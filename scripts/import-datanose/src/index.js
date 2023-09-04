import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { globSync } from 'glob'

const msaDir = '../../../msa'
const mongoAddress = 'localhost:27017'
const devMode = process.argv[2] === 'dev'

// A map from datanose IDs to IDs in the thesisfair system
// const organizationFiles = devMode ? globSync('data/organizations-dev.csv') : globSync('data/organizations*.csv')
const organizationFiles = globSync('data/organizations*.csv')
// const organizationFiles = globSync('data/organizations-dev.csv')
const datanoseOrganizations = organizationFiles.map(f => parse(readFileSync(f), { columns: true })).flat()

// const projectFiles = devMode ? globSync('data/projects-dev.csv') : globSync('data/projects*.csv')
const projectFiles = globSync('data/projects*.csv')
const datanoseProjects = projectFiles.map(f => parse(readFileSync(f), { columns: true })).flat()

const eventData = parse(readFileSync('data/events.csv'), { columns: true })
for (const event of eventData) {
  event.degrees = event.degrees
    .slice(1, -1)
    .split(',')
    .map(d => d.trim())
  event.external_id = event['﻿external_id'] || event['external_id']
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
      /(?<firstname>(?:[a-z]+\. )*[^()]+?) +(?<lastname>[^()]*) \((?<email>.*), (?<entityName>.*)\)/
    ).groups
    delete user.entity

    if (devMode) {
      user['password'] = '$2b$10$k6sWNYGtbJMtl4yvsMbpZuKN0n5/V4.0B8P3MGnAY5mcvw1P5/Voy'
    }

    switch (`${user.firstname} ${user.lastname}`) {
      case 'Yasmin Santis':
      case 'Grace Watson':
      case 'Ischa Abraham':
      case 'Jake Jongejans':
        user.admin = true
    }

    users.push(Object.assign({}, user))
  }

  return users
}

// Takes tabular datanose data of orgs and a mapping from external entity IDs
// to internal entity IDs
function users(orgs, entityIdMap) {
  const users = new Map() // Map from user e-mail to user data

  for (const org of orgs) {
    for (const user of contactsToUsers(org.Contacts)) {
      if (users.has(user.email)) {
        users.get(user.email).enids.push(entityIdMap[org['ID']])
      } else {
        user.enids = [entityIdMap[org['ID']]]
        users.set(user.email, user)
      }
    }
  }

  if (devMode) {
    users.set('admin', {
      firstname: 'admin',
      lastname: 'admin',
      email: 'admin',
      admin: true,
      password: '$2b$10$k6sWNYGtbJMtl4yvsMbpZuKN0n5/V4.0B8P3MGnAY5mcvw1P5/Voy'
    })
  }

  return Array.from(users.values())
}

function entities(orgs) {
  return orgs.map(org => {
    const reps = contactsToUsers(org['Contacts'])

    return {
      name: org['﻿Name'] || org['Name'],
      description: org['About'],
      type: org['Type'][0],
      contact: [
        { type: 'email', content: reps.length > 0 ? reps[0].email : 'No email specified' },
        { type: 'website', content: org['Website'] || 'No website specified' },
      ],
      external_id: org['ID'],
      representatives: reps.length,
    }
  }).concat({
    name: 'Thesisfair academics',
    grantsAcademicRights: true,
    type: 'C',
  })
}

function projects(projects, entityIdMap, eventIdMap) {
  return projects.map(project => {
    return {
      enid: entityIdMap[project['﻿Organisation'] || project['Organisation']],
      evids: project['Fairs'] ? [eventIdMap[project['Fairs']]] : [],
      name: project['Project Title'],
      description: project['Project Description'],
      environment: project['Work environment'],
      expectations: project['Expectations'],
      degrees: project['Fairs'].includes('AI') ? ['MScAI'] : ['MScCLSJD', 'MScCS', 'MScISIS', 'MScISDS', 'MScLogic', 'MScSE'],
      attendance: project['Participate in'] ? 'yes' : 'no',
      numberOfStudents: isNaN(project['Number of Students']) ? undefined : project['Number of Students'],
      email: project['Project Contact'],
    }
  })
}

async function writeToDB(service, data, discriminator = null, drop = true) {
  discriminator = discriminator
    ? discriminator[0].toUpperCase() + discriminator.slice(1)
    : service[0].toUpperCase() + service.slice(1)
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
  const entityIdMap = Object.fromEntries(dbEntities.map(entity => [entity['external_id'], entity['_id'].toString()]))
  const entityNameMap = Object.fromEntries(dbEntities.map(entity => [entity['name'], entity['_id'].toString()]))

  // Write users to DB using this mapping
  const userData = users(datanoseOrganizations, entityIdMap)
  await writeToDB('user', userData, 'representative')

  // Write events to DB
  const dbEvents = await writeToDB('event', eventData)

  // keep track of event ID mapping
  const eventIdMap = Object.fromEntries(dbEvents.map(entity => [entity['external_id'], entity['_id'].toString()]))

  // Write projects to DB
  const projectData = projects(datanoseProjects, entityNameMap, eventIdMap)
  await writeToDB('project', projectData)
}

main()
