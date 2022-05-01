import amqp from 'amqplib';
import debugLib from 'debug';

import { connect as connectDB } from './database.js';
import graphql from './graphql.js';

const debug = debugLib('event_service:messaging');
const queue = 'API_events'

const main = async () => {
  await connectDB();
  let auth = `${process.env.rabbitmqUsername}:${process.env.rabbitmqPassword}@`;
  if (auth === ':@') auth = '';

  const conn = await amqp.connect(`amqp://${auth}rabbitmq`)
  const channel = await conn.createChannel();

  channel.assertQueue(queue, {
    durable: false,
  });

  channel.consume(queue, async (msg) => {
    debug('Recv corr: %ds, reply:To %s', msg.properties.correlationId, msg.properties.replyTo)

    const payload = JSON.parse(msg.content.toString());
    const reply = await graphql(payload.query, payload.variables);

    channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(reply)), { correlationId: msg.properties.correlationId });
    channel.ack(msg);
  });
}

main();
