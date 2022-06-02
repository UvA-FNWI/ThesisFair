import subCli from '../subCli.js';

import manageEntities from './manageEntities.js';
import manageEvents from './manageEvents.js';

const args = ['event', 'admin'];
const stories = [manageEntities, manageEvents];

subCli('admin', args, stories);
