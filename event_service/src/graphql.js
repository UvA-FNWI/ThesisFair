import { graphql, GraphQLError } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';

import { Event } from './database.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
    event: {
        type: 'Event',
        args: {
            evid: 'ID!',
        },
        resolve: async (obj, args, req) => {
          const event = await Event.findById(args.evid);

          if (!event.enabled && req.user.type !== 'a') {
            throw new Error('UNAUTHORIZED list disabled event');
          }

          return event;
        },
    },
    events: {
      type: '[Event!]',
      args: {
          all: 'Boolean',
      },
      resolve: (obj, args, req) => {
        if (args.all && req.user.type !== 'a') {
          throw new Error('UNAUTHORIZED list all events');
        }

        return Event.find(args.all ? {} : { enabled: true });
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
            entities: '[ID!]'
        },
        resolve: (obj, args, req) => {
          if (req.user.type !== 'a') {
            throw new Error('UNAUTHORIZED create a new event');
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
            entities: '[ID!]'
        },
        resolve: (obj, args, req) => {
          if (req.user.type !== 'a') {
            throw new Error('UNAUTHORIZED update an event');
          }

          const evid = args.evid;
          delete args.evid;
          return Event.findByIdAndUpdate(evid, { $set: args }, { new: true });
        },
    },
    'event.delete': {
        type: 'Event',
        args: {
            evid: 'ID!',
        },
        resolve: (obj, args, req) => {
          if (req.user.type !== 'a') {
            throw new Error('UNAUTHORIZED create delete an event');
          }

          return Event.findByIdAndDelete(args.evid);
        },
    },

    'event.entity.add': {
        type: 'Event',
        args: {
            evid: 'ID!',
            enid: 'ID!',
        },
        resolve: (obj, args, req) => {
          if (req.user.type !== 'a') {
            throw new Error('UNAUTHORIZED add an entity to an event');
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
        resolve: (obj, args, req) => {
          if (req.user.type !== 'a') {
            throw new Error('UNAUTHORIZED delete an entity from an event');
          }

          return Event.findByIdAndUpdate(args.evid, { $pull: { entities: args.enid } }, { new: true });
        },
    },
})

const schema = schemaComposer.buildSchema();

const execute = (query, variableValues = {}, contextValue = {}) => graphql({ schema, source: query, variableValues, contextValue });
export default execute;
