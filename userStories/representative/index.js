import { Command } from 'commander';

import viewStudents from './viewStudents.js';
import updateAccount from './updateAccount.js';

const stories = [updateAccount, viewStudents];
const simulate = async (event, entity, representative) => {
  let fn;
  while (true) {
    fn = stories[Math.floor(Math.random() * stories.length)];
    await fn(event, entity, representative).catch((err) => {
      console.error(fn.name, 'Threw error: ', err);
      process.exit(1);
    });
    console.log(`sub,representative,ran,${event}-${entity}-${representative},${fn.name}`);
  }
};

const main = () => {
  const program = new Command();
  program.command('simulate')
    .argument('<event>', '', parseInt)
    .argument('<entity>', '', parseInt)
    .argument('<representative>', '', parseInt)
    .action((...args) => simulate(...args).catch(console.log))

  program.parse();
}
main();
