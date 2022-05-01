import amqp from 'amqplib';
import debugLib from 'debug';

const debug = debugLib('API_gateway:messaging')
export let conn = null;
export let channel = null;
let replyQueue = null;

const correlationIds = {};
const handleReply = (msg) => {
    debug('Received message with correlationId: %d', msg.properties.correlationId);

    const callback = correlationIds[msg.properties.correlationId];
    if (callback) {
        delete correlationIds[msg.properties.correlationId];
        callback(msg);
    }
}

let correlationId = 0;
const genCorrelationId = () => {
    return (++correlationId).toString();
}

export const disconnect = () => {
    conn.close();
    conn = null;
    channel = null;
    replyQueue = null;
}

export const connect = async () => {
    conn = await amqp.connect(process.env.amqpConStr || 'amqp://rabbitmq')
    channel = await conn.createChannel();
    channel.prefetch(1);
    debug('Connected to amqp');

    // Initialize rpc mechanism
    replyQueue = await channel.assertQueue('', { exclusive: true });
    channel.consume(replyQueue.queue, handleReply, { noAck: true });
    debug('Initialized reply queue: %s', replyQueue.queue);

    // TODO: Properly call disconnect on shutdown/crash
}

export const rpc = (queue, data) => {
    return new Promise((resolve, reject) => {
        const id = genCorrelationId();
        correlationIds[id] = (msg) => resolve(JSON.parse(msg.content.toString()));

        channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { correlationId: id, replyTo: replyQueue.queue });
        debug('Message send with corrolation id %d', id);
    });
}
