import { expect } from 'chai';

import { fail } from './lib.js';
import api from './api.js';
import initDB, { init, disconnect, db } from './db.js';


const gen_project_import = () => ({
  base: [
    {
      ID: 10101,
      entityID: 0,
      name: 'Test Project',
      description: 'This is a test project',
      datanoseLink: 'https://datanose.nl/project/test',
      enabled: true,
    },
    {
      ID: 20202,
      entityID: 0,
      name: 'UvA Project',
      description: 'You will be doing reserach at the UvA',
      datanoseLink: 'https://datanose.nl/project/UvAResearch',
      enabled: true,
    },
  ],
  update: [
    {
      ID: 10101,
      entityID: 0,
      name: 'Test',
      description: 'It will be cool',
      datanoseLink: 'https://datanose.nl/project/test',
      enabled: true,
    },
    {
      ID: 20202,
      entityID: 0,
      name: 'UvA',
      description: 'You will be doing cool stuf at the UvA',
      datanoseLink: 'https://datanose.nl/project/UvAResearch',
      enabled: true,
    },
  ],
  updateEnid: [
    {
      ID: 10101,
      entityID: 1,
      name: 'Test Project',
      description: 'This is a test project',
      datanoseLink: 'https://datanose.nl/project/test',
      enabled: true,
    },
    {
      ID: 20202,
      entityID: 1,
      name: 'UvA Project',
      description: 'You will be doing reserach at the UvA',
      datanoseLink: 'https://datanose.nl/project/UvAResearch',
      enabled: true,
    },
  ],
  delete: [
    {
      ID: 10101,
      entityID: 0,
      name: 'Test Project',
      description: 'This is a test project',
      datanoseLink: 'https://datanose.nl/project/test',
      enabled: false,
    },
    {
      ID: 20202,
      entityID: 0,
      name: 'UvA Project',
      description: 'You will be doing reserach at the UvA',
      datanoseLink: 'https://datanose.nl/project/UvAResearch',
      enabled: false,
    },
  ],
  invalidEnid: [
    {
      ID: 10101,
      entityID: 12344321,
      name: 'Test Project',
      description: 'This is a test project',
      datanoseLink: 'https://datanose.nl/project/test',
      enabled: true,
    },
    {
      ID: 20202,
      entityID: 12344321,
      name: 'UvA Project',
      description: 'You will be doing reserach at the UvA',
      datanoseLink: 'https://datanose.nl/project/UvAResearch',
      enabled: true,
    },
  ],
});

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
    const res = await api.project.getOfEntity(db.events[0].evid, db.entities[0].enid).exec();

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
  import: () => {
    it('mutation import should hanle permissions properly', async () => {
      const project_import = gen_project_import();
      await fail(api.project.import(project_import.csv, db.entities[0].enid).exec);
    });
  },
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
      const project = { ...db.projects[0], external_id: 10101 };
      delete project.pid;

      const res = await api.project.create(project).exec();
      expect(res.pid).to.exist;
      expect(res).to.deep.equal({ ...project, pid: res.pid });
    });

    it('mutation project.create should properly check if event exists', async () => {
      const project = { ...db.projects[0], evid: '62728401a41b2cfc83a7035b', external_id: 10101 };
      delete project.pid;

      await fail(api.project.create(project).exec);
    });

    it('mutation project.create should properly check if entity exists', async () => {
      const project = { ...db.projects[0], enid: '62728401a41b2cfc83a7035b', external_id: 10101 };
      delete project.pid;

      await fail(api.project.create(project).exec);
    });

    it('mutation project.update should update the project', async () => {
      const updatedEntity = { ...db.projects[1], pid: db.projects[0].pid, external_id: db.projects[0].external_id };
      const res = await api.project.update(updatedEntity).exec();
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

    it('mutation project.import should import projects', async () => {
      const project_import = gen_project_import();
      const res = await api.project.import(project_import.base, db.events[0].evid).exec();

      for (let i = 0; i < project_import.base; i++) {
        const actual = res[i];
        const expected = project_import.base[i];

        expect(actual.error).to.be.null;
        expect(actual.project.evid).to.equal(db.events[0].evid);
        expect(actual.project.enid).to.equal(db.entities[0].enid);
        expect(actual.project.name).to.equal(expected.name);
        expect(actual.project.external_id).to.equal(expected.ID);
        expect(actual.project.description).to.equal(expected.description);
        expect(actual.project.datanoseLink).to.equal(expected.datanoseLink);
      }
    });

    it('mutation project.import should check if evid exists when creating', async () => {
      const project_import = gen_project_import();
      await fail(api.project.import(project_import.base, '63061b54a3bd020d16952b11').exec);
    });

    it('mutation project.import should check if enid exists when creating', async () => {
      const project_import = gen_project_import();
      const res = await api.project.import(project_import.invalidEnid, db.events[0].evid).exec();
      for (const item of res) {
        expect(item.project).to.be.null;
        expect(item.error).to.be.string;
        expect(item.error.length).to.be.above(0);
      }
    });

    it('mutation project.import should update existing projects', async () => {
      const project_import = gen_project_import();
      await api.project.import(project_import.base, db.events[0].evid).exec();
      const res = await api.project.import(project_import.update, db.events[0].evid).exec();

      for (let i = 0; i < project_import.base; i++) {
        const actual = res[i];
        const expected = project_import.update[i];

        expect(actual.error).to.be.null;
        expect(actual.project.evid).to.equal(db.events[0].evid);
        expect(actual.project.enid).to.equal(db.entities[0].enid);
        expect(actual.project.name).to.equal(expected.name);
        expect(actual.project.external_id).to.equal(expected.ID);
        expect(actual.project.description).to.equal(expected.description);
        expect(actual.project.datanoseLink).to.equal(expected.datanoseLink);
      }
    });

    it('mutation project.import should delete projects', async () => {
      const project_import = gen_project_import();
      await api.project.import(project_import.base, db.events[0].evid).exec();

      const res = await api.project.import(project_import.delete, db.events[0].evid).exec();
      for (const item of res) {
        expect(item.project).to.be.null;
        expect(item.error).to.be.null;
      }
    });

    it('mutation project.import should handle double delete properly', async () => {
      const project_import = gen_project_import();
      await api.project.import(project_import.base, db.events[0].evid).exec();

      let res = await api.project.import(project_import.delete, db.events[0].evid).exec();
      for (const item of res) {
        expect(item.project).to.be.null;
        expect(item.error).to.be.null;
      }

      res = await api.project.import(project_import.delete, db.events[0].evid).exec();
      for (const item of res) {
        expect(item.project).to.be.null;
        expect(item.error).to.be.null;
      }
    });
  });

  describe('Representative', () => {
    beforeEach(async () => {
      await api.user.login('rep', 'rep');
    });

    testQuery();

    permissions.create();
    permissions.update();
    permissions.delete();
    permissions.import();
  });

  describe('Student', () => {
    beforeEach(async () => {
      await api.user.login('student', 'student');
    });

    testQuery();

    permissions.create();
    permissions.update();
    permissions.delete();
    permissions.import();
  });
});
