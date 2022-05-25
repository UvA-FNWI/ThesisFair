import { pages, loginStudent, randSleep } from '../lib.js';

const browseProjects = async (event, student) => {
  const evid = await loginStudent(event, student);

  await pages.student.dashboard();
  await randSleep(0, 2);

  const { entities, actions } = await pages.student.entities(evid);

  for (const entity of entities) {
    await actions.openEntity(entity.enid);
    await randSleep(1, 3);
  }
}
export default browseProjects;
