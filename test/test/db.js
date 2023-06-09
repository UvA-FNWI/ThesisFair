import bcrypt from 'bcrypt'

import { MongoDBProvisioner } from '../../msa/libraries/mongodbprovisioner/index.js'

const saltRounds = 0
const hashCache = {}
const hash = async password => {
  if (hashCache[password]) {
    return hashCache[password]
  }

  return (hashCache[password] = await bcrypt.hash(password, saltRounds))
}

const configs = {
  entities: {
    uri: process.env.mongodbConStrEntity || 'mongodb://localhost:27017/entity_service',
    library: import('../../msa/entity_service/src/database.js'),
    object: 'Entity',
    get: db => [
      {
        name: 'New name1 - entity',
        description: 'New description1 - entity',
        type: 'company',
        contact: [
          { type: 'website', content: 'qrcsoftware.nl/1' },
          { type: 'email', content: 'info.1@uva.nl' },
          { type: 'phonenumber', content: '06 12345671' },
        ],
        external_id: 0,
        representatives: 2,
        location: 'Booth 1',
      },
      {
        name: 'New name 2',
        description: 'New description 2',
        type: 'research',
        contact: [
          { type: 'website', content: 'qrcsoftware.nl/2' },
          { type: 'email', content: 'info.2@uva.nl' },
          { type: 'phonenumber', content: '06 12345672' },
        ],
        external_id: 1,
        representatives: 2,
        location: 'Booth 2',
      },
      {
        name: 'New name 3',
        description: 'New description 3',
        type: 'company',
        contact: [
          { type: 'website', content: 'qrcsoftware.nl/3' },
          { type: 'email', content: 'info.3@uva.nl' },
          { type: 'phonenumber', content: '06 12345673' },
        ],
        external_id: 2,
        representatives: 3,
        location: 'Booth 3',
      },
      {
        name: 'New name 4',
        description: 'New description 4',
        type: 'company',
        contact: [
          { type: 'website', content: 'qrcsoftware.nl/4' },
          { type: 'email', content: 'info.4@uva.nl' },
          { type: 'phonenumber', content: '06 12345674' },
        ],
        external_id: 3,
        representatives: 4,
        location: 'Booth 4',
      },
    ],
  },
  events: {
    uri: process.env.mongodbConStrEvent || 'mongodb://localhost:27017/event_service',
    library: import('../../msa/event_service/src/database.js'),
    object: 'Event',
    get: db => [
      {
        external_id: 1,
        enabled: true,
        name: 'New name 1 - event',
        description: 'New description 1 - event',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 1',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [db.entities[0].enid, db.entities[1].enid, db.entities[2].enid, db.entities[3].enid],
      },
      {
        external_id: 2,
        enabled: false,
        name: 'New name 2 - event',
        description: 'New description 2 - event',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 2',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [db.entities[0].enid, db.entities[1].enid],
      },
      {
        external_id: 3,
        enabled: true,
        name: 'New name 3 - event',
        description: 'New description 3 - event',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 3',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [db.entities[1].enid],
      },
      {
        external_id: 4,
        enabled: true,
        name: 'New name 4 - event',
        description: 'New description 4 - event',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 4',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [db.entities[1].enid],
      },
      {
        external_id: 5,
        enabled: true,
        name: 'New name 5 - event',
        description: 'New description 5 - event',
        start: '2022-04-27T22:05:00.000Z',
        location: 'New location 5',
        studentSubmitDeadline: '2022-04-30T22:05:00.000Z',
        entities: [db.entities[0].enid, db.entities[1].enid],
      },
    ],
  },
  projects: {
    uri: process.env.mongodbConStrProject || 'mongodb://localhost:27017/project_service',
    library: import('../../msa/project_service/src/database.js'),
    object: 'Project',
    get: db => [
      {
        enid: db.entities[0].enid,
        evids: [db.events[0].evid],
        name: 'New name1 - project',
        description: 'New description1',
        datanoseLink: 'https://datanose.nl/projects/newName1',
        external_id: 0,
      },
      {
        enid: db.entities[0].enid,
        evids: [db.events[0].evid],
        name: 'New name 2 - project',
        description: 'New description 2',
        datanoseLink: 'https://datanose.nl/projects/newName2',
        external_id: 1,
      },
      {
        enid: db.entities[1].enid,
        evids: [db.events[1].evid, db.events[4].evid],
        name: 'Other company project - project',
        description: 'Belongs to another company',
        datanoseLink: 'https://datanose.nl/projects/newName3',
        external_id: 2,
      },
    ],
  },
  users: {
    uri: process.env.mongodbConStrUser || 'mongodb://localhost:27017/user_service',
    library: import('../../msa/user_service/src/database.js'),
    object: 'User',
    objects: ['User', 'Student', 'Representative'],
    hide: ['password'],
    get: async db => [
      {
        firstname: 'Quinten',
        lastname: 'Coltof',
        email: 'student',
        password: await hash('student'),
        phone: '+31 6 01234567',
        studentnumber: '12345678',
        websites: ['https://qrcsoftware.nl', 'https://softwareify.nl'],
        studies: ['UvA Informatica'],
        share: [db.entities[0].enid, db.entities[2].enid],
        manuallyShared: [db.entities[0].enid, db.entities[2].enid],
        __t: 'Student',
      },
      {
        firstname: 'Johannes',
        lastname: 'Sebastiaan',
        email: 'johannes.sebastiaan@gmail.com',
        phone: '+31 6 11234567',
        studentnumber: '22345678',
        websites: ['https://johannes.nl', 'https://sebastiaan.nl'],
        studies: ['UvA Kunstmatige Intellegentie', 'VU Rechten'],
        share: [db.entities[0].enid, db.entities[1].enid],
        manuallyShared: [db.entities[0].enid],
        __t: 'Student',
      },
      {
        firstname: 'John',
        lastname: 'de jonge',
        email: 'rep',
        phone: '+31 6 21234567',
        enid: db.entities[0].enid,
        password: await hash('rep'),
        repAdmin: false,
        __t: 'Representative',
      },
      {
        firstname: 'Edsger',
        lastname: 'Dijkstra',
        email: 'repAdmin',
        phone: '+31 6 31234567',
        enid: db.entities[0].enid,
        password: await hash('repAdmin'),
        repAdmin: true,
        __t: 'Representative',
      },
      {
        firstname: 'Eduard',
        lastname: 'Dijkstra',
        email: 'Eduard.d@uva.com',
        phone: '+31 6 41234567',
        enid: db.entities[1].enid,
        password: await hash('helloWorld!'),
        repAdmin: false,
        __t: 'Representative',
      },
      {
        email: 'admin',
        password: await hash('admin'),
        admin: true,
      },
      {
        firstname: 'Private',
        lastname: 'Student',
        email: 'private@gmail.com',
        phone: '+31 6 11134567',
        studentnumber: '22245678',
        websites: [],
        studies: ['UvA Kunstmatige Intellegentie'],
        share: [],
        manuallyShared: [],
        __t: 'Student',
      },
    ],
  },
  votes: {
    uri: process.env.mongodbConStrVote || 'mongodb://localhost:27017/vote_service',
    library: import('../../msa/vote_service/src/database.js'),
    object: 'Vote',
    get: db => [
      {
        uid: db.users[0].uid,
        evid: db.events[0].evid,
        votes: [
          { enid: db.projects[0].enid, pid: db.projects[0].pid },
          { enid: db.projects[1].enid, pid: db.projects[1].pid },
          { enid: db.projects[2].enid, pid: db.projects[2].pid },
        ],
      },
      {
        uid: db.users[1].uid,
        evid: db.events[0].evid,
        votes: [
          { enid: db.projects[0].enid, pid: db.projects[0].pid },
          { enid: db.projects[2].enid, pid: db.projects[2].pid },
        ],
      },
      {
        uid: db.users[0].uid,
        evid: db.events[4].evid,
        votes: [
          { enid: db.projects[0].enid, pid: db.projects[0].pid },
          { enid: db.projects[1].enid, pid: db.projects[1].pid },
          { enid: db.projects[2].enid, pid: db.projects[2].pid },
        ],
      },
      {
        uid: db.users[1].uid,
        evid: db.events[4].evid,
        votes: [
          { enid: db.projects[0].enid, pid: db.projects[0].pid },
          { enid: db.projects[2].enid, pid: db.projects[2].pid },
        ],
      },
    ],
  },
  schedule: {
    uri: process.env.mongodbConStrVote || 'mongodb://localhost:27017/schedule_service',
    library: import('../../msa/schedule_service/src/database.js'),
    object: 'Schedule',
    get: db => [
      {
        uid: db.users[0].uid,
        evid: db.events[4].evid,
        enid: db.entities[0].enid,
        slot: 'Slot1',
      },
      {
        uid: db.users[0].uid,
        evid: db.events[4].evid,
        enid: db.entities[1].enid,
        slot: 'Slot2',
      },
      {
        uid: db.users[0].uid,
        evid: db.events[4].evid,
        enid: db.entities[3].enid,
        slot: 'Slot3',
      },
    ],
  },
}

const provisioner = new MongoDBProvisioner(configs)

export let db
export let models
export const init = provisioner.init
const main = async () => {
  await provisioner.provision()
  console.log('Provisioned database')
  db = provisioner.db
  console.log('Database ready', db)
  models = provisioner.models
  console.log('Models ready', models)
}
export default main
export const disconnect = provisioner.disconnect

if (process.argv.length === 3 && process.argv[2] === 'run') {
  console.log('Initializing database from cli')
  init().then(main).then(disconnect)
}
