import mongoose from 'mongoose';
import debugLib from 'debug';

const debug = debugLib('project_service:database');
let conn;

const projectSchema = new mongoose.Schema({
  enid: mongoose.Schema.ObjectId,
  evid: mongoose.Schema.ObjectId,
  name: String,
  description: String,
  datanoseLink: String,
});
projectSchema.virtual('pid').get(function () { return this._id; }); // Create _id alias

export let Project;

export const connect = async (uri) => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/project_service';
  conn = mongoose.createConnection(conStr);
  debug(`Connected to database: ${conStr}`);

  Project = conn.model('Project', projectSchema);
  return conn;
}

export const disconnect = async () => {
  await conn.close();
}
