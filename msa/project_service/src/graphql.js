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
      evid: 'ID!',
      enid: 'ID!',
    },
    resolve: (obj, args) => Project.find({ evid: args.evid, enid: args.enid }),
  },
  projectsOfEvent: {
    type: '[Project!]',
    args: {
      evid: 'ID!'
    },
    resolve: (obj, args) => Project.find({ evid: args.evid }),
  },
});

schemaComposer.Mutation.addNestedFields({
  'project.create': {
    type: 'Project',
    args: {
      enid: 'ID!',
      evid: 'ID!',
      name: 'String!',
      description: 'String',
      datanoseLink: 'String',
    },
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED create project');
      }

      const res = await Promise.all([
        rgraphql('api-event', `query { event(evid: ${JSON.stringify(args.evid)}) { evid } }`),
        rgraphql('api-entity', `query { entity(enid: ${JSON.stringify(args.enid)}) { enid } }`),
      ]);

      if (res[0].errors) {
        throw new Error('An unkown error occured while checking if the enid is valid');
      }

      if (res[1].errors) {
        throw new Error('An unkown error occured while checking if the enid is valid');
      }

      if (!res[0].data.event) {
        throw new Error('The given evid does not exist');
      }

      if (!res[1].data.entity) {
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
      evid: 'ID',
      name: 'String',
      description: 'String',
      datanoseLink: 'String',
    },
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update project');
      }

      if (args.evid) {
        const res = await rgraphql('api-event', `query { event(evid: ${JSON.stringify(args.evid)}) { evid } }`);

        if (res.errors || !res.data) {
          throw new Error('An unkown error occured while checking if the evid is valid');
        }

        if (!res.data.event) {
          throw new Error('The given evid does not exist');
        }
      }

      if (args.enid) {
        const res = await rgraphql('api-entity', `query { entity(enid: ${JSON.stringify(args.enid)}) { enid } }`);
        if (res.errors || !res.data) {
          console.log(res);
          throw new Error('An unkown error occured while checking if the enid is valid');
        }

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
  'project.deleteOfEntity': {
    type: 'Boolean',
    args: {
      enid: 'ID!',
    },
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete project');
      }

      await Project.deleteMany({ enid: args.enid });
      return true
    }
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

const executeGraphql = (query, variableValues = {}, contextValue = {}) => graphql({ schema, source: query, variableValues, contextValue });
export default executeGraphql;
