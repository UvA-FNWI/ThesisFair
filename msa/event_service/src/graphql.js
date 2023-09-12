import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync, mkdirSync, existsSync, constants } from 'fs'
import { writeFile, readFile, access } from 'fs/promises'
import mongoose from 'mongoose'

import { rgraphql } from '../../libraries/amqpmessaging/index.js'
import { Event } from './database.js'
import { canGetEvent, canGetEvents, entityReadAccess } from './permissions.js'

const imageTypes = ['student', 'rep']

const checkEntitiesExist = async entities => {
  const res = await rgraphql('api-entity', 'query($enids: [ID!]!){entities(enids:$enids){enid}}', { enids: entities })
  if (res.errors) {
    console.error('Checking entities failed', res.errors)
    throw new Error('Unexpected error occured while checking if entities exist')
  }

  const enids = res.data.entities.map(entity => (entity ? entity.enid : null))
  for (const enid of entities) {
    if (!enids.includes(enid)) {
      throw new Error(`Entity ${enid} does not exist!`)
    }
  }
}

const deleteEvent = async evid => {
  const calls = await Promise.all([
    rgraphql('api-project', 'mutation deleteLinkedProjects($evid: ID!) { project { deleteOfEvent(evid: $evid) } }', {
      evid: evid,
    }),
    rgraphql('api-schedule', 'mutation deleteLinkedSchedules($evid: ID!) { schedule { deleteOfEvent(evid: $evid) } }', {
      evid: evid,
    }),
    rgraphql('api-vote', 'mutation deleteLinkedVotes($evid: ID!) { vote { deleteOfEvent(evid: $evid) } }', {
      evid: evid,
    }),
  ])
  for (const call of calls) {
    if (call.errors) {
      console.error('Deleting linked objects failed', call.errors)
      throw new Error('Deleting all linked objects failed')
    }
  }

  return await Event.findByIdAndDelete(evid)
}

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

schemaComposer.Query.addNestedFields({
  event: {
    type: 'Event',
    args: {
      evid: 'ID!',
    },
    description: 'Get an event by evid.',
    resolve: async (obj, args, req) => {
      const event = await Event.findById(args.evid)
      if (!event) {
        return null
      }
      canGetEvent(req, args, event)

      return event
    },
  },
  eventsOfEntity: {
    type: '[Event]',
    args: {
      enid: 'ID!',
    },
    description: 'Get all events an entity participates in',
    resolve: async (obj, args, req) => {
      entityReadAccess(req, args.enid)

      const res = await rgraphql('api-project', 'query($enid: ID!) { projectsOfEntity(enid: $enid) { evids } }', {
        enid: args.enid,
      })

      if (res.errors || !res.data) {
        console.error(res)
        throw new Error("An unkown error occurred while attempting to find the organisation's projects")
      }

      const evids = [...new Set(res.data.projectsOfEntity.map(project => project.evids).flat())]

      return await Event.find({ evid: { $in: evids } })
    },
  },
  eventByExtID: {
    type: 'Event',
    args: {
      external_id: 'ID!',
    },
    description: 'Get an event using the external identifier.',
    resolve: async (obj, args, req) => {
      const event = await Event.findOne({ external_id: args.external_id })
      if (!event) {
        return null
      }
      canGetEvent(req, args, event)
      return event
    },
  },
  eventImage: {
    type: 'String',
    args: {
      evid: 'ID!',
      type: 'String!',
    },
    description: 'Get the event image for the student or rep.',
    resolve: async (obj, args, req) => {
      if (!imageTypes.includes(args.type)) {
        throw new Error('Invalid image type. Options are: ' + imageTypes.join(','))
      }

      const file = `./data/${args.evid}-${args.type}`
      try {
        await access(file, constants.R_OK)
      } catch (error) {
        return null
      }

      return readFile(file).then(content => content.toString())
    },
  },
  active: {
    type: '[Event!]',
    args: {},
    description: 'Get all enabled events',
    resolve: async (obj, args, req) => {
      const filter = {
        enabled: true,
      }

      // if (req.user.type === 'r') {
      //   filter.entities = {
      //     $in: req.user.enid,
      //   }
      // }

      return await Event.find(filter)
    },
  },
  events: {
    type: '[Event!]',
    args: {},
    description: 'Get all events.',
    resolve: async (obj, args, req) => {
      canGetEvents(req, args)

      return await Event.find()
    },
  },
})

