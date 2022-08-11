import mongoose from 'mongoose';
import debugLib from 'debug';

const debug = debugLib('event_service:database');
let conn;

const eventSchema = new mongoose.Schema({
  _id: mongoose.Schema.ObjectId,
  enabled: Boolean,
  name: String,
  description: String,
  start: Date,
  location: String,
  studentSubmitDeadline: Date,
  entities: [mongoose.Schema.ObjectId],
});
eventSchema.virtual('evid').get(function () { return this._id; }); // Create _id alias

export let Event;

export const connect = async (uri) => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/event_service';
  conn = mongoose.createConnection(conStr);
  debug(`Connected to database: ${conStr}`);

  Event = conn.model('Event', eventSchema);
  return conn;
}

export const disconnect = async () => {
  await conn.close();
}
