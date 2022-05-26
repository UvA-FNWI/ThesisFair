import subCli from '../subCli.js';

import updateEntity from './updateEntity.js';

const args = ['event', 'entity', 'adminRepresentative'];
const stories = [updateEntity];

subCli(args, stories);
