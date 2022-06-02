import { pages, loginStudent, randSleep } from '../lib.js';

const updateAccount = async (api, event, student) => {
  await loginStudent(api, event, student);

  const { actions } = await pages.student.dashboard(api);
  await randSleep(0, 2);

  await actions.updateInfo();
}
export default updateAccount;
