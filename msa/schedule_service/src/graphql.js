import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';

import { rgraphql } from '../../libraries/amqpmessaging/index.js';
import { Schedule } from './database.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
  studentSchedule: {
    type: '[Schedule!]!',
    args: {
      uid: 'ID!',
    },
    description: JSON.stringify({
    }),
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || (req.user.uid === args.uid))) {
        throw new Error('UNAUTHORIZED to get this users schedule');
      }

      return await Schedule.find({ uid: args.uid });
    },
  },
  representativeSchedule: {
    type: '[Schedule!]!',
    args: {
      enid: 'ID!',
    },
    description: JSON.stringify({
    }),
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || (req.user.type === 'r' && req.user.enid === args.enid))) {
        throw new Error('UNAUTHORIZED to get this users schedule');
      }

      return await Schedule.find({ enid: args.enid });
    },
  },
});

schemaComposer.Mutation.addNestedFields({
  'schedule.generate': {
    type: 'String',
    args: {
      evid: 'ID!',
    },
    description: JSON.stringify({
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED to generate sche')
      }
    },
  }
});

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
