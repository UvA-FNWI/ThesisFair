import { expect } from 'chai';

import { request, login, dictToGraphql } from '../../libraries/graphql-query-builder/index.js';
import initDB, { db } from './db.js';

const body = `enid
name
description
type
contact {
  type
  content
}
external_id
`;

const entity_import = {
  csv: `Name,Column1,Last login,Fairs paid,Contact e-mail addresses,Votes,Representatives,ID
Entity 1,Elodie Snel,01/01/2022,,elodie@snel.nl;,0,0,84336
Entity 2,Christian de lange,01/12/2021,,christian@lange.nl;,0,0,84202
University of Amsterdam: Graduate School of Informatics (Senior TAs),"dr. ing. Cristian Hugo Echbert, dr. Jochem Emo Sloom",,,c.h.echbert@uva.nl;j.esloom@uva.nl;,0,0,80854
`,
  data: [
    { name: 'Entity 1', external_id: 84336 },
    { name: 'Entity 2', external_id: 84202 },
    { name: 'University of Amsterdam: Graduate School of Informatics (Senior TAs)', external_id: 80854 }
  ]
};

const testQuery = () => {
  it('query entity should get an entity', async () => {
    const res = await request(`
query {
    entity(${dictToGraphql({ enid: db.entities[0].enid })}) {
      ${body}
    }
}
    `);

    expect(res).to.exist;
    expect(res.data).to.exist;
    expect(res.errors, 'Does not have errors').to.be.undefined;

    expect(res.data.entity).to.deep.equal(db.entities[0]);
  });

  it('query entities should get the correct entities', async () => {
    const res = await request(`
query {
    entities(${dictToGraphql({ enids: [db.entities[1].enid, db.entities[0].enid] })}) {
      ${body}
    }
}
    `);

    expect(res).to.exist;
    expect(res.data).to.exist;
    expect(res.errors, 'Does not have errors').to.be.undefined;

    expect(res.data.entities).to.deep.include(db.entities[0]);
    expect(res.data.entities).to.deep.include(db.entities[1]);
  });
}

const testUpdate = () => {
  it('mutation entity.update should update the entity', async () => {
    const updatedEntity = { ...db.entities[1], enid: db.entities[0].enid };
    const res = await request(`
mutation {
    entity {
        update(${dictToGraphql(updatedEntity)}) {
          ${body}
        }
    }
}
        `);

    expect(res).to.exist;
    expect(res.data).to.exist;
    expect(res.errors, 'Does not have errors').to.be.undefined;

    expect(res.data.entity.update).to.deep.equal(updatedEntity);
  });
}

const permissions = {
  create: () => {
    it('mutation create should hanle permissions properly', async () => {
      const newEntity = { ...db.entities[0] };
      delete newEntity.enid;
      const res = await request(`
  mutation {
    entity {
        create(${dictToGraphql(newEntity)}) {
          ${body}
        }
    }
  }
      `, undefined, false);

      expect(res).to.exist;
      expect(res.data.entity.create).to.be.null;
      expect(res.errors).to.exist;
    });
  },
  update: () => {
    it('mutation update should hanle permissions properly', async () => {
      const updatedEntity = { ...db.entities[1], enid: db.entities[0].enid };
      const res = await request(`
  mutation {
      entity {
          update(${dictToGraphql(updatedEntity)}) {
            ${body}
          }
      }
  }
      `, undefined, false);

      expect(res).to.exist;
      expect(res.data.entity.update).to.be.null;
      expect(res.errors).to.exist;
    });
  },
  delete: () => {
    it('mutation delete should hanle permissions properly', async () => {
      const res = await request(`
  mutation {
      entity {
          delete(${dictToGraphql({ enid: db.entities[0].enid })}) {
            ${body}
          }
      }
  }
      `, undefined, false);

      expect(res).to.exist;
      expect(res.data.entity.delete).to.be.null;
      expect(res.errors).to.exist;
    });
  },
  import: () => {
    it('mutation import should hanle permissions properly', async () => {
      const res = await request(`
mutation {
    entity {
        import(${dictToGraphql({ file: entity_import.csv })}) {
          ${body}
        }
    }
}
      `, undefined, false);

      expect(res).to.exist;
      expect(res.data.entity.import).to.be.null;
      expect(res.errors).to.exist;
    });
  },
}

