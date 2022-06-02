import subCli from '../subCli.js';

import browseProjects from './browseProjects.js';
import browseVotedProjects from './browseVotedProjects.js';
import updateAccount from './updateAccount.js';
import uploadCV from './uploadCV.js';

const args = ['event', 'student'];
const stories = [browseProjects, browseVotedProjects, updateAccount, uploadCV];

subCli('student', args, stories);
