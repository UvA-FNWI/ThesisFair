export default class Connection {
  constructor(conn, handleRequest) {
    this.conn = conn;
    this.handleRequest = handleRequest;

    this.conn.on('data', this.receiveData);
    this.conn.on('close', this.closed);
    this.conn.on('error', (error) => console.error('Connection error: ', error));
    this.buffer = '';

    this.correlationIds = {};
    this.correlationId = 0;
  }

  receiveData = async (data) => {
    this.buffer += data.toString();

    const messages = this.buffer.split(/\n/g);
    this.buffer = messages.pop();

    for (const message of messages) {
      const packet = JSON.parse(message);

      if (packet.type === 'request') {
        const response = await this.handleRequest(packet.data);
        this.send('response', response, packet.correlationId);
      } else if (packet.type === 'response') {
        const callback = this.correlationIds[packet.correlationId];
        if (callback) {
          delete this.correlationIds[packet.correlationId];
          callback(packet.data);
        }
      }
    }
  }

  genCorrelationId = () => {
    return (++this.correlationId).toString();
  }

  sendData = (data) => {
    return new Promise((resolve) => {
      const newCorrelationId = this.genCorrelationId();
      this.correlationIds[newCorrelationId] = resolve;

      this.send('request', data, newCorrelationId);
    })
  }

  send = (type, data, correlationId) => {
    this.conn.write(JSON.stringify({
      type,
      correlationId,
      data
    }) + '\n');
  }

  closed = () => {
    console.log('Connection closed');
    if (this.onClosed) {
      this.onClosed(this);
    }
  }

  close = () => this.conn.close();
}
