import { Command } from 'commander';

const simulate = async (stories, args) => {
  let fn;
  while (true) {
    fn = stories[Math.floor(Math.random() * stories.length)];
    await fn(...args).catch((err) => {
      console.error(fn.name, 'Threw error: ', err);
      process.exit(1);
    });
    console.log(`${Date.now()},subCli,student,ran,${fn.name},${args.join('-')}`);
  }
};

export default (args, stories) => {
  const program = new Command();
  const simulateCmd = program.command('simulate').action((...args) => simulate(stories, args.slice(0, -2)).catch(console.log))
  for (const arg of args) {
    simulateCmd.argument(`<${arg}>`, '', parseInt);
  }

  program.command('debug')
    .argument('<story index>', '', parseInt, 0)
    .action((index) => stories[index](...args.map(() => 0)).catch(console.log));

  program.parse();
}
