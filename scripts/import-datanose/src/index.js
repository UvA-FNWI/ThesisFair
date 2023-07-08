import { MongoDBProvisioner } from '../../../msa/libraries/mongodbprovisioner/index.js'
import { normalize } from '../../../msa/libraries/mongodbprovisioner/index.js'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { globSync } from 'glob'

const msaDir = '../../../msa'
const mongoAddress = process.argv[2] || 'localhost:27017'

// A map from datanose IDs to IDs in the thesisfair system
const datanoseOrganizations = parse(readFileSync('data/organizations.csv'), {columns: true})
const datanoseProjects = Object.fromEntries(
  globSync('data/projects_*-*.csv').map(f => [f, parse(readFileSync(f), {columns: true})])
)

function parseContacts(contacts) {
  const splitContacts = []
  let depth = 0
  let cut = 0

  for (const i in contacts) {
    if (contacts[i] == '(') {
      depth += 1
    }

    if (contacts[i] == ')') {
      depth -= 1
    }

    if (contacts[i] == ',' && depth == 0) {
      splitContacts.push(contacts.slice(cut, i).trim())
      cut = new Number(i) + 1
    }
  }

  if (cut < contacts.length) {
    splitContacts.push(contacts.slice(cut, contacts.length).trim())
  }

  return splitContacts
}

function contactsToUsers(contactsString) {
  const users = []
  const contacts = parseContacts(contactsString)

  for (const contact of contacts) {
    const user = contact.match(
      /(?<firstname>(?:[a-z]+\. )*[^()]+?) +(?<lastname>[^()]*) \((?<email>.*), (?<entity>.*)\)/
    ).groups
    delete user.entity

    users.push(Object.assign({}, user))
  }

  return users
}

// Takes tabular datanose data of orgs and a mapping from external entity IDs
// to internal entity IDs
function users(orgs, entityIdMap) {
  const users = []

  for (const org of orgs) {
    for (const user of contactsToUsers(org.Contacts)) {
      user.enid = entityIdMap[org['ID']]
      users.push(user)
    }
  }

  return users
}

function entities(orgs) {
  return orgs.map(org => {
    const reps = contactsToUsers(org['Contacts'])

    return {
      name: org['﻿Name'],
      description: org['About'],
      type: org['Type'][0],
      contact: [
        { type: 'email',
          content: reps.length > 0 ? reps[0].email : 'No email specified',
        },
        { type: 'website',
          content: org['Website'] || 'No website specified',
        }
      ],
      external_id: org['ID'],
      representatives: reps.length,
    }
  })
}

const configs = {
  entities: {
    uri: process.env.mongodbConStrEntity || `mongodb://${mongoAddress}/entity_service`,
    library: import(`${msaDir}/entity_service/src/database.js`),
    object: 'Entity',
    get: db => genEntities()
  },
  events: {
    uri: process.env.mongodbConStrEvent || 'mongodb://${mongoAddress}/event_service',
    library: import(`${msaDir}/event_service/src/database.js`),
    object: 'Event',
  },
  projects: {
    uri: process.env.mongodbConStrProject || `mongodb://${mongoAddress}/project_service`,
    library: import(`${msaDir}/project_service/src/database.js`),
    object: 'Project',
  },
  users: {
    uri: process.env.mongodbConStrUser || `mongodb://${mongoAddress}/user_service`,
    library: import(`${msaDir}/user_service/src/database.js`),
    object: 'User',
    objects: ['User', 'Student', 'Representative'],
    hide: ['password'],
  },
  votes: {
    uri: process.env.mongodbConStrVote || `mongodb://${mongoAddress}/vote_service`,
    library: import(`${msaDir}/vote_service/src/database.js`),
    object: 'Vote',
  },
}

// const provisioner = new MongoDBProvisioner(configs)
// 
// export let db
// export let models
// export const init = provisioner.init

async function writeToDB(service, data, discriminator=null, drop=true) {
  discriminator = discriminator ?
    discriminator[0].toUpperCase() + discriminator.slice(1) :
    service[0].toUpperCase() + service.slice(1)
  console.log(discriminator)
  const DB = await import(`${msaDir}/${service}_service/src/database.js`)
  await DB.connect(`mongodb://${mongoAddress}/${service}_service`)
  const DBModel = DB[discriminator]
  if (drop) {
    await DBModel.deleteMany({})
  }
  const res = await DBModel.insertMany(data, null)
  await DB.disconnect()

  return res
}
async function main() {
  // Write entities to DB
  const entityData = entities(datanoseOrganizations)
  const dbEntities = await writeToDB('entity', entityData)

  // Keep track of entity ID mapping
  const entityIdMap = Object.fromEntries(
    dbEntities.map(
      entity => [entity['external_id'], entity['_id'].toString()]
    )
  )

  // Write users to DB
  const userData = users(datanoseOrganizations, entityIdMap)
  const dbUsers = await writeToDB('user', userData, 'representative')
}

main()
// provisioner.init().then(main).then(provisioner.disconnect)
