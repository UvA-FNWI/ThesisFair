import { pages, loginRep, randSleep } from '../lib.js';

const updateAccount = async (event, entity, adminRepresentative) => {
  await loginRep(event, entity, adminRepresentative, true);

  const { actions } = await pages.rep.dashboard();
  await randSleep(0, 2);

  await actions.updateInfo();
}
export default updateAccount;
