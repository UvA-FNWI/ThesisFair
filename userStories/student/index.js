import subCli from '../subCli.js';

import browseProjects from './browseProjects.js';
import browseVotedProjects from './browseVotedProjects.js';
import updateAccount from './updateAccount.js';

const args = ['event', 'student'];
const stories = [browseProjects, browseVotedProjects, updateAccount];

subCli(args, stories);
