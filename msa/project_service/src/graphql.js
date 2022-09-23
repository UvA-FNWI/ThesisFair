import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';

import { rgraphql } from '../../libraries/amqpmessaging/index.js';
import { Project } from './database.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

const evidExists = async (evid) => {
  const res = await rgraphql('api-event', 'query checkEVID($evid: ID!) { event(evid: $evid) { evid } }', { evid });

  if (res.errors || !res.data) {
    console.error(res);
    throw new Error('An unkown error occured while checking if the evid is valid');
  }

  if (!res.data.event) {
    return false;
  }

  return true;
};

const enidExists = async (enid) => {
  const res = await rgraphql('api-entity', 'query checkENID($enid: ID!) { entity(enid: $enid) { enid } }', { enid });
  if (res.errors || !res.data) {
    console.error(res);
    throw new Error('An unkown error occured while checking if the enid is valid');
  }

  if (!res.data.entity) {
    return false;
  }

  return true;
}

const getEvid = async (external_id) => {
  const res = await rgraphql('api-event', 'query getEvid($external_id: ID!) { eventByExtID(external_id: $external_id) { evid } }', { external_id });

  if (res.errors || !res.data) {
    console.error(res);
    throw new Error('An unkown error occured while checking if the evid is valid');
  }

  if (!res.data.eventByExtID) {
    return false;
  }

  return res.data.eventByExtID.evid;
};

const getEnid = async (external_id) => {
  const res = await rgraphql('api-entity', 'query getEnid($external_id: ID!) { entityByExtID(external_id: $external_id) { enid } }', { external_id });
  if (res.errors || !res.data) {
    console.error(res);
    throw new Error('An unkown error occured while checking if the enid is valid');
  }

  if (!res.data.entityByExtID) {
    return false;
  }

  return res.data.entityByExtID.enid;
}

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
  projectByExtID: {
    type: 'Project',
    args: {
      external_id: 'ID!',
    },
    description: JSON.stringify({
      caching: { type: 'project', key: 'pid' }
    }),
    resolve: (obj, args) => Project.findOne({ external_id: args.external_id }),
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
    resolve: (obj, args) => Project.find({ enid: args.enid, evids: args.evid }),
  },
  projectsOfEvent: {
    type: '[Project!]',
    args: {
      evid: 'ID!'
    },
    description: JSON.stringify({
      caching: { type: 'project', key: 'pid', multiple: true }
    }),
    resolve: (obj, args) => Project.find({ evids: args.evid }),
  },
});

schemaComposer.Mutation.addNestedFields({
  // 'project.create': {
  //   type: 'Project',
  //   args: {
  //     enid: 'ID!',
  //     evid: 'ID!',
  //     name: 'String!',
  //     description: 'String',
  //     datanoseLink: 'String',
  //     external_id: 'Int!',
  //   },
  //   description: JSON.stringify({
  //     caching: { type: 'project', key: 'pid', create: true }
  //   }),
  //   resolve: async (obj, args, req) => {
  //     if (req.user.type !== 'a') {
  //       throw new Error('UNAUTHORIZED create project');
  //     }

  //     const res = await Promise.all([
  //       evidExists(args.evid),
  //       enidExists(args.enid),
  //     ]);

  //     if (!res[0]) {
  //       throw new Error('The given evid does not exist');
  //     }

  //     if (!res[1]) {
  //       throw new Error('The given enid does not exist');
  //     }

  //     return Project.create(args);
  //   }
  // },
  // 'project.update': {
  //   type: 'Project',
  //   args: {
  //     pid: 'ID!',
  //     enid: 'ID',
  //     evid: 'ID',
  //     name: 'String',
  //     description: 'String',
  //     datanoseLink: 'String',
  //   },
  //   description: JSON.stringify({
  //     caching: { type: 'project', key: 'pid', update: true }
  //   }),
  //   resolve: async (obj, args, req) => {
  //     if (req.user.type !== 'a') {
  //       throw new Error('UNAUTHORIZED update project');
  //     }

  //     if (args.evid && !(await evidExists(args.evid))) {
  //       throw new Error('The given evid does not exist');
  //     }

  //     if (args.enid && !(await enidExists(args.enid))) {
  //       throw new Error('The given enid does not exist');
  //     }

  //     const pid = args.pid;
  //     delete args.pid;
  //     return Project.findByIdAndUpdate(pid, { $set: args }, { new: true });
  //   },
  // },
  'project.delete': {
    type: 'Project',
    args: {
      pid: 'ID!',
    },
    description: JSON.stringify({
      caching: { type: 'project', key: 'pid', delete: true }
    }),
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
    description: JSON.stringify({

    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete project');
      }

      await Project.deleteMany({ enid: args.enid });
      return true
    }
  },
  'project.import': {
    type: '[ProjectImportResult!]!',
    args: {
      projects: '[ProjectImport!]!',
    },
    description: JSON.stringify({
      caching: { type: 'project', key: 'pid', multiple: true }
    }),
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || req.user.type === 'service')) {
        throw new Error('UNAUTHORIZED import projects');
      }

      return Promise.all(
        args.projects.map(async ({ ID: external_id, entityID: external_enid, name, description, datanoseLink, enabled, evids: external_evids }) => {
          const evids = external_evids ? await Promise.all(external_evids.map(getEvid)) : [];
          for (const evid of evids) {
            if (!evid) {
              return { error: `Event with ID "${evid}" could not be found!.` };
            }
          }

          const project = await Project.findOne({ external_id: external_id });
          if (project) {
            if (enabled) { // Update project
              if (name)
                project.name = name;
              if (description)
                project.description = description;
              if (datanoseLink)
                project.datanoseLink = datanoseLink;
              if (evids)
                project.evids = evids;

              await project.save();
              return {
                object: project,
              };
            }

            // Delete project
            await Project.deleteOne({ external_id: external_id });
            return {};
          }

          if (!enabled) { // Project already deleted
            return {};
          }

          const enid = await getEnid(external_enid);
          if (!enid) {
            return { error: `Entity with ID ${external_enid} could not be found!` };
          }

          // Create project
          return {
            project: await Project.create({
              evids,
              enid,
              name: name,
              description,
              datanoseLink,
              external_id,
            }),
          }
        })
      )
    }
  }
});

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
