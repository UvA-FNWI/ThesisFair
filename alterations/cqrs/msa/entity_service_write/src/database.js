import mongoose from 'mongoose';
import debugLib from 'debug';
import { channel } from '../../libraries/amqpmessaging/index.js';


const debug = debugLib('entity_service:database');
let conn;

const entitySchema = new mongoose.Schema({
  name: String,
  description: String,
  type: { type: String, enum: ['company', 'research'] },
  contact: [new mongoose.Schema({
    type: { type: String, enum: ['website', 'email', 'phonenumber'] },
    content: String,
  })],
  external_id: { type: Number, index: true },
}, { autoIndex: false });
entitySchema.virtual('enid').get(function () { return this._id; }); // Create _id alias

const eventSchema = new mongoose.Schema({
  operation: String,
  data: Object,
  identifier: mongoose.Types.ObjectId,
});

eventSchema.post('save', function (_, next) {
  channel.sendToQueue('api-entity', Buffer.from(JSON.stringify({
    event: 'write',
    operation: this.operation,
    data: this.data,
    identifier: this.identifier
  })));

  next();
});

export let Entity;
export let Event;

export const connect = async (uri) => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/entity_service-write';
  conn = await mongoose.createConnection(conStr).asPromise();
  debug(`Connected to database: ${conStr}`);

  Entity = conn.model('Entity', entitySchema);
  Event = conn.model('Event', eventSchema);

  return conn;
}

export const disconnect = async () => {
  await conn.close();
}
