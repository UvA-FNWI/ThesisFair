import { graphqlHTTP } from 'express-graphql'
import { print } from 'graphql'
import { introspectSchema } from '@graphql-tools/wrap'
import { stitchSchemas } from '@graphql-tools/stitch'
import debugLib from 'debug'

import { channel, rgraphql } from '../../libraries/amqpmessaging/index.js'
import { graphqlConfig } from './config.js'
import errors from './errors.js'

const debug = debugLib('API_gateway:graphql')

const executor = (queue, { document, variables, context }) =>
  rgraphql(queue, print(document), variables, context ? { user: context.user } : {})

/**
 * Assert all configured messaging queues and introspect the schema of the queues
 * Concatinate the schema into one and serve it on the route /graphql.
 * @returns ExpressJS middleware
 */
const getMiddleware = async () => {
  const subschemas = []
  for (const queue of graphqlConfig.queues) {
    debug('Loading queue %s', queue)
    if (channel) {
      await channel.assertQueue(queue, {
        durable: false,
      })
    }

    const subexecutor = args => executor(queue, args)
    subschemas.push({
      schema: await introspectSchema(subexecutor),
      executor: subexecutor,
    })
  }

  const schema = stitchSchemas({
    subschemas,
  })

  debug('Done initializing graphql middleware')
  return graphqlHTTP({
    schema,
    graphiql: !!process.env.DEBUG,
    customFormatErrorFn: err => {
      if (!process.env.DEBUG && err.message) {
        const split = err.message.split(' ')
        if (split.length > 0 && errors[split[0]]) {
          const error = errors[split[0]]
          err.message = error.message + err.message.substring(split[0].length + 1)
        }
      }

      return err
    },
  })
}

export default getMiddleware
