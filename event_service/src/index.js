import amqp from 'amqplib';

const queue = 'API_events'

const main = async () => {
  const conn = await amqp.connect('amqp://rabbitmq');
  const channel = await conn.createChannel();

  channel.assertQueue(queue, {
    durable: false,
  });

  channel.consume(queue, (msg) => {
    const reply = msg.content.toString() + ' - ack!';
    console.log('Sending reply: ', reply);
    channel.sendToQueue(msg.properties.replyTo, Buffer.from(reply), { correlationId: msg.properties.correlationId });
    channel.ack(msg);
  });
}

main();
