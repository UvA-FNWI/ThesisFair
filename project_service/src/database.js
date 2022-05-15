import mongoose from 'mongoose';
import debugLib from 'debug';

const debug = debugLib('project_service:database');

export const connect = async () => {
  const conStr = process.env.mongodbConStr || 'mongodb://mongodb/project_service';
  const conn = await mongoose.connect(conStr);
  debug(`Connected to database: ${conStr}`);
  return conn;
}

const projectSchema = new mongoose.Schema({
  enid: mongoose.Schema.ObjectId,
  name: String,
  description: String,
  datanoseLink: String,
});
projectSchema.virtual('pid').get(function () { return this._id; }); // Create _id alias

export const Project = mongoose.model('Project', projectSchema);
