import debugLib from 'debug';

import { connect, receive } from '../../libraries/amqpmessaging/index.js';
import { connect as connectDB } from './database.js';
import graphql from './graphql.js';
import write from './writeEvent.js';

const debug = debugLib('user_service:index')

const main = async () => {
  await connectDB();
  await connect();
  receive('api-user', graphql);
  receive('api-user-update', write, false);
  debug('Initialized, waiting for requests');
}

main();
