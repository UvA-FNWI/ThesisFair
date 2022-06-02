import { pages, loginRep, randSleep } from '../lib.js';

const updateAccount = async (api, event, entity, representative) => {
  await loginRep(api, event, entity, representative);

  const { actions } = await pages.rep.dashboard(api);
  await randSleep(0, 2);

  await actions.updateInfo();
}
export default updateAccount;
