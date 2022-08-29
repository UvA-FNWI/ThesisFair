import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';
import { parse as csvParser } from 'csv-parse';

import { rgraphql } from '../../libraries/amqpmessaging/index.js';
import { Entity } from './database.js';
import config from './config.js';
import { canGetAllEntities } from './permissions.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
  entity: {
    type: 'Entity',
    args: {
      enid: 'ID!',
    },
    description: JSON.stringify({
      caching: { type: 'entity', key: 'enid' },
    }),
    resolve: (obj, args) => Entity.findById(args.enid),
  },
  entityByExtID: {
    type: 'Entity',
    args: {
      external_id: 'ID!',
    },
    description: JSON.stringify({
      caching: { type: 'entity', key: 'enid' },
    }),
    resolve: (obj, args) => Entity.findOne({ external_id: args.external_id }),
  },
  entitiesAll: {
    type: '[Entity!]',
    description: JSON.stringify({
      checkPermissions: canGetAllEntities.toString(),
      caching: { type: 'entity', key: 'enid', multiple: true },
    }),
    resolve: (obj, args, req) => {
      canGetAllEntities(req);
      return Entity.find();
    },
  },
  entities: {
    type: '[Entity!]',
    args: {
      enids: '[ID!]!'
    },
    description: JSON.stringify({
      caching: { type: 'entity', key: 'enid', keys: 'enids' },
    }),
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
    description: JSON.stringify({
      caching: { type: 'entity', key: 'enid', create: true },
    }),
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
    description: JSON.stringify({
      caching: { type: 'entity', key: 'enid', update: true },
    }),
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
    description: JSON.stringify({
      caching: { type: 'entity', key: 'enid', delete: true },
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete entities');
      }

      const [projects, users] = await Promise.all([
        rgraphql('api-project', 'mutation deleteLinkedProjects($enid: ID!) { project { deleteOfEntity(enid: $enid) } }', { enid: args.enid }),
        rgraphql('api-user', 'mutation deleteLinkedUsers($enid: ID!) { user { deleteOfEntity(enid: $enid) } }', { enid: args.enid }),
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
    type: '[EntityImportResult!]!',
    args: {
      file: 'String!',
    },
    description: JSON.stringify({
      caching: { type: 'entity', key: 'enid', multiple: true },
    }),
    resolve: (obj, args, req) => {
      if (!(req.user.type === 'a' || req.user.type === 'service')) {
        throw new Error('UNAUTHORIZED import entities');
      }

      return new Promise((resolve, reject) => {
        csvParser(args.file.trim(), { columns: true }, (err, records, info) => {
          if (err) { reject(err); return; }

          if (records.length === 0) {
            reject(new Error('No row provided to import'));
            return;
          }

          if (!Object.values(config.fields).every((key) => key in records[0])) {
            reject(new Error('Not all required fields supplied! Required fields are: ' + Object.values(config.fields).join(',')));
            return;
          }

          resolve(
            Promise.all(
              records.map(async (record) => {
                const name = record[config.fields.name].trim();
                const adminNames = record[config.fields.user_names].split(config.array_separator).map((item) => item.trim());
                const adminEmails = record[config.fields.user_emails].split(config.array_separator).map((item) => item.trim());
                const enabled = record[config.fields.enabled].trim() !== '0';
                const external_id = record[config.fields.external_id].trim();

                let entity = await Entity.findOne({ external_id: external_id });
                if (entity) {
                  if (enabled) { // Entity already created.
                    if (name)
                      entity.name = name;
                    await entity.save();
                    return { entity };
                  }

                  // Delete entity
                  const res = await rgraphql('api-user', 'mutation deleteUsersOfEntity($enid: ID!) { user { deleteOfEntity(enid: $enid) } }', { enid: entity.enid });
                  if (res.errors) {
                    console.error(res);
                    return { error: 'Unexpected error has occured' };
                  }

                  await Entity.deleteOne({ external_id: external_id });
                  return {};
                }

                if (!enabled) { // Entity already deleted.
                  return {};
                }

                // Create entity and admin accounts
                if (adminNames.length !== adminEmails.length) {
                  return { error: 'Fields Admin names and Admin emails need to have the same length!' };
                }

                entity = await Entity.create({
                  name: name,
                  external_id,
                  type: 'company',
                });

                for (let i = 0; i < adminNames.length; i++) {
                  const split = adminNames[i].split(' ');
                  const firstname = split.shift();
                  const lastname = split.join(' ');
                  const email = adminEmails[i];

                  const res = await rgraphql('api-user', 'mutation createAdminRepresentative($enid: ID!, $firstname: String, $lastname: String, $email: String!) { user { representative { create(enid: $enid, firstname: $firstname, lastname: $lastname, email: $email, repAdmin: true) { uid } } } }', { enid: entity.enid, firstname, lastname, email });
                  if (res.errors) {
                    // Delete all users and, log and return error message.
                    await rgraphql('api-user', 'mutation deleteUsersOfEntity($enid: ID!) { user { deleteOfEntity(enid: $enid) } }', { enid: entity.enid });

                    console.error('Unexpected error while creating users: ', res);
                    return { error: 'Unexpected error has occured' };
                  }
                }

                return { entity };
              })
            )
          );
        });
      });
    }
  }
});

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
