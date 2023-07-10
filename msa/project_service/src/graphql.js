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

schemaComposer.Query.addNestedFields({
  tags: {
    type: '[String]',
    args: {},
    description: 'Get a list of every tag assigned to any project',
    resolve: async (obj, args) => {
      const docs = await Project.find({}, { tags: 1 }).exec()
      const tags = [...new Set(docs.map(({ tags }) => tags).flat())]

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
    resolve: async (obj, args) => {
      if (args.evid) {
        return await Project.find({ enid: args.enid, evid: args.evid })
      }

      return await Project.find({ enid: args.enid })
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
      email: 'String',
      numberOfStudents: 'Int',
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

      const res = await Promise.all([...args.evids.map(evid => evidExists(evid)), enidExists(args.enid)])

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
      email: 'String',
      numberOfStudents: 'Int',
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

      const res = await Promise.all([...args.evids.map(evid => evidExists(evid)), enidExists(args.enid)])

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
})

const schema = schemaComposer.buildSchema()

const executeGraphql = ({ query, variables = {}, context = {} }) =>
  graphql({ schema, source: query, variableValues: variables, contextValue: context })
export default executeGraphql
