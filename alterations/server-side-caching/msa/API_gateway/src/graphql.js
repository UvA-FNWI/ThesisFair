import { graphqlHTTP } from 'express-graphql';
import { GraphQLObjectType, GraphQLUnionType, GraphQLScalarType, print } from 'graphql';
import { introspectSchema } from '@graphql-tools/wrap';
import { stitchSchemas } from '@graphql-tools/stitch';
import debugLib from 'debug';

import { channel, rgraphql } from '../../libraries/amqpmessaging/index.js';
import { graphqlConfig } from './config.js';
import errors from './errors.js';

import { createClient } from 'redis';

const debug = debugLib('API_gateway:graphql');
const redisClient = createClient({
  url: 'redis://redis:6379'
});
const annotations = {
  query: {},
  mutation: {},
};
const selections = {};

const getSelections = (type) => {
  const _getField = (name, selectionSet) => {
    const field = {
      kind: 'Field',
      name: {
        kind: 'Name',
        value: name,
      }
    }

    if (selectionSet) {
      field.selectionSet = selectionSet;
    }

    return field;
  };

  const _resolveType = (field) => {
    while (field.ofType) {
      field = field.ofType;
    }

    return field;
  }

  const _getSelections = (typeObj) => {
    if (typeObj instanceof GraphQLObjectType) {
      const fields = [];
      for (const field in typeObj._fields) {
        const type = _resolveType(typeObj._fields[field].type);
        if (type instanceof GraphQLScalarType){
          fields.push(_getField(typeObj._fields[field].name))
        } else if (type instanceof GraphQLObjectType) {
          fields.push(_getField(typeObj._fields[field].name, {
            kind: 'SelectionSet',
            selections: _getSelections(type),
          }));
        } else {
          throw new Error('Unrecognized type');
        }
      }
      return fields;
    } else if (typeObj instanceof GraphQLUnionType) {
      return typeObj._types.reduce((arr, field) => {
        arr.push({
          kind: 'InlineFragment',
          typeCondition: {
            kind: 'NamedType',
            name: {
              kind: 'Name',
              value: field.name,
            }
          },
          selectionSet: {
            kind: 'SelectionSet',
            selections: _getSelections(field)
          }
        });
        return arr;
      }, []);
    }

    throw new Error('Unkown query type: ' + (typeObj && typeObj.constructor ? typeObj.constructor.name : 'unkown name'));
  }

  if (type instanceof GraphQLScalarType) {
    return null;
  }

  const selections = _getSelections(type);
  selections.push(_getField('__typename'));
  return selections;
}

const getArguments = (args, variables) => {
  const argumentVariableValues = {};
  for (const argument of args) {
    argumentVariableValues[argument.name.value] = (argument.value.kind === 'Variable' ? variables[argument.name.value] : argument.value.value);
  }

  return argumentVariableValues;
}

const getDict = (dict, path) => {
  for (const key of path.split('.')) {
    dict = dict[key];
  }

  return dict;
}

const setDict = (dict, path, value) => {
  const root = dict;
  const keys = path.split('.');
  const finalKey = keys.pop();
  for (const key of keys) {
    if (!dict[key]) {
      dict[key] = {};
    }

    dict = dict[key];
  }

  dict[finalKey] = value;

  return root;
}

const getFunctionPath = (obj) => {
  const _getFunctionPath = (field, path, kind) => {
    path = path + field.name.value;
    console.log(kind, annotations[kind]);
    if (path in annotations[kind]) {
      return [field, path, kind];
    }

    if (!field.selectionSet || !field.selectionSet.selections) {
      return null;
    }

    for (const child of field.selectionSet.selections) {
      const res = _getFunctionPath(child, path + '.', kind);
      if (res) {
        return res;
      }
    }
  }

  for (const definition of obj) {
    for (const field of definition.selectionSet.selections) {
      const res = _getFunctionPath(field, '', definition.operation);
      if (res) {
        return res;
      }
    }
  }

  throw new Error('Could not find function definition');
}

