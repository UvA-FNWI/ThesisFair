import { expect } from 'chai';

import { request, login, dictToGraphql } from '../../libraries/graphql-query-builder/index.js';
import initDB, { entities } from './entity.db.js';

const body = `enid
name
description
type
contact {
  type
  content
}
`;

const testQuery = () => {
  it('query entity should get an entity', async () => {
    const res = await request(`
query {
    entity(${dictToGraphql({ enid: entities[0].enid })}) {
      ${body}
    }
}
    `);

    expect(res).to.exist;
    expect(res.data).to.exist;
    expect(res.errors, 'Does not have errors').to.be.undefined;

    expect(res.data.entity).to.deep.equal(entities[0]);
  });

  it('query entities should get the correct entities', async () => {
    const res = await request(`
query {
    entities(${dictToGraphql({ enids: [entities[1].enid, entities[0].enid] })}) {
      ${body}
    }
}
    `);

    expect(res).to.exist;
    expect(res.data).to.exist;
    expect(res.errors, 'Does not have errors').to.be.undefined;

    expect(res.data.entities).to.deep.include(entities[0]);
    expect(res.data.entities).to.deep.include(entities[1]);
  });
}

const testUpdate = () => {
  it('mutation entity.update should update the entity', async () => {
    const updatedEntity = { ...entities[1], enid: entities[0].enid };
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
      const newEntity = { ...entities[0] };
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
      const updatedEntity = { ...entities[1], enid: entities[0].enid };
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
          delete(${dictToGraphql({ enid: entities[0].enid })}) {
            ${body}
          }
      }
  }
      `, undefined, false);

      expect(res).to.exist;
      expect(res.data.entity.delete).to.be.null;
      expect(res.errors).to.exist;
    });
  }
}

describe.only('Entity', () => {
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
      let entity = JSON.parse(JSON.stringify(entities[0]));
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
      `, undefined, true);

      expect(res.data.entity.create).to.be.null;
      expect(res.errors).to.exist;

      entity = JSON.parse(JSON.stringify(entities[0]));
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
      `, undefined, true);

      expect(res.data.entity.create).to.be.null;
      expect(res.errors).to.exist;
    });

    testUpdate();

    it('mutation entity.delete should delete the entity', async () => {
      const res = await request(`
  mutation {
      entity {
          delete(${dictToGraphql({ enid: entities[0].enid })}) {
            ${body}
          }
      }
  }
          `);

      expect(res).to.exist;
      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.entity.delete).to.deep.equal(entities[0]);


      const query = await request(`
  query {
      entity(${dictToGraphql({ enid: entities[0].enid })}) {
        ${body}
      }
  }
          `);

      expect(query.data.entity).to.be.null;
    });
  });

  describe('Representative', () => {
    beforeEach(async () => {
      await login('rep', 'rep', { enid: entities[0].enid });
    });

    testQuery();

    permissions.create();
    testUpdate();
    permissions.delete();
  });

  describe('Student', () => {
    before(async () => {
      await login('student', 'student');
    });

    testQuery();

    permissions.create();
    permissions.update();
    permissions.delete();
  });
});