describe('Entity', () => {
  beforeEach(async () => {
    await initDB();
  });

  describe('Admin', () => {
    before(async () => {
      await login('admin', 'admin');
    });

    testQuery();

    it('mutation entity.create should create an entity', async () => {
      const entity = {
        name: 'New name',
        description: 'New description',
        type: 'company',
        contact: [{ type: 'website', content: 'qrcsoftware.nl' }, { type: 'phonenumber', content: '06 12345678' }],
        external_id: 100,
      }

      const res = await request(`
  mutation {
    entity {
        create(${dictToGraphql(entity)}) {
          ${body}
        }
    }
  }
      `)


      expect(res).to.exist;
      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.entity.create.enid).to.exist;
      entity.enid = res.data.entity.create.enid;

      expect(res.data.entity.create).to.deep.equal(entity);
    });

    it('should check enum values properly', async () => {
      let entity = JSON.parse(JSON.stringify(db.entities[0]));
      delete entity.enid;
      entity.type = 'invalidType';

      let res = await request(`
      mutation {
          entity {
              create(${dictToGraphql(entity)}) {
                ${body}
              }
          }
      }
      `, undefined, false);

      expect(res.data.entity.create).to.be.null;
      expect(res.errors).to.exist;

      entity = JSON.parse(JSON.stringify(db.entities[0]));
      delete entity.enid;
      entity.contact[0].type = 'invalidType';

      res = await request(`
      mutation {
          entity {
              create(${dictToGraphql(entity)}) {
                ${body}
              }
          }
      }
      `, undefined, false);

      expect(res.data.entity.create).to.be.null;
      expect(res.errors).to.exist;
    });

    testUpdate();

    it('mutation entity.delete should delete the entity', async () => {
      const res = await request(`
  mutation {
      entity {
          delete(${dictToGraphql({ enid: db.entities[0].enid })}) {
            ${body}
          }
      }
  }
          `);

      expect(res).to.exist;
      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.entity.delete).to.deep.equal(db.entities[0]);

      const projects = await request(`
      query {
        projectsOfEntity(${dictToGraphql({ enid: db.entities[0].enid })}) {
            pid
            enid
          }
      }
      `);

      expect(projects).to.exist;
      expect(projects.data.projectsOfEntity).to.exist;
      expect(projects.data.projectsOfEntity).to.be.a('array');
      expect(projects.data.projectsOfEntity).to.have.length(0);
      expect(projects.errors).to.be.undefined;

      const query = await request(`
  query {
      entity(${dictToGraphql({ enid: db.entities[0].enid })}) {
        ${body}
      }
  }
          `);

      expect(query.data.entity).to.be.null;
    });

    it('mutation entity.import should import entities', async () => {
      const res = await request(`
mutation {
    entity {
        import(${dictToGraphql({ file: entity_import.csv })}) {
          ${body}
        }
    }
}
    `);

    expect(res).to.exist;
    expect(res.data).to.exist;
    expect(res.errors).to.be.undefined;

    expect(res.data.entity.import.map((e) => e.name)).to.deep.equal(entity_import.data.map((e) => e.name));
    expect(res.data.entity.import.map((e) => e.external_id)).to.deep.equal(entity_import.data.map((e) => e.external_id));

    // TODO: Test if users were made properly
    });

    it('mutation entity.import should not double import entities', async () => {
      await request(`
mutation {
    entity {
        import(${dictToGraphql({ file: entity_import.csv })}) {
          ${body}
        }
    }
}
    `);

    const res = await request(`
    mutation {
        entity {
            import(${dictToGraphql({ file: entity_import.csv })}) {
              ${body}
            }
        }
    }
        `);

    expect(res).to.exist;
    expect(res.data).to.exist;
    expect(res.errors).to.be.undefined;

    expect(res.data.entity.import.every((v) => v === null), 'All returned entities are null').to.be.true;

    // TODO: Test if users were not made
    });
  });

  describe('Representative', () => {
    beforeEach(async () => {
      await login('rep', 'rep', { enid: db.entities[0].enid });
    });

    testQuery();

    permissions.create();
    testUpdate();
    permissions.delete();
    permissions.import();
  });

  describe('Student', () => {
    before(async () => {
      await login('student', 'student');
    });

    testQuery();

    permissions.create();
    permissions.update();
    permissions.delete();
    permissions.import();
  });
});
