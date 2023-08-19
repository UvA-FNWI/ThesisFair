import debugLib from 'debug'

import { connect, initSending, receive } from '../../libraries/amqpmessaging/index.js'
import { connect as connectDB } from './database.js'
import scheduleUpdates from './update.js'
import graphql from './graphql.js'

const debug = debugLib('payment_service:index')

const main = async () => {
  await connectDB()
  await connect()
  await initSending()
  receive('api-payment', graphql)
  scheduleUpdates()
  debug('Initialized, waiting for requests')
}

main()
