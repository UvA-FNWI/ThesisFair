import mongoose from 'mongoose'
import debugLib from 'debug'

const debug = debugLib('entity_service:database')
let conn

const entitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String },
  contact: [
    new mongoose.Schema({
      type: { type: String, enum: ['website', 'email', 'phonenumber'] },
      content: { type: String, required: true },
    }),
  ],
  external_id: { type: Number, unique: true, sparse: true },
  representatives: { type: Number },
  location: { type: String },
  grantsAcademicRights: { type: Boolean, default: false },
})
entitySchema.virtual('enid').get(function () {
  return this._id
}) // Create _id alias

export let Entity

export const connect = async uri => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/entity_service'
  conn = await mongoose.createConnection(conStr).asPromise()
  debug(`Connected to database: ${conStr}`)

  Entity = conn.model('Entity', entitySchema)
  return conn
}

export const disconnect = async () => {
  await conn.close()
}
