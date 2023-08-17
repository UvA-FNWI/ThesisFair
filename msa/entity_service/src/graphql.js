import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync } from 'fs'

import { rgraphql } from '../../libraries/amqpmessaging/index.js'
import { Entity } from './database.js'
import { canGetAllEntities } from './permissions.js'

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

const deleteEntity = async enid => {
  const calls = await Promise.all([
    rgraphql('api-event', 'mutation deleteFromEvents($enid: ID!) { event { removeEntity(enid: $enid) } }', {
      enid: enid,
    }),
    rgraphql('api-project', 'mutation deleteLinkedProjects($enid: ID!) { project { deleteOfEntity(enid: $enid) } }', {
      enid: enid,
    }),
    rgraphql('api-user', 'mutation deleteLinkedUsers($enid: ID!) { user { deleteOfEntity(enid: $enid) } }', {
      enid: enid,
    }),
    rgraphql(
      'api-schedule',
      'mutation deleteLinkedSchedules($enid: ID!) { schedule { deleteOfEntity(enid: $enid) } }',
      { enid: enid }
    ),
    rgraphql('api-vote', 'mutation deleteLinkedVotes($enid: ID!) { vote { deleteOfEntity(enid: $enid) } }', {
      enid: enid,
    }),
  ])
  for (const call of calls) {
    if (call.errors) {
      console.error('Deleting linked objects failed', call.errors)
      throw new Error('Deleting all linked objects failed')
    }
  }

  return await Entity.findByIdAndDelete(enid)
}

async function getFairsOfEntity(enid) {
  const res = await rgraphql('api-event', 'query($enid: ID!) { eventsOfEntity(enid: $enid) { start, evid, enabled } }', { enid })

  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unknown error occurred while attempting to find the events the organisation is participating in')
  }

  // TODO: remove any events that are free to attend (marketplace events)
  return res.data.eventsOfEntity.filter(event => event.enabled)
}

