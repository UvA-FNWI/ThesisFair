import net from 'net';
import { connect, initSending, receive, rpc } from '../../../../msa/libraries/amqpmessaging/index.js';
import Connection from './Connection.js';

let server;
let connection = null;
const onNewConnection = (conn) => {
  if (connection) {
    connection.onClosed = null;
    connection.close();
  }

  connection = new Connection(conn);
  connection.onClosed = () => {
    connection = null;
  }

  connection.handleRequest = ({ queue, data }) => rpc(queue, data);
}

const main = async () => {
  server = net.createServer(onNewConnection);
  await connect();
  await initSending();

  receive(process.env.queue, (...args) => {
    if (connection === null) {
      console.error('Received packet before connection to client was made');
      return { errors: [ 'Service instance not yet initialized' ] };
    }

    return connection.sendData(args);
  });

  server.listen(3001, 'localhost');
  console.log('Listening on localhost:3001');
}
main();
