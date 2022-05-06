import { graphql } from 'graphql';
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
        resolve: (obj, args) => Event.findById(args.evid),
    },
    events: {
      type: '[Event!]!',
      args: {
          all: 'Boolean',
      },
      resolve: (obj, args) => {
        // TODO: Premission checking
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
        resolve: (obj, args) => Event.create(args),
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
        resolve: (obj, args) => {
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
        resolve: (obj, args) => Event.findByIdAndDelete(args.evid),
    },

    'event.entity.add': {
        type: 'Event',
        args: {
            evid: 'ID!',
            enid: 'ID!',
        },
        resolve: (obj, args) => Event.findByIdAndUpdate(args.evid, { $push: { entities: args.enid } }),
    },
    'event.entity.del': {
        type: 'Event',
        args: {
            evid: 'ID!',
            enid: 'ID!',
        },
        resolve: (obj, args) => Event.findByIdAndUpdate(args.evid, { $pull: { entities: args.enid } }),
    },
})

const schema = schemaComposer.buildSchema();

const execute = (query, variableValues = {}) => graphql({ schema, source: query, variableValues });
export default execute;
