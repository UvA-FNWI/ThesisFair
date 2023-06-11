import debugLib from 'debug'

import { connect, initSending, receive } from '../../libraries/amqpmessaging/index.js'
import { connect as connectDB } from './database.js'
import graphql from './graphql.js'

const debug = debugLib('entity_service:index')

const main = async () => {
  await connectDB()
  await connect()
  await initSending()
  receive('api-entity', graphql)
  debug('Initialized, waiting for requests')
}

main()
