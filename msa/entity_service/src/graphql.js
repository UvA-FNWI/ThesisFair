import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync } from 'fs'

import { rgraphql } from '../../libraries/amqpmessaging/index.js'
import { Entity } from './database.js'
import { canGetAllEntities } from './permissions.js'

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

const deleteEntity = async enid => {
  const calls = await Promise.all([
    rgraphql('api-event', 'mutation deleteFromEvents($enid: ID!) { event { removeEntity(enid: $enid) } }', {
      enid: enid,
    }),
    rgraphql('api-project', 'mutation deleteLinkedProjects($enid: ID!) { project { deleteOfEntity(enid: $enid) } }', {
      enid: enid,
    }),
    rgraphql('api-user', 'mutation deleteLinkedUsers($enid: ID!) { user { deleteOfEntity(enid: $enid) } }', {
      enid: enid,
    }),
    rgraphql(
      'api-schedule',
      'mutation deleteLinkedSchedules($enid: ID!) { schedule { deleteOfEntity(enid: $enid) } }',
      { enid: enid }
    ),
    rgraphql('api-vote', 'mutation deleteLinkedVotes($enid: ID!) { vote { deleteOfEntity(enid: $enid) } }', {
      enid: enid,
    }),
  ])
  for (const call of calls) {
    if (call.errors) {
      console.error('Deleting linked objects failed', call.errors)
      throw new Error('Deleting all linked objects failed')
    }
  }

  return Entity.findByIdAndDelete(enid)
}

schemaComposer.Query.addNestedFields({
  entity: {
    type: 'Entity',
    args: {
      enid: 'ID!',
    },
    description: 'Get the entity by enid.',
    resolve: (obj, args) => Entity.findById(args.enid),
  },
  entityByExtID: {
    type: 'Entity',
    args: {
      external_id: 'ID!',
    },
    description: 'Get the entity by external identifier.',
    resolve: (obj, args) => Entity.findOne({ external_id: args.external_id }),
  },
  entitiesAll: {
    type: '[Entity!]',
    description: 'Get all entities.',
    resolve: (obj, args, req) => {
      canGetAllEntities(req)
      return Entity.find()
    },
  },
  entities: {
    type: '[Entity!]',
    args: {
      enids: '[ID!]!',
    },
    description: 'Request a list of entities by supplying their enids. The order is not preserved!',
    resolve: (obj, args) => Entity.find({ _id: { $in: args.enids } }),
  },
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
      representatives: 'Int',
      location: 'String',
    },
    description: 'Create a new entity.',
    resolve: (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED create entities')
      }

      return Entity.create(args)
    },
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
      representatives: 'Int',
      location: 'String',
    },
    description: 'Update an entity.',
    resolve: (obj, args, req) => {
      const enid = args.enid
      delete args.enid

      if (!(req.user.type === 'a' || (req.user.type === 'r' && req.user.repAdmin === true && req.user.enid === enid))) {
        throw new Error('UNAUTHORIZED update this entity')
      }

      if (args.type && req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update type of entity')
      }

      return Entity.findByIdAndUpdate(enid, { $set: args }, { new: true })
    },
  },
  'entity.delete': {
    type: 'Entity',
    args: {
      enid: 'ID!',
    },
    description: 'Delete an entity.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete entities')
      }

      return deleteEntity(args.enid)
    },
  },
  'entity.import': {
    type: '[EntityImportResult!]!',
    args: {
      entities: '[EntityImport!]!',
    },
    description: `Import entities
Parameters:
- entities - Structured data of type EntityImport

The EntityImport type has the following fields:
- ID - A unique numeric identifier from the system that is sending the data
- name - The name of the organisation
- representatives - The number of representatives from this organisation, filled in by the event managers.
- admins - Array of AdminAccount objects which have the keys firstname, lastname and email.
- enabled - When false the organisation will be deleted, otherwise it will be upserted.

Example Payload:
\`\`\`
[
  {
    "ID": 10101,
    "name": "UvA",
    "representatives": 2,
    "admins": [
      {
        "firstname": "Quinten",
        "lastname": "Coltof",
        "email": "quinten.coltof@uva.nl",
      },
      {
        "firstname": "Yvanka",
        "lastname": "van Dijk",
        "email": "yvanka.van.dijk@uva.nl",
      },
    ],
    "enabled": true
  },
  {
    "ID": 20202,
    "name": "ASML",
    "representatives": 2,
    "admins": [
      {
        "firstname": "Lucas",
        "lastname": "van Dijk",
        "email": "lucas.van.dijk@uva.nl",
      },
      {
        "firstname": "Yvonne",
        "lastname": "van Dijk",
        "email": "yvonne.van.dijk@uva.nl",
      },
    ],
    "enabled": true
  }
]
\`\`\`
    `,
    resolve: (obj, args, req) => {
      if (!(req.user.type === 'a' || req.user.type === 'service')) {
        throw new Error('UNAUTHORIZED import entities')
      }

      return Promise.all(
        args.entities.map(async ({ ID: external_id, name, enabled, representatives }) => {
          let entity = await Entity.findOne({ external_id: external_id })
          if (entity) {
            if (enabled) {
              // Entity already created.
              if (name) entity.name = name
              if (representatives) entity.representatives = representatives
              await entity.save()
              return { entity }
            }

            // Delete entity
            try {
              await deleteEntity(entity.enid)
            } catch (error) {
              return { error: error }
            }
            return {}
          }

          if (!enabled) {
            // Entity already deleted.
            return {}
          }

          // Create entity and admin accounts
          return {
            entity: await Entity.create({
              name: name,
              external_id,
              representatives,
              type: 'company',
            }),
          }
        })
      )
    },
  },
})

const schema = schemaComposer.buildSchema()

const executeGraphql = ({ query, variables = {}, context = {} }) =>
  graphql({ schema, source: query, variableValues: variables, contextValue: context })
export default executeGraphql
