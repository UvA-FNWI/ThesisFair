import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';

import { Entity } from './database.js';
import { canGetAllEntities } from './permissions.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
  entity: {
    type: 'Entity',
    args: {
      enid: 'ID!',
    },
    description: JSON.stringify({
      caching: { type: 'entity', key: 'enid' },
    }),
    resolve: (obj, args) => Entity.findById(args.enid),
  },
  entitiesAll: {
    type: '[Entity!]',
    description: JSON.stringify({
      checkPermissions: canGetAllEntities.toString(),
      caching: { type: 'entity', key: 'enid', multiple: true },
    }),
    resolve: (obj, args, req) => {
      canGetAllEntities(req);
      return Entity.find();
    },
  },
  entities: {
    type: '[Entity!]',
    args: {
      enids: '[ID!]!'
    },
    description: JSON.stringify({
      caching: { type: 'entity', key: 'enid', keys: 'enids' },
    }),
    resolve: (obj, args) => Entity.find({ _id: { $in: args.enids } }),
  }
});

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
