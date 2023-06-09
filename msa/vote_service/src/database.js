import mongoose from 'mongoose'
import debugLib from 'debug'

const debug = debugLib('vote_service:database')
let conn

const voteSchema = new mongoose.Schema({
  uid: { type: mongoose.Schema.ObjectId, required: true },
  evid: { type: mongoose.Schema.ObjectId, required: true },
  votes: [
    new mongoose.Schema({
      enid: { type: mongoose.Schema.ObjectId, required: true },
      pid: { type: mongoose.Schema.ObjectId, required: true },
    }),
  ],
})
voteSchema.virtual('vid').get(function () {
  return this._id
}) // Create _id alias
voteSchema.index({ uid: 1, evid: 1 }, { unique: true })
voteSchema.index({ uid: 1, evid: 1, 'votes.pid': 1 }, { unique: true })
export let Vote

export const connect = async uri => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/vote_service'
  conn = mongoose.createConnection(conStr)
  debug(`Connected to database: ${conStr}`)

  Vote = conn.model('Vote', voteSchema)
  return conn
}

export const disconnect = async () => {
  await conn.close()
}
