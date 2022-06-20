import { Entity } from './database.js';

const events = {
  create: async (data, identifier) => {
    await Entity.create(data);
  },
  update: async (data, identifier) => {
    await Entity.updateOne({ _id: identifier }, data);
  },
  delete: async (data, identifier) => {
    await Entity.deleteOne({ _id: identifier });
  },
}

export default (payload) => {
  if (!(payload.operation in events)) {
    throw new Error('Unkown operation: ' + payload.operation);
  }

  return events[payload.operation](payload.data, payload.identifier);
}
