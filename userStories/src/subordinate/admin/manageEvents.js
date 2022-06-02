import { pages, loginAdmin, randSleep } from '../lib.js';

const manageEvents = async (api, event, admin) => {
  const evid = await loginAdmin(api, event, admin);

  const { actions } = await pages.admin.eventsDashboard(api);
  await randSleep(0, 2);

  await actions.updateEvent(evid);
  await randSleep(0, 2);

  const { event: newEvent } = await actions.createEvent();

  await actions.updateEvent(newEvent.evid);
  await randSleep(0, 2);

  await actions.deleteEvent(newEvent.evid);
}
export default manageEvents;
