import subCli from '../subCli.js';

import updateAccount from './updateAccount.js';
import updateEntity from './updateEntity.js';

const args = ['event', 'entity', 'adminRepresentative'];
const stories = [updateAccount, updateEntity];

subCli(args, stories);
