import { Event } from './database.js';

const events = {
  create: async (data, identifier) => {
    await Event.create(data);
  },
  update: async (data, identifier) => {
    await Event.updateOne({ _id: identifier }, data);
  },
  delete: async (data, identifier) => {
    await Event.deleteOne(identifier);
  },
  'entity.add': async (data, identifier) => {
    await Event.updateOne({ _id: identifier }, { $push: { entities: data } });
  },
  'entity.del': async (data, identifier) => {
    await Event.updateOne({ _id: identifier }, { $pull: { entities: data } });
  }
}

export default (payload) => {
  if (!(payload.operation in events)) {
    throw new Error('Unkown operation: ' + payload.operation);
  }

  return events[payload.operation](payload.data, payload.identifier);
}
