import mongoose from 'mongoose';
import debugLib from 'debug';
import { channel } from '../../libraries/amqpmessaging/index.js';
import protobuf from 'protobufjs';

const debug = debugLib('project_service:database');
let conn;
let protobufRoot, protobufEvent;

const projectSchema = new mongoose.Schema({
  enid: mongoose.Schema.ObjectId,
  evid: mongoose.Schema.ObjectId,
  name: String,
  description: String,
  datanoseLink: String,
});
projectSchema.virtual('pid').get(function () { return this._id; }); // Create _id alias

const eventSchema = new mongoose.Schema({
  operation: String,
  data: Object,
  identifier: mongoose.Types.ObjectId,
});

eventSchema.post('save', function (_, next) {
  channel.sendToQueue('api-project-update', protobufEvent.encode(protobufEvent.fromObject({
    operation: this.operation,
    data: this.data,
    identifier: this.identifier
  })).finish());

  next();
});

export let Project;
export let Event;

export const connect = async (uri) => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/project_service';
  conn = mongoose.createConnection(conStr);
  debug(`Connected to database: ${conStr}`);

  Project = conn.model('Project', projectSchema);
  Event = conn.model('Event', eventSchema);

  protobufRoot = protobuf.loadSync('./src/projectservice.proto');
  protobufEvent = protobufRoot.lookupType('projectservice.Event');

  return conn;
}

export const disconnect = async () => {
  await conn.close();
}
