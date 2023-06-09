import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync } from 'fs'
import { writeFile, unlink } from 'fs/promises'
import { exec as cpExec } from 'child_process'
import { parse as csvParser } from 'csv-parse'

import { rgraphql } from '../../libraries/amqpmessaging/index.js'
import { Schedule } from './database.js'

const getEvent = async evid => {
  const res = await rgraphql('api-event', 'query getEvent($evid: ID!) { event(evid: $evid) { entities } }', { evid })

  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unkown error occured while getting the event')
  }

  if (!res.data.event) {
    return false
  }

  return res.data.event
}

const getEntities = async enids => {
  const res = await rgraphql(
    'api-entity',
    'query getEntities($enids: [ID!]!) { entities(enids: $enids) { enid representatives name } }',
    { enids }
  )

  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unkown error occured while getting the entities')
  }

  if (!res.data.entities) {
    return false
  }

  return res.data.entities
}

const getUid = async studentnumber => {
  if (!studentnumber) {
    return null
  }

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

const getVotes = async evid => {
  if (!evid) {
    return null
  }

  const res = await rgraphql(
    'api-vote',
    'query getVotes($evid: ID!) { votesOfEvent(evid: $evid) { uid votes { enid pid } } }',
    { evid }
  )

  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unkown error occured while getting the votes')
  }

  if (!res.data.votesOfEvent) {
    return false
  }

  return res.data.votesOfEvent
}

const studentShareInfo = async (uid, enid, share = true) => {
  if (!uid || !enid) {
    return null
  }

  const res = await rgraphql(
    'api-user',
    'mutation studentShareInfo($uid: ID!, $enid: ID!, $share: Boolean!) { user { student { shareInfo(uid: $uid, enid: $enid, share: $share) { uid }}}}',
    { uid, enid, share }
  )

  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unkown error occured while sharing the student data with the entities')
  }

  return res.data.user.student.shareInfo
}

const exec = cmd => {
  return new Promise((resolve, reject) => {
    cpExec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err, [stdout, stderr])
        return
      }

      resolve([stdout, stderr])
    })
  })
}

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

schemaComposer.Query.addNestedFields({
  scheduleStudent: {
    type: '[Schedule!]',
    args: {
      uid: 'ID!',
      evid: 'ID!',
    },
    description: 'Get the schedule of a student on an event.',
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || (req.user.type === 's' && req.user.uid === args.uid))) {
        throw new Error('UNAUTHORIZED to get this users schedule')
      }

      const schedule = await Schedule.find({ evid: args.evid, uid: args.uid })
      if (schedule.length === 0) {
        if (!(await Schedule.findOne({ evid: args.evid }))) {
          return null // No schedule has been generated yet.
        }
      }

      return schedule
    },
  },
  scheduleRepresentative: {
    type: '[Schedule!]',
    args: {
      enid: 'ID!',
      evid: 'ID!',
    },
    description: 'Get the schedule of an entity on an event.',
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || (req.user.type === 'r' && req.user.enid === args.enid))) {
        throw new Error('UNAUTHORIZED to get this users schedule')
      }

      const schedule = await Schedule.find({ evid: args.evid, enid: args.enid })
      if (schedule.length === 0) {
        if (!(await Schedule.findOne({ evid: args.evid }))) {
          return null // No schedule has been generated yet.
        }
      }

      return schedule
    },
  },
  scheduleAdmin: {
    type: '[Schedule!]',
    args: {
      evid: 'ID!',
    },
    description: 'Get everyones schedule of an event.',
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a')) {
        throw new Error('UNAUTHORIZED to get the full schedule')
      }

      return Schedule.find({ evid: args.evid })
    },
  },
  scheduleStudentForEntity: {
    type: 'Boolean!',
    args: {
      uid: 'ID!',
      enid: 'ID!',
    },
    description: 'Check if a student is scheduled with an entity.',
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a')) {
        throw Error('UNAUTHORIZED internal only route')
      }

      return !!(await Schedule.findOne({ uid: args.uid, enid: args.enid }))
    },
  },
})

