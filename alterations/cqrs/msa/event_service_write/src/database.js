import mongoose from 'mongoose';
import debugLib from 'debug';
import { channel } from '../../libraries/amqpmessaging/index.js';

const debug = debugLib('event_service:database');
let conn;

const eventSchema = new mongoose.Schema({
  enabled: Boolean,
  name: String,
  description: String,
  start: Date,
  location: String,
  studentSubmitDeadline: Date,
  entities: [mongoose.Schema.ObjectId],
});
eventSchema.virtual('evid').get(function () { return this._id; }); // Create _id alias

const CQRSeventSchema = new mongoose.Schema({
  operation: String,
  data: Object,
  identifier: mongoose.Types.ObjectId,
});

CQRSeventSchema.post('save', function (_, next) {
  channel.sendToQueue('api-event', Buffer.from(JSON.stringify({
    event: 'write',
    operation: this.operation,
    data: this.data,
    identifier: this.identifier
  })));

  next();
});

export let Event;
export let CQRSEvent;

export const connect = async (uri) => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/event_service';
  conn = mongoose.createConnection(conStr);
  debug(`Connected to database: ${conStr}`);

  Event = conn.model('Event', eventSchema);
  CQRSEvent = conn.model('CQRSEvent', CQRSeventSchema);
  return conn;
}

export const disconnect = async () => {
  await conn.close();
}
