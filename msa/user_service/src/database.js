import mongoose from 'mongoose'
import debugLib from 'debug'

const debug = debugLib('user_service:database')
let conn

const userSchema = new mongoose.Schema({
  firstname: { type: String },
  lastname: { type: String },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String },
  admin: { type: Boolean },
  password: { type: String },
  resetCode: { type: String },
})
userSchema.virtual('uid').get(function () {
  return this._id
}) // Create _id alias
export let User
export let Student
export let Representative

export const connect = async uri => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/user_service'
  conn = mongoose.createConnection(conStr)
  debug(`Connected to database: ${conStr}`)

  User = conn.model('User', userSchema)

  Student = User.discriminator(
    'Student',
    new mongoose.Schema({
      studentnumber: { type: String, required: true, unique: true },
      websites: [String],
      studies: [String],
      share: [mongoose.Schema.Types.ObjectId],
      manuallyShared: [mongoose.Schema.Types.ObjectId],
    })
  )

  const repSchema = new mongoose.Schema({
      enid: { type: mongoose.Schema.ObjectId, required: true },
      external_id: { type: String, unique: true, sparse: true },
    })
  // New: every rep is a repadmin
  repSchema.virtual('repAdmin').get(() => true)

  Representative = User.discriminator(
    'Representative',
    repSchema
  )

  return conn
}

export const disconnect = async () => {
  await conn.close()
}

export const isValidObjectId = mongoose.isValidObjectId
