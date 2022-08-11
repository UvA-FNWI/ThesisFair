import mongoose from 'mongoose';
import debugLib from 'debug';
import { channel } from '../../libraries/amqpmessaging/index.js';
import protobuf from 'protobufjs';

const debug = debugLib('user_service:database');
let conn;
let protobufRoot, protobufEvent;

const userSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  email: { type: String, unique: true },
  phone: String,
  admin: Boolean,
  password: String,
});
userSchema.virtual('uid').get(function () { return this._id; }); // Create _id alias
export let User;
export let Student;
export let Representative;

const eventSchema = new mongoose.Schema({
  operation: String,
  data: Object,
  identifier: mongoose.Types.ObjectId,
});

eventSchema.post('save', function (_, next) {
  channel.sendToQueue('api-user-update', protobufEvent.encode(protobufEvent.fromObject({
    operation: this.operation,
    data: this.data,
    identifier: this.identifier
  })).finish());

  next();
});

export let Event;

export const connect = async (uri) => {
  const conStr = uri || process.env.mongodbConStr || 'mongodb://mongodb/user_service';
  conn = mongoose.createConnection(conStr);
  debug(`Connected to database: ${conStr}`);

  User = conn.model('User', userSchema);
  Event = conn.model('Event', eventSchema);

  Student = User.discriminator('Student', new mongoose.Schema({
    studentnumber: { type: String, unique: true },
    websites: [String],
    studies: [String],
    share: [mongoose.Schema.Types.ObjectId],
  }));

  Representative = User.discriminator('Representative', new mongoose.Schema({
    enid: { type: mongoose.Schema.ObjectId },
    repAdmin: { type: Boolean, default: false },
  }));

  protobufRoot = protobuf.loadSync('./src/userservice.proto');
  protobufEvent = protobufRoot.lookupType('userservice.Event');

  return conn;
}

export const disconnect = async () => {
  await conn.close();
}

export const isValidObjectId = mongoose.isValidObjectId;
