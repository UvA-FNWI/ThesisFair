import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync } from 'fs'
import { AsyncParser } from '@json2csv/node'
import mongoose from 'mongoose'

const ObjectId = mongoose.Types.ObjectId

import { rgraphql } from '../../libraries/amqpmessaging/index.js'
import { Vote, Settings } from './database.js'
import { canGetStudentVotes } from './permissions.js'

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

async function votingClosed() {
  return await Settings.findOne({}).then(result => Boolean(result?.votingClosed))
}

schemaComposer.Query.addNestedFields({
  votesCSV: {
    type: 'String',
    description: 'Pull a CSV dump of the vote database',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error("UNAUTHORIZED pull vote CSV")
      }

      const votes = await Vote.find()
      const votedPids = [...new Set(votes.map(vote => vote.pids).flat())]
      const entitiesRes = await rgraphql('api-entity', 'query { entitiesAll { enid, name } }')
      const projectsRes = await rgraphql('api-project', 'query getProjectsWithVotes($pids: [ID!]!) { projects(pids: $pids) { pid, name, enid, degrees, evids } }', { pids: votedPids })
      const usersRes = await rgraphql('api-user', 'query { usersAll { ... on UserBase { uid, firstname, lastname, email }, ... on Student { studentnumber, studies } } }')
      const eventsRes = await rgraphql('api-event', 'query { events { evid, name } }', { pids: votedPids })

      const entities = entitiesRes.data.entitiesAll
      const projects = projectsRes.data.projects
      const users = usersRes.data.usersAll
      const events = eventsRes.data.events
      
      const projectNameByPid = Object.fromEntries(projects.map(project => [project.pid, project.name]))
      const enidByPid = Object.fromEntries(projects.map(project => [project.pid, project.enid]))
      const evidsByPid = Object.fromEntries(projects.map(project => [project.pid, project.evids]))
      const degreesByPid = Object.fromEntries(projects.map(project => [project.pid, project.degrees]))
      const entityNameByEnid = Object.fromEntries(entities.map(entity => [entity.enid, entity.name]))
      const userByUid = Object.fromEntries(users.map(user => [user.uid, user]))
      const eventNameByEvid = Object.fromEntries(events.map(event => [event.evid, event.name]))

      const table = []

      for (const vote of votes) {
        if (!Object.keys(userByUid).includes(vote.uid.toString())) {
          continue
        }

        const user = userByUid[vote.uid]
        const rows = vote.pids.map(pid => ({
          "Project": projectNameByPid[pid],
          "Entity": entityNameByEnid[enidByPid[pid]],
          "Student": `${user.firstname} ${user.lastname} (${user.studentnumber}) <${user.email}>`,
          "Degrees": user.studies,
          "Project degrees": degreesByPid[pid],
          "Project events": evidsByPid[pid].map(evid => eventNameByEvid[evid]),
        }))

        table.push(...rows)
      }
      
      const parser = new AsyncParser()
      if (table.length == 0) {
        return "No votes yet"
      }

      return await parser.parse(table).promise()
    }
  },
  votingClosed: {
    type: 'Boolean!',
    args: {},
    description: 'Return whether voting is closed or not (true if it is, false otherwise)',
    resolve: votingClosed,
  },
  votesOfStudent: {
    type: '[ID!]',
    args: {
      uid: 'ID!',
      // evid: 'ID!',
    },
    description: 'Get the votes of a student from an event.',
    resolve: async (obj, args, req) => {
      canGetStudentVotes(req, args)
      return await Vote.findOne({ uid: args.uid }).then(result => result?.pids || null)
    },
  },
  votesOfProjects: {
    type: '[Vote]',
    args: {
      pids: '[ID!]',
    },
    description: 'Get the students who voted for a project on an event.',
    resolve: async (obj, args, req) => {
      if (req.user.type === 's') {
        throw new Error('UNAUTHORIZED get votes of projects')
      }

      // TODO: check that the requesting session's entity owns all requested
      // projects

      const votes = await Vote.find({ pids: { $elemMatch: { $in: args.pids } } })

      console.log(votes)
      return votes.map(vote => ({
        uid: vote.uid,
        pids: vote.pids.filter(pid => args.pids.includes(pid.toString()))
      }))
    },
  },
})

schemaComposer.Mutation.addNestedFields({
  'vote.closed': {
    type: 'Boolean!',
    args: {
      closed: 'Boolean!',
    },
    description: 'Set the votingClosed setting to the given value',
    resolve: async (_obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED change voting closed status')
      }

      await Settings.findOneAndUpdate({}, { votingClosed: args.closed })
      return true
    },
  },
  'vote.deleteOfEntity': {
    type: 'String',
    args: {
      enid: 'ID!',
    },
    description: 'Delete all votes for an entity.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete vote')
      }

      // TODO: Add back functionality with new schema

      // await Vote.deleteMany({ enid: args.enid })
    },
  },
  'vote.deleteOfEvent': {
    type: 'String',
    args: {
      evid: 'ID!',
    },
    description: 'Delete all votes of an event.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete vote')
      }

      // TODO: Add back functionality with new schema

      // await Vote.deleteMany({ evid: args.evid })
    },
  },
  'vote.add': {
    type: 'Boolean',
    args: {
      uid: 'ID!',
      pid: 'ID!',
    },
    description: "Add a project to a student's votes.",
    resolve: async (obj, args, req) => {
      canGetStudentVotes(req, args)
      if (await votingClosed()) {
        throw new Error('UNAUTHORIZED change votes after voting closed')
      }

      const currentVotes = await Vote.findOne({ uid: args.uid })

      const pidObject = new ObjectId(args.pid)

      if (!currentVotes) {
        await Vote.create({ uid: args.uid, pids: [pidObject] })
        return true
      }

      const newVotes = [...currentVotes.pids, pidObject]

      await Vote.findOneAndUpdate({ uid: args.uid }, { pids: newVotes })

      return true
    },
  },
  'vote.remove': {
    type: 'Boolean',
    args: {
      uid: 'ID!',
      pid: 'ID!',
    },
    description: "Remove a project from a student's votes.",
    resolve: async (obj, args, req) => {
      canGetStudentVotes(req, args)
      if (await votingClosed()) {
        throw new Error('UNAUTHORIZED change votes after voting closed')
      }

      const currentVotes = await Vote.findOne({ uid: args.uid })

      if (!currentVotes) {
        await Vote.create({ uid: args.uid, pids: [] })
        return true
      }

      const pidObject = new ObjectId(args.pid)

      const newVotes = currentVotes.pids.filter(p => !p.equals(pidObject))

      await Vote.findOneAndUpdate({ uid: args.uid }, { pids: newVotes })

      return true
    },
  },
})

const schema = schemaComposer.buildSchema()

const executeGraphql = ({ query, variables = {}, context = {} }) =>
  graphql({ schema, source: query, variableValues: variables, contextValue: context })
export default executeGraphql
