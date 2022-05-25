import child_process from 'child_process';
import { Command } from 'commander';

import dbProvisioner from './initDB.js';
import { randSleep } from './lib.js';

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
  console.log(`node cli.js run ${events} ${admins} ${students} ${entities} ${adminRepresentatives} ${representatives}`);
};

const subprocesses = [];
const abortController = new AbortController();
const exec = (type, ...options) => {
  const proc = child_process.spawn('node', [`${type}/index.js`, 'simulate', ...options], { signal: abortController.signal });
  proc.stdout.pipe(process.stdout);

  proc.on('exit', (code) => {
    if (code !== 0) {
      console.error(type, ...options, 'crashed');
      console.error(proc.stderr.read().toString());
      return;
    }

    console.log(['master', 'procDone', type, ...options].join(','));
  });
  subprocesses.push(proc);
}

const run = async (events, admins, students, entities, adminRepresentatives, representatives, servers, serverIndex) => {
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
      exec('student', event, student);
      await randSleep(0.01, 0.5);
    }

    for (let entity = entitiesChunk * serverIndex; entity < entitiesChunk * (serverIndex + 1); entity++) {
      for (let adminRepresentative = adminRepresentativesChunk * serverIndex; adminRepresentative < adminRepresentativesChunk * (serverIndex + 1); adminRepresentative++) {

      }

      for (let representative = representativesChunk * serverIndex; representative < representativesChunk * (serverIndex + 1); representative++) {

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
    .argument('[servers]', 'The amount of servers the workload is split over', (v) => parseInt(v), 1)
    .argument('[serverIndex]', 'The index of this server', (v) => parseInt(v), 0)
    .action(run);

  program.parse();
}
main();
