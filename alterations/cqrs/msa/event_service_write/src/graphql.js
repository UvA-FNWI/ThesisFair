import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';

import { rgraphql } from '../../libraries/amqpmessaging/index.js';
import { CQRSEvent, Event } from './database.js';

const checkEntitiesExist = async (entities) => {
  const res = await rgraphql('api-entity', 'query($enids: [ID!]!){entities(enids:$enids){enid}}', { enids: entities });
  if (res.errors) {
    console.error('Checking entities failed', res.errors);
    throw new Error('Unexpected error occured while checking if entities exist');
  }

  const enids = res.data.entities.map((entity) => entity ? entity.enid : null);
  for (const enid of entities) {
    if (!enids.includes(enid)) {
      throw new Error(`Entity ${enid} does not exist!`);
    }
  }
}

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
  'event_service_write': {
    type: 'String',
    description: JSON.stringify({}),
    resolve: (obj, args) => 'placeholder_query',
  }
});

schemaComposer.Mutation.addNestedFields({
  'event.create': {
    type: 'Event',
    args: {
      enabled: 'Boolean',
      name: 'String!',
      description: 'String',
      start: 'Date',
      location: 'String',
      studentSubmitDeadline: 'Date',
      entities: '[ID!]'
    },
    description: JSON.stringify({
      caching: { type: 'event', key: 'evid', create: true }
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED create a new event');
      }

      if (args.entities) {
        await checkEntitiesExist(args.entities);
      }

      const event = new Event(args);
      await event.validate();

      CQRSEvent.create({
        operation: 'create',
        data: event.toObject(),
      });

      return event;
    },
  },
  'event.update': {
    type: 'Event',
    args: {
      evid: 'ID!',
      enabled: 'Boolean',
      name: 'String',
      description: 'String',
      start: 'Date',
      location: 'String',
      studentSubmitDeadline: 'Date',
      entities: '[ID!]'
    },
    description: JSON.stringify({
      caching: { type: 'event', key: 'evid', update: true }
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update an event');
      }

      if (args.entities) {
        await checkEntitiesExist(args.entities);
      }

      const evid = args.evid;
      delete args.evid;

      const event = new Event({ ...args, _id: evid });
      await event.validate();

      CQRSEvent.create({
        operation: 'update',
        data: event.toObject(),
        identifier: evid,
      });

      return event;
    },
  },
  'event.delete': {
    type: 'Event',
    args: {
      evid: 'ID!',
    },
    description: JSON.stringify({
      caching: { type: 'event', key: 'evid', delete: true }
    }),
    resolve: (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED create delete an event');
      }

      CQRSEvent.create({
        operation: 'delete',
        identifier: args.evid,
      });

      return null;
    },
  },

  'event.entity.add': {
    type: 'Event',
    args: {
      evid: 'ID!',
      enid: 'ID!',
    },
    description: JSON.stringify({
      caching: { type: 'event', key: 'evid', update: true }
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED add an entity to an event');
      }

      const res = await rgraphql('api-entity', 'query($enid:ID!) { entity(enid:$enid) { enid } } ', { enid: args.enid });
      if (res.errors) {
        console.error('Checking entity failed:', res.errors);
        throw new Error('Unexpected error while checking if entity exists');
      }
      if (!res.data.entity) {
        throw new Error('Could not find an entity with that enid');
      }

      CQRSEvent.create({
        operation: 'entity.add',
        data: args.enid,
        identifier: args.evid,
      });

      return null;
    },
  },
  'event.entity.del': {
    type: 'Event',
    args: {
      evid: 'ID!',
      enid: 'ID!',
    },
    description: JSON.stringify({
      caching: { type: 'event', key: 'evid', update: true }
    }),
    resolve: (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete an entity from an event');
      }

      CQRSEvent.create({
        operation: 'entity.del',
        data: args.enid,
        identifier: args.evid,
      });

      return null;
    },
  },
})

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
