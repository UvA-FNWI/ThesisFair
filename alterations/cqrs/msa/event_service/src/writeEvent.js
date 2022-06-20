import { Event } from './database.js';

const events = {
  create: (data, identifier) => {
    Event.create(data);
  },
  update: (data, identifier) => {
    Event.updateOne({ _id: identifier }, data);
  },
  delete: (data, identifier) => {
    Event.deleteOne(identifier);
  },
  'entity.add': (data, identifier) => {
    Event.updateOne({ _id: identifier }, { $push: { entities: data } });
  },
  'entity.del': (data, identifier) => {
    Event.updateOne({ _id: identifier }, { $pull: { entities: data } });
  }
}

export default (payload) => {
  if (!(payload.operation in events)) {
    throw new Error('Unkown operation: ' + payload.operation);
  }

  return events[payload.operation](payload.data, payload.identifier);
}
