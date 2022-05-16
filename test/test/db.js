import { MongoClient, ObjectId } from 'mongodb';

export let db;

const configs = {
  entities: {
    uri: process.env.mongodbConStrEntity || 'mongodb://localhost:27017',
    db: 'entity_service',
    collection: 'entities',
    get: () => [
      {
        name: 'New name1',
        description: 'New description1',
        type: 'company',
        contact: [{ type: 'website', content: 'qrcsoftware.nl/1' }, { type: 'email', content: 'info.1@uva.nl' }, { type: 'phonenumber', content: '06 12345671' }],
        external_id: 0,
      },
      {
        name: 'New name 2',
        description: 'New description 2',
        type: 'research',
        contact: [{ type: 'website', content: 'qrcsoftware.nl/2' }, { type: 'email', content: 'info.2@uva.nl' }, { type: 'phonenumber', content: '06 12345672' }],
        external_id: 1,
      }
    ],
    postCreate: (entities, res) => {
      for (const i in res.insertedIds) {
        entities[i].enid = res.insertedIds[i].toString();
        delete entities[i]._id;
      }
    }
  },
  events: {
    uri: process.env.mongodbConStrEvent || 'mongodb://localhost:27017',
    db: 'event_service',
    collection: 'events',
    get: () => [
      {
        enabled: true,
        name: 'New name 1',
        description: 'New description 1',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 1',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [new ObjectId(db.entities[0].enid), new ObjectId(db.entities[1].enid)],
      },
      {
        enabled: false,
        name: 'New name 2',
        description: 'New description 2',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 2',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [new ObjectId(db.entities[0].enid), new ObjectId(db.entities[1].enid)],
      },
      {
        enabled: true,
        name: 'New name 3',
        description: 'New description 3',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 3',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [new ObjectId(db.entities[1].enid)],
      },
      {
        enabled: true,
        name: 'New name 4',
        description: 'New description 4',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 4',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [new ObjectId(db.entities[1].enid)],
      },
    ],
    postCreate: (events, res) => {
      for (const i in res.insertedIds) {
        events[i].evid = res.insertedIds[i].toString();
        delete events[i]._id;

        for (const entityIndex in events[i].entities) {
          events[i].entities[entityIndex] = events[i].entities[entityIndex].toString();
        }
      }
    }
  },
  projects: {
    uri: process.env.mongodbConStrProject || 'mongodb://localhost:27017',
    db: 'project_service',
    collection: 'projects',
    get: () => [
      {
        enid: ObjectId(db.entities[0].enid),
        name: 'New name1',
        description: 'New description1',
        datanoseLink: 'https://datanose.nl/projects/newName1',
      },
      {
        enid: ObjectId(db.entities[0].enid),
        name: 'New name 2',
        description: 'New description 2',
        datanoseLink: 'https://datanose.nl/projects/newName2',
      },
      {
        enid: ObjectId(db.entities[1].enid),
        name: 'Other company project',
        description: 'Belongs to another company',
        datanoseLink: 'https://datanose.nl/projects/newName3',
      },
    ],
    postCreate: (projects, res) => {
      for (const i in res.insertedIds) {
        projects[i].pid = res.insertedIds[i].toString();
        projects[i].enid = projects[i].enid.toString();
        delete projects[i]._id;
      }
    }
  },
};

const main = async () => {
  db = {};
  for (const name in configs) {
    const config = configs[name];

    const client = new MongoClient(config.uri);
    await client.connect();
    try {
      const mongodb = client.db(config.db);
      const collection = mongodb.collection(config.collection);

      if (await mongodb.listCollections({ name: config.collection }).hasNext()) {
        await collection.drop();
      }

      db[name] = config.get();
      const res = await collection.insertMany(db[name]);
      await config.postCreate(db[name], res);
    } finally {
      await client.close();
    }
  }
}

export default main;