import mongoose from 'mongoose'
import debugLib from 'debug'

const debug = debugLib('payment_service:database')
let conn

const schema = new mongoose.Schema({
  status: { type: String, required: true, default: () => 'open' },
  target: { type: String, required: true },
  amount: { type: Number, required: true },
  url: { type: String },
  externalId: { type: Number },
})

schema.virtual('timestamp').get(function () {
  return this.createdAt
})

export let Payments

export const connect = async uri => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/payment_service'
  conn = await mongoose.createConnection(conStr).asPromise()
  debug(`Connected to database: ${conStr}`)

  Payments = conn.model('Payments', schema)
  return conn
}

export const disconnect = async () => {
  await conn.close()
}
