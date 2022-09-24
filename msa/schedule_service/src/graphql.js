import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { exec as cpExec } from 'child_process';
import { parse as csvParser } from 'csv-parse';


import { rgraphql } from '../../libraries/amqpmessaging/index.js';
import { Schedule } from './database.js';

const getEvent = async (evid) => {
  const res = await rgraphql('api-event', 'query getEvent($evid: ID!) { event(evid: $evid) { entities } }', { evid });

  if (res.errors || !res.data) {
    console.error(res);
    throw new Error('An unkown error occured while getting the event');
  }

  if (!res.data.event) {
    return false;
  }

  return res.data.event;
};

const getEntities = async (enids) => {
  const res = await rgraphql('api-entity', 'query getEntities($enids: [ID!]!) { entities(enids: $enids) { enid representatives } }', { enids });

  if (res.errors || !res.data) {
    console.error(res);
    throw new Error('An unkown error occured while getting the entities');
  }

  if (!res.data.entities) {
    return false;
  }

  return res.data.entities;
}

const getVotes = async (evid) => {
  const res = await rgraphql('api-vote', 'query getVotes($evid: ID!) { votesOfEvent(evid: $evid) { uid votes { enid pid } } }', { evid });

  if (res.errors || !res.data) {
    console.error(res);
    throw new Error('An unkown error occured while getting the votes');
  }

  if (!res.data.votesOfEvent) {
    return false;
  }

  return res.data.votesOfEvent;
}

const exec = (cmd) => {
  return new Promise((resolve, reject) => {
    cpExec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err, [stdout, stderr]);
        return;
      }

      resolve([stdout, stderr]);
    });
  });
}

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
  studentSchedule: {
    type: '[Schedule!]!',
    args: {
      uid: 'ID!',
      evid: 'ID!',
    },
    description: JSON.stringify({
    }),
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || (req.user.uid === args.uid))) {
        throw new Error('UNAUTHORIZED to get this users schedule');
      }

      return await Schedule.find({ evid: args.evid, uid: args.uid });
    },
  },
  representativeSchedule: {
    type: '[Schedule!]!',
    args: {
      enid: 'ID!',
      evid: 'ID!',
    },
    description: JSON.stringify({
    }),
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || (req.user.type === 'r' && req.user.enid === args.enid))) {
        throw new Error('UNAUTHORIZED to get this users schedule');
      }

      return await Schedule.find({ evid: args.evid, enid: args.enid });
    },
  },
  // deleteOfEvent: { // TODO
  // }
});

schemaComposer.Mutation.addNestedFields({
  'schedule.generate': {
    type: 'String',
    args: {
      evid: 'ID!',
    },
    description: JSON.stringify({
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED to generate schedule')
      }

      if (await Schedule.findOne({ evid: args.evid })) {
        return 'Schedule already created!';
      }

      const studentVotes = await getVotes(args.evid);
      if (!studentVotes || studentVotes.length === 0) {
        return 'No votes found. Import votes first.'
      }

      const csvRows = ['Student_ID,Org,Project_Voted_For,person,programme']
      for (const student of studentVotes) {
        for (const vote of student.votes) {
          csvRows.push(`${student.uid},${vote.enid},${vote.pid},,`);
        }
      }

      const event = await getEvent(args.evid);
      if (!event) {
        return `Could not retrieve event with ID ${args.evid}`;
      }

      const entities = await getEntities(event.entities);
      if (!entities) {
        return `Could not get all entities from event`;
      }

      const csvRepsRows = ['name,n_reps'];
      for (const { enid, representatives } of entities) {
        csvRepsRows.push(`${enid},${representatives}`);
      }

      const fileName = `./tmp/schedule.${Date.now()}`;
      await writeFile(fileName + '.csv', csvRows.join('\n') + '\n');
      await writeFile(fileName + '.reps.csv', csvRepsRows.join('\n') + '\n');
      const [stdout, stderr] = await exec(`thesisfair --repdata "${fileName}.reps.csv" "${fileName}.csv"`);
      await unlink(fileName + '.csv');
      await unlink(fileName + '.reps.csv');


      return new Promise((resolve, reject) => {
        csvParser(stdout.trim(), { columns: true }, async (err, records, info) => {
          if (err) { reject(err); return; }

          if (records.length === 0) {
            resolve('No schedule was generated');
            return;
          }

          for (const { Slot: slot, ' StudentID': uid, ' Project_Voted_For': enid } of records) {
            await Schedule.create({
              uid: uid.trim(),
              evid: args.evid,
              enid: enid.trim(),
              slot: slot.trim(),
            });
          }

          resolve(null);
        });
      });
    },
  }
});

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
