import genApi, { enableTrace } from '../api.js';

export const initialize = () => {
  enableTrace();
}

export default async (url, running, caching, callback, name, stories, args) => {
  const api = genApi(url);
  if (caching > 0) {
    api.enableCaching(caching);
  }
  let fn;
  while (running.running) {
    fn = stories[Math.floor(Math.random() * stories.length)];
    try {
      await fn(api.api, ...args);
      callback(0, {
        type: name,
        fn: fn.name,
        args: args,
        trace: api.getTrace(),
      });
    } catch (error) {
      callback(1, {
        type: name,
        fn: fn.name,
        args: args,
        trace: api.getTrace(),
        error: error.message,
      });
    }

    api.clearTrace();
  }
};
