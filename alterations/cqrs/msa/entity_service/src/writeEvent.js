import { Entity } from './database.js';

const events = {
  create: (data, identifier) => {
    Entity.create(data);
  },
  update: (data, identifier) => {
    Entity.updateOne({ _id: identifier }, data);
  },
  delete: (data, identifier) => {
    Entity.deleteOne({ _id: identifier });
  },
}

export default (payload) => {
  if (!(payload.operation in events)) {
    throw new Error('Unkown operation: ' + payload.operation);
  }

  return events[payload.operation](payload.data, payload.identifier);
}
