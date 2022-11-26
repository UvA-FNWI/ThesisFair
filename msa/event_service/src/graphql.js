import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync, mkdirSync, existsSync, constants } from 'fs';
import { writeFile, readFile, access } from 'fs/promises';

import { rgraphql } from '../../libraries/amqpmessaging/index.js';
import { Event } from './database.js';
import { canGetEvent, canGetEvents } from './permissions.js';

const imageTypes = ['student', 'rep']

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

const getEnid = async (external_id) => {
  const res = await rgraphql('api-entity', 'query getEnid($external_id: ID!) { entityByExtID(external_id: $external_id) { enid } }', { external_id });
  if (res.errors || !res.data) {
    console.error(res);
    throw new Error('An unkown error occured while checking if the enid is valid');
  }

  if (!res.data.entityByExtID) {
    return false;
  }

  return res.data.entityByExtID.enid;
}

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
  event: {
    type: 'Event',
    args: {
      evid: 'ID!',
    },
    description: JSON.stringify({
      permissionCheck: canGetEvent.toString(),
      caching: { type: 'event', key: 'evid' }
    }),
    resolve: async (obj, args, req) => {
      const event = await Event.findById(args.evid);
      if (!event) { return null; }
      canGetEvent(req, args, event);
      return event;
    },
  },
  eventByExtID: {
    type: 'Event',
    args: {
      external_id: 'ID!',
    },
    description: JSON.stringify({
      permissionCheck: canGetEvent.toString(),
      caching: { type: 'event', key: 'evid' }
    }),
    resolve: async (obj, args, req) => {
      const event = await Event.findOne({ external_id: args.external_id });
      if (!event) { return null; }
      canGetEvent(req, args, event);
      return event;
    },
  },
  eventImage: {
    type: 'String',
    args: {
      evid: 'ID!',
      type: 'String!',
    },
    resolve: async (obj, args, req) => {
      if (!imageTypes.includes(args.type)) {
        throw new Error('Invalid image type. Options are: ' + imageTypes.join(','));
      }

      const file = `./data/${args.evid}-${args.type}`;
      try {
        await access(file, constants.R_OK);
      } catch (error) {
        return null;
      }

      return readFile(file).then((content) => content.toString());
    }
  },
  events: {
    type: '[Event!]',
    args: {
      all: 'Boolean',
    },
    description: JSON.stringify({
      permissionCheck: canGetEvents.toString(),
      caching: { type: 'event', key: 'evid', multiple: true }
    }),
    resolve: (obj, args, req) => {
      canGetEvents(req, args);

      const filter = {};
      if (!args.all) {
        filter.enabled = true;
      }
      if (req.user.type === 'r') {
        filter.entities = {
          $in: req.user.enid,
        }
      }

      return Event.find(filter);
    },
  },
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
      entities: '[ID!]',
      external_id: 'Int!',
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

      return Event.create(args);
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
      entities: '[ID!]',
      external_id: 'Int',
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
      return Event.findByIdAndUpdate(evid, { $set: args }, { new: true });
    },
  },
  'event.updateImage': {
    type: 'Boolean',
    args: {
      evid: 'ID!',
      type: 'String!',
      image: 'String!',
    },
    description: JSON.stringify({
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update an event');
      }

      if (!imageTypes.includes(args.type)) {
        throw new Error('Invalid image type. Options are: ' + imageTypes.join(','));
      }

      const event = Event.findById(args.evid);
      if (!event) {
        throw new Error('event does not exist');
      }

      await writeFile(`./data/${args.evid}-${args.type}`, args.image);
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

      return Event.findByIdAndDelete(args.evid);
    },
  },
  'event.removeEntity': {
    type: 'String',
    args: {
      enid: 'ID!',
    },
    description: JSON.stringify({
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED remove an entity from events');
      }

      await Event.updateMany({ $pull: { entities: args.enid } });
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

      return Event.findByIdAndUpdate(args.evid, { $push: { entities: args.enid } }, { new: true });
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

      return Event.findByIdAndUpdate(args.evid, { $pull: { entities: args.enid } }, { new: true });
    },
  },
  'event.import': {
    type: '[EventImportResult!]!',
    args: {
      events: '[EventImport!]!',
    },
    description: JSON.stringify({
    }),
    resolve: (obj, args, req) => {
      if (!(req.user.type === 'a' || req.user.type === 'service')) {
        throw new Error('UNAUTHORIZED import events');
      }

      return Promise.all(
        args.events.map(async ({ ID: external_id, enabled, name, description, start, location, entities: external_enids }) => {
          const entities = external_enids ? await Promise.all(external_enids.map(getEnid)) : null;
          for (let i = 0; i < entities.length; i++) {
            if (!entities[i]) {
              return { error: `Entity with ID "${external_enids[i]}" could not be found!.` };
            }
          }

          const event = await Event.findOne({ external_id: external_id });
          if (event) {
            if (enabled) { // Update project
              if (name)
                event.name = name;
              if (description)
                event.description = description;
              if (start)
                event.start = start;
              if (location)
                event.location = location;
              if (entities)
                event.entities = entities;

              await event.save();
              return {
                object: event,
              };
            }

            // Delete project
            await Event.deleteOne({ external_id: external_id });
            return {};
          }

          if (!enabled) { // Project already deleted
            return {};
          }

          return {
            event: await Event.create({
              enabled: true,
              name,
              description,
              start,
              location,
              entities,
              external_id,
            })
          }
        })
      )
    },
  }
})

if (!existsSync('./data')) {
  mkdirSync('./data');
}

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
