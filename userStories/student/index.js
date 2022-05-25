import { Command } from 'commander';

import browseProjects from './browseProjects.js';
import browseVotedProjects from './browseVotedProjects.js';
import updateAccount from './updateAccount.js';

const stories = [browseProjects, browseVotedProjects, updateAccount];
const simulate = async (event, student) => {
  let fn;
  while (true) {
    fn = stories[Math.floor(Math.random() * stories.length)];
    await fn(event, student);
    console.log(`sub,student,ran,${event}-${student},${fn.name}`);
  }
};

const main = () => {
  const program = new Command();
  program.command('simulate')
    .argument('<event>', '', parseInt)
    .argument('<student>', '', parseInt)
    .action((...args) => simulate(...args).catch(console.log))

  program.parse();
}
main();
