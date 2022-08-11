import { Entity } from './database.js';
import protobuf from 'protobufjs';

const protobufRoot = protobuf.loadSync('src/entityservice.proto');
const protobufEvent = protobufRoot.lookupType('entityservice.Event');

const events = {
  create: async (data, identifier) => {
    await Entity.create(data);
  },
  update: async (data, identifier) => {
    console.log(data);
    await Entity.updateOne({ _id: identifier }, data);
  },
  delete: async (data, identifier) => {
    await Entity.deleteOne({ _id: identifier });
  },
}

export default (payload) => {
  let event = protobufEvent.toObject(protobufEvent.decode(payload), {
    enums: String,
  });

  if (event.data) {
    event.data['external_id'] = event.data['externalId'];
  }
  if (!(event.operation in events)) {
    throw new Error('Unkown operation: ' + event.operation);
  }

  return events[event.operation](event.data, event.identifier);
}
