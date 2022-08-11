import { Event } from './database.js';
import protobuf from 'protobufjs';

const protobufRoot = protobuf.loadSync('src/eventservice.proto');
const protobufMsg = protobufRoot.lookupType('eventservice.CQRSEvent');

const events = {
  create: async (data, identifier) => {
    await Event.create(data);
  },
  update: async (data, identifier) => {
    await Event.updateOne({ _id: identifier }, data);
  },
  delete: async (data, identifier) => {
    await Event.deleteOne({ _id: identifier });
  },
  'entity.add': async (data, identifier) => {
    await Event.updateOne({ _id: identifier }, { $push: { entities: data.enid } });
  },
  'entity.del': async (data, identifier) => {
    await Event.updateOne({ _id: identifier }, { $pull: { entities: data.enid } });
  }
}

export default (payload) => {
  let event = protobufMsg.toObject(protobufMsg.decode(payload), {
    enums: String
  });

  if (!(event.operation in events)) {
    throw new Error('Unkown operation: ' + event.operation);
  }

  return events[event.operation](event.data, event.identifier);
}
