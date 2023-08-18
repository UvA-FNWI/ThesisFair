import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync } from 'fs'
import axios from 'axios'

import { Payments } from './database.js'

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

/* Get the most recent/completed/open payments for the targets */
async function getPayments(targets) {
  return await Payments.aggregate([
    { $addFields: {
      // Create a new field that specifies priority of this payment. Paid
      // payments are the most important and should always be selected, etc.
      sortStatus: {
        $switch: {
          branches: [
            { case: { $eq: ['$status', 'paid'] }, then: 0 },
            { case: { $eq: ['$status', 'invoice'] }, then: 1 },
            { case: { $eq: ['$status', 'open'] }, then: 2 },
            { case: { $eq: ['$status', 'failed'] }, then: 4 },
          ],
          default: 5,
        },
      },
    }},
    // Make sure to pick the payment by priority, and otherwise get the most
    // recently created
    { $sort: { sortStatus: -1, _id: 1 } },
    { $group: {
      _id: '$target',
      target: { $last: '$target' },
      status: { $last: '$status' },
      url: { $last: '$url' },
    }},
    { $match: {
      target: { $in: targets },
    }},
  ])
}

schemaComposer.Query.addNestedFields({
  payment: {
    type: '[Payment]',
    args: {
      targets: '[String]',
    },
    description: 'Get payment information for all targets that have any',
    resolve: async (_obj, args) => {
      return await getPayments(args.targets)
    }
  },
  /* Note: this should really be a mutation, as it's not returning anything
   * that might already be there, like paymentLink. Nevertheless, I opted for
   * this just because it was easier */
  invoice: {
    type: 'Boolean', // True if an invoice request is created, false otherwise
    args: {
      target: 'String!',
      amount: 'Int',
    },
    description: 'Request an invoice for this target, i.e. set the payment status to "invoice requested"',
    resolve: async(_obj, args) => {
      // Get the current payment status
      const payments = await getPayments([args.target])
      const payment = payments ? payments[0] : undefined

      // If there is one that's already paid, don't create a new invoice request
      if (payment?.status == 'paid') {
        // throw new Error('This target has already been paid')
        return false
      }

      if (payment?.status == 'invoice') {
        return false
      }

      await Payments.create({
        target: args.target,
        amount: args.amount,
        status: 'invoice',
      })

      return true
    },
  },
  paymentLink: {
    type: 'String',
    args: {
      target: 'String!',
      amount: 'Int',
    },
    description: 'Get payment link for target, create new one if needed',
    resolve: async (_obj, args) => {
      // Get the current payment status
      const payments = await getPayments([args.target])
      const payment = payments ? payments[0] : undefined

      // If there is one that's already paid or open, return its payment link
      // (don't create a new one)
      if (['open', 'paid', 'failed'].includes(payment?.status)) {
        return payment.url
      }

      if (!args.amount) {
        throw new Error('No link found -- specify amount to create one')
      }

      // Otherwise, if there are only failed, canceled or expired links
      // Get a link and ID from Datanose
      const result = await axios({
        method: 'post',
        baseURL: process.env.DATANOSE_API_URL,
        url: 'Payments',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PAYMENT_API_TOKEN}`,
        },
        data: {
          amount: args.amount,
          description: args.target,
        }
      })

      // Add them to the database
      await Payments.create({
        externalId: result.data.Id,
        url: result.data.Url,
        target: args.target,
        amount: args.amount,
      })

      // Return the link
      return result.data.Url
    }
  }
})

const schema = schemaComposer.buildSchema()

const executeGraphql = ({ query, variables = {}, context = {} }) =>
  graphql({ schema, source: query, variableValues: variables, contextValue: context })
export default executeGraphql
