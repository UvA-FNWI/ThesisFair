import fs from 'fs'
import path from 'path'
import { Command } from 'commander';
import mongoose from 'mongoose';
import { parse as csvParser } from 'csv-parse';

const Result = mongoose.model('Result', new mongoose.Schema({
  run: String,
  id: mongoose.Schema.Types.ObjectId,
  time: Date,
  proc: String,
  event: String,
  data: Object
}));

const uploadFile = (file, run) => {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(file);
    const parser = csvParser({ columns: true, skip_empty_lines: true, trim: true, relaxQuotes: true });
    const id = mongoose.Types.ObjectId();

    parser.on('readable', async () => {
      let record;
      while ((record = parser.read()) !== null) {
        const timeKey = Object.keys(record)[0];
        const time = record[timeKey];
        delete record[timeKey];

        await Result.create({
          id: id,
          run: run,
          time: time,
          proc: fileName,
          event: 'manualCSVImportRecord',
          data: record,
        })
      }
    });

    parser.on('error', reject);
    parser.on('end', resolve);

    const fileStream = fs.createReadStream(file, { encoding: 'utf-8' });
    fileStream.pipe(parser);
  });
}

const uploadDir = async (csvDir, db, run) => {
  await mongoose.connect('mongodb://' + db);
  console.log('Connected to database');

  for (const file of fs.readdirSync(csvDir)) {
    if (!file.endsWith('.csv')) {
      continue;
    }

    console.log('Loading', file);
    await uploadFile(path.join(csvDir, file), run);
    console.log('Uploaded', file);
  }

  await mongoose.disconnect();
}

const main = () => {
  const program = new Command();
  program
    .argument('<csvDir>', 'The directory of the csv files')
    .argument('<db>', 'The mongodb database where to dump the results')
    .argument('[run]', 'The run annotation to add to all the rows which are dumped')
    .action(uploadDir);

  program.parse();
}
main();
