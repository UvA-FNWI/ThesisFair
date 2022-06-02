import { Command } from 'commander';
import dbProvisioner from './initDB.js';

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
  console.log(`node run.js ${events} ${admins} ${students} ${entities} ${adminRepresentatives} ${representatives}`);
};

const main = () => {
  const program = new Command();
  program
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

  program.parse();
}
main();
