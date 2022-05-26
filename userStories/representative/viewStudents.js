import { pages, loginRep, randSleep } from '../lib.js';

const viewStudents = async (event, entity, representative) => {
  const evid = await loginRep(event, entity, representative);

  const { projects, actions } = await pages.rep.projects(evid);
  await randSleep(0.5, 2);

  for (const project of projects) {
    await actions.getVotedUsers(project.pid);
    await randSleep(0.5, 2);
  }
}
export default viewStudents;