schemaComposer.Mutation.addNestedFields({
  'event.create': {
    type: 'Event',
    args: {
      enabled: 'Boolean',
      name: 'String!',
      description: 'String',
      start: 'Date',
      end: 'Date',
      degrees: '[Degree]',
      location: 'String',
      studentSubmitDeadline: 'Date',
      entities: '[ID!]',
      external_id: 'String',
      isMarketplace: 'Boolean',
      deadlinePassed: 'Boolean',
    },
    description: 'Create new event.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED create a new event')
      }

      if (args.entities) {
        await checkEntitiesExist(args.entities)
      }

      return await Event.create(args)
    },
  },
  'event.update': {
    type: 'Event',
    args: {
      evid: 'ID!',
      enabled: 'Boolean',
      name: 'String',
      description: 'String',
      start: 'Date',
      end: 'Date',
      degrees: '[Degree]',
      location: 'String',
      studentSubmitDeadline: 'Date',
      entities: '[ID!]',
      external_id: 'String',
      isMarketplace: 'Boolean',
      deadlinePassed: 'Boolean',
    },
    description: 'Update an event.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update an event')
      }

      if (args.entities) {
        await checkEntitiesExist(args.entities)
      }

      const evid = args.evid
      delete args.evid
      return await Event.findByIdAndUpdate(evid, { $set: args }, { new: true })
    },
  },
  'event.updateImage': {
    type: 'Boolean',
    args: {
      evid: 'ID!',
      type: 'String!',
      image: 'String!',
    },
    description: 'Update the event image.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update an event')
      }

      if (!imageTypes.includes(args.type)) {
        throw new Error('Invalid image type. Options are: ' + imageTypes.join(','))
      }

      const event = Event.findById(args.evid)
      if (!event) {
        throw new Error('event does not exist')
      }

      await writeFile(`./data/${args.evid}-${args.type}`, args.image)
    },
  },
  'event.delete': {
    type: 'Event',
    args: {
      evid: 'ID!',
    },
    description: 'Delete an event.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED create delete an event')
      }

      return await deleteEvent(args.evid)
    },
  },
  'event.removeEntity': {
    type: 'String',
    args: {
      enid: 'ID!',
    },
    description: 'Remove the given entity id from all events.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED remove an entity from events')
      }

      await Event.updateMany({ $pull: { entities: args.enid } })
    },
  },

  'event.entity.add': {
    type: 'Event',
    args: {
      evid: 'ID!',
      enid: 'ID!',
    },
    description: 'Add an entity to an event.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED add an entity to an event')
      }

      const res = await rgraphql('api-entity', 'query($enid:ID!) { entity(enid:$enid) { enid } } ', { enid: args.enid })
      if (res.errors) {
        console.error('Checking entity failed:', res.errors)
        throw new Error('Unexpected error while checking if entity exists')
      }
      if (!res.data.entity) {
        throw new Error('Could not find an entity with that enid')
      }

      return await Event.findByIdAndUpdate(args.evid, { $push: { entities: args.enid } }, { new: true })
    },
  },
  'event.entity.del': {
    type: 'Event',
    args: {
      evid: 'ID!',
      enid: 'ID!',
    },
    description: 'Remove an entity from an event.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete an entity from an event')
      }

      return await Event.findByIdAndUpdate(args.evid, { $pull: { entities: args.enid } }, { new: true })
    },
  },
})

if (!existsSync('./data')) {
  mkdirSync('./data')
}

const schema = schemaComposer.buildSchema()

const executeGraphql = ({ query, variables = {}, context = {} }) =>
  graphql({ schema, source: query, variableValues: variables, contextValue: context })
export default executeGraphql
