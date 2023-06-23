import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync } from 'fs'

import { rgraphql } from '../../libraries/amqpmessaging/index.js'
import { Vote } from './database.js'
import { canGetStudentVotes, canGetEntityVotes } from './permissions.js'

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

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
  votesOfStudent: {
    type: '[Pid!]',
    args: {
      uid: 'ID!',
      evid: 'ID!',
    },
    description: 'Get the votes of a student from an event.',
    resolve: (obj, args, req) => {
      canGetStudentVotes(req, args)
      return Vote.findOne({ evid: args.evid, uid: args.uid }).then(result =>
        result ? result.votes.map(v => v.pid) : null
      )
    },
  },
  votesOfEntity: {
    type: '[StudentVote!]',
    args: {
      enid: 'ID!',
      evid: 'ID!',
    },
    description: 'Get the students that voted for an entity on an event.',
    resolve: async (obj, args, req) => {
      canGetEntityVotes(req, args)

      const votes = await Vote.find({ evid: args.evid, 'votes.enid': args.enid })
      if (!votes) {
        return null
      }

      const res = []
      for (const studentVote of votes) {
        for (const vote of studentVote.votes) {
          if (args.enid == vote.enid) {
            res.push({ uid: studentVote.uid, pid: vote.pid })
          }
        }
      }

      return res
    },
  },
  votesOfProject: {
    type: '[ID!]',
    args: {
      pid: 'ID!',
      evid: 'ID!',
    },
    description: 'Get the students who voted for a project on an event.',
    resolve: async (obj, args, req) => {
      if (req.user.type === 's') {
        throw new Error('UNAUTHORIZED get votes of projects')
      }

      const query = { evid: args.evid }
      if (req.user.type === 'a') {
        query['votes.pid'] = args.pid
      } else if (req.user.type === 'r') {
        query['votes'] = { $elemMatch: { pid: args.pid, enid: req.user.enid } }
      }

      return Vote.find(query).then(result => result.map(v => v.uid))
    },
  },
  votesOfEvent: {
    type: '[EventVote!]!',
    args: {
      evid: 'ID!',
    },
    description: 'Get all the votes of an event.',
    resolve: (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw Error('UNAUTHORIZED to get all votes of the event')
      }

      return Vote.find({ evid: args.evid })
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

      return !!(await Vote.findOne({ uid: args.uid, 'votes.enid': args.enid }))
    },
  },
})

schemaComposer.Mutation.addNestedFields({
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

      await Vote.deleteMany({ enid: args.enid })
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

      await Vote.deleteMany({ evid: args.evid })
    },
  },
  'vote.import': {
    type: '[VoteImportResult!]!',
    args: {
      votes: '[VoteImport!]!',
      evid: 'ID!',
    },
    description: `Import votes.
Parameters:
- votes - Structured data of type VoteImport
- evid - The event ID from the ThesisFair Platform

The VoteImport type has the following fields:
- studentnumber - The student its studentnumber
- projectID - The unique numeric identifier of the project which has previously been supplied as ID parameter while importing the project
- enabled - When false the vote will be deleted, otherwise it will be upserted

Example payload:
\`\`\`
[
  {
    studentnumber: 22245678,
    projectID: 0,
    enabled: true,
  },
  {
    studentnumber: 22245678,
    projectID: 2,
    enabled: true,
  },
]
\`\`\`
    `,
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || req.user.type === 'service')) {
        throw new Error('UNAUTHORIZED import votes')
      }

      const evid = await getEvid(args.evid)
      if (!evid) {
        throw new Error('Event does not exist!')
      }

      return Promise.all(
        args.votes.map(async ({ studentnumber, projectID: external_pid, enabled }) => {
          let uid, project
          try {
            ;[uid, project] = await Promise.all([getUid(studentnumber), getProjectData(external_pid)])
          } catch (error) {
            console.log(error)
            return { error }
          }

          if (!uid) {
            return { error: 'Student not found with given studentnumber.' }
          }

          if (!project) {
            return { error: 'Project not found with given project_id.' }
          }

          const votes = await Vote.findOneAndUpdate({ uid: uid, evid: evid }, {}, { new: true, upsert: true }) // Automic find or create

          const contains = !!votes.votes.find(({ pid: votePid }) => votePid == project.pid)
          const voteItem = { pid: project.pid, enid: project.enid }
          if (enabled && !contains) {
            await Vote.updateOne({ _id: votes._id }, { $push: { votes: [voteItem] } })
            await shareInfo(uid, project.enid)
          } else if (!enabled && contains) {
            await Vote.updateOne({ _id: votes._id }, { $pull: { votes: voteItem } })
          }

          return {}
        })
      )
    },
  },
})

const schema = schemaComposer.buildSchema()

const executeGraphql = ({ query, variables = {}, context = {} }) =>
  graphql({ schema, source: query, variableValues: variables, contextValue: context })
export default executeGraphql
