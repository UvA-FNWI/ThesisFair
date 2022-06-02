import { pages, loginAdmin, randSleep } from '../lib.js';

const manageEntities = async (api, event, admin) => {
  await loginAdmin(api, event, admin);

  const { actions } = await pages.admin.entitiesDashboard(api);
  await randSleep(0, 2);

  const { entity } = await actions.createEntity();

  await actions.updateEntity(entity.enid);
  await randSleep(0, 2);

  await actions.deleteEntity(entity.enid);
}
export default manageEntities;
