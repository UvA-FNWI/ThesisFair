import debugLib from 'debug';

import { connect, receive } from '../../libraries/amqpmessaging/index.js';
import { connect as connectDB } from './database.js';
import graphql from './graphql.js';

const debug = debugLib('entity_service:index')

const main = async () => {
  await connectDB();
  await connect();
  receive('API_project', graphql);
  debug('Initialized, waiting for requests');
}

main();
