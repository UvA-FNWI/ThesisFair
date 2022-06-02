import simulate from '../simulate.js';

import manageEntities from './manageEntities.js';
import manageEvents from './manageEvents.js';
import manageProjects from './manageProjects.js';

const stories = [manageEntities, manageEvents, manageProjects];

export default (url, running, callback, event, admin) => simulate(url, running, callback, 'admin', stories, [event, admin])
