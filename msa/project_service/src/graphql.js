import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync } from 'fs'

import { rgraphql } from '../../libraries/amqpmessaging/index.js'
import { Project } from './database.js'

import { entityWriteAccess, projectWriteAccess } from './permissions.js'

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

const evidExists = async evid => {
  const res = await rgraphql('api-event', 'query checkEVID($evid: ID!) { event(evid: $evid) { evid } }', { evid })

  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unkown error occured while checking if the evid is valid')
  }

  if (!res.data.event) {
    return false
  }

  return true
}

const enidExists = async enid => {
  const res = await rgraphql('api-entity', 'query checkENID($enid: ID!) { entity(enid: $enid) { enid } }', { enid })
  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unkown error occured while checking if the enid is valid')
  }

  if (!res.data.entity) {
    return false
  }

  return true
}

const getEvid = async external_id => {
  const res = await rgraphql(
    'api-event',
    'query getEvid($external_id: ID) { eventByExtID(external_id: $external_id) { evid } }',
    { external_id }
  )

  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unkown error occured while checking if the evid is valid')
  }

  if (!res.data.eventByExtID) {
    return false
  }

  return res.data.eventByExtID.evid
}

const getEnid = async external_id => {
  const res = await rgraphql(
    'api-entity',
    'query getEnid($external_id: ID) { entityByExtID(external_id: $external_id) { enid } }',
    { external_id }
  )
  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unkown error occured while checking if the enid is valid')
  }

  if (!res.data.entityByExtID) {
    return false
  }

  return res.data.entityByExtID.enid
}

schemaComposer.Query.addNestedFields({
  tags: {
    type: '[String]',
    args: {},
    description: 'Get a list of every tag assigned to any project',
    resolve: async (obj, args) => {
      const docs = await Project.find({}, {tags: 1}).exec()
      const tags = [... new Set(docs.map(({tags}) => tags).flat())]

      return tags
    },
  },
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
      pids: '[ID!]!',
    },
    description: 'Get a list of projects using their project ids. Result is not in original order!',
    resolve: (obj, args) => Project.find({ _id: { $in: args.pids } }),
  },
  projectsOfEntity: {
    type: '[Project!]',
    args: {
      evid: 'ID',
      enid: 'ID!',
    },
    description: 'Get the projects of a given entity and event.',
    resolve: (obj, args) => {
      if (args.evid) {
        return Project.find({ enid: args.enid, evid: args.evid })
      }
      
      return Project.find({ enid: args.enid })
    },
  },
  projectsOfEvent: {
    type: '[Project!]',
    args: {
      evid: 'ID!',
    },
    description: 'Get the projects available on an event.',
    resolve: (obj, args) => Project.find({ evids: args.evid }),
  },
})

schemaComposer.Mutation.addNestedFields({
  'project.create': {
    type: 'Project',
    args: {
      enid: 'ID!',
      evid: 'ID',
      evids: '[ID]',
      name: 'String!',
      degrees: '[Degree]',
      tags: '[String]',
      description: 'String',
      attendance: 'Attendance',
      environment: 'String',
      expectations: 'String',
      datanoseLink: 'String',
      external_id: 'Int',
    },
    description: JSON.stringify({
      caching: { type: 'project', key: 'pid', create: true },
    }),
    resolve: async (obj, args, req) => {
      projectWriteAccess(req.user, args)

      if (args.evid) {
        if (args.evids) {
          args.evids = [...args.evids, args.evid]
        } else {
          args.evids = [args.evid]
        }

        delete args.evid
      }

      const res = await Promise.all([
        ...args.evids.map(evid => evidExists(evid)),
        enidExists(args.enid)
      ])

      if (res.some(i => !i)) {
        throw new Error('A given evid or the enid do not exist')
      }

      return await Project.create(args)
    },
  },
  'project.update': {
    type: 'Project',
    args: {
      pid: 'ID!',
      enid: 'ID',
      evid: 'ID',
      evids: '[ID]',
      name: 'String',
      attendance: 'Attendance',
      description: 'String',
      expectations: 'String',
      environment: 'String',
      tags: '[String]',
      degrees: '[Degree]',
      datanoseLink: 'String',
    },
    description: JSON.stringify({
      caching: { type: 'project', key: 'pid', update: true },
    }),
    resolve: async (obj, args, req) => {
      projectWriteAccess(req.user, args)

      if (args.evid) {
        args.evids = [...args.evids, args.evid]
      }

      const res = await Promise.all([
        ...args.evids.map(evid => evidExists(evid)),
        enidExists(args.enid)
      ])

      if (res.some(i => !i)) {
        throw new Error('A given evid or the enid do not exist')
      }

      const pid = args.pid
      delete args.pid
      await Project.findByIdAndUpdate(pid, { $set: args }, { new: true })
    },
  },
  'project.approval': {
    type: 'Project',
    args: {
      pid: 'ID!',
      approval: 'ApprovalStatus!',
    },
    description: 'Set the approval status for the given project',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED approve projects')
      }

      const pid = args.pid
      delete args.pid
      await Project.findByIdAndUpdate(pid, { $set: args }, { new: true })
    },
  },
  'project.delete': {
    type: 'Project',
    args: {
      pid: 'ID!',
    },
    description: 'Delete a project.',
    resolve: async (obj, args, req) => {
      projectWriteAccess(req.user, args)

      await Project.findByIdAndDelete(args.pid)
    },
  },
  'project.deleteOfEntity': {
    type: 'String',
    args: {
      enid: 'ID!',
    },
    description: 'Delete all projects of an entity.',
    resolve: async (obj, args, req) => {
      entityWriteAccess(req.user, args)

      await Project.deleteMany({ enid: args.enid })
    },
  },
  'project.deleteOfEvent': {
    type: 'String',
    args: {
      evid: 'ID!',
    },
    description: 'Delete all projects of an event.',
    resolve: async (obj, args, req) => {
      entityWriteAccess(req.user, args)

      await Project.updateMany({ $pull: { evids: args.evid } })
    },
  },
  'project.import': {
    // TODO: also import degree tags from DataNose
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
        throw new Error('UNAUTHORIZED import projects')
      }

      return Promise.all(
        args.projects.map(
          async ({
            ID: external_id,
            entityID: external_enid,
            name,
            description,
            datanoseLink,
            enabled,
            evids: external_evids,
          }) => {
            const evids = external_evids ? await Promise.all(external_evids.map(getEvid)) : []
            for (let i = 0; i < evids.length; i++) {
              if (!evids[i]) {
                return { error: `Event with ID "${external_evids[i]}" could not be found!.` }
              }
            }

            const project = await Project.findOne({ external_id: external_id })
            if (project) {
              if (enabled) {
                // Update project
                if (name) project.name = name
                if (description) project.description = description
                if (datanoseLink) project.datanoseLink = datanoseLink
                if (evids) project.evids = evids

                await project.save()
                return {
                  object: project,
                }
              }

              // Delete project
              await Project.deleteOne({ external_id: external_id })
              return {}
            }

            if (!enabled) {
              // Project already deleted
              return {}
            }

            const enid = await getEnid(external_enid)
            if (!enid) {
              return { error: `Entity with ID ${external_enid} could not be found!` }
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
          }
        )
      )
    },
  },
})

const schema = schemaComposer.buildSchema()

const executeGraphql = ({ query, variables = {}, context = {} }) =>
  graphql({ schema, source: query, variableValues: variables, contextValue: context })
export default executeGraphql
