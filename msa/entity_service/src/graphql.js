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

schemaComposer.Query.addNestedFields({
  entity: {
    type: 'Entity',
    args: {
      enid: 'ID!',
    },
    description: 'Get the entity by enid.',
    resolve: (obj, args) => Entity.findById(args.enid),
  },
  paymentAndEntity: {
    type: 'PaymentAndEntity',
    args: {
      enid: 'ID!',
    },
    description: 'Get payment information of an entity and the entity info as well',
    resolve: async (obj, args, req) => {
      const entity = await Entity.findById(args.enid)
      const res = await rgraphql('api-payment', 'query($targets: [String]) { payment(targets: $targets) { status, url } }', { targets: [entity.enid] })[0] 

      if (res.errors || !res.data) {
        console.error(res)
        throw new Error('An unkown error occured while attempting to generate a payment link')
      }

      return {
        entity,
        ...res.data.payment,
      }
    },
  },
  paymentLink: {
    type: 'String',
    args: {
      enid: 'ID!',
    },
    description: 'Get a payment link for the given entity',
    resolve: async (obj, args) => {
      const entity = await Entity.findById(args.enid)

      let amount
      switch (entity.type) {
        case "A":
          amount = 300
          break;
        case "B":
          amount = 200
          break;
        case "C":
          amount = 100
          break;
        default:
          throw new Error('This organisation type does not need to pay to attend an event')
      }

      const res = await rgraphql('api-payment', 'query($target: String!, $amount: Int) { paymentLink(target: $target, amount: $amount) }', { target: entity.enid, amount })

      if (res.errors || !res.data) {
        console.error(res)
        throw new Error('An unkown error occured while looking up payment status')
      }

      return res.data.paymentLink
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
