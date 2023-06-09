import mongoose from 'mongoose'
import debugLib from 'debug'

const debug = debugLib('schedule_service:database')
let conn

const scheduleSchema = new mongoose.Schema({
  uid: { type: mongoose.Schema.ObjectId, required: true },
  evid: { type: mongoose.Schema.ObjectId, required: true },
  enid: { type: mongoose.Schema.ObjectId, required: true },
  slot: { type: String, required: true },
  // start: { type: Date, required: true },
  // end: { type: Date, required: true },
})
scheduleSchema.virtual('sid').get(function () {
  return this._id
}) // Create _id alias

export let Schedule

export const connect = async uri => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/schedule_service'
  conn = mongoose.createConnection(conStr)
  debug(`Connected to database: ${conStr}`)

  Schedule = conn.model('Schedule', scheduleSchema)
  return conn
}

export const disconnect = async () => {
  await conn.close()
}
