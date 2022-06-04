import mongoose from 'mongoose';
import inquirer from 'inquirer';
import { existsSync } from 'fs';
import { createWriteStream } from 'fs';

const outputFile = './out.csv';
const sep = ',';

const Result = mongoose.model('Result', new mongoose.Schema({
  run: String,
  id: mongoose.Schema.Types.ObjectId,
  time: Date,
  proc: String,
  event: String,
  data: Object
}));

const serviceMapping = {
  entity: ['entity', 'entitiesAll', 'entities', /^entity\..+/],
  event: ['event', 'events', /^event\..+/],
  project: ['project', 'projects', 'projectsOfEntity', 'projectsOfEvent', /^project\..+/],
  user: ['user', 'users', 'cv', 'apiToken', /^user\..+/],
  vote: ['votesOfStudent', 'votesOfEntity', 'votesOfProject'],
};

const findService = (functionPath) => {
  for (const service in serviceMapping) {
    for (const mapper of serviceMapping[service]) {
      if (mapper instanceof RegExp ? mapper.test(functionPath) : mapper === functionPath) {
        return service;
      }
    }
  }

  throw new Error('Service not found for functionPath:', functionPath);
}

const getRequestResults = async (curr, next) => {
  const results = Result.find({ proc: 'simulate', time: { $gte: curr, $lt: next } });

  const requests = {
    total: 0,
    entity: 0,
    event: 0,
    project: 0,
    user: 0,
    vote: 0,
  };
  const duration = {
    total: 0,
    entity: 0,
    event: 0,
    project: 0,
    user: 0,
    vote: 0,
  }
  let errors = 0;
  for await (const result of results) {
    if (result.event === 'error') {
      errors += 1;
      continue;
    }

    requests.total += result.data.trace.length;

    for (const request of result.data.trace) {
      const service = findService(request.fn);
      requests[service] += 1;
      duration[service] += request.duration;
      duration.total += request.duration;
    }
  }

  return {
    'requests': requests.total,
    'request total duration': duration.total,
    'request errors': errors,
    'entity_service requests': requests.entity,
    'event_service requests': requests.event,
    'project_service requests': requests.project,
    'user_service requests': requests.user,
    'vote_service requests': requests.vote,
    'entity_service total duration': duration.entity,
    'event_service total duration': duration.event,
    'project_service total duration': duration.project,
    'user_service total duration': duration.user,
    'vote_service total duration': duration.vote,
  };
}

const compileResults = async (config) => {
  if (config.exports.length === 0) {
    throw new Error('At least one export should be selected. This script retrieves the timestamp buckets from the export');
  }
  const timestamps = await Result.find({ id: config.exports[0] }).distinct('time');
  const names = (await Result.find({ $in: { id: config.exports }, time: timestamps[0] }))
    .reduce((a, doc) => {
      for (const key of Object.keys(doc.data)) {
        if (a.includes(key)) {
          console.error(doc);
          throw new Error(`Duplicate data key ${key} encountered`);
        }

        a.push(key);
      }

      return a;
    }, []);

  const headers = [
    'timestamp',
    'requests',
    'request total duration',
    'request errors',
    'entity_service requests',
    'event_service requests',
    'project_service requests',
    'user_service requests',
    'vote_service requests',
    'entity_service total duration',
    'event_service total duration',
    'project_service total duration',
    'user_service total duration',
    'vote_service total duration',
    ...names
  ]
  const fs = createWriteStream(outputFile);
  fs.write(headers.join(sep) + '\n');

  let curr, next;
  for (let i = 0; i < timestamps.length - 1; i++) {
    curr = timestamps[i];
    next = timestamps[i + 1];

    const results = (await Result.find({ $in: { id: config.exports }, time: curr })).map((result) => result.data);
    const data = Object.assign(Object.create(null), await getRequestResults(curr, next), ...results);
    data.timestamp = curr.toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' });

    let res = '';
    for (const header of headers) {
      let value = data[header];
      if (typeof value === 'string') {
        value = value.replace(/req(\/s)?/g, '', ).trim();
      } else if (typeof value === 'undefined') {
        value = '';
      }

      res += value + sep;
    }
    fs.write(res + '\n');
  }
}

const genQuestions = async () => {
  const runsStart = await Result.find({ event: 'runStart' });
  const runsEnd = await Result.find({ event: 'runEnd' });

  const runsFiltered = runsStart.filter((startDoc) => runsEnd.find((endDoc) => startDoc.id.equals(endDoc.id)));
  console.log(runsStart.length - runsFiltered.length, 'unfinished runs found');

  const exportIds = await Result.find({ event: 'manualCSVImportRecord' }).distinct('id');
  const exportNames = await Promise.all(exportIds.map((exportId) => Result.findOne({ id: exportId }).then((doc) => doc.proc)));

  return [
    {
      type: 'checkbox',
      message: 'Select which finished runs you want to include in the export',
      name: 'runs',
      choices: runsFiltered.map((doc) => ({
        name: `${doc.time} ${doc.run}`,
        value: doc.id,
      })),
    },
    {
      type: 'checkbox',
      message: 'Select which imported files you want to include in the export',
      name: 'exports',
      choices: exportIds.map((exportId, i) => ({
        name: exportNames[i],
        value: exportId,
      }))
    },
  ];
}

const main = async () => {
  if (existsSync(outputFile)) {
    console.error('Output file already exists. It will be overwritten if you continue!');
  }

  const setupQuestions = await inquirer.prompt({
    type: 'input',
    name: 'mongodb',
    message: 'Where is the results mongodb database located?',
    default: 'localhost/real',
  });
  mongoose.connect('mongodb://' + setupQuestions.mongodb)

  const answers = await inquirer.prompt(await genQuestions());

  await compileResults(answers);

  await mongoose.disconnect();
}
main();
