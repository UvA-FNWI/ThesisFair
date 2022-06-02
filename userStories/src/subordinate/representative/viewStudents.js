import { pages, loginRep, randSleep } from '../lib.js';

const viewStudents = async (api, event, entity, representative) => {
  const evid = await loginRep(api, event, entity, representative);

  const { projects, actions } = await pages.rep.projects(api, evid);
  await randSleep(0.5, 2);

  for (const project of projects) {
    await actions.getVotedUsers(project.pid);
    await randSleep(0.5, 2);
  }
}
export default viewStudents;
