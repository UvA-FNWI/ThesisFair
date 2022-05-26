import { pages, loginStudent, randSleep } from '../lib.js';

const browseVotedProjects = async (event, student) => {
  const evid = await loginStudent(event, student);

  await pages.student.dashboard();
  await randSleep(0, 2);

  await pages.student.votes(evid);
  await randSleep(0, 5);
}
export default browseVotedProjects;