const executor = async (queue, caching, { document, variables, context }) => {
  let fnNode, path, annotation, kind, cacheConfig, args;
  if (caching) {
    [fnNode, path, kind] = getFunctionPath(document.definitions);

    annotation = annotations[kind][path]
    cacheConfig = annotation ? annotation.caching : undefined;
    caching = !!cacheConfig;

    if (caching) {
      args = getArguments(fnNode.arguments, variables);
    }
  }

  const result = [];
  if (caching && !cacheConfig.multiple && !cacheConfig.create && !cacheConfig.update && !cacheConfig.delete) {
    if (cacheConfig.keys) {
      const keys = args[cacheConfig.keys];

      for (let i = 0; i < keys.length;) {
        const cachedResult = await redisClient.get(`${cacheConfig.type}.${keys[i]}`);
        if (cachedResult) {
          result.push(JSON.parse(cachedResult));
          keys.splice(i, 1);
          continue;
        }

        ++i;
      }

      if (annotation.checkPermissions) {
        annotation.checkPermissions(context, args, result);
      }

      if (keys.length === 0) {
        return setDict({}, `data.${path}`, result);
      }
    } else {
      const cachedResult = await redisClient.get(`${cacheConfig.type}.${args[cacheConfig.key]}`);

      if (cachedResult) {
        const result = JSON.parse(cachedResult);

        if (annotation.checkPermissions) {
          annotation.checkPermissions(context, args, result);
        }

        return setDict({}, `data.${path}`, result);
      }
    }

    if (selections[annotation.type]) { // null value signals a non-complex value which does not have fields
      // Request all data
      // Introduces restriction: Only one function can be queried at a time.
      fnNode.selectionSet.selections = selections[annotation.type];
    }
  }

  let rawResult = await rgraphql(queue, print(document), variables, context ? { user: context.user } : {});
  if (!rawResult || (rawResult.errors && rawResult.errors.length > 0)) {
    return rawResult;
  }


  if (caching) {
    const res = getDict(rawResult.data, path);

    if (res) {
      if (cacheConfig.keys || cacheConfig.multiple) {
        for (const doc of res) {
          if (!doc) { continue; }

          const id = doc[cacheConfig.key];
          if (id) {
            redisClient.set(`${cacheConfig.type}.${id}`, JSON.stringify(doc));
          }
        }

        result.push(...res);
        return setDict({}, `data.${path}`, result);
      } else {
        if (cacheConfig.delete) {
          if (!args[cacheConfig.key]) {
            throw new Error('Caching system could get the identifier that was used to delete the record');
          }
          await redisClient.del(`${cacheConfig.type}.${args[cacheConfig.key]}`);
        } else {
          const id = res[cacheConfig.key];
          if (id) {
            await redisClient.set(`${cacheConfig.type}.${id}`, JSON.stringify(res));
          }
        }
      }
    }
  }

  return rawResult;
};

const getMiddleware = async () => {
  await redisClient.connect();

  const subschemas = [];
  for (const queue of graphqlConfig.queues) {
    debug('Loading queue %s', queue);
    if (channel) {
      await channel.assertQueue(queue, {
        durable: false,
      });
    }

    subschemas.push({
      schema: await introspectSchema((args) => executor(queue, false, args)),
      executor: (args) => executor(queue, false, args).catch((err) => { console.error(err); throw err; }),
    });
  }

  const schema = stitchSchemas({
    subschemas
  });

  const annotate = (obj, path, kind) => {
    if (!obj.description) {
      console.error(`${path} does not have a description! Caching not possible.`);
      return;
    }

    let type = obj.type;
    while (!type.name && type.ofType) {
      type = type.ofType;
    }
    if (!type.name) {
      console.error('Coult not get type of function ', path);
    }

    annotations[kind][path] = JSON.parse(obj.description);
    annotations[kind][path]['type'] = type.name;
    if (annotations[kind][path].checkPermissions) {
      annotations[kind][path].checkPermissions = eval(annotations[kind][path].checkPermissions);
    }
  }

  const traverse = (obj, path, kind) => {
    if (obj.args.length > 0) {
      annotate(obj, path, kind);
      return;
    }

    for (const field in obj.type._fields) {
      traverse(obj.type._fields[field], `${path}.${field}`, kind);
    }
  }

  const queryFields = schema.getQueryType().getFields();
  for (const field in queryFields) {
    annotate(queryFields[field], field, 'query');
  }

  const mutationFields = schema.getMutationType().getFields();
  for (const field in mutationFields) {
    traverse(mutationFields[field], field, 'mutation');
  }

  const types = schema.getTypeMap();
  for (const kind in annotations) {
    for (const fnPath in annotations[kind]) {
      selections[annotations[kind][fnPath].type] = getSelections(types[annotations[kind][fnPath].type])
    }
  }

  debug('Done initializing graphql middleware');
  return graphqlHTTP({
    schema,
    graphiql: !!process.env.DEBUG,
    customFormatErrorFn: (err) => {
      if (!process.env.DEBUG && err.message) {
        const split = err.message.split(' ');
        if (split.length > 0 && errors[split[0]]) {
          const error = errors[split[0]];
          err.message = error.message + err.message.substring(split[0].length + 1);
        }
      }

      return err;
    }
  });
}

export default getMiddleware;
