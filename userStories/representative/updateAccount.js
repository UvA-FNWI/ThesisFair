import { pages, loginRep, randSleep } from '../lib.js';

const updateAccount = async (event, entity, representative) => {
  await loginRep(event, entity, representative);

  const { actions } = await pages.rep.dashboard();
  await randSleep(0, 2);

  await actions.updateInfo();
}
export default updateAccount;
