import { connect, initSending, receive, rpc } from './index.js';

const main = async () => {
  await connect();
  await initSending();

  for (let index = 0; index < 20; index++) {
    const response = await rpc('queue', { one: 1, two: 2, three: 3 });
    console.log(response);
  }
}
main();
