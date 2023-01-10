import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';

import { rgraphql } from '../../libraries/amqpmessaging/index.js';
import { Project } from './database.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

//! Left in the project due to possible future usage.
// const evidExists = async (evid) => {
//   const res = await rgraphql('api-event', 'query checkEVID($evid: ID!) { event(evid: $evid) { evid } }', { evid });

//   if (res.errors || !res.data) {
//     console.error(res);
//     throw new Error('An unkown error occured while checking if the evid is valid');
//   }

//   if (!res.data.event) {
//     return false;
//   }

//   return true;
// };

// const enidExists = async (enid) => {
//   const res = await rgraphql('api-entity', 'query checkENID($enid: ID!) { entity(enid: $enid) { enid } }', { enid });
//   if (res.errors || !res.data) {
//     console.error(res);
//     throw new Error('An unkown error occured while checking if the enid is valid');
//   }

//   if (!res.data.entity) {
//     return false;
//   }

//   return true;
// }

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
    description: 'Get a project by its project id.',
    resolve: (obj, args) => Project.findById(args.pid),
  },
  projectByExtID: {
    type: 'Project',
    args: {
      external_id: 'ID!',
    },
    description: 'Get a project using its external id',
    resolve: (obj, args) => Project.findOne({ external_id: args.external_id }),
  },
  projects: {
    type: '[Project!]',
    args: {
      pids: '[ID!]!'
    },
    description: 'Get a list of projects using their project ids. Result is not in original order!',
    resolve: (obj, args) => Project.find({ _id: { $in: args.pids } }),
  },
  projectsOfEntity: {
    type: '[Project!]',
    args: {
      evid: 'ID!',
      enid: 'ID!',
    },
    description: 'Get the projects of a given entity and event.',
    resolve: (obj, args) => Project.find({ enid: args.enid, evids: args.evid }),
  },
  projectsOfEvent: {
    type: '[Project!]',
    args: {
      evid: 'ID!'
    },
    description: 'Get the projects available on an event.',
    resolve: (obj, args) => Project.find({ evids: args.evid }),
  },
});

schemaComposer.Mutation.addNestedFields({
  //! Left in the project due to possible future usage.
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
    description: 'Delete a project.',
    resolve: (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete project');
      }

      return Project.findByIdAndDelete(args.pid);
    },
  },
  'project.deleteOfEntity': {
    type: 'String',
    args: {
      enid: 'ID!',
    },
    description: 'Delete all projects of an entity.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete project');
      }

      await Project.deleteMany({ enid: args.enid });
    }
  },
  'project.deleteOfEvent': {
    type: 'String',
    args: {
      evid: 'ID!',
    },
    description: 'Delete all projects of an event.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete project');
      }

      await Project.updateMany({ $pull: { evids: args.evid} });
    }
  },
  'project.import': {
    type: '[ProjectImportResult!]!',
    args: {
      projects: '[ProjectImport!]!',
    },
    description: `Import projects.
Parameters:
- projects - Structured data of type ProjectImport

The ProjectImport type has the following fields:
- ID - A unique numeric identifier of the project
- entityID - The unique numeric identifier of the entity the project is linked to
- evids - An array of the unique numeric identifiers of the events this project linked to
- name - Name of the project
- description - The description of the project
- datanoseLink - The link to datanose (Complete url)
- enabled - When false the project will be deleted, otherwise it will be upserted.

Example payload:
\`\`\`
[
  {
    "ID": 10101,
    "entityID": 0,
    "evids": [0, 1],
    "name": "Test Project",
    "description": "This is a test project",
    "datanoseLink": "https://datanose.nl/project/test",
    "enabled": true,
  },
  {
    "ID": 20202,
    "entityID": 0,
    "evids": [0, 1],
    "name": "UvA Project",
    "description": "You will be doing research at the UvA",
    "datanoseLink": "https://datanose.nl/project/UvAResearch",
    "enabled": true,
  },
]
\`\`\`
    `,
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || req.user.type === 'service')) {
        throw new Error('UNAUTHORIZED import projects');
      }

      return Promise.all(
        args.projects.map(async ({ ID: external_id, entityID: external_enid, name, description, datanoseLink, enabled, evids: external_evids }) => {
          const evids = external_evids ? await Promise.all(external_evids.map(getEvid)) : [];
          for (let i = 0; i < evids.length; i++) {
            if (!evids[i]) {
              return { error: `Event with ID "${external_evids[i]}" could not be found!.` };
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
