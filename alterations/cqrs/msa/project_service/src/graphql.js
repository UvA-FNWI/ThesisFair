import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';

import { Project } from './database.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
  project: {
    type: 'Project',
    args: {
      pid: 'ID!',
    },
    description: JSON.stringify({
      caching: { type: 'project', key: 'pid' }
    }),
    resolve: (obj, args) => Project.findById(args.pid),
  },
  projects: {
    type: '[Project!]',
    args: {
      pids: '[ID!]!'
    },
    description: JSON.stringify({
      caching: { type: 'project', key: 'pid', keys: 'pids' }
    }),
    resolve: (obj, args) => Project.find({ _id: { $in: args.pids } }),
  },
  projectsOfEntity: {
    type: '[Project!]',
    args: {
      evid: 'ID!',
      enid: 'ID!',
    },
    description: JSON.stringify({
      caching: { type: 'project', key: 'pid', multiple: true }
    }),
    resolve: (obj, args) => Project.find({ evid: args.evid, enid: args.enid }),
  },
  projectsOfEvent: {
    type: '[Project!]',
    args: {
      evid: 'ID!'
    },
    description: JSON.stringify({
      caching: { type: 'project', key: 'pid', multiple: true }
    }),
    resolve: (obj, args) => Project.find({ evid: args.evid }),
  },
});

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
