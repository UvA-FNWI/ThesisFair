import mongoose from 'mongoose';
import debugLib from 'debug';

const debug = debugLib('vote_service:database');

export const connect = async (uri) => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/vote_service';
  const conn = await mongoose.connect(conStr);
  debug(`Connected to database: ${conStr}`);
  return conn;
}

export const disconnect = async () => {
  await mongoose.connection.close();
}

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

export const Vote = mongoose.model('Vote', voteSchema);
