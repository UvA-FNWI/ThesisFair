import { Router } from 'express';
import { channel, rpc } from '../messaging.js';

const queue = 'API_events'
channel.assertQueue(queue, {
  durable: false,
});

const router = Router();

router.get('/create', async (req, res, next) => {
  const mutation = `
  mutation {
    event {
      create(name: "Test event", description: "Does this work") {
        evid
        name
        description
      }
    }
  }
  `;

  const result = JSON.parse((await rpc(queue, Buffer.from(mutation))).content.toString());
  res.send(result);
});

router.get('/:id?', async (req, res, next) => {
  const query = `
  query {
    event(evid: "${req.params.id}") {
      name
      description
      location
      entities
    }
  }
  `;

  const result = JSON.parse((await rpc(queue, Buffer.from(query))).content.toString());
  res.send(result);
});

export default router;
