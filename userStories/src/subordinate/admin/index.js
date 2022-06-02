import subCli from '../subCli.js';

import manageEvents from './manageEvents.js';

const args = ['event', 'admin'];
const stories = [manageEvents];

subCli('admin', args, stories);
