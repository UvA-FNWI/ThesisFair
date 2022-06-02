import subCli from '../subCli.js';

import manageEntities from './manageEntities.js';
import manageEvents from './manageEvents.js';
import manageProjects from './manageProjects.js';

const args = ['event', 'admin'];
const stories = [manageEntities, manageEvents, manageProjects];

subCli('admin', args, stories);
