import amqp from 'amqplib'
import debugLib from 'debug'

const debug = debugLib('messaging')
export let conn = null
export let channel = null

let replyQueue = null
let sendInitialized = false

const TRY_COUNT = 20
const TRY_TIMEOUT = 500
const MSG_TIMEOUT = 30000 // ms

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export const connect = async () => {
  let tries = 0
  while (true) {
    try {
      conn = await amqp.connect(process.env.amqpConStr || 'amqp://rabbitmq')
      break
    } catch (error) {
      if (tries > TRY_COUNT) {
        throw error
      }
    }

    await sleep(TRY_TIMEOUT)
    tries += 1
  }
  channel = await conn.createChannel()
  channel.prefetch(5)
  debug('Connected to amqp')

  // TODO: Properly call disconnect on shutdown/crash
}

export const disconnect = () => {
  conn.close()
  conn = null
  channel = null
  replyQueue = null
  sendInitialized = false
}

//* Receiving
export const receive = async (queue, callback) => {
  channel.assertQueue(queue, {
    durable: false,
  })

  channel.consume(queue, async msg => {
    debug('Recv corr: %ds, reply:To %s', msg.properties.correlationId, msg.properties.replyTo)
    if (msg.properties.timestamp < Date.now() - MSG_TIMEOUT) {
      channel.ack(msg)
      console.log('Dropped timeouted message: ' + msg.content)
      return
    }

    const payload = JSON.parse(msg.content.toString())
    const reply = await callback(payload)

    if (msg.properties.replyTo) {
      channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(reply)), {
        correlationId: msg.properties.correlationId,
        timestamp: Date.now(),
      })
    }
    channel.ack(msg)
  })
}

//* Sending
export const initSending = async () => {
  // Initialize rpc mechanism
  replyQueue = await channel.assertQueue('', { exclusive: true })
  channel.consume(replyQueue.queue, handleReply, { noAck: true })
  debug('Initialized reply queue: %s', replyQueue.queue)
  sendInitialized = true
}

const correlationIds = {}
const handleReply = msg => {
  debug('Received message with correlationId: %d', msg.properties.correlationId)

  const callback = correlationIds[msg.properties.correlationId]
  if (callback) {
    delete correlationIds[msg.properties.correlationId]
    callback(msg)
  }
}

let correlationId = 0
const genCorrelationId = () => {
  return (++correlationId).toString()
}

export const rpc = (queue, data) => {
  if (!sendInitialized) {
    throw new Error('Sending is not initialized when rpc is called!')
  }

  return new Promise((resolve, reject) => {
    const id = genCorrelationId()
    correlationIds[id] = msg => resolve(JSON.parse(msg.content.toString()))

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
      correlationId: id,
      replyTo: replyQueue.queue,
      timestamp: Date.now(),
    })
    debug('Message send with corrolation id %d', id)
  })
}

export const rgraphql = (queue, query, variables = null, context = { user: { type: 'a' } }) => {
  return rpc(queue, { event: 'graphql', query, variables, context })
}
