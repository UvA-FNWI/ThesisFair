import { Project } from './database.js';
import protobuf from 'protobufjs';

const protobufRoot = protobuf.loadSync('src/projectservice.proto');
const protobufEvent = protobufRoot.lookupType('projectservice.Event');

const events = {
  create: async (data, identifier) => {
    await Project.create(data);
  },
  update: async (data, identifier) => {
    await Project.updateOne({ _id: identifier }, data);
  },
  delete: async (data, identifier) => {
    await Project.deleteOne({ _id: identifier });
  },
  deleteOfEntity: async (data, identifier) => {
    await Project.deleteMany({ enid: data.enid });
  }
}

export default (payload) => {
  let event = protobufEvent.toObject(protobufEvent.decode(payload), {
    enums: String,
  });

  if (!(event.operation in events)) {
    throw new Error('Unkown operation: ' + event.operation);
  }

  return events[event.operation](event.data, event.identifier);
}
