import { mkdirSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';

import { User, Representative, Student } from './database.js';

if (!existsSync('./data')) {
  mkdirSync('./data');
}

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
    await writeFile(`./data/${identifier}`, data);
  },
  'student.shareInfo': async (data, identifier) => {
    let operation;
    if (data.share) {
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
    await User.deleteMany({ enid: data.enid });
  },
}

export default (payload) => {
  if (!(payload.operation in events)) {
    throw new Error('Unkown operation: ' + payload.operation);
  }

  return events[payload.operation](payload.data, payload.identifier);
}
