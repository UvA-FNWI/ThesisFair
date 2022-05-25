import bcrypt from 'bcrypt';

import { MongoDBProvisioner } from '../libraries/mongoDBProvisioner/index.js';

const saltRounds = 10;
const hashCache = {};
const hash = async (password) => {
  if (hashCache[password]) {
    return hashCache[password];
  }

  return (hashCache[password] = await bcrypt.hash(password, saltRounds))
};

const sample = (options, amount) => {
  if (amount > options.length) {
    throw new Error(`Unable to take ${amount} unique values from ${options.length} options.`);
  }

  const res = [];
  for (let i = 0; i < amount; i++) {
    res.push(...options.splice(Math.floor(Math.random() * options.length), 1));
  }

  return res;
};

const genProvisionerConfig = ({ events: eventCount, admins: adminCount, students: studentCount, studentVotes: studentVoteCount, entities: entityCount, adminRepresentatives: adminRepCount, representatives: repCount, projects: projectCount }) => ({
  entities: {
    uri: process.env.mongodbConStrEntity || 'mongodb://localhost:27017/entity_service',
    library: '../../entity_service/src/database.js',
    object: 'Entity',
    get: (db) => {
      const entities = [];
      for (let event = 0; event < eventCount; event++) {
        for (let entity = 0; entity < entityCount; entity++) {
          entities.push({
            name: `Event ${event} - Entity ${entity}`,
            description: `Entity ${entity}`,
            type: 'company',
            contact: [],
            external_id: entity,
          });
        }
      }

      return entities;
    },
  },
  events: {
    uri: process.env.mongodbConStrEvent || 'mongodb://localhost:27017/event_service',
    library: '../../event_service/src/database.js',
    object: 'Event',
    get: (db) => {
      const events = [];
      for (let event = 0; event < eventCount; event++) {
        events.push({
          enabled: true,
          name: `Event ${event}`,
          description: `Event description ${event}`,
          start: '2022-04-27T22:00:00.000Z',
          location: `Event location ${event}`,
          studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
          entities: db.entities.slice(event * entityCount, (event + 1) * entityCount).map((entity) => entity.enid),
        });
      }

      return events;
    },
  },
  projects: {
    uri: process.env.mongodbConStrProject || 'mongodb://localhost:27017/project_service',
    library: '../../project_service/src/database.js',
    object: 'Project',
    get: (db) => {
      const projects = [];
      for (let event = 0; event < eventCount; event++) {
        for (let entity = 0; entity < entityCount; entity++) {
          for (let project = 0; project < projectCount; project++) {
            const entityObj = db.entities[event * entityCount + entity];

            projects.push({
              enid: entityObj.enid,
              evid: db.events[event].evid,
              name: `${entityObj.name} - Project ${project}`,
              description: `Project description ${project}`,
              datanoseLink: `https://datanose.nl/projects/project${project}`,
            });
          }
        }
      }

      return projects;
    },
  },
  users: {
    uri: process.env.mongodbConStrUser || 'mongodb://localhost:27017/user_service',
    library: '../../user_service/src/database.js',
    object: 'User',
    objects: ['User', 'Student', 'Representative'],
    hide: ['password'],
    get: async (db) => {
      const users = [];
      for (let event = 0; event < eventCount; event++) {
        const eventObj = db.events[event];
        for (let i = 0; i < adminCount; i++) {
          users.push({
            firstname: `${eventObj.name} - Admin ${i}`,
            lastname: `Lastname ${i}`,
            email: `admin.${event}-${i}@uva.nl`,
            password: await hash('admin'),
            admin: true,
          });
        }

        for (let i = 0; i < studentCount; i++) {
          users.push({
            firstname: `${eventObj.name} - Student ${i}`,
            lastname: `Lastname ${i}`,
            email: `student.${event}-${i}@student.uva.nl`,
            password: await hash('student'),
            phone: '+31 6 01234567',
            studentnumber: event * studentCount + i,
            websites: [],
            studies: ['UvA Informatica'],
            share: [],
            __t: "Student",
          });
        }

        for (let entity = 0; entity < entityCount; entity++) {
          const entityObj = db.entities[event * entityCount + entity];

          for (let i = 0; i < adminRepCount; i++) {
            users.push({
              firstname: `${entityObj.name} - AdminRepresentative ${i}`,
              lastname: `Lastname ${i}`,
              email: `adminRepresentative.${event}-${entity}-${i}@company.nl`,
              // phone: '+31 6 21234567',
              enid: entityObj.enid,
              password: await hash('adminRepresentative'),
              repAdmin: true,
              __t: "Representative",
            });
          }

          for (let i = 0; i < repCount; i++) {
            users.push({
              firstname: `${entityObj.name} - Representative ${i}`,
              lastname: `Lastname ${i}`,
              email: `representative.${event}-${entity}-${i}@company.nl`,
              // phone: '+31 6 21234567',
              enid: entityObj.enid,
              password: await hash('representative'),
              repAdmin: false,
              __t: "Representative",
            });
          }
        }
      }

      return users;
    },
  },
  votes: {
    uri: process.env.mongodbConStrVote || 'mongodb://localhost:27017/vote_service',
    library: '../../vote_service/src/database.js',
    object: 'Vote',
    get: async (db, models) => {
      const votes = [];
      for (let event = 0; event < eventCount; event++) {
        for (let student = 0; student < studentCount; student++) {
          const studentIndex = adminCount * (event + 1) + event * (studentCount + entityCount * (adminRepCount + repCount)) + student;

          const start = event * entityCount * projectCount; // Inclusive
          const end = (event + 1) * entityCount * projectCount; // Non-inclusive

          const studentVotes = sample(Array.from({ length: end - start }, (v, k) => k + start), studentVoteCount).map((choice) => ({
            enid: db.projects[choice].enid,
            pid: db.projects[choice].pid
          }));

          votes.push({
            uid: db.users[studentIndex].uid,
            evid: db.events[event].evid,
            votes: studentVotes,
          });

          const enids = studentVotes.map((v) => v.enid).filter((v, i, a) => a.indexOf(v) === i);
          await models.Student.findByIdAndUpdate(db.users[studentIndex].uid, { share: enids });
        }
      }

      return votes;
    },
  },
});

/**
 * @param {Object} config Config object
 * @param {Number} config.events The amount of events
 * @param {Number} config.admins The amount of admins per event
 * @param {Number} config.students The amount of students per event
 * @param {Number} config.studentVotes The amount of votes for projects per student. Should be smaller or equal to entities * projects
 * @param {Number} config.entities The amount of entities per event
 * @param {Number} config.adminRepresentatives The amount of admin representatives per entity
 * @param {Number} config.representatives The amount of representatives per entity
 * @param {Number} config.projects The amount of projects per entity
 */
export default (config) => new MongoDBProvisioner(genProvisionerConfig(config));

if (process.argv.length === 3 && process.argv[2] === 'run') {
  const config = {
    events: 2,
    admins: 2,
    students: 500,
    studentVotes: 5, // <= entities * projects

    entities: 40,
    adminRepresentatives: 2,
    representatives: 8,
    projects: 15,
  };
  const provisioner = new MongoDBProvisioner(genProvisionerConfig(config));

  console.log('Initializing database from cli with sample config');
  provisioner.init().then(provisioner.main).then(provisioner.disconnect);
}
