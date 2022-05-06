import { expect } from 'chai';
import { request, login, Enum, dictToGraphql, dictToSimpleDict } from '../../libraries/graphql-query-builder/index.js';

let newEnid;
const entity = {
    name: 'New name',
    description: 'New description',
    type: Enum('company'),
    contact: [{ type: Enum('website'), content: 'qrcsoftware.nl' }, { type: Enum('email'), content: 'info@uva.nl' }, { type: Enum('phonenumber'), content: '06 12345678' }],
}
const entityResponse = dictToSimpleDict(entity);

const entityUpdate = {
    name: 'Changed name',
    description: 'Changed description',
    type: Enum('research'),
    contact: [{ type: Enum('website'), content: 'resume.qrcsoftware.nl' }, { type: Enum('phonenumber'), content: '06 87654321' }, { type: Enum('email'), content: 'info@qrcsoftware.nl' }],
}
const entityUpdateResponse = dictToSimpleDict(entityUpdate);

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
  before(() => {
    login('admin', 'admin');
  })

    it('mutation entity.create should create an entity', async () => {
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
        newEnid = res.data.entity.create.enid;

        delete res.data.entity.create.enid;
        expect(res.data.entity.create).to.deep.equal(entityResponse);
    });

    it('query entity should get the new entity', async () => {
        const res = await request(`
query {
    entity(${dictToGraphql({ enid: newEnid })}) {
      ${body}
    }
}
        `);

        expect(res).to.exist;
        expect(res.data).to.exist;
        expect(res.errors, 'Does not have errors').to.be.undefined;

        expect(res.data.entity.enid).to.eq(newEnid);

        delete res.data.entity.enid;
        expect(res.data.entity).to.deep.equal(entityResponse);
    });

    it('mutation entity.update should update the entity', async () => {
        const res = await request(`
mutation {
    entity {
        update(${dictToGraphql({ enid: newEnid, ...entityUpdate })}) {
          ${body}
        }
    }
}
        `);

        expect(res).to.exist;
        expect(res.data).to.exist;
        expect(res.errors, 'Does not have errors').to.be.undefined;

        expect(res.data.entity.update.enid).to.eq(newEnid);

        delete res.data.entity.update.enid;
        expect(res.data.entity.update).to.deep.equal(entityUpdateResponse);
    });

    it('mutation entity.delete should delete the entity', async () => {
        const res = await request(`
mutation {
    entity {
        delete(${dictToGraphql({ enid: newEnid })}) {
          ${body}
        }
    }
}
        `);

        expect(res).to.exist;
        expect(res.data).to.exist;
        expect(res.errors, 'Does not have errors').to.be.undefined;

        expect(res.data.entity.delete.enid).to.eq(newEnid);

        delete res.data.entity.delete.enid;
        expect(res.data.entity.delete).to.deep.equal(entityUpdateResponse);


        const query = await request(`
query {
    entity(${dictToGraphql({ enid: newEnid })}) {
      ${body}
    }
}
        `);

        expect(query.data.entity).to.be.null;
    });
});
