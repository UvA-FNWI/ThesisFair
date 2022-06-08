import simulate from '../simulate.js';

import browseProjects from './browseProjects.js';
import browseVotedProjects from './browseVotedProjects.js';
import updateAccount from './updateAccount.js';
import uploadCV from './uploadCV.js';

const stories = [browseProjects, browseVotedProjects, updateAccount, uploadCV];

export default (url, running, caching, callback, event, student) => simulate(url, running, caching, callback, 'student', stories, [event, student])
