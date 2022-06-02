import api, { apiTokenData } from '../api.js';
import { readFile } from 'fs/promises';

const longDescription = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed at vehicula neque. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Etiam sagittis magna vitae interdum vehicula. Duis mi neque, accumsan vel lacus ac, pretium pellentesque est. Donec tellus purus, sodales sit amet eros nec, consectetur mattis quam. Ut pretium, est eu lacinia accumsan, quam nunc euismod mi, sit amet viverra dui lorem nec velit. In tempus, leo eu aliquet pretium, urna tellus rutrum quam, eget accumsan odio mauris imperdiet massa. Sed ut faucibus arcu. Fusce vel tortor vitae risus pulvinar luctus. Etiam at dui metus. Etiam odio nisi, imperdiet efficitur iaculis ac, feugiat ac massa. Aliquam pellentesque libero bibendum nunc volutpat, sit amet pharetra nisl efficitur. Suspendisse malesuada leo mauris. Aenean cursus mi et eros scelerisque, sed efficitur mauris volutpat. Donec volutpat enim id aliquet porttitor. Maecenas nec iaculis tortor.';
export const sleep = (s) => new Promise((resolve) => setTimeout(resolve, s * 1000));
export const randSleep = (min, max) => sleep(min + (Math.random() * max - min));

export const loginStudent = async (event, student) => {
  await api.user.login(`student.${event}-${student}@student.uva.nl`, 'student');
  const events = await api.event.getAll().exec();
  return events[event].evid;
}

export const loginRep = async (event, entity, representative, admin = false) => {
  await api.user.login(`${admin ? 'adminRepresentative' : 'representative'}.${event}-${entity}-${representative}@company.nl`, admin ? 'adminRepresentative' : 'representative');
  const events = await api.event.getAll(false, { evid: 1 }).exec();
  return events[0].evid;
}

export const loginAdmin = async (event, admin) => {
  await api.user.login(`admin.${event}-${admin}@uva.nl`, 'admin');
  const events = await api.event.getAll().exec();
  return events[event].evid;
}

export const pages = {
  student: {
    dashboard: async () => {
      return {
        user: await api.user.get(apiTokenData.uid).exec(),
        actions: {
          updateInfo: async () => {
            await api.user.student.update({
              uid: apiTokenData.uid,
              firstname: 'Lorem ipsum.',
              lastname: 'Lorem ipsum.',
              phone: 'Lorem ipsum.',
              websites: ['Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam ut magna id ut.', 'Lorem ipsum dolor nam.', 'Lorem ipsum dolor sit amet massa nunc.'],
            }).exec();
          },
          uploadCV: async () => {
            await api.user.student.uploadCV(apiTokenData.uid, (await readFile('../../files/cv.txt')).toString('base64')).exec();
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
              projects: await api.project.getOfEntity(evid, enid).exec(),
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
            await api.user.representative.update({
              uid: apiTokenData.uid,
              firstname: 'Lorem ipsum.',
              lastname: 'Lorem ipsum.',
              phone: 'Lorem ipsum.',
            }).exec();
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
  },
  repAdmin: {
    entityDashboard: async () => {
      return {
        entity: await api.entity.get(apiTokenData.enid).exec(),
        actions: {
          updateInfo: async () => {
            await api.entity.update({
              enid: apiTokenData.enid,
              name: 'Lorem ipsum.',
              description: 'Lorem ipsum.',
              contact: [{ type: 'website', content: 'Lorem ipsum.'}, { type: 'phone', content: '+31 000000000' }, { type: 'email', content: 'contact@company.nl' }],
            }).exec();
          },

          createUser: async () => {
            const user = await api.user.representative.create({
              enid: apiTokenData.enid,
              firstname: 'Employee firstname',
              lastname: 'Employee lastname',
              email: `${apiTokenData.enid} - ${Date.now()} - ${Math.random()*100}@company.nl`,
              phone: '06 83277881'
            }).exec();

            return {
              user: user,
            };
          },

          updateUser: async (uid, admin) => {
            await api.user.representative.update({
              uid: uid,
              repAdmin: admin
            }).exec();
          },

          deleteUser: async (uid) => {
            await api.user.delete(uid).exec();
          }
        }
      };
    },
  },
  admin: {
    eventsDashboard: async () => {
      return {
        events: await api.event.getAll().exec(),

        actions: {
          createEvent: async () => {
            const event = await api.event.create({
              enabled: false,
              name: 'The next big thesisfair',
              description: longDescription,
              start: Date.now(),
              location: 'UvA',
              studentSubmitDeadline: new Date() + 7,
              entities: []
            }).exec();
            return {
              event: event
            }
          },
          updateEvent: async (evid) => {
            await api.event.update({
              evid: evid,
              name: 'The name is now different!',
              description: longDescription,
            }).exec();
          },
          deleteEvent: async (evid) => {
            await api.event.delete(evid).exec();
          },
        }
      }
    },
    entitiesDashboard: async () => {
      return {
        entities: await api.entity.getAll().exec(),

        actions: {
          updateEntity: async (enid) => {
            await api.entity.update({
              enid: enid,
              name: 'The new name of the company',
              description: 'The new company description set by the admin is waaaay beter than the previous',
              type: 'research',
            }).exec();
          },
          createEntity: async () => {
            const entity = await api.entity.create({
              name: 'The name of the company',
              description: 'The company description set by the admin is waaaay beter than the previous',
              type: 'company',
            }).exec();

            return {
              entity: entity
            }
          },
          updateEntity: async (evid) => {
            await api.entity.create({
              evid: evid,
              name: 'The name is now different!',
              description: longDescription,
              type: 'company',
            }).exec();
          },
          deleteEntity: async (evid) => {
            await api.entity.delete(evid).exec();
          },
        }
      };
    },
    projectsDashboard: async (evid) => {
      return {
        projects: await api.project.getOfEvent(evid).exec(),

        actions: {
          createProject: async () => {
            const event = await api.event.get(evid, { entities: 1 }).exec();

            const project = await api.project.create({
              enid: event.entities[0],
              evid: evid,
              name: 'The most epic project ever',
              description: longDescription,
              datanoseLink: 'https://datanose.nl/epidProject',
            }).exec();

            return {
              project: project,
            }
          },
          updateProject: async (pid) => {
            await api.project.update({
              pid: pid,
              name: 'The new name of the project!',
              description: longDescription,
              datanoseLink: 'https://datanose.nl/epidProject',
            }).exec();
          },
          deleteProject: async (pid) => {
            await api.project.delete(pid).exec();
          }
        }
      };
    },
  }
}
