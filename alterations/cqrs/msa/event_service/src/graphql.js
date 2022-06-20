import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';

import { Event } from './database.js';
import { canGetEvent, canGetEvents } from './permissions.js';

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

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
