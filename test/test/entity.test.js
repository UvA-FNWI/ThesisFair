import { expect } from 'chai';

import { fail } from './lib.js';
import api from './api.js';
import initDB, { init, disconnect, db, models } from './db.js';

const entity_import = {
  base: [
    {
      ID: 10101,
      name: 'UvA',
      admins: [
        {
          firstname: 'Quinten',
          lastname: 'Coltof',
          email: 'quinten.coltof@uva.nl',
        },
        {
          firstname: 'Yvanka',
          lastname: 'van Dijk',
          email: 'yvanka.van.dijk@uva.nl',
        },
      ],
      enabled: true
    },
    {
      ID: 20202,
      name: 'ASML',
      admins: [
        {
          firstname: 'Lucas',
          lastname: 'van Dijk',
          email: 'lucas.van.dijk@uva.nl',
        },
        {
          firstname: 'Yvonne',
          lastname: 'van Dijk',
          email: 'yvonne.van.dijk@uva.nl',
        },
      ],
      enabled: true
    },
  ],
  update: [
    {
      ID: 10101,
      name: 'UvA Master of Software Engineering',
      admins: [
        {
          firstname: 'Quinten',
          lastname: 'Coltof',
          email: 'quinten.coltof@uva.nl',
        },
        {
          firstname: 'Yvanka',
          lastname: 'van Dijk',
          email: 'yvanka.van.dijk@uva.nl',
        },
      ],
      enabled: true
    },
    {
      ID: 20202,
      name: 'ASML',
      admins: [
        {
          firstname: 'Lucas',
          lastname: 'van Dijk',
          email: 'lucas.van.dijk@uva.nl',
        },
        {
          firstname: 'Yvonne',
          lastname: 'van Dijk',
          email: 'yvonne.van.dijk@uva.nl',
        },
      ],
      enabled: true
    },
  ],

  delete: [
    {
      ID: 10101,
      name: 'UvA',
      admins: [
        {
          firstname: 'Quinten',
          lastname: 'Coltof',
          email: 'quinten.coltof@uva.nl',
        },
        {
          firstname: 'Yvanka',
          lastname: 'van Dijk',
          email: 'yvanka.van.dijk@uva.nl',
        },
      ],
      enabled: false
    },
    {
      ID: 20202,
      name: 'ASML',
      admins: [
        {
          firstname: 'Lucas',
          lastname: 'van Dijk',
          email: 'lucas.van.dijk@uva.nl',
        },
        {
          firstname: 'Yvonne',
          lastname: 'van Dijk',
          email: 'yvonne.van.dijk@uva.nl',
        },
      ],
      enabled: false
    },
  ],
};

const testQuery = () => {
  it('query entity should get an entity', async () => {
    const res = await api.entity.get(db.entities[0].enid).exec();
    expect(res).to.deep.equal(db.entities[0]);
  });

  it('query entities should get the correct entities', async () => {
    const res = await api.entity.getMultiple([db.entities[1].enid, db.entities[0].enid]).exec();
    expect(res).to.deep.include(db.entities[0]);
    expect(res).to.deep.include(db.entities[1]);
  });
}

const permissions = {
  getAll: () => {
    it('mutation getAll should hanle permissions properly', async () => {
      await fail(api.entity.getAll().exec);
    });
  },
  create: () => {
    it('mutation create should hanle permissions properly', async () => {
      const newEntity = { ...db.entities[0] };
      delete newEntity.enid;

      await fail(api.entity.create(newEntity).exec);
    });
  },
  update: () => {
    it('mutation update should hanle permissions properly', async () => {
      const updatedEntity = { ...db.entities[1], enid: db.entities[0].enid };

      await fail(api.entity.update(updatedEntity).exec);
    });
  },
  delete: () => {
    it('mutation delete should hanle permissions properly', async () => {
      await fail(api.entity.delete(db.entities[0].enid).exec);
    });
  },
  import: () => {
    it('mutation import should hanle permissions properly', async () => {
      await fail(api.entity.import(entity_import.csv).exec);
    });
  },
}

