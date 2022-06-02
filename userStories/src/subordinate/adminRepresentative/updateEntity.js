import { pages, loginRep, randSleep } from '../lib.js';

const updateEntity = async (api, event, entity, adminRepresentative) => {
  await loginRep(api, event, entity, adminRepresentative, true);

  const { actions } = await pages.repAdmin.entityDashboard(api);
  await randSleep(0, 2);

  await actions.updateInfo();
}
export default updateEntity;
