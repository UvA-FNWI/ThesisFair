import { Router } from 'express';
import { channel, rpc } from '../messaging.js';

const queue = 'API_events'
channel.assertQueue(queue, {
  durable: false,
});

const router = Router();

/* GET users listing. */
router.get('/', async (req, res, next) => {
  const result = await rpc(queue, Buffer.from('request'))
  res.send(result);
});

export default router;