describe('Entity', () => {
  before(init);
  after(disconnect);
  beforeEach(initDB);

  describe('Admin', () => {
    beforeEach(async () => {
      await api.user.login('admin', 'admin');
    });

    testQuery();

    it('query entitiesAll should get all entities' , async () => {
      const res = await api.entity.getAll().exec();
      expect(res).to.deep.equal(db.entities);
    });

    it('mutation entity.create should create an entity', async () => {
      const entity = {
        name: 'New name',
        description: 'New description',
        type: 'company',
        contact: [{ type: 'website', content: 'qrcsoftware.nl' }, { type: 'phonenumber', content: '06 12345678' }],
        external_id: 100,
      }

      const res = await api.entity.create(entity).exec();

      expect(res.enid).to.exist;
      expect(res).to.deep.equal({ ...entity, enid: res.enid });
    });

    it('should check enum values properly', async () => {
      const check = async (entity) => {
        await fail(api.entity.create(entity).exec);
      };

      let entity = JSON.parse(JSON.stringify(db.entities[0]));
      delete entity.enid;
      entity.type = 'invalidType';
      await check(entity);

      entity = JSON.parse(JSON.stringify(db.entities[0]));
      delete entity.enid;
      entity.contact[0].type = 'invalidType';
      await check(entity);
    });

    it('mutation entity.update should update the entity', async () => {
      const updatedEntity = { ...db.entities[1], enid: db.entities[0].enid, external_id: db.entities[0].external_id };
      const res = await api.entity.update(updatedEntity).exec();
      expect(res).to.deep.equal(updatedEntity);
    });

    it('mutation entity.delete should delete the entity, linked projects and representatives', async () => {
      const res = await api.entity.delete(db.entities[0].enid).exec();
      expect(res).to.deep.equal(db.entities[0]);

      const query = await api.entity.get(db.entities[0].enid).exec();
      expect(query).to.be.null;

      const representatives = await models.Representative.find({ enid: db.entities[0].enid });
      expect(representatives).to.have.length(0);

      const projects = await models.Project.find({ enid: db.entities[0].enid });
      expect(projects).to.have.length(0);
    });

    it('mutation entity.import should import entities and create users', async () => {
      const userCountBefore = (await models.User.find()).length;
      const res = await api.entity.import(entity_import.base).exec();

      expect(res.map((e) => e.entity.name)).to.deep.equal(entity_import.base.map((e) => e.name));
      expect(res.map((e) => e.entity.external_id)).to.deep.equal(entity_import.base.map((e) => e.ID));

      const userCountAfter = (await models.User.find()).length;

      expect(userCountAfter).to.equal(userCountBefore + 4);
    });

    it('mutation entity.import should update entities when they already exist', async () => {
      await api.entity.import(entity_import.base).exec();

      const res = await api.entity.import(entity_import.update).exec();
      expect(res.map((e) => e.entity.name)).to.deep.equal(entity_import.update.map((e) => e.name));
      expect(res.map((e) => e.entity.external_id)).to.deep.equal(entity_import.update.map((e) => e.ID));
    });

    it('mutation entity.import should conditonally delete entities and users', async () => {
      const userCountBefore = (await models.User.find()).length;

      await api.entity.import(entity_import.base).exec();

      const res = await api.entity.import(entity_import.delete).exec();
      for (const item of res) {
        expect(item.error).to.be.null;
        expect(item.entity).to.be.null;
      }
      const userCountAfter = (await models.User.find()).length;

      expect(userCountAfter).to.equal(userCountBefore);
    });


    it('mutation entity.import should properly handle double deletes', async () => {
      await api.entity.import(entity_import.base).exec();
      let res = await api.entity.import(entity_import.delete).exec();
      for (const item of res) {
        expect(item.error).to.be.null;
        expect(item.entity).to.be.null;
      }

      res = await api.entity.import(entity_import.delete).exec();
      for (const item of res) {
        expect(item.error).to.be.null;
        expect(item.entity).to.be.null;
      }
    });

    it('mutation entity.import should not double import entities', async () => {
      const userCountBefore = models.User.find().length;
      await api.entity.import(entity_import.base).exec();
      const res = await api.entity.import(entity_import.base).exec();

      expect(res.map((e) => e.entity.name)).to.deep.equal(entity_import.base.map((e) => e.name));
      expect(res.map((e) => e.entity.external_id)).to.deep.equal(entity_import.base.map((e) => e.ID));

      const userCountAfter = models.User.find().length;
      expect(userCountAfter).to.equal(userCountBefore);
    });
  });

  describe('Admin representative', () => {
    beforeEach(async () => {
      await api.user.login('repAdmin', 'repAdmin');
    });

    testQuery();

    permissions.getAll();
    permissions.create();

    it('mutation entity.update should update the entity', async () => {
      const updatedEntity = { ...db.entities[1], enid: db.entities[0].enid, type: db.entities[0].type, external_id: db.entities[0].external_id };
      const updateQuery = {...updatedEntity};
      delete updateQuery.type;
      const res = await api.entity.update(updateQuery).exec();
      expect(res).to.deep.equal(updatedEntity);
    });

    it('mutation entity.update should not allow admin representatives to update entity type', async () => {
      await fail(api.entity.update({ enid: db.entities[0].enid, type: 'research' }).exec);
    })

    permissions.delete();
    permissions.import();
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

    permissions.getAll();
    permissions.create();
    permissions.update();
    permissions.delete();
    permissions.import();
  });
});
