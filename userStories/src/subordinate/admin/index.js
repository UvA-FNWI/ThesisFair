import simulate from '../simulate.js';

import manageEntities from './manageEntities.js';
import manageEvents from './manageEvents.js';
import manageProjects from './manageProjects.js';

const stories = [manageEntities, manageEvents, manageProjects];

export default (url, running, caching, callback, event, admin) => simulate(url, running, caching, callback, 'admin', stories, [event, admin])
