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
        name: 'Apple',
        description: 'We build revolutionary products that elevate the user experience beyond imagination.',
        type: 'company',
        contact: [
          { type: 'website', content: 'apple.com' },
          { type: 'email', content: 'noreply@apple.com' },
          { type: 'phonenumber', content: '06 12345671' },
        ],
        external_id: 0,
        representatives: 2,
        location: 'Booth 1',
      },
      {
        name: 'Alphabet',
        description: 'We collect all the data, from your purchase habits to your location history.',
        type: 'company',
        contact: [
          { type: 'website', content: 'google.com' },
          { type: 'email', content: 'noreply@google.com' },
          { type: 'phonenumber', content: '06 12345672' },
        ],
        external_id: 1,
        representatives: 2,
        location: 'Booth 2',
      },
      {
        name: 'Meta',
        description: 'Everybody calls us Facebook. Hiding our name because we are a terrible company did not help.',
        type: 'company',
        contact: [
          { type: 'website', content: 'facebook.com' },
          { type: 'email', content: 'noreply@meta.com' },
          { type: 'phonenumber', content: '06 12345673' },
        ],
        external_id: 2,
        representatives: 3,
        location: 'Booth 3',
      },
      {
        name: 'UvA AI',
        description: 'We are the AI department of the UvA. We research the latest in AI.',
        type: 'research',
        contact: [
          { type: 'website', content: 'uva.nl' },
          { type: 'email', content: 'noreply@uva.nl' },
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
        name: 'AI Thesis Fair',
        description:
          'This event is the 2023 AI Thesis Fair. Students and companies will meet to discuss thesis projects and internships regarding AI. It is held live, with booths for all participating companies.',
        start: '2022-04-27T22:00:00.000Z',
        location: 'Science Park 904, 1098 XH Amsterdam',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [db.entities[0].enid, db.entities[1].enid, db.entities[2].enid, db.entities[3].enid],
        degrees: ['MScAI'],
      },
      {
        external_id: 2,
        enabled: true,
        name: 'General Thesis Fair',
        description:
          'This event is the 2023 General Thesis Fair. Students and companies will meet to discuss thesis projects and internships. It is held live, with booths for all participating companies.',
        start: '2022-04-27T22:00:00.000Z',
        location: 'Science Park 904, 1098 XH Amsterdam',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [db.entities[0].enid, db.entities[1].enid],
        degrees: ['MScSE', 'MScISDS', 'MScISIS', 'MScLogic', 'MScCLSJD'],
      },
      {
        external_id: 3,
        enabled: false,
        name: 'Old Thesis Fair',
        description: 'This is an old Thesis Fair archive.',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 3',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [db.entities[1].enid],
      },
      {
        external_id: 4,
        enabled: false,
        name: 'Old Thesis Fair',
        description: 'This is an old Thesis Fair archive.',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 4',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [db.entities[1].enid],
      },
      {
        external_id: 5,
        enabled: false,
        name: 'Old Thesis Fair',
        description: 'This is an old Thesis Fair archive.',
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
        name: 'AI in Nuclear Fusion',
        description:
          'We are looking for a student to help us with our AI in Nuclear Fusion project. We are looking for a student with a background in AI and Physics.',
        datanoseLink: 'https://datanose.nl/projects/newName1',
        external_id: 0,
        degrees: ['MScAI', 'MScISIS', 'MScISDS'],
      },
      {
        enid: db.entities[0].enid,
        evids: [db.events[0].evid],
        name: 'Project Thesis Fair',
        description:
          "# Project Thesis Fair\n\nThis platform needs a set of updates. That's where you come in.\n\n## Datanose deintegration\n\nAll current integrations with Datanose (except payment) will be removed. You will need to set up everything in terms of data storage, database schema, CRUD for Thesis Fair.\n\n## More magic\n\nThe platform should be solid, should support everything requested and look the part.",
        degrees: ['MScAI', 'MScSE'],
        environment: "It's the UvA, you get free chocolate, tea and coffee. What more do you want?",
        expectations:
          'Three deadline stages, work should be done before then and communication on project should be done regularly for feedback and updates.',
        attending: 'yes',
        email: 'thesisfair@ivi.uva.nl',
        numberOfStudents: 2,
        tags: ['UvA Thesis Fair Lab.Platform Creation & Management'],
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
