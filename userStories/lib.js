import api, { apiTokenData } from './api.js';

export const sleep = (s) => new Promise((resolve) => setTimeout(resolve, s * 1000));
export const randSleep = (min, max) => sleep(min + (Math.random() * max - min));

export const loginStudent = async (event, student) => {
  await api.user.login(`student.${event}-${student}@student.uva.nl`, 'student');
  const events = await api.event.getAll().exec();
  return events[event].evid;
}

export const loginRep = async (event, entity, representative) => {
  await api.user.login(`representative.${event}-${entity}-${representative}@company.nl`, 'representative');
  const events = await api.event.getAll(false, { evid: 1 }).exec();
  return events[0].evid;
}


export const pages = {
  student: {
    dashboard: async () => {
      return {
        user: await api.user.get(apiTokenData.uid).exec(),
        actions: {
          updateInfo: async () => {
            api.user.student.update({
              uid: apiTokenData.uid,
              firstname: 'Lorem ipsum.',
              lastname: 'Lorem ipsum.',
              phone: 'Lorem ipsum.',
              websites: ['Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam ut magna id ut.', 'Lorem ipsum dolor nam.', 'Lorem ipsum dolor sit amet massa nunc.'],
            })
          }
        }
      }
    },

    votes: async (evid) => {
      const votes = await api.votes.getOfStudent(apiTokenData.uid, evid).exec();
      const projectArray = await api.project.getMultiple(votes, { evid: 0 }).exec();
      const projects = {};
      for (const project of projectArray) {
        if (!(project.enid in projects)) {
          projects[project.enid] = [];
        }

        projects[project.enid].push(project);
      }

      const entities = await api.entity.getMultiple(Object.keys(projects)).exec();
      for (const entity of entities) {
        entity.projects = projects[entity.enid];
      }

      return {
        votes,
        entities
      }
    },

    entities: async (evid) => {
      const event = await api.event.get(evid).exec();
      const entities = await api.entity.getMultiple(event.entities).exec();

      return {
        entities,
        actions: {
          openEntity: async (enid) => {
            return {
              projects: await api.project.getOfEntity(enid).exec(),
            };
          },
          search: async (name) => { // TODO

          },
          shareInfo: async (enid, state) => {
            await api.user.student.shareInfo(apiTokenData.uid, enid, state).exec();
          }
        }
      };
    }
  },
  rep: {
    dashboard: async () => {
      return {
        user: await api.user.get(apiTokenData.uid).exec(),
        actions: {
          updateInfo: async () => {
            api.user.representative.update({
              uid: apiTokenData.uid,
              firstname: 'Lorem ipsum.',
              lastname: 'Lorem ipsum.',
              phone: 'Lorem ipsum.',
            })
          }
        }
      }
    },
    projects: async (evid) => {
      return {
        projects: await api.project.getOfEntity(evid, apiTokenData.enid).exec(),
        actions: {
          getVotedUsers: async (pid) => {
            const uids = await api.votes.getOfProject(pid, evid).exec();

            return {
              students: await api.user.getMultiple(uids).exec(),
            }
          }
        }
      }
    }
  }
}
