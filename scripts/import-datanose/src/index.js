import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { globSync } from 'glob'

const msaDir = '../../../msa'
const mongoAddress = process.argv[2] || 'localhost:27017'

// A map from datanose IDs to IDs in the thesisfair system
// const datanoseOrganizations = globSync('data/organizations-dev.csv').map(
const datanoseOrganizations = globSync('data/organizations*.csv').map(
  f => parse(readFileSync(f), {columns: true})
).flat()
// const datanoseProjects = globSync('data/projects-dev.csv').map(
const datanoseProjects = globSync('data/projects*.csv').map(
  f => parse(readFileSync(f), {columns: true})
).flat()
const eventData = parse(readFileSync('data/events.csv'), {columns: true})
for (const event of eventData) {
  event.degrees = event.degrees.slice(1, -1).split(',').map(d => d.trim())
  event.external_id = event['﻿external_id']
}

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

function projects(projects, entityIdMap, eventIdMap) {
  return projects.map(project => {
    return {
      enid: entityIdMap[project['﻿Organisation']],
      evids: project['Fairs'] ? [eventIdMap[project['Fairs']]] : [],
      name: project['Project Title'],
      description: project['Project Description'],
      environment: project['Work environment'],
      expectations: project['Expectations'],
      degrees: project['Fairs'].includes('AI') ? ['AI'] : ['CPS', 'DS', 'IS', 'MoL', 'SE'],
      attendance: project['Participate in'] ? 'yes' : 'no',
      numberOfStudents: isNaN(project['Number of Students']) ? undefined : project['Number of Students'],
      email: project['Project Contact'],
    }
  })
}

async function writeToDB(service, data, discriminator=null, drop=true) {
  discriminator = discriminator ?
    discriminator[0].toUpperCase() + discriminator.slice(1) :
    service[0].toUpperCase() + service.slice(1)
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
  const entityNameMap = Object.fromEntries(
    dbEntities.map(
      entity => [entity['name'], entity['_id'].toString()]
    )
  )

  // Write users to DB using this mapping
  const userData = users(datanoseOrganizations, entityIdMap)
  await writeToDB('user', userData, 'representative')

  // Write events to DB
  const dbEvents = await writeToDB('event', eventData)

  // keep track of event ID mapping
  const eventIdMap = Object.fromEntries(
    dbEvents.map(
      entity => [entity['external_id'], entity['_id'].toString()]
    )
  )

  // Write projects to DB
  const projectData = projects(datanoseProjects, entityNameMap, eventIdMap)
  await writeToDB('project', projectData)
}

main()
