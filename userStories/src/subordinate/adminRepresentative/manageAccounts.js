import { pages, loginRep, randSleep } from '../lib.js';

const manageAccounts = async (api, event, entity, adminRepresentative) => {
  await loginRep(api, event, entity, adminRepresentative, true);

  const { actions } = await pages.repAdmin.entityDashboard(api);
  await randSleep(0, 2);

  let users = [];
  for (let index = 0; index < 5; index++) {
    users.push(actions.createUser());
    await randSleep(0, 2);
  }
  users = await Promise.all(users);

  for (const { user } of users) {
    await actions.updateUser(user.uid, true);
    await randSleep(0, 2);
  }

  for (const { user } of users) {
    await actions.deleteUser(user.uid);
    await randSleep(0, 0.5);
  }
}
export default manageAccounts;
