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
        resolve: async (obj, args) => Event.findById(args.evid),
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
        resolve: async (obj, args) => await Event.create(args),
    },
    'event.update': {
        type: 'Event',
        args: {
            evid: 'ID!',
            enabled: 'Boolean',
            name: 'String!',
            description: 'String',
            start: 'Date',
            location: 'String',
            studentSubmitDeadline: 'Date',
            entities: '[ID!]'
        },
        resolve: (obj, args) => Event.findByIdAndUpdate(args.evid),
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
