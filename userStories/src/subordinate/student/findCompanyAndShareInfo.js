import { pages, loginStudent, randSleep } from '../lib.js';

const findCompanyAndShareInfo = async (event, student) => {
  const evid = await loginStudent(event, student);

  await pages.student.dashboard();
  await randSleep(0, 10);

  const { entities, actions } = await pages.student.entities(evid);

  const foundEntities = await actions.search('Entity 1'); // TODO: Make this functional
  await actions.shareInfo(foundEntities[0].enid, true);

}
// export default findCompanyAndShareInfo;
