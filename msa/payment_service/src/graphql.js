import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync } from 'fs'
import axios from 'axios'

import { Payments } from './database.js'

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

schemaComposer.Query.addNestedFields({
  payment: {
    type: '[Payment]',
    args: {
      targets: '[String]',
    },
    description: 'Get payment information for all targets that have any',
    resolve: async (_obj, args) => {
      // Find the most recent entry of a payment into the database for each
      // target
      return await Payments.aggregate([
        { $sort: { _id: 1 } },
        { $group: {
          _id: "$target",
          target: { $last: "$target" },
          status: { $last: "$status" },
          url: { $last: "$url" }
        }},
        { $match: {
          target: { $in: args.targets }
        }}
      ])
    }
  },
  paymentLink: {
    type: 'String',
    args: {
      target: 'String!',
      amount: 'Int',
    },
    description: 'Get payment link for target, create new one if needed',
    resolve: async (_obj, args) => {
      // Check if there is an open or paid payment link in the database
      const payment = await Payments.findOne({
        target: args.target,
        status: { $in: [ 'open', 'paid '] },
      })

      // If there is one, return its payment link (don't create a new one)
      if (payment) {
        return payment.url
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
      Payments.create({
        externalId: result.data.Id,
        url: result.data.Url,
        target: args.target,
        amount: args.amount,
      })

      // Return the link
      return result.Url
    }
  }
})

const schema = schemaComposer.buildSchema()

const executeGraphql = ({ query, variables = {}, context = {} }) =>
  graphql({ schema, source: query, variableValues: variables, contextValue: context })
export default executeGraphql
