import { pages, loginRep, randSleep } from '../lib.js';

const updateAccount = async (api, event, entity, adminRepresentative) => {
  await loginRep(api, event, entity, adminRepresentative, true);

  const { actions } = await pages.rep.dashboard(api);
  await randSleep(0, 2);

  await actions.updateInfo();
}
export default updateAccount;
