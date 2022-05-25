import { expect } from 'chai';

import { fail } from './lib.js';
import api from '../../userStories/api.js';
import initDB, { init, disconnect, db } from './db.js';


const project_import = {
  csv: ``,
  data: [
  ]
};

const testQuery = () => {
  it('query project should get a project', async () => {
    const res = await api.project.get(db.projects[0].pid).exec();
    expect(res).to.deep.equal(db.projects[0]);
  });

  it('query projects should get the correct projects', async () => {
    const res = await api.project.getMultiple([db.projects[1].pid, db.projects[0].pid]).exec();

    expect(res).to.deep.include(db.projects[0]);
    expect(res).to.deep.include(db.projects[1]);
    expect(res).to.not.deep.include(db.projects[2]);
  });

  it('query projectsOfEntity should get the correct projects', async () => {
    const res = await api.project.getOfEntity(db.entities[0].enid).exec();

    for (const project of db.projects) {
      if (db.projects[0].enid === project.enid) {
        expect(res).to.deep.include(project);
      } else {
        expect(res).not.to.deep.include(project);
      }
    }
  });

  it('query projectsOfEvent should get the correct projects', async () => {
    const res = await api.project.getOfEvent(db.events[0].evid).exec();

    for (const project of db.projects) {
      if (db.events[0].evid === project.evid) {
        expect(res).to.deep.include(project);
      } else {
        expect(res).not.to.deep.include(project);
      }
    }
  });
}

const permissions = {
  create: () => {
    it('mutation create should hanle permissions properly', async () => {
      const newEntity = { ...db.projects[0] };
      delete newEntity.pid;
      await fail(api.project.create(newEntity).exec);
    });
  },
  update: () => {
    it('mutation update should hanle permissions properly', async () => {
      const updatedEntity = { ...db.projects[1], pid: db.projects[0].pid };
      await fail(api.project.update(updatedEntity).exec);
    });
  },
  delete: () => {
    it('mutation delete should hanle permissions properly', async () => {
      await fail(api.project.delete(db.projects[0].pid).exec);
    });
  },
  // import: () => {
  //   it('mutation import should hanle permissions properly', async () => {
  //     await fail(api.project.import(entity_import.csv).exec);
  //   });
  // },
}

describe('project', () => {
  before(init);
  after(disconnect);
  beforeEach(initDB);

  describe('Admin', () => {
    beforeEach(async () => {
      await api.user.login('admin', 'admin');
    });

    testQuery();

    it('mutation project.create should create an project', async () => {
      const project = { ...db.projects[0] };
      delete project.pid;

      const res = await api.project.create(project).exec();
      expect(res.pid).to.exist;
      expect(res).to.deep.equal({...project, pid: res.pid});
    });

    it('mutation project.create should properly check if event exists', async () => {
      const project = { ...db.projects[0], evid: '62728401a41b2cfc83a7035b' };
      delete project.pid;

      await fail(api.project.create(project).exec);
    });

    it('mutation project.create should properly check if entity exists', async () => {
      const project = { ...db.projects[0], enid: '62728401a41b2cfc83a7035b' };
      delete project.pid;

      await fail(api.project.create(project).exec);
    });

    it('mutation project.update should update the project', async () => {
      const updatedEntity = { ...db.projects[1], pid: db.projects[0].pid };
      const res = await api.project.update(updatedEntity).exec()
      expect(res).to.deep.equal(updatedEntity);
    });

    it('mutation project.update should properly check if the event exists', async () => {
      await fail(api.project.update({ pid: db.projects[0].pid, evid: '62728401a41b2cfc83a7035b' }).exec);
    });

    it('mutation project.update should properly check if the entity exists', async () => {
      await fail(api.project.update({ pid: db.projects[0].pid, enid: '62728401a41b2cfc83a7035b' }).exec);
    });


    it('mutation project.delete should delete the project', async () => {
      const res = await api.project.delete(db.projects[0].pid).exec();
      expect(res).to.deep.equal(db.projects[0]);

      const query = await api.project.get(db.projects[0].pid).exec();
      expect(query).to.be.null;
    });

    it('mutation project.deleteOfEntity should delete all entities projects', async () => {
      await api.project.deleteOfEntity(db.entities[0].enid).exec();

      let query = await api.project.get(db.projects[0].pid).exec();
      expect(query).to.be.null;
      query = await api.project.get(db.projects[1].pid).exec();
      expect(query).to.be.null;
      query = await api.project.get(db.projects[2].pid).exec();
      expect(query).to.deep.equal(db.projects[2]);
    });

    describe('Representative', () => {
      beforeEach(async () => {
        await api.user.login('rep', 'rep');
      });

      testQuery();

      permissions.create();
      permissions.update();
      permissions.delete();
      // permissions.import();
    });

    describe('Student', () => {
      beforeEach(async () => {
        await api.user.login('student', 'student');
      });

      testQuery();

      permissions.create();
      permissions.update();
      permissions.delete();
      // permissions.import();
    });
  });
});
