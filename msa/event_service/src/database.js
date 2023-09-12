import mongoose from 'mongoose'
import debugLib from 'debug'

const debug = debugLib('event_service:database')
let conn

const eventSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, required: true },
    name: { type: String, required: true },
    description: { type: String },
    start: { type: Date, required: true },
    end: { type: Date },
    location: { type: String },
    studentSubmitDeadline: { type: Date },
    entities: [{ type: mongoose.Schema.ObjectId }],
    external_id: { type: String },
    degrees: [{ type: String }],
    isMarketplace: { type: Boolean },
    deadlinePassed: { type: Boolean, default: () => false },
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
)

eventSchema.virtual('evid').get(function () {
  return this._id
}) // Create _id alias

export let Event

export const connect = async uri => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/event_service'
  conn = mongoose.createConnection(conStr)
  debug(`Connected to database: ${conStr}`)

  Event = conn.model('Event', eventSchema)
  return conn
}

export const disconnect = async () => {
  await conn.close()
}
