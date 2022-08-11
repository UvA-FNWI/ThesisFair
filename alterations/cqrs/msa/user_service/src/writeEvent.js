import { mkdirSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import protobuf from 'protobufjs';

import { User, Representative, Student } from './database.js';

if (!existsSync('./data')) {
  mkdirSync('./data');
}

const protobufRoot = protobuf.loadSync('src/userservice.proto');
const protobufEvent = protobufRoot.lookupType('userservice.Event');

const events = {
  'representative.create': async (data, identifier) => {
    await Representative.create(data);
  },
  'representative.update': async (data, identifier) => {
    await Representative.updateOne({ _id: identifier }, data);
  },
  'student.update': async (data, identifier) => {
    await Student.updateOne({ _id: identifier }, data);
  },
  'student.uploadCV': async (data, identifier) => {
    await writeFile(`./data/${identifier}`, data.cv);
  },
  'student.shareInfo': async (data, identifier) => {
    let operation;
    if (data.shareState) {
      operation = { $push: { share: data.enid } };
    } else {
      operation = { $pull: { share: data.enid } };
    }

    await Student.updateOne({ _id: identifier }, operation);
  },
  delete: async (data, identifier) => {
    await User.deleteOne({ _id: identifier });
  },
  deleteOfEntity: async (data, identifier) => {
    await Representative.deleteMany({ enid: data.enid });
  },
}

export default (payload) => {
  let event = protobufEvent.toObject(protobufEvent.decode(payload), {
    enums: String,
    arrays: true
  });

  if (!(event.operation in events)) {
    throw new Error('Unkown operation: ' + event.operation);
  }

  return events[event.operation](event.data, event.identifier);
}
