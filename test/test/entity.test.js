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

describe('Entity', () => {
  beforeEach(async () => {
    await initDB();
  });

  before(() => {
    login('admin', 'admin');
  });

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

  it('mutation entity.update should update the entity', async () => {
    const updatedEntity = { enid: entities[0].enid, ...entities[1] };
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