schemaComposer.Query.addNestedFields({
  entity: {
    type: 'Entity',
    args: {
      enid: 'ID!',
    },
    description: 'Get the entity by enid.',
    resolve: (obj, args) => Entity.findById(args.enid),
  },
  fairs: {
    type: '[ID]',
    args: {
      enid: 'ID!',
    },
    description: 'Get a list of the evids of this entity',
    resolve: async (obj, args, req) => {
      const fairs = await getFairsOfEntity(args.enid)

      return fairs.map(event => event.evid)
    },
  },
  paymentAndEntity: {
    type: 'PaymentAndEntity',
    args: {
      enid: 'ID!',
    },
    description: 'Get payment information of an entity and the entity info as well',
    resolve: async (obj, args, req) => {
      // TODO: check read access for entity
      const entity = await Entity.findById(args.enid)
      const events = await getFairsOfEntity(args.enid)

      const res = await rgraphql('api-payment', 'query($targets: [String]) { payment(targets: $targets) { status, url, target } }', {
        targets: events.map(event => `${args.enid}@${new Date(event.start).setHours(0, 0, 0, 0)}`)
      })

      if (res.errors || !res.data) {
        console.error(res)
        throw new Error('An unknown error occured while attempting look up payment status')
      }

      console.log(res.data.payment.map(payment => ({
          status: payment.status,
          url: payment.url,
          date: new Date(Number(payment.target.split("@")[1])),
        })))

      return {
        entity,
        payments: res.data.payment.map(payment => ({
          status: payment.status,
          url: payment.url,
          eventDate: new Date(Number(payment.target.split("@")[1])),
        })),
      }
    },
  },
  paymentLink: {
    type: 'String',
    args: {
      enid: 'ID!',
      evid: 'ID!',
    },
    description: 'Get a payment link for the given entity',
    resolve: async (obj, args) => {
      const entity = await Entity.findById(args.enid)

      let amount
      switch (entity.type) {
        case "A":
          amount = 1500
          break;
        case "B":
          amount = 700
          break;
        case "C":
          amount = 200
          break;
        case "Lab42":
          amount = 150
          break;
        case "Partner":
          amount = 200
          break;
        case "Free":
          throw new Error('This organisation type does not need to pay to attend an event')
        default:
          throw new Error('Unknown organisation type, please contact an administrator')
      }

      const eventRes = await rgraphql('api-event', 'query($evid: ID!) { event(evid: $evid) { start } }', { evid: args.evid })

      if (eventRes.errors || !eventRes.data) {
        console.error(eventRes)
        throw new Error('An unkown error occured while looking up the event date')
      }

      // Unix timestamp of the start of the day of the event, no hours, minutes, etc.
      // this way, two events that occur on the same date will have the same payment
      // target, meaning you only pay once
      const eventDateUnix = new Date(eventRes.data.event.start).setHours(0, 0, 0, 0)

      const paymentRes = await rgraphql('api-payment', 'query($target: String!, $amount: Int) { paymentLink(target: $target, amount: $amount) }', { target: `${args.enid}@${eventDateUnix}`, amount })

      if (paymentRes.errors || !paymentRes.data) {
        console.error(paymentRes)
        throw new Error('An unkown error occured while looking up payment status')
      }

      return paymentRes.data.paymentLink
    }
  },
  entityByExtID: {
    type: 'Entity',
    args: {
      external_id: 'ID!',
    },
    description: 'Get the entity by external identifier.',
    resolve: (obj, args) => Entity.findOne({ external_id: args.external_id }),
  },
  entitiesAll: {
    type: '[Entity!]',
    description: 'Get all entities.',
    resolve: async (obj, args, req) => {
      canGetAllEntities(req)
      return await Entity.find()
    },
  },
  paymentsAndEntitiesAll: {
    type: '[PaymentAndEntity]',
    description: 'Get payments of all entities and entity information as well.',
    resolve: async (obj, args, req) => {
      canGetAllEntities(req)
      const entities = await Entity.find()
      const res = await rgraphql('api-payment', 'query($targets: [String]) { payment(targets: $targets) { status, url, target } }', { targets: entities.map(entity => entity.enid) })

      if (res.errors || !res.data) {
        console.error(res)
        throw new Error('An unkown error occured while looking up payment status')
      }

      return entities.map(entity => ({
        entity,
        ...res.data.payment.find(payment => payment.target == entity.enid)
      }))
    },

  },
  entities: {
    type: '[Entity!]',
    args: {
      enids: '[ID!]!',
    },
    description: 'Request a list of entities by supplying their enids. The order is not preserved!',
    resolve: (obj, args) => Entity.find({ _id: { $in: args.enids } }),
  },
})

schemaComposer.Mutation.addNestedFields({
  'entity.create': {
    type: 'Entity',
    args: {
      name: 'String!',
      description: 'String',
      type: 'String!',
      contact: '[EntityContactInfoIn!]',
      external_id: 'String',
      representatives: 'Int',
      location: 'String',
    },
    description: 'Create a new entity.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED create entities')
      }

      return await Entity.create(args)
    },
  },
  'entity.update': {
    type: 'Entity',
    args: {
      enid: 'ID!',
      name: 'String',
      description: 'String',
      type: 'String',
      contact: '[EntityContactInfoIn!]',
      external_id: 'String',
      representatives: 'Int',
      location: 'String',
    },
    description: 'Update an entity.',
    resolve: async (obj, args, req) => {
      const enid = args.enid
      delete args.enid

      if (!(
        req.user.type === 'a' ||
        (req.user.type === 'r' && req.user.repAdmin && req.user.enids.includes(enid))
      )) {
        throw new Error('UNAUTHORIZED update this entity')
      }

      if (args.type && req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update type of entity')
      }

      return await Entity.findByIdAndUpdate(enid, { $set: args }, { new: true })
    },
  },
  'entity.delete': {
    type: 'Entity',
    args: {
      enid: 'ID!',
    },
    description: 'Delete an entity.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete entities')
      }

      return await deleteEntity(args.enid)
    },
  },
})

const schema = schemaComposer.buildSchema()

const executeGraphql = ({ query, variables = {}, context = {} }) =>
  graphql({ schema, source: query, variableValues: variables, contextValue: context })
export default executeGraphql
