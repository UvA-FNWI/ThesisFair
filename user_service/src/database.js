import mongoose from 'mongoose';
import debugLib from 'debug';

const debug = debugLib('project_service:database');

export const connect = async (uri) => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/project_service';
  const conn = await mongoose.connect(conStr);
  debug(`Connected to database: ${conStr}`);
  return conn;
}

export const disconnect = async () => {
  await mongoose.connection.close();
}

const userSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  email: { type: String, required: true, unique: true },
  phone: String,
  admin: Boolean,
  password: String,
});
userSchema.virtual('uid').get(function () { return this._id; }); // Create _id alias
export const User = mongoose.model('User', userSchema);

export const Student = User.discriminator('Student', new mongoose.Schema({
  studentnumber: { type: String, required: true, unique: true },
  websites: [String],
  studies: [String],
  share: [mongoose.Schema.Types.ObjectId],
}));

export const Representative = User.discriminator('Representative', new mongoose.Schema({
  enid: { type: mongoose.Schema.ObjectId, required: true },
  repAdmin: Boolean,
}));
