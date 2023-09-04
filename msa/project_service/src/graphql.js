import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync } from 'fs'
import { AsyncParser } from '@json2csv/node';

import { rgraphql } from '../../libraries/amqpmessaging/index.js'
import { Project } from './database.js'

import { entityWriteAccess, projectWriteAccess } from './permissions.js'

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

const orderedFields = [
  // ['pid', 'Unique ID'],
  // ['enid', 'Entity'],
  ['entityName', 'Organisation name'],
  // ['evids', 'Event IDs'],
  ['eventNames', 'Event names'],
  ['name', 'Name'],
  ['degrees', 'Degrees'],
  ['tags', 'Tags'],
  ['description', 'Description'],
  ['environment', 'Working environment'],
  ['expectations', 'Expectations'],
  ['email', 'Contact E-mail'],
  ['numberOfStudents', 'Number of students'],
  ['adminApproval', 'Admin approval status'],
  ['attendance', 'Will this project attend a fair?'],
]

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
    throw new Error('An unknown error occured while checking if the enid is valid')
  }

  if (!res.data.entity) {
    return false
  }

  return true
}

schemaComposer.Query.addNestedFields({
  csv: {
    type: 'String',
    description: 'Pull a CSV dump of the project database',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED read all project information')
      }

      const entities = await rgraphql(
        'api-entity',
        'query { entitiesAll { enid, name } }',
      )

      const events = await rgraphql(
        'api-event',
        'query { events { evid, name } }',
      )

      console.log("SNOSDF")
      console.log(events.data.events)

      const projects = await Project.find()
      const table = []

      for (const project of projects) {
        if (entities?.data?.entitiesAll) {
          project.entityName = entities.data.entitiesAll.find(e => e.enid == project.enid)?.name
        }

        if (events?.data?.events && project.evids) {
          project.eventNames = project.evids.map(
            evid => events.data.events.find(e => e.evid == evid)?.name
          )
        }

        console.log(events.data.events)
        console.log(project.evids)
        console.log(project.eventNames)

        const row = Object.fromEntries(orderedFields.map(
          ([orig, fancy]) => [fancy, project[orig]]
        ))

        table.push(row)
      }

      const parser = new AsyncParser()
      return await parser.parse(table).promise()
    },
  },
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
      external_id: 'String',
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
  'project.comment': {
    type: 'Project',
    args: {
      pid: 'ID!',
      comment: 'String!',
    },
    description: 'Leave a new comment under a project',
    resolve: async (obj, args, req) => {
      const entities = await rgraphql(
        'api-entity',
        'query($enids: [ID!]!) { entities(enids: $enids) { grantsAcademicRights } }',
        {
          enids: req.user.enids,
        }
      )

      const canApprove = req.user.type === 'a' || entities.data.entities.some(entity => entity.grantsAcademicRights)

      if (!canApprove) {
        throw new Error('UNAUTHORIZED leave comments on projects')
      }

      return await Project.findByIdAndUpdate(
        args.pid,
        {
          $push: { comments: args.comment },
        },
        { new: true }
      )
    },
  },
  'project.approval': {
    type: 'Project',
    args: {
      pid: 'ID!',
      approval: 'ApprovalStatus!',
      degree: 'Degree', // If unspecified, this is taken to be an Admin's comment
    },
    description: 'Set the approval status for the given project',
    resolve: async (obj, args, req) => {
      const updateApproval = async () => {
        const pid = args.pid
        delete args.pid
        
        if (!args.degree) {
          args.adminApproval = args.approval
        } else {
          args.academicApproval = {degree: args.degree, approval: args.approval}
        }

        delete args.degree
        delete args.approval

        if (args.adminApproval) {
          await Project.findByIdAndUpdate(pid, { $set: args }, { new: true })
        } else {
          await Project.findByIdAndUpdate(pid,
            [
              {
                $addFields: {
                  "academicApproval": {
                    $filter: {
                      input: {
                        $ifNull: [
                          "$academicApproval",
                          []
                        ]
                      },
                      as: "item",
                      cond: {
                        $ne: [ "$$item.degree", args.degree ]
                      }
                    }
                  }
                }
              },
              {
                $addFields: {
                  "academicApproval": {
                    $concatArrays: [
                      "$academicApproval",
                      [ args.academicApproval ]
                    ]
                  }
                }
              }
            ]
          )
        }
      }

      if (req.user.type === 'a') return await updateApproval()

      // Always allowed, even for non-academic users
      if (args.approval === 'awaiting') return await updateApproval()

      const project = await Project.findById(args.pid)

      // Anybody can go from academicCommented to preliminary
      if (args.approval === 'preliminary' && project.approval === 'academicCommented') {
        return await updateApproval()
      }

      const entities = await rgraphql(
        'api-entity',
        'query($enids: [ID!]!) { entities(enids: $enids) { grantsAcademicRights } }',
        {
          enids: req.user.enids,
        }
      )

      const canApprove = entities.data.entities.some(entity => entity.grantsAcademicRights)

      // Academic users are also allowed to change the approval status
      if (canApprove) return await updateApproval()

      throw new Error('UNAUTHORIZED leave comments on projects')
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
