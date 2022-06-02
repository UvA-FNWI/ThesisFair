import subCli from '../subCli.js';

import updateAccount from './updateAccount.js';
import updateEntity from './updateEntity.js';
import manageAccounts from './manageAccounts.js';

const args = ['event', 'entity', 'adminRepresentative'];
const stories = [updateAccount, updateEntity, manageAccounts];

subCli('adminRepresentative', args, stories);
