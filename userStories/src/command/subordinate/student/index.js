import subCli from '../subCli.js';

import browseProjects from './browseProjects.js.js';
import browseVotedProjects from './browseVotedProjects.js.js';
import updateAccount from './updateAccount.js.js';

const args = ['event', 'student'];
const stories = [browseProjects, browseVotedProjects, updateAccount];

subCli('student', args, stories);
