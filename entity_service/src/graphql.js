import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';

import { Entity } from './database.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
    entity: {
        type: 'Entity',
        args: {
            enid: 'ID!',
        },
        resolve: (obj, args) => Entity.findById(args.enid),
    },
});

schemaComposer.Mutation.addNestedFields({
    'entity.create': {
        type: 'Entity',
        args: {
            name: 'String!',
            description: 'String',
            type: 'String!',
            contact: '[EntityContactInfoIn!]',
        },
        resolve: (obj, args) => Entity.create(args)
      },
    'entity.update': {
        type: 'Entity',
        args: {
            enid: 'ID!',
            name: 'String!',
            description: 'String',
            type: 'String!',
            contact: '[EntityContactInfoIn!]'
        },
        resolve: (obj, args) => {
          const enid = args.enid;
          delete args.enid;
          return Entity.findByIdAndUpdate(enid, { $set: args }, { new: true });
        },
    },
    'entity.delete': {
        type: 'Entity',
        args: {
            enid: 'ID!',
        },
        resolve: (obj, args) => Entity.findByIdAndDelete(args.enid),
    },
});

const schema = schemaComposer.buildSchema();

const execute = (query, variableValues = {}) => graphql({ schema, source: query, variableValues });
export default execute;
