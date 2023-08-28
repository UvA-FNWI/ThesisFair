import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync } from 'fs'

import { rgraphql } from '../../libraries/amqpmessaging/index.js'
import { Entity } from './database.js'
import { canGetAllEntities } from './permissions.js'

import nodemailer from 'nodemailer'

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

const mail = nodemailer.createTransport({
  host: process.env.MAILHOST,
  port: parseInt(process.env.MAILPORT),
  ...(process.env.MAILUSER
    ? {
        auth: {
          user: process.env.MAILUSER,
          pass: process.env.MAILPASS,
        },
      }
    : null),
})

const sendChangeRequestedMail = async (emails, projectName) => {
  await mail.sendMail({
    from: 'UvA ThesisFair <thesisfair-IvI@uva.nl>',
    to: process.env.OVERRIDEMAIL || emails,
    subject: '',
    text: `
  Dear Madam/Sir,

  ${emails.join(' ')}

  We are writing to inform you about a time-sensitive matter related to your project, ${projectName}. This project has recently been flagged by an academic associated with the program, who has indicated the need for further information or a revision.

  To address this promptly, we kindly request that you log in to the Thesis Fair platform at https://thesisfair.ivi.uva.nl/. Once logged in, please locate and select your project to review the comments provided by the academic. It is important to carefully consider their feedback and make any necessary adjustments to the project.

  Given the urgency of this matter, please complete these revisions within the next 1-2 business days from the receipt of this email.

  Should you have any questions or encounter any challenges during this process, please do not hesitate to reach out to us for assistance.

  We look forward to your timely response and collaboration.

  Kind regards,

  The Thesis Fair Team
  `,
  })
}

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
  const res = await rgraphql(
    'api-event',
    'query($enid: ID!) { eventsOfEntity(enid: $enid) { start, evid, enabled } }',
    { enid }
  )

  if (res.errors) {
    console.error(res)
  }
  if (res.errors || !res.data) {
    // console.error(res)
    throw new Error(
      'An unknown error occurred while attempting to find the events the organisation is participating in'
    )
  }

  return res.data.eventsOfEntity.filter(event => event.enabled).filter(event => !event.isMarketplace) || []
}

function getAmountByEntityType(type) {
  switch (type) {
    case 'A':
      return 1500
    case 'B':
      return 700
    case 'C':
      return 200
    case 'Lab42':
      return 150
    case 'Partner':
      return 200
    case 'Free':
      throw new Error('This organisation type does not need to pay to attend an event')
    default:
      throw new Error('Unknown organisation type, please contact an administrator')
  }
}

async function paymentTarget(enid, evid) {
  const eventRes = await rgraphql('api-event', 'query($evid: ID!) { event(evid: $evid) { start } }', { evid })

  if (eventRes.errors || !eventRes.data) {
    console.error(eventRes)
    throw new Error('An unkown error occured while looking up the event date')
  }

  // Unix timestamp of the start of the day of the event, no hours, minutes, etc.
  // this way, two events that occur on the same date will have the same payment
  // target, meaning you only pay once
  const eventDateUnix = new Date(eventRes.data.event.start).setHours(0, 0, 0, 0)

  return `${enid}@${eventDateUnix}`
}

