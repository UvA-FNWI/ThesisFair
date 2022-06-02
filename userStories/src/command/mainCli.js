import child_process from 'child_process';
import { Command } from 'commander';
import mongoose from 'mongoose';

import dbProvisioner from './initDB.js';

const Result = mongoose.model('Result', new mongoose.Schema({
  run: String,
  id: mongoose.Schema.Types.ObjectId,
  time: Date,
  proc: String,
  event: String,
  data: Object
}));


const init = async (events, admins, students, studentVotes, entities, adminRepresentatives, representatives, projects) => {
  console.log('Initializing database...');
  const provisionar = dbProvisioner({
    events,
    admins,
    students,
    studentVotes,

    entities,
    adminRepresentatives,
    representatives,
    projects,
  });

  await provisionar.init();
  await provisionar.provision();
  await provisionar.disconnect();

  console.log('DB initialization done');
  console.log('\nTo test with all users execute the following command:');
  console.log(`node mainCli.js run ${events} ${admins} ${students} ${entities} ${adminRepresentatives} ${representatives}`);
};

const subprocess = [];
const exec = (type, url, db, run, id, ...options) => {
  const proc = child_process.spawn('node', [`../subordinate/${type}/index.js`, 'simulate', ...options, '--url', url]);

  let buffer = '';
  let strings;
  proc.stdout.on('data', (data) => {
    if (!db) {
      console.log(data.toString())
      return;
    }

    buffer += data.toString();
    strings = buffer.split('\n');
    if (strings.length === 0) {
      return;
    }

    buffer += strings.pop()
    for (const string of strings) {
      data = JSON.parse(string);
      if (data.event === 'error') {
        console.error('Error occured during user story execution');
      }
      data.run = run;
      data.id = id;
      Result.create(data);
    }
  });

  proc.on('exit', (code) => {
    subprocess.splice(subprocess.indexOf(proc), 1);
    if (code !== 0) {
      console.error('[!]', type, ...options, 'crashed');

      if (db) {
        Result.create({
          run,
          id,
          time: Date.now(),
          proc: 'mainCli',
          event: 'subCli crashed',
          data: {
            type,
            options,
            stderr: proc.stderr.read(),
          }
        });
      }
      return;
    }

    console.log(['mainCli', 'procDone', type, ...options].join(','));
  });
  subprocess.push(proc);
}

const run = async (events, admins, students, entities, adminRepresentatives, representatives, url, servers, serverIndex, options) => {
  const { db, run } = options;
  const dbFlag = !!db;
  if (dbFlag) {
    console.error('Connecting to results database');
    await mongoose.connect(db);
    console.error('Connected to results database');
  }
  console.error('Running...');

  process.on('SIGINT', async () => {
    console.error('Stopping subprocess')

    if (dbFlag) {
      await Result.create({
        run: run,
        id: id,
        time: Date.now(),
        proc: 'mainCli',
        event: 'runEnd'
      });
    }

    const i = setInterval(() => {
      console.error('Subprocesses still running', subprocess.length);
      if (subprocess.length === 0) {
        if (dbFlag) {
          mongoose.disconnect();
        }
        clearInterval(i);
      }
    }, 1000);
  });

  const id = mongoose.Types.ObjectId();
  if (dbFlag) {
    await Result.create({
      run: run,
      id: id,
      time: Date.now(),
      proc: 'mainCli',
      event: 'runStart',
      data: {
        events, admins, students, entities, adminRepresentatives, representatives, url, servers, serverIndex
      }
    });
  }

  process.stderr.setMaxListeners(1000);

  const eventsChunk = events / servers;
  const adminsChunk = admins / servers;
  const studentsChunk = students / servers;
  const entitiesChunk = entities / servers;
  const adminRepresentativesChunk = adminRepresentatives / servers;
  const representativesChunk = representatives / servers;

  for (let event = eventsChunk * serverIndex; event < eventsChunk * (serverIndex + 1); event++) {
    for (let admin = adminsChunk * serverIndex; admin < adminsChunk * (serverIndex + 1); admin++) {

    }

    for (let student = studentsChunk * serverIndex; student < studentsChunk * (serverIndex + 1); student++) {
      exec('student', url, dbFlag, run, id, event, student);
    }

    for (let entity = entitiesChunk * serverIndex; entity < entitiesChunk * (serverIndex + 1); entity++) {
      for (let adminRepresentative = adminRepresentativesChunk * serverIndex; adminRepresentative < adminRepresentativesChunk * (serverIndex + 1); adminRepresentative++) {
        exec('adminRepresentative', url, dbFlag, run, id, event, entity, adminRepresentative);
      }

      for (let representative = representativesChunk * serverIndex; representative < representativesChunk * (serverIndex + 1); representative++) {
        exec('representative', url, dbFlag, run, id, event, entity, representative);
      }
    }
  }
};

const main = () => {
  const program = new Command();
  program.command('init')
    .argument('<events>', 'The amount of events', parseInt)
    .argument('<admins>', 'The amount of admins per event', parseInt)
    .argument('<students>', 'The amount of students per event', parseInt)
    .argument('<studentVotes>', 'The amount of votes for projects per student. Should be smaller or equal to entities * projects', parseInt)
    .argument('<entities>', 'The amount of entities per event', parseInt)
    .argument('<adminRepresentatives>', 'The amount of admin representatives per entity', parseInt)
    .argument('<representatives>', 'The amount of representatives per entity', parseInt)
    .argument('<projects>', 'The amount of projects per entity', parseInt)
    .description('Initialize the database for stress testing')
    .action(init);

  program.command('run')
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
