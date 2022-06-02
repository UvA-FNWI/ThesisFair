import { Command } from 'commander';
import mongoose from 'mongoose';

import { initialize } from './simulate.js';

import admin from './admin/index.js';
import adminRepresentative from './adminRepresentative/index.js';
import representative from './representative/index.js';
import student from './student/index.js';
const roles = { admin, adminRepresentative, representative, student }

const simulations = [];
const running = { running: true };
let url, db, id, runName;

const Result = mongoose.model('Result', new mongoose.Schema({
  run: String,
  id: mongoose.Schema.Types.ObjectId,
  time: Date,
  proc: String,
  event: String,
  data: Object
}));


const runSimulation = (type, url, ...options) => {
  const callback = (err, data) => {
    const msg = {
      id: id,
      run: runName,
      time: Date.now(),
      proc: 'simulate',
      event: err ? 'error' : 'succes',
      data: data,
    }

    if (err) {
      console.error('Error occured during user story execution');
    }

    if (db) {
      Result.create(msg);
    } else {
      console.log(JSON.stringify(msg));
    }
  }

  const sim = roles[type](url, running, callback, ...options);
  simulations.push(sim.then(() => { simulations.splice(simulations.indexOf(sim), 1); }));
}

const runHandleSIGINT = async () => {
  if (!running.running) {
    console.log('Shutdown was forced and thus not clean!');
    process.exit(0);
  }

  console.error('Waiting for simulations to finish...')
  running.running = false;

  if (db) {
    await Result.create({
      id: id,
      run: runName,
      time: Date.now(),
      proc: 'main',
      event: 'runEnd'
    });
  }

  const i = setInterval(() => {
    console.error('Simulations still running', simulations.length);
    if (simulations.length === 0) {
      if (db) {
        mongoose.disconnect();
      }
      clearInterval(i);
    }
  }, 1000);
}

const run = async (events, admins, students, entities, adminRepresentatives, representatives, urlParam, servers, serverIndex, options) => {
  initialize();
  process.on('SIGINT', runHandleSIGINT);

  runName = options.run;
  db = !!options.db;
  url = urlParam;
  id = mongoose.Types.ObjectId();
  if (db) {
    console.error('Connecting to results database');
    await mongoose.connect(options.db);
    console.error('Connected to results database');

    await Result.create({
      run: runName,
      id: id,
      time: Date.now(),
      proc: 'main',
      event: 'runStart',
      data: {
        events, admins, students, entities, adminRepresentatives, representatives, url, servers, serverIndex
      }
    });
  }
  console.error('Starting...');

  const adminsChunk = Math.ceil(admins / servers);
  const studentsChunk = Math.ceil(students / servers);
  const entitiesChunk = Math.ceil(entities / servers);

  for (let event = 0; event < events; event++) {
    for (let admin = adminsChunk * serverIndex; Math.min(admins, admin < adminsChunk * (serverIndex + 1)); admin++) {
      runSimulation('admin', url, event, admin);
    }

    for (let student = studentsChunk * serverIndex; Math.min(students, student < studentsChunk * (serverIndex + 1)); student++) {
      runSimulation('student', url, event, student);
    }

    for (let entity = entitiesChunk * serverIndex; Math.min(entities, entity < entitiesChunk * (serverIndex + 1)); entity++) {
      for (let adminRepresentative = 0; adminRepresentative < adminRepresentatives; adminRepresentative++) {
        runSimulation('adminRepresentative', url, event, entity, adminRepresentative);
      }

      for (let representative = 0; representative < representatives; representative++) {
        runSimulation('representative', url, event, entity, representative);
      }
    }
  }

  console.error(`Started ${simulations.length} simulations`);
};

const main = () => {
  const program = new Command();
  program
    .argument('<events>', 'The amount of events', parseInt)
    .argument('<admins>', 'The amount of admins per event', parseInt)
    .argument('<students>', 'The amount of students per event', parseInt)
    .argument('<entities>', 'The amount of entities per event', parseInt)
    .argument('<adminRepresentatives>', 'The amount of admin representatives per entity', parseInt)
    .argument('<representatives>', 'The amount of representatives per entity', parseInt)
    .argument('[url]', 'The url of the webserver to run against', 'http://localhost:3000/')
    .argument('[servers]', 'The amount of servers the workload is split over', (v) => parseInt(v), 1)
    .argument('[serverIndex]', 'The index of this server', (v) => parseInt(v), 0)
    .option('--db [dburi]', 'Dump the results to the mongodb database available at this url', false)
    .option('--run [name]', 'Name this run in the mongodb database', '')
    .action(run);

  program.parse();
}
main();
