import axios from 'axios';
import http from 'http';

const RETRY_COUNT = 10;
export const channel = null; // Polyfill

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let handler;
const server = http.createServer(async (req, res) => {
  if (!handler) {
    console.error('Received message for unexisting queue', req.url);
    return;
  }

  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const data = JSON.parse(Buffer.concat(buffers).toString());

  const reply = await handler(data.query, data.variables, data.context);
  res.writeHead(200);
  res.write(JSON.stringify(reply));
  res.end();
});

export const connect = () => {
  server.listen(8000);
}

export const disconnect = () => {
  server.close();
}

//* Receiving
export const receive = async (_, callback) => {
  handler = callback;
}

//* Sending
export const initSending = async () => {} // Polyfill

export const rpc = async (queue, data) => {
  for (let tries = 0; tries < RETRY_COUNT; tries++) {
    try {
      const response = await axios.post(`http://${queue}:8000`, data);
      return response.data;
    } catch (error) {
      if (tries === RETRY_COUNT) {
        throw error;
      }
      await sleep(500);
    }
  }
}

export const rgraphql = (queue, query, variables = null , context = { user: { type: 'a' } }) => {
  return rpc(queue, { query, variables, context });
}
