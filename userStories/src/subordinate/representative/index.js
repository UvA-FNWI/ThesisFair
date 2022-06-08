import simulate from '../simulate.js';

import viewStudents from './viewStudents.js';
import updateAccount from './updateAccount.js';

const stories = [updateAccount, viewStudents];

export default (url, running, caching, callback, event, entity, representative) => simulate(url, running, caching, callback, 'representative', stories, [event, entity, representative])
