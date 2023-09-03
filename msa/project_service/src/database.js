import mongoose from 'mongoose'
import debugLib from 'debug'

const debug = debugLib('project_service:database')
let conn

const projectSchema = new mongoose.Schema({
  enid: { type: mongoose.Schema.ObjectId, required: true },
  evids: [{ type: mongoose.Schema.ObjectId }],
  name: { type: String },
  description: { type: String },
  environment: { type: String },
  expectations: { type: String },
  email: { type: String },
  numberOfStudents: { type: Number },
  degrees: [{ type: String }],
  tags: [{ type: String }],
  attendance: { type: String },
  adminApproval: { type: String, default: () => 'awaiting' },
  academicApproval: [{
    degree: {type: String},
    approval: {type: String},
  }],
  datanoseLink: { type: String },
  external_id: { type: String },
  comments: [{type: String, default: () => []}],
})
projectSchema.virtual('pid').get(function () {
  return this._id
}) // Create _id alias

export let Project

export const connect = async uri => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/project_service'
  conn = mongoose.createConnection(conStr)
  debug(`Connected to database: ${conStr}`)

  Project = conn.model('Project', projectSchema)
  return conn
}

export const disconnect = async () => {
  await conn.close()
}
