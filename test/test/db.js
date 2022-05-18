import bcrypt from 'bcrypt';

export let db;

const saltRounds = 0;
const hashCache = {};
const hash = async (password) => {
  if (hashCache[password]) {
    return hashCache[password];
  }

  return (hashCache[password] = await bcrypt.hash(password, saltRounds))
};

const normalize = (objects, hide = []) => {
  hide ||= [];

  const normalizeValue = (value) => {
    if (value instanceof Object) {
      // The check below needs to hapen dirty because every ObjectId is from another mongoose library instance.
      if (value.constructor.name === 'ObjectId') {
        return value.toString();
      } else if (value instanceof Date) {
        return value.toISOString();
      } else if (Array.isArray(value)) {
        if (value.length === 0) { return value; }

        for (const i in value) {
          value[i] = normalizeValue(value[i]);
        }
      }
    }

    return value;
  }

  const normalizeObject = (object) => {
    delete object.id;
    delete object._id;
    delete object.__v;
    delete object.__t;

    for (const key of hide) {
      delete object[key];
    }

    for (const key in object) {
      object[key] = normalizeValue(object[key]);
    }

    return object;
  }

  return objects.map((object) =>
    object.toObject({
      virtuals: true,
      transform: (doc, object) => normalizeObject(object)
    })
  );
}

const configs = {
  entities: {
    uri: process.env.mongodbConStrEntity || 'mongodb://localhost:27017/entity_service',
    library: '../../entity_service/src/database.js',
    object: 'Entity',
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
  },
  events: {
    uri: process.env.mongodbConStrEvent || 'mongodb://localhost:27017/event_service',
    library: '../../event_service/src/database.js',
    object: 'Event',
    get: () => [
      {
        enabled: true,
        name: 'New name 1',
        description: 'New description 1',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 1',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [db.entities[0].enid, db.entities[1].enid],
      },
      {
        enabled: false,
        name: 'New name 2',
        description: 'New description 2',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 2',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [db.entities[0].enid, db.entities[1].enid],
      },
      {
        enabled: true,
        name: 'New name 3',
        description: 'New description 3',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 3',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [db.entities[1].enid],
      },
      {
        enabled: true,
        name: 'New name 4',
        description: 'New description 4',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location 4',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: [db.entities[1].enid],
      },
    ],
  },
  projects: {
    uri: process.env.mongodbConStrProject || 'mongodb://localhost:27017/project_service',
    library: '../../project_service/src/database.js',
    object: 'Project',
    get: () => [
      {
        enid: db.entities[0].enid,
        evid: db.events[0].evid,
        name: 'New name1',
        description: 'New description1',
        datanoseLink: 'https://datanose.nl/projects/newName1',
      },
      {
        enid: db.entities[0].enid,
        evid: db.events[0].evid,
        name: 'New name 2',
        description: 'New description 2',
        datanoseLink: 'https://datanose.nl/projects/newName2',
      },
      {
        enid: db.entities[1].enid,
        evid: db.events[1].evid,
        name: 'Other company project',
        description: 'Belongs to another company',
        datanoseLink: 'https://datanose.nl/projects/newName3',
      },
    ]
  },
  users: {
    uri: process.env.mongodbConStrUser || 'mongodb://localhost:27017/user_service',
    library: '../../user_service/src/database.js',
    object: 'User',
    objects: ['User', 'Student', 'Representative'],
    hide: ['password'],
    get: async () => [
      {
        firstname: 'Quinten',
        lastname: 'Coltof',
        email: 'student',
        password: await hash('student'),
        phone: '+31 6 01234567',
        studentnumber: '12345678',
        websites: ['https://qrcsoftware.nl', 'https://softwareify.nl'],
        studies: ['UvA Informatica'],
        __t: "Student",
      },
      {
        firstname: 'Johannes',
        lastname: 'Sebastiaan',
        email: 'johannes.sebastiaan@gmail.com',
        phone: '+31 6 11234567',
        studentnumber: '22345678',
        websites: ['https://johannes.nl', 'https://sebastiaan.nl'],
        studies: ['UvA Kunstmatige Intellegentie', 'VU Rechten'],
        __t: "Student",
      },
      {
        firstname: 'John',
        lastname: 'de jonge',
        email: 'rep',
        phone: '+31 6 21234567',
        enid: db.entities[0].enid,
        password: await hash('rep'),
        repAdmin: false,
        __t: "Representative",
      },
      {
        firstname: 'Edsger',
        lastname: 'Dijkstra',
        email: 'repAdmin',
        phone: '+31 6 31234567',
        enid: db.entities[0].enid,
        password: await hash('repAdmin'),
        repAdmin: true,
        __t: "Representative",
      },
      {
        firstname: 'Eduard',
        lastname: 'Dijkstra',
        email: 'Eduard.d@uva.com',
        phone: '+31 6 41234567',
        enid: db.entities[1].enid,
        password: await hash('helloWorld!'),
        repAdmin: false,
        __t: "Representative",
      },
      {
        email: 'admin',
        password: await hash('admin'),
        admin: true,
      },
    ],
  },
};

const main = async () => {
  db = {};
  for (const name in configs) {
    const config = configs[name];

    const lib = await import(config.library);
    await lib.connect(config.uri);
    try {
      await lib[config.object].db.dropDatabase();
      for (const object of config.objects || [config.object]) {
        await lib[object].init();
      }

      db[name] = normalize(await lib[config.object].insertMany(await config.get()), config.hide);
    } finally {
      await lib.disconnect();
    }
  }
}

export default main;
