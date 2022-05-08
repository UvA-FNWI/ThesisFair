import { MongoClient } from 'mongodb';
const uri = process.env.mongodbConStrEvent || 'mongodb://localhost:27017'

const getEntities = () => [
  {
    name: 'New name1',
    description: 'New description1',
    type: 'company',
    contact: [{ type: 'website', content: 'qrcsoftware.nl/1' }, { type: 'email', content: 'info.1@uva.nl' }, { type: 'phonenumber', content: '06 12345671' }],
  },
  {
    name: 'New name 2',
    description: 'New description 2',
    type: 'research',
    contact: [{ type: 'website', content: 'qrcsoftware.nl/2' }, { type: 'email', content: 'info.2@uva.nl' }, { type: 'phonenumber', content: '06 12345672' }],
  }
];

export let entities;

const run = async (client) => {
  const db = await client.db('entity_service');
  const collection = db.collection('entities');

  if (await db.listCollections({ name: 'entities' }).hasNext()) {
    await collection.drop();
  }

  entities = getEntities();
  const res = await collection.insertMany(entities);

  for (const i in res.insertedIds) {
    entities[i].enid = res.insertedIds[i].toString();
    delete entities[i]._id;
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
