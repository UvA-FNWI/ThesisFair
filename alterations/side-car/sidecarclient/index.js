import net from 'net';
import Connection from './Connection.js';

export const channel = null; // Polyfill
let connection;
let handler;

export const connect = async () => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const conn = new net.Socket();

      conn.connect(3001, 'localhost');
      conn.once('connect', () => {
        clearInterval(interval);

        connection = new Connection(conn, (data) => {
          if (!handler) {
            console.error('Received message before handler was registered!');
            return;
          }

          return handler(data);
        });
        connection.onClosed = connect;

        console.log('Connected to sidecar');
        resolve();
      });
    }, 500);
  });
}

export const disconnect = () => {
  connection.close();
}

//* Receiving
export const receive = async (_, callback) => {
  handler = (args) => callback(...args);
}

//* Sending
export const initSending = async () => { } // Polyfill

export const rpc = (queue, data) => {
  if (!connection) { throw new Error('Not connected to sidecar!'); }

  return connection.sendData({
    queue,
    data,
  })
}

export const rgraphql = (queue, query, variables = null, context = { user: { type: 'a' } }) => {
  return rpc(queue, { query, variables, context });
}
