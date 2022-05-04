import { connect, receive } from '../../libraries/amqpmessaging/index.js';

import { connect as connectDB } from './database.js';
import graphql from './graphql.js';

const main = async () => {
  await connectDB();
  await connect();
  receive('API_events', graphql);
}

main();
