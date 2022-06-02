import simulate from '../simulate.js';

import updateAccount from './updateAccount.js';
import updateEntity from './updateEntity.js';
import manageAccounts from './manageAccounts.js';

const stories = [updateAccount, updateEntity, manageAccounts];

export default (url, running, callback, event, entity, adminRepresentative) => simulate(url, running, callback, 'adminRepresentative', stories, [event, entity, adminRepresentative])
