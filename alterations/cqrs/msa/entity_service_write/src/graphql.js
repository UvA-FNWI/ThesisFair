import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';

import { rgraphql } from '../../libraries/amqpmessaging/index.js';
import { Entity, Event } from './database.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
  'entity_service_write': {
    type: 'String',
    description: JSON.stringify({}),
    resolve: (obj, args) => 'placeholder_query',
  }
})

schemaComposer.Mutation.addNestedFields({
  'entity.create': {
    type: 'Entity',
    args: {
      name: 'String!',
      description: 'String',
      type: 'String!',
      contact: '[EntityContactInfoIn!]',
      external_id: 'Int',
    },
    description: JSON.stringify({
      caching: { type: 'entity', key: 'enid', create: true },
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED create entities');
      }

      const entity = new Entity(args);
      await entity.validate();

      await Event.create({
        operation: 'create',
        data: entity.toObject(),
      });

      return entity;
    }
  },
  'entity.update': {
    type: 'Entity',
    args: {
      enid: 'ID!',
      name: 'String',
      description: 'String',
      type: 'String',
      contact: '[EntityContactInfoIn!]',
      external_id: 'Int',
    },
    description: JSON.stringify({
      caching: { type: 'entity', key: 'enid', update: true },
    }),
    resolve: async (obj, args, req) => {
      const enid = args.enid;
      delete args.enid;

      if (!(req.user.type === 'a' || (req.user.type === 'r' && req.user.repAdmin === true && req.user.enid === enid))) {
        throw new Error('UNAUTHORIZED update this entity');
      }

      if (args.type && req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update type of entity');
      }

      const entity = new Entity({ ...args, _id: enid });
      await entity.validate();

      await Event.create({
        operation: 'update',
        data: args,
        identifier: enid,
      });

      return entity;
    },
  },
  'entity.delete': {
    type: 'Entity',
    args: {
      enid: 'ID!',
    },
    description: JSON.stringify({
      caching: { type: 'entity', key: 'enid', delete: true },
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete entities');
      }

      const [projects, users] = await Promise.all([
        rgraphql('api-project-write', 'mutation deleteLinkedProjects($enid: ID!) { project { deleteOfEntity(enid: $enid) } }', { enid: args.enid }),
        rgraphql('api-user-write', 'mutation deleteLinkedUsers($enid: ID!) { user { deleteOfEntity(enid: $enid) } }', { enid: args.enid }),
      ]);
      if (projects.errors || !projects.data.project || !projects.data.project.deleteOfEntity) {
        console.error('Deleting linked projects failed', projects.errors);
        throw new Error('Deleting all linked projects failed');
      }

      if (users.errors || !users.data.user || !users.data.user.deleteOfEntity) {
        console.error('Deleting linked users failed', users.errors);
        throw new Error('Deleting all representatives failed');
      }

      await Event.create({
        operation: 'delete',
        identifier: args.enid,
      });

      return null;
    },
  }
});

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
