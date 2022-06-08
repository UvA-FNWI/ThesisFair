import simulate from '../simulate.js';

import updateAccount from './updateAccount.js';
import updateEntity from './updateEntity.js';
import manageAccounts from './manageAccounts.js';

const stories = [updateAccount, updateEntity, manageAccounts];

export default (url, running, caching, callback, event, entity, adminRepresentative) => simulate(url, running, caching, callback, 'adminRepresentative', stories, [event, entity, adminRepresentative])
