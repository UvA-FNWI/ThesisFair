import { pages, loginStudent, randSleep } from '../lib.js';

const updateAccount = async (event, student) => {
  await loginStudent(event, student);

  const { actions } = await pages.student.dashboard();
  await randSleep(0, 2);

  await actions.uploadCV();
}
export default updateAccount;
