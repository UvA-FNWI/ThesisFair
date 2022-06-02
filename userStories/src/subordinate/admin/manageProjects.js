import { pages, loginAdmin, randSleep } from '../lib.js';

const manageProjects = async (event, admin) => {
  const evid = await loginAdmin(event, admin);

  const { actions } = await pages.admin.projectsDashboard(evid);
  await randSleep(0, 2);

  const { project } = await actions.createProject();

  await actions.updateProject(project.pid);
  await randSleep(0, 2);

  await actions.deleteProject(project.pid);
}
export default manageProjects;
