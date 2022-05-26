import subCli from '../subCli.js';

import viewStudents from './viewStudents.js';
import updateAccount from './updateAccount.js';

const args = ['event', 'entity', 'representative'];
const stories = [updateAccount, viewStudents];

subCli(args, stories);
