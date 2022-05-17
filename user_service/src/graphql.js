import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';

import { User, Student, Representative } from './database.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
  user: {
    type: 'User',
    args: {
      uid: 'ID!',
    }, // TODO: Add permission checks
    resolve: (obj, args) => User.findById(args.uid),
  },
});

// schemaComposer.Mutation.addNestedFields({
//   'project.create': {
//     type: 'Project',
//     args: {
//       enid: 'ID!',
//       evid: 'ID!',
//       name: 'String!',
//       description: 'String',
//       datanoseLink: 'String',
//     },
//     resolve: async (obj, args, req) => {
//       if (req.user.type !== 'a') {
//         throw new Error('UNAUTHORIZED create project');
//       }

//       return Project.create(args);
//     }
//   },
//   'project.update': {
//     type: 'Project',
//     args: {
//       pid: 'ID!',
//       enid: 'ID',
//       evid: 'ID',
//       name: 'String',
//       description: 'String',
//       datanoseLink: 'String',
//     },
//     resolve: async (obj, args, req) => {
//       if (req.user.type !== 'a') {
//         throw new Error('UNAUTHORIZED update project');
//       }

//       const pid = args.pid;
//       delete args.pid;
//       return Project.findByIdAndUpdate(pid, { $set: args }, { new: true });
//     },
//   },
//   'project.delete': {
//     type: 'Project',
//     args: {
//       pid: 'ID!',
//     },
//     resolve: (obj, args, req) => {
//       if (req.user.type !== 'a') {
//         throw new Error('UNAUTHORIZED delete project');
//       }

//       return Project.findByIdAndDelete(args.pid);
//     },
//   },
//   'project.deleteOfEntity': {
//     type: 'Boolean',
//     args: {
//       enid: 'ID!',
//     },
//     resolve: async (obj, args, req) => {
//       if (req.user.type !== 'a') {
//         throw new Error('UNAUTHORIZED delete project');
//       }

//       await Project.deleteMany({ enid: args.enid });
//       return true
//     }
//   },
// });

const schema = schemaComposer.buildSchema();

const execute = (query, variableValues = {}, contextValue = {}) => graphql({ schema, source: query, variableValues, contextValue });
export default execute;
