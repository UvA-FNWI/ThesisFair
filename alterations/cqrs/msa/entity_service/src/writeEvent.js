import { Entity } from './database.js';

const create = (data, identifier) => {
  console.log('creating', data, identifier);
  Entity.create(data);
}

const update = (data, identifier) => {
  console.log('updating', data, identifier);
  Entity.updateOne(identifier, data);
}

const del = (data, identifier) => {
  console.log('deleting', data, identifier);
  Entity.deleteOne(identifier);
}

export default (payload) => {
  switch (payload.operation) {
    case 'create':
      create(payload.data, payload.identifier);
      break;

    case 'update':
      update(payload.data, payload.identifier);
      break;

    case 'delete':
      del(payload.data, payload.identifier);
      break;

    default:
      throw new Error('Unkown operation: ' + payload.operation);
  }
}
