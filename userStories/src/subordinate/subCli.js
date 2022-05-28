import { Command } from 'commander';
import { setUrl, enableTrace, clearTrace, getTrace } from '../api.js';
import debugLib from 'debug';

const debug = debugLib('userStories:subCli')

const simulate = async (name, stories, args) => {
  const [_, program] = args.splice(args.length - 2, 2);
  const { url } = program.optsWithGlobals();
  setUrl(url);
  debug('URL: %s', url);

  let fn;
  enableTrace();
  while (true) {
    fn = stories[Math.floor(Math.random() * stories.length)];
    debug('Running %s', fn.name);
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
  program.option('--url <url>', 'The url of the webserver to run against', 'http://localhost:3000/');
  const simulateCmd = program.command('simulate').action((...args) => simulate(name, stories, args).catch(console.log))
  for (const arg of args) {
    simulateCmd.argument(`<${arg}>`, '', parseInt);
  }

  program.command('debug')
    .argument('<story index>', '', parseInt, 0)
    .action((index, _, program) => {
      const { url } = program.optsWithGlobals();
      setUrl(url);

      stories[index](...args.map(() => 0)).catch(console.log);
     });

  program.parse();
}