schemaComposer.Mutation.addNestedFields({
  'schedule.update': {
    type: 'Schedule',
    args: {
      sid: 'ID!',
      uid: 'ID',
      enid: 'ID',
      slot: 'String',
    },
    description: 'Update a specific appointment.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update schedule')
      }
      const sid = args.sid
      delete args.sid

      return Schedule.findByIdAndUpdate(sid, { $set: args }, { new: true })
    },
  },
  'schedule.generate': {
    type: 'String',
    args: {
      evid: 'ID!',
    },
    description: 'Generate a schedule using a in house created algorithm.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED to generate schedule')
      }

      if (await Schedule.findOne({ evid: args.evid })) {
        return 'Schedule already created!'
      }

      const studentVotes = await getVotes(args.evid)
      if (!studentVotes || studentVotes.length === 0) {
        return 'No votes found. Import votes first.'
      }

      const csvRows = ['Student_ID,Org,Project_Voted_For,person,programme']
      for (const student of studentVotes) {
        for (const vote of student.votes) {
          csvRows.push(`${student.uid},${vote.enid},${vote.pid},,`)
        }
      }

      const event = await getEvent(args.evid)
      if (!event) {
        return `Could not retrieve event with ID ${args.evid}`
      }

      const entities = await getEntities(event.entities)
      if (!entities) {
        return `Could not get all entities from event`
      }

      const csvRepsRows = ['name,n_reps']
      for (const { enid, representatives } of entities) {
        csvRepsRows.push(`${enid},${representatives}`)
      }

      const fileName = `./tmp/schedule.${Date.now()}`
      await writeFile(fileName + '.csv', csvRows.join('\n') + '\n')
      await writeFile(fileName + '.reps.csv', csvRepsRows.join('\n') + '\n')
      const [stdout, stderr] = await exec(`thesisfair --repdata "${fileName}.reps.csv" "${fileName}.csv"`)
      await unlink(fileName + '.csv')
      await unlink(fileName + '.reps.csv')

      return new Promise((resolve, reject) => {
        csvParser(stdout.trim(), { columns: true }, async (err, records, info) => {
          if (err) {
            reject(err)
            return
          }

          if (records.length === 0) {
            resolve('No schedule was generated')
            return
          }

          for (let { Slot: slot, ' StudentID': uid, ' Project_Voted_For': enid } of records) {
            uid = uid.trim()
            enid = enid.trim()
            slot = slot.trim()

            await Schedule.create({
              uid: uid,
              evid: args.evid,
              enid: enid,
              slot: slot,
            })

            await studentShareInfo(uid, enid)
          }

          resolve(null)
        })
      })
    },
  },

  'schedule.import': {
    type: 'String',
    args: {
      evid: 'ID!',
      file: 'String!',
    },
    description: `Import the schedule for a given event. The file parameter should be a CSV file with the headers "Slot,StudentID,Org" and content being: Name of the slot, student id (external identifier) and the organisation name.`,
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED to import schedule')
      }

      if (await Schedule.findOne({ evid: args.evid })) {
        return 'Schedule already created!'
      }

      return new Promise((resolve, reject) => {
        csvParser(
          args.file.trim(),
          { columns: true, skip_empty_lines: true, delimiter: ',' },
          async (err, records, info) => {
            if (err) {
              reject(err)
              return
            }

            if (records.length === 0) {
              resolve('Given file does not have records')
              return
            }

            const event = await getEvent(args.evid)
            if (!event) {
              resolve('Could not find event')
              return
            }

            const entities = await getEntities(event.entities)
            if (!entities) {
              resolve('Could not get entities of event')
              return
            }

            const schedule = []
            for (const record of records) {
              let { Slot: slot, StudentID: studentnumber, Org: entityName } = record
              const uid = await getUid(studentnumber)
              if (!uid) {
                resolve(
                  `Count not find or create student with studentnumber ${studentnumber}. Record: ${JSON.stringify(
                    record
                  )}`
                )
                return
              }
              entityName = entityName.trim()
              const entity = entities.find(entity => entity.name.trim() === entityName)
              if (!entity) {
                resolve(`Count not find entity with name '${entityName}'`)
                return
              }

              schedule.push({
                uid: uid,
                evid: args.evid,
                enid: entity.enid,
                slot: slot,
              })
            }

            for (const appointment of schedule) {
              await studentShareInfo(appointment.uid, appointment.enid)
            }

            await Schedule.insertMany(schedule)
            resolve(null)
          }
        )
      })
    },
  },

  'schedule.deleteOfEntity': {
    type: 'String',
    args: {
      enid: 'ID!',
    },
    description: 'Delete all appointments with an entity.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED to delete schedule')
      }

      await Schedule.deleteMany({ enid: args.enid })
    },
  },

  'schedule.deleteOfEvent': {
    type: 'String',
    args: {
      evid: 'ID!',
    },
    description: 'Delete all appointments of an event.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED to delete schedule')
      }

      await Schedule.deleteMany({ evid: args.evid })
    },
  },
})

const schema = schemaComposer.buildSchema()

const executeGraphql = ({ query, variables = {}, context = {} }) =>
  graphql({ schema, source: query, variableValues: variables, contextValue: context })
export default executeGraphql
