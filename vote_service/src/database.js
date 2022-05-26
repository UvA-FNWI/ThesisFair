import mongoose from 'mongoose';
import debugLib from 'debug';

const debug = debugLib('vote_service:database');
let conn;

const voteSchema = new mongoose.Schema({
  uid: mongoose.Schema.ObjectId,
  evid: mongoose.Schema.ObjectId,
  votes: [new mongoose.Schema({
    enid: mongoose.Schema.ObjectId,
    pid: mongoose.Schema.ObjectId,
  })],
});
voteSchema.virtual('vid').get(function () { return this._id; }); // Create _id alias
voteSchema.index({ uid: 1, evid: 1 }, { unique: true });
voteSchema.index({ uid: 1, evid: 1, 'votes.pid': 1 }, { unique: true });
export let Vote;

export const connect = async (uri) => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/vote_service';
  conn = mongoose.createConnection(conStr);
  debug(`Connected to database: ${conStr}`);

  Vote =  conn.model('Vote', voteSchema);
  return conn;
}

export const disconnect = async () => {
  await conn.close();
}