schemaComposer.Query.addNestedFields({
  entity: {
    type: 'Entity',
    args: {
      enid: 'ID!',
    },
    description: 'Get the entity by enid.',
    resolve: async (obj, args, req, source) => {
      // TODO: check read access for entity
      const requestedFields = source.fieldNodes[0].selectionSet.selections.map(e => e.name.value)

      const entity = await Entity.findById(args.enid)

      let events = null
      if (requestedFields.includes('payments') || requestedFields.includes('evids')) {
        events = await getFairsOfEntity(args.enid)
      }

      // TODO: only fetch payment if the user is allowed to see payments
      let payments = null
      if (requestedFields.includes('payments')) {
        const res = await rgraphql(
          'api-payment',
          'query($targets: [String]) { payment(targets: $targets) { status, url, target } }',
          {
            targets: events.map(event => `${args.enid}@${new Date(event.start).setHours(0, 0, 0, 0)}`),
          }
        )

        if (res.errors || !res.data) {
          console.error(res)
          throw new Error('An unknown error occured while attempting look up payment status')
        }

        payments = res.data.payment.map(payment => ({
          status: payment.status,
          url: payment.url,
          eventDate: new Date(Number(payment.target.split('@')[1])),
        }))
      }

      if (events) {
        entity.evids = events.map(event => event.evid)
      }

      if (payments) {
        entity.payments = payments
      }

      return entity
    },
  },
  fairs: {
    type: '[ID]',
    args: {
      enid: 'ID!',
    },
    description: 'Get a list of the evids of this entity',
    resolve: async (obj, args, req) => {
      const fairs = (await getFairsOfEntity(args.enid)) || []

      return fairs.map(event => event.evid)
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
      const amount = getAmountByEntityType(entity.type)
      const target = await paymentTarget(args.enid, args.evid)

      const paymentRes = await rgraphql(
        'api-payment',
        'query($target: String!, $amount: Int) { paymentLink(target: $target, amount: $amount) }',
        { target, amount }
      )

      if (paymentRes.errors || !paymentRes.data) {
        console.error(paymentRes)
        throw new Error('An unkown error occured while looking up payment status')
      }

      return paymentRes.data.paymentLink
    },
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
    resolve: async (obj, args, req, source) => {
      canGetAllEntities(req)
      const requestedFields = source.fieldNodes[0].selectionSet.selections.map(e => e.name.value)

      const entities = await Entity.find()

      // TODO: use an "all events by enid" endpoint or something rather than many requests
      let eventsByEnid = null
      if (requestedFields.includes('payments') || requestedFields.includes('evids')) {
        eventsByEnid = Object.fromEntries(
          await Promise.all(entities.map(async ({ enid }) => [enid, await getFairsOfEntity(enid)]))
        )
      }

      // TODO: only fetch payment if the user is allowed to see payments
      let paymentsByEnid = null
      if (requestedFields.includes('payments')) {
        // Get statuses for each target
        const res = await rgraphql(
          'api-payment',
          'query($targets: [String]) { payment(targets: $targets) { status, url, target } }',
          {
            targets: Object.entries(eventsByEnid)
              .map(([enid, events]) => events.map(event => `${enid}@${new Date(event.start).setHours(0, 0, 0, 0)}`))
              .flat(),
          }
        )

        if (res.errors || !res.data) {
          console.error(res)
          throw new Error('An unknown error occured while attempting look up payment status')
        }

        const payments = res.data.payment.map(payment => ({
          status: payment.status,
          url: payment.url,
          eventDate: new Date(Number(payment.target.split('@')[1])),
          enid: payment.target.split('@')[0],
        }))

        paymentsByEnid = Object.fromEntries(
          payments
            .reduce((map, payment) => map.set(payment.enid, [...(map.get(payment.enid) || []), payment]), new Map())
            .entries()
        )
      }

      for (const entity of entities) {
        entity.evids = eventsByEnid[entity.enid].map(event => event.evid)
        entity.payments = paymentsByEnid[entity.enid]
      }

      return entities
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
  'entity.acceptPayment': {
    type: 'Boolean',
    args: {
      enid: 'ID!',
      evid: 'ID!',
    },
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED accept payment')
      }

      const target = await paymentTarget(args.enid, args.evid)

      const res = await rgraphql(
        'api-payment',
        'mutation acceptPayment($target: String!) { payment { acceptPayment(target: $target) { amount } } }',
        { target }
      )

      if (res.errors || !res.data) {
        console.error(res)
        throw new Error('An unknown error occurred while attempting to set the payment status to paid')
      }

      return !!res.data.payment?.acceptPayment
    },
  },
  'entity.requestChanges': {
    type: 'Boolean',
    args: {
      enid: 'ID!',
      pid: 'ID!',
    },
    description: 'Request a change for the given entity',
    resolve: async (obj, args) => {
      // Query all users that are part of the entity
      const users = await rgraphql('api-user', 'query($enid: ID!) { usersOfEntity(enid: $enid) { email } }', {
        enid: args.enid,
      })

      const project = await rgraphql('api-project', 'query($pid: ID!) { project(pid: $pid) { name } }', {
        pid: args.pid,
      })

      const projectName = project.data.project.name

      if (users.errors || !users.data) return false

      const emails = users.data.usersOfEntity.map(user => user.email)

      await sendChangeRequestedMail(emails, projectName)

      return true
    },
  },
  'entity.requestInvoice': {
    type: 'Boolean',
    args: {
      enid: 'ID!',
      evid: 'ID!',
    },
    description: 'Request an invoice for the given entity',
    resolve: async (obj, args) => {
      const entity = await Entity.findById(args.enid)
      const amount = getAmountByEntityType(entity.type)
      const target = await paymentTarget(args.enid, args.evid)

      const res = await rgraphql(
        'api-payment',
        'mutation requestInvoice($target: String!, $amount: Int!) { payment { requestInvoice(target: $target, amount: $amount) } }',
        { target, amount }
      )

      if (res.errors || !res.data) {
        console.error(res)
        throw new Error('An unknown error occurred while attempting to create an invoice request')
      }

      return res.data.payment?.requestInvoice
    },
  },
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

      if (!(req.user.type === 'a' || (req.user.type === 'r' && req.user.repAdmin && req.user.enids.includes(enid)))) {
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
