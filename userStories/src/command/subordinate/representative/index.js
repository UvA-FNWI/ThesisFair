import subCli from '../subCli.js';

import viewStudents from './viewStudents.js.js';
import updateAccount from './updateAccount.js.js';

const args = ['event', 'entity', 'representative'];
const stories = [updateAccount, viewStudents];

subCli('representative', args, stories);
