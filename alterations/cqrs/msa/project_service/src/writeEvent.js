import { Project } from './database.js';

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
  console.log(payload);
  if (!(payload.operation in events)) {
    throw new Error('Unkown operation: ' + payload.operation);
  }

  return events[payload.operation](payload.data, payload.identifier);
}
