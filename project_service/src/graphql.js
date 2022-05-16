import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';
// import { parse as csvParser } from 'csv-parse';

import { rgraphql } from '../../libraries/amqpmessaging/index.js';
import { Project } from './database.js';
// import config from './config.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
  project: {
    type: 'Project',
    args: {
      pid: 'ID!',
    },
    resolve: (obj, args) => Project.findById(args.pid),
  },
  projects: {
    type: '[Project!]',
    args: {
      pids: '[ID!]!'
    },
    resolve: (obj, args) => Project.find({ _id: { $in: args.pids } }),
  },
  projectsOfEntity: {
    type: '[Project!]',
    args: {
      enid: 'ID!'
    },
    resolve: (obj, args) => Project.find({ enid: args.enid }),
  },
});

schemaComposer.Mutation.addNestedFields({
  'project.create': {
    type: 'Project',
    args: {
      enid: 'ID!',
      name: 'String!',
      description: 'String',
      datanoseLink: 'String',
    },
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED create project');
      }

      const res = await rgraphql('API_entity',
        `query { entity(enid: ${JSON.stringify(args.enid)}) { enid } }`,
        null,
        { user: { type: 'a' } },
      );

      if (!res.data.entity) {
        throw new Error('The given enid does not exist');
      }

      return Project.create(args);
    }
  },
  'project.update': {
    type: 'Project',
    args: {
      pid: 'ID!',
      enid: 'ID',
      name: 'String',
      description: 'String',
      datanoseLink: 'String',
    },
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update project');
      }

      if (args.enid) {
        const res = await rgraphql('API_entity',
          `query { entity(enid: ${JSON.stringify(args.enid)}) { enid } }`,
          null,
          { user: { type: 'a' } },
        );

        if (!res.data.entity) {
          throw new Error('The given enid does not exist');
        }
      }

      const pid = args.pid;
      delete args.pid;
      return Project.findByIdAndUpdate(pid, { $set: args }, { new: true });
    },
  },
  'project.delete': {
    type: 'Project',
    args: {
      pid: 'ID!',
    },
    resolve: (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete project');
      }

      return Project.findByIdAndDelete(args.pid);
    },
  },
  'project.import': {
    type: '[Project]',
    args: {
      file: 'String!',
      enid: 'ID!',
    },
    resolve: (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED import projects');
      }

      // return new Promise((resolve, reject) => {
      //   csvParser(args.file.trim(), { columns: true }, (err, records, info) => {
      //     if (err) { reject(err); return; }

      //     resolve(
      //       Promise.all(
      //         records.map(async (record) => {
      //           const external_id = record[config.project_external_id];
      //           const project = await Project.find({ external_id: external_id });
      //           if (project.length > 0) {
      //             return null;
      //           }

      //           // TODO: Create admin representative accounts with name and email address

      //           return Project.create({
      //             name: record[config.project_name],
      //             external_id,
      //             type: 'company',
      //           })
      //         })
      //       )
      //     );
      //   });
      // });
    }
  }
});

const schema = schemaComposer.buildSchema();

const execute = (query, variableValues = {}, contextValue = {}) => graphql({ schema, source: query, variableValues, contextValue });
export default execute;
