import { graphqlHTTP } from 'express-graphql';
import { GraphQLObjectType, GraphQLUnionType, print } from 'graphql';
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
let queryFields = null;
let permissionFunctions = {};

const getSelections = (name) => {
  const _getField = (name) => ({
    kind: 'Field',
    name: {
      kind: 'Name',
      value: name,
    }
  });

  const _getSelections = (typeObj) => {
    if (typeObj instanceof GraphQLObjectType) {
      return Object.keys(typeObj._fields).map(_getField);
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

  const selections = _getSelections(queryFields[name].type);
  selections.push(_getField('__typename'));
  return selections;
}

const getArgumentInformation = (args, variables) => {
  const argumentVariables = [];
  const argumentVariableValues = {};
  for (const argument of args) {
    argumentVariables.push(argument.name.value);

    if (argument.value.kind === 'Variable') {
      argumentVariableValues[argument.name.value] = variables[argument.name.value];
    } else {
      argumentVariableValues[argument.name.value] = argument.value.value;
    }
  }

  return [argumentVariables, argumentVariableValues];
}
const getKey = (name, argumentVariables, argumentVariableValues) => {
  return `${name}|${argumentVariables.map((variable) => `${variable}:${argumentVariableValues[variable]}`).join(',')}`;
}

const executor = async (queue, caching, { document, variables, context }) => {
  caching &&= document.definitions[0].operation === 'query';

  let name, key;
  if (caching) {
    const fnNode = document.definitions[0].selectionSet.selections[1];
    name = fnNode.name.value;
    const [argumentVariables, argumentVariableValues] = getArgumentInformation(fnNode.arguments, variables);
    key = getKey(name, argumentVariables, argumentVariableValues);

    const cachedResult = await redisClient.get(key);

    if (cachedResult) {
      const result = JSON.parse(cachedResult);

      if (permissionFunctions[name]) {
        permissionFunctions[name](context, argumentVariableValues, result);
      }

      return result;
    }

    fnNode.selectionSet.selections = getSelections(name); // Introduces restriction: Only one function can be queried at a time.
  }

  const result = await rgraphql(queue, print(document), variables, context ? { user: context.user } : {});

  if (caching && (!result.errors || result.errors.length === 0)) {
    redisClient.set(key, JSON.stringify(result), {
      EX: 60,
    });
  }

  return result;
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
      executor: (args) => executor(queue, true, args),
    });
  }

  const schema = stitchSchemas({
    subschemas
  });
  queryFields = schema.getQueryType().getFields();
  for (const name in queryFields) {
    if (queryFields[name].description) {
      permissionFunctions[name] = eval(queryFields[name].description);
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
