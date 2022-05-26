import { pages, loginRep, randSleep } from '../lib.js';

const updateEntity = async (event, entity, adminRepresentative) => {
  await loginRep(event, entity, adminRepresentative, true);

  const { actions } = await pages.repAdmin.entityDashboard();
  await randSleep(0, 2);

  await actions.updateInfo();
}
export default updateEntity;
