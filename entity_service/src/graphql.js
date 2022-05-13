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
    entities: {
      type: '[Entity!]',
      args: {
        enids: '[ID!]!'
      },
      resolve: (obj, args) => Entity.find({ _id: { $in: args.enids } }),
    }
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
        resolve: (obj, args, req) => {
          if (req.user.type !== 'a') {
            throw new Error('UNAUTHORIZED create entities');
          }

          return Entity.create(args);
        }
      },
    'entity.update': {
        type: 'Entity',
        args: {
            enid: 'ID!',
            name: 'String',
            description: 'String',
            type: 'String',
            contact: '[EntityContactInfoIn!]'
        },
        resolve: (obj, args, req) => {
          const enid = args.enid;
          delete args.enid;

          if (!(req.user.type === 'a' || (req.user.type === 'r' && req.user.enid === enid))) {
            throw new Error('UNAUTHORIZED update this entity');
          }

          return Entity.findByIdAndUpdate(enid, { $set: args }, { new: true });
        },
    },
    'entity.delete': {
        type: 'Entity',
        args: {
            enid: 'ID!',
        },
        resolve: (obj, args, req) => {
          if (req.user.type !== 'a') {
            throw new Error('UNAUTHORIZED delete entities');
          }

          return Entity.findByIdAndDelete(args.enid)
        },
    },
});

const schema = schemaComposer.buildSchema();

const execute = (query, variableValues = {}, contextValue = {}) => graphql({ schema, source: query, variableValues, contextValue });
export default execute;
