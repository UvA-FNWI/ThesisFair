import { pages, loginAdmin, randSleep } from '../lib.js';

const manageEntities = async (event, admin) => {
  await loginAdmin(event, admin);

  const { actions } = await pages.admin.entitiesDashboard();
  await randSleep(0, 2);

  const { entity } = await actions.createEntity();

  await actions.updateEntity(entity.enid);
  await randSleep(0, 2);

  await actions.deleteEntity(entity.enid);
}
export default manageEntities;
