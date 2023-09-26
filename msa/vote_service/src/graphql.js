import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync } from 'fs'
import { AsyncParser } from '@json2csv/node'
import mongoose from 'mongoose'

const ObjectId = mongoose.Types.ObjectId

import { rgraphql } from '../../libraries/amqpmessaging/index.js'
import { Vote, Settings } from './database.js'
import { canGetStudentVotes, canGetEntityVotes } from './permissions.js'

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

async function votingClosed() {
  return await Settings.findOne({}).then(result => Boolean(result?.votingClosed))
}

const getUid = async studentnumber => {
  const res = await rgraphql(
    'api-user',
    'query getUid($studentnumber: ID!) { student(studentnumber: $studentnumber) { ... on Student { uid } } }',
    { studentnumber },
    { user: { type: 'system' } }
  )
  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unkown error occured while getting the user uid')
  }

  if (!res.data.student) {
    return false
  }

  return res.data.student.uid
}

const shareInfo = async (uid, enid, share = true) => {
  const res = await rgraphql(
    'api-user',
    'mutation shareInfo($uid: ID!, $enid: ID!, $share: Boolean!) { user { student { shareInfo(uid: $uid, enid: $enid, share: $share) { uid } } } }',
    { uid, enid, share }
  )
  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unkown error occured while checking if the enid is valid')
  }
}

const getProjectData = async external_pid => {
  const res = await rgraphql(
    'api-project',
    'query getPid($external_id: ID!) { projectByExtID(external_id: $external_id) { pid enid } }',
    { external_id: external_pid }
  )
  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unkown error occured while looking up the project')
  }

  if (!res.data.projectByExtID) {
    return false
  }

  return res.data.projectByExtID
}

const getEvid = async external_id => {
  const res = await rgraphql(
    'api-event',
    'query getEvid($external_id: ID!) { eventByExtID(external_id: $external_id) { evid } }',
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
      const projectsRes = await rgraphql('api-project', 'query getProjectsWithVotes($pids: [ID!]!) { projects(pids: $pids) { pid, name, enid } }', { pids: votedPids })
      const usersRes = await rgraphql('api-user', 'query { usersAll { ... on UserBase { uid, firstname, lastname, email }, ... on Student { studentnumber } } }')
      
      const entities = entitiesRes.data.entitiesAll
      const projects = projectsRes.data.projects
      const users = usersRes.data.usersAll
      
      const projectNameByPid = Object.fromEntries(projects.map(project => [project.pid, project.name]))
      const enidByPid = Object.fromEntries(projects.map(project => [project.pid, project.enid]))
      const entityNameByEnid = Object.fromEntries(entities.map(entity => [entity.enid, entity.name]))
      const userByUid = Object.fromEntries(users.map(user => [user.uid, user]))

      const table = []

      for (const vote of votes) {
        const user = userByUid[vote.uid]
        const rows = vote.pids.map(pid => ({
          "Project": projectNameByPid[pid],
          "Entity": entityNameByEnid[enidByPid[pid]],
          "Student": `${user.firstname} ${user.lastname} (${user.studentnumber}) <${user.email}>`,
        }))

        table.push(...rows)
      }
      
      const parser = new AsyncParser()
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
  votesOfEntity: {
    type: '[Vote!]',
    args: {
      enid: 'ID!',
      evid: 'ID',
    },
    description: 'Get the students that voted for an entity on an event.',
    resolve: async (obj, args, req) => {
      canGetEntityVotes(req, args)

      throw new Error('Broken due to vote schema change')

      const match = args.evid
        ? { evid: new ObjectId(args.evid), 'votes.enid': new ObjectId(args.enid) }
        : { 'votes.enid': new ObjectId(args.enid) }

      const votes = await Vote.aggregate([
        { $match: match },
        {
          $project: {
            uid: '$uid',
            votes: {
              $filter: {
                input: '$votes',
                as: 'vote',
                cond: { $eq: ['$$vote.enid', new ObjectId(args.enid)] },
              },
            },
          },
        },
      ])

      if (!votes) {
        return null
      }

      return await votes.map(({ uid, votes }) => votes.map(({ pid }) => ({ uid, pid }))).flat()
    },
  },
  votesOfProject: {
    type: '[ID!]',
    args: {
      pid: 'ID!',
      evid: 'ID',
    },
    description: 'Get the students who voted for a project on an event.',
    resolve: async (obj, args, req) => {
      if (req.user.type === 's') {
        throw new Error('UNAUTHORIZED get votes of projects')
      }

      throw new Error('Broken due to vote schema change')

      const query = args.evid ? { evid: args.evid } : {}

      if (req.user.type === 'a') {
        query['votes.pid'] = args.pid
      } else if (req.user.type === 'r') {
        query['votes'] = { $elemMatch: { pid: args.pid, enid: req.user.enid } }
      }

      return await Vote.find(query).then(result => result.map(v => v.uid))
    },
  },
  votesOfEvent: {
    type: '[Vote!]!',
    args: {
      evid: 'ID!',
    },
    description: 'Get all the votes of an event.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED to get all votes of the event')
      }

      throw new Error('Broken due to vote schema change')

      return await Vote.find({ evid: args.evid })
    },
  },
  voteStudentForEntity: {
    type: 'Boolean',
    args: {
      uid: 'ID!',
      enid: 'ID!',
    },
    description: 'Check if a student has voted for an entity.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw Error('UNAUTHORIZED internal only route')
      }

      throw new Error('Broken due to vote schema change')

      return !!(await Vote.findOne({ uid: args.uid, 'votes.enid': args.enid }))
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
