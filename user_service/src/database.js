import mongoose from 'mongoose';
import debugLib from 'debug';

const debug = debugLib('project_service:database');

export const connect = async () => {
  const conStr = process.env.mongodbConStr || 'mongodb://mongodb/project_service';
  const conn = await mongoose.connect(conStr);
  debug(`Connected to database: ${conStr}`);
  return conn;
}

const userSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  email: String,
  phone: String,
});
userSchema.virtual('uid').get(function () { return this._id; }); // Create _id alias
export const User = mongoose.model('User', userSchema);

export const Student = User.discriminator('Student', new mongoose.Schema({
  studentnumber: String,
  websites: [String],
  studies: [String],
}));

export const Representative = User.discriminator('Representative', new mongoose.Schema({
  enid: mongoose.Schema.ObjectId,
  password: String,
  repAdmin: Boolean,
}));
