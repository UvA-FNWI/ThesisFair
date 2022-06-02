import { pages, loginStudent, randSleep } from '../lib.js';

const browseVotedProjects = async (api, event, student) => {
  const evid = await loginStudent(api, event, student);

  await pages.student.dashboard(api);
  await randSleep(0, 2);

  await pages.student.votes(api, evid);
  await randSleep(0, 5);
}
export default browseVotedProjects;
