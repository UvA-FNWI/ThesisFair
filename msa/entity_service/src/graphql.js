import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';
import { parse as csvParser } from 'csv-parse';

import { rgraphql } from '../../libraries/amqpmessaging/index.js';
import { Entity } from './database.js';
import config from './config.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
  entity: {
    type: 'Entity',
    args: {
      enid: 'ID!',
    },
    resolve: (obj, args) => Entity.findById(args.enid),
  },
  entities: {
    type: '[Entity!]',
    args: {
      enids: '[ID!]!'
    },
    resolve: (obj, args) => Entity.find({ _id: { $in: args.enids } }),
  }
});

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
    resolve: (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED create entities');
      }

      return Entity.create(args);
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
    resolve: (obj, args, req) => {
      const enid = args.enid;
      delete args.enid;

      if (!(req.user.type === 'a' || (req.user.type === 'r' && req.user.repAdmin === true && req.user.enid === enid))) {
        throw new Error('UNAUTHORIZED update this entity');
      }

      if (args.type && req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update type of entity');
      }

      return Entity.findByIdAndUpdate(enid, { $set: args }, { new: true });
    },
  },
  'entity.delete': {
    type: 'Entity',
    args: {
      enid: 'ID!',
    },
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete entities');
      }

      const [projects, users] = await Promise.all([
        rgraphql('API_project', 'mutation deleteLinkedProjects($enid: ID!) { project { deleteOfEntity(enid: $enid) } }', { enid: args.enid }),
        rgraphql('API_user', 'mutation deleteLinkedUsers($enid: ID!) { user { deleteOfEntity(enid: $enid) } }', { enid: args.enid }),
      ]);
      if (projects.errors || !projects.data.project || !projects.data.project.deleteOfEntity) {
        console.error('Deleting linked projects failed', projects.errors);
        throw new Error('Deleting all linked projects failed');
      }

      if (users.errors || !users.data.user || !users.data.user.deleteOfEntity) {
        console.error('Deleting linked users failed', users.errors);
        throw new Error('Deleting all representatives failed');
      }

      return Entity.findByIdAndDelete(args.enid)
    },
  },
  'entity.import': {
    type: '[Entity]',
    args: {
      file: 'String!',
    },
    resolve: (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED import entities');
      }

      return new Promise((resolve, reject) => {
        csvParser(args.file.trim(), { columns: true }, (err, records, info) => {
          if (err) { reject(err); return; }

          resolve(
            Promise.all(
              records.map(async (record) => {
                const external_id = record[config.entity_external_id];
                const entity = await Entity.find({ external_id: external_id });
                if (entity.length > 0) {
                  return null;
                }

                // TODO: Create admin representative accounts with name and email address

                return Entity.create({
                  name: record[config.entity_name],
                  external_id,
                  type: 'company',
                })
              })
            )
          );
        });
      });
    }
  }
});

const schema = schemaComposer.buildSchema();

const execute = (query, variableValues = {}, contextValue = {}) => graphql({ schema, source: query, variableValues, contextValue });
export default execute;
