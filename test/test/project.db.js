import { MongoClient } from 'mongodb';
const uri = process.env.mongodbConStrProject || 'mongodb://localhost:27017'

const getProjects = () => [
  {
    enid: '62728401f41b2cfc83a7035b',
    name: 'New name1',
    description: 'New description1',
    datanoseLink: 'https://datanose.nl/projects/newName1',
  },
  {
    enid: '62728401f41b2cfc83a7035b',
    name: 'New name 2',
    description: 'New description 2',
    datanoseLink: 'https://datanose.nl/projects/newName2',
  },
  {
    enid: '62728401f41b2cfc83a7035a',
    name: 'Other company project',
    description: 'Belongs to another company',
    datanoseLink: 'https://datanose.nl/projects/newName3',
  },
];

export let projects;

const run = async (client) => {
  const db = await client.db('project_service');
  const collection = db.collection('projects');

  if (await db.listCollections({ name: 'projects' }).hasNext()) {
    await collection.drop();
  }

  projects = getProjects();
  const res = await collection.insertMany(projects);

  for (const i in res.insertedIds) {
    projects[i].pid = res.insertedIds[i].toString();
    delete projects[i]._id;
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
