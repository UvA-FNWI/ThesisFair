import { Command } from 'commander';
import { enableTrace, clearTrace, getTrace } from '../api.js.js';

const simulate = async (name, stories, args) => {
  let fn;
  enableTrace();
  while (true) {
    fn = stories[Math.floor(Math.random() * stories.length)];
    await fn(...args).catch((err) => {
      console.error(fn.name, 'Threw error: ', err);
      process.exit(1);
    });
    console.log(JSON.stringify({
      time: Date.now(),
      proc: 'subCli',
      event: 'ran',
      data: {
        type: name,
        fn: fn.name,
        args: args,
        trace: getTrace(),
      }
    }))
    clearTrace();
  }
};

export default (name, args, stories) => {
  const program = new Command();
  const simulateCmd = program.command('simulate').action((...args) => simulate(name, stories, args.slice(0, -2)).catch(console.log))
  for (const arg of args) {
    simulateCmd.argument(`<${arg}>`, '', parseInt);
  }

  program.command('debug')
    .argument('<story index>', '', parseInt, 0)
    .action((index) => stories[index](...args.map(() => 0)).catch(console.log));

  program.parse();
}
