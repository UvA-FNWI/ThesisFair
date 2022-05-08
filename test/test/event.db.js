import { MongoClient, ObjectId } from 'mongodb';
const uri = process.env.mongodbConStr || 'mongodb://localhost:27017'

const getEvents = () => [
  {
    enabled: true,
    name: 'New name 1',
    description: 'New description 1',
    start: '2022-04-27T22:00:00.000Z',
    location: 'New location 1',
    studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
    entities: [new ObjectId('62728401f41b2cfc83a7035b'), new ObjectId('6266fb7b25f56e50b2306d0f'), new ObjectId('6266fb7b25f56e50b2306d0e')],
  },
  {
    enabled: false,
    name: 'New name 2',
    description: 'New description 2',
    start: '2022-04-27T22:00:00.000Z',
    location: 'New location 2',
    studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
    entities: [new ObjectId('62728401f41b2cfc83a7035b'), new ObjectId('6266fb7b25f56e50b2306d0a'), new ObjectId('6266fb7b25f56e50b2306d0b')],
  },
  {
    enabled: true,
    name: 'New name 3',
    description: 'New description 3',
    start: '2022-04-27T22:00:00.000Z',
    location: 'New location 3',
    studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
    entities: [new ObjectId('62728401f41b2cfc83a7035b'), new ObjectId('6266fb7b25f56e50b2306d0a'), new ObjectId('6266fb7b25f56e50b2306d0b')],
  },
  {
    enabled: true,
    name: 'New name 4',
    description: 'New description 4',
    start: '2022-04-27T22:00:00.000Z',
    location: 'New location 4',
    studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
    entities: [new ObjectId('6266fb7b25f56e50b2306d0a'), new ObjectId('6266fb7b25f56e50b2306d0b')],
  }
];

export let events;

const run = async (client) => {
  const db = await client.db('event_service');
  const collection = db.collection('events');

  if (await db.listCollections({ name: 'events' }).hasNext()) {
    await collection.drop();
  }

  events = getEvents();
  const res = await collection.insertMany(events);

  for (const i in res.insertedIds) {
    events[i].evid = res.insertedIds[i].toString();
    delete events[i]._id;

    for (const entityIndex in events[i].entities) {
      events[i].entities[entityIndex] = events[i].entities[entityIndex].toString();
    }
  }
}

const main = async () => {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    await run(client);
  } finally {
    await client.close();
  }
}

export default main;
main();
