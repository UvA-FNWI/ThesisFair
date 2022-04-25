import { graphql, buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema'
import { readFileSync } from 'fs';

import { Event } from './database.js';

const resolvers = {
    Query: {
        event: (obj, args) => Event.findById(args.evid),
    },
    Mutation: {
        createEvent: (obj, args) => {
            console.log('Creating object', args);
            return Event.create(args);
        },
        updateEvent: (obj, args) => Event.findByIdAndUpdate(args.evid),
        deleteEvent: (obj, args) => Event.findByIdAndDelete(args.evid),

        addEntity: (obj, args) => Event.findByIdAndUpdate(args.evid, {
            $push: {
                entities: args.enid,
            }
        }),
        delEntity: (obj, args) => Event.findByIdAndUpdate(args.evid, {
            $pull: {
                entities: args.enid,
            }
        }),
    },
};

const schema = makeExecutableSchema({
    typeDefs: readFileSync('./schema.graphql').toString('utf8'),
    resolvers
  });

const execute = (query, variableValues = {}) => {
    return graphql({ schema, source: query, variableValues })
}

export default execute;
