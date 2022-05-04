import { expect } from 'chai';
import { dictToGraphql, request } from '../../libraries/graphql-query-builder/index.js';

let newevid;
const event = {
    enabled: true,
    name: 'New name',
    description: 'New description',
    start: '2022-04-27T22:00:00.000Z',
    location: 'New location',
    studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
    entities: ['6266fb7b25f56e50b2306d0f', '6266fb7b25f56e50b2306d0e'],
}

const eventUpdate = {
    enabled: false,
    name: 'Changed name',
    description: 'Changed description',
    start: '2022-04-28T22:00:00.000Z',
    location: 'Changed location',
    studentSubmitDeadline: '2022-05-01T22:00:00.000Z',
    entities: ['6266fb7b25f56e50b2306dab', '6266fb7b25f56e50b2306dcd'],
}


describe('Event', () => {
    it('mutation event.create should create an event', async () => {
        const res = await request(`
mutation {
    event {
        create(${dictToGraphql(event)}) {
            evid
            enabled
            name
            description
            start
            location
            studentSubmitDeadline
            entities
        }
    }
}
        `)


        expect(res).to.exist;
        expect(res.data).to.exist;
        expect(res.errors, 'Does not have errors').to.be.undefined;

        expect(res.data.event.create.evid).to.exist;
        newevid = res.data.event.create.evid;

        delete res.data.event.create.evid;
        expect(res.data.event.create).to.deep.equal(event);
    });

    it('query event should get the new event', async () => {
        const res = await request(`
query {
    event(${dictToGraphql({ evid: newevid })}) {
        evid
        enabled
        name
        description
        start
        location
        studentSubmitDeadline
        entities
    }
}
        `);

        expect(res).to.exist;
        expect(res.data).to.exist;
        expect(res.errors, 'Does not have errors').to.be.undefined;

        expect(res.data.event.evid).to.exist;
        newevid = res.data.event.evid;

        delete res.data.event.evid;
        expect(res.data.event).to.deep.equal(event);
    });

    it('mutation event.update should update the event', async () => {
        const res = await request(`
mutation {
    event {
        update(${dictToGraphql({ evid: newevid, ...eventUpdate })}) {
            evid
            enabled
            name
            description
            start
            location
            studentSubmitDeadline
            entities
        }
    }
}
        `);

        expect(res).to.exist;
        expect(res.data).to.exist;
        expect(res.errors, 'Does not have errors').to.be.undefined;

        expect(res.data.event.update.evid).to.eq(newevid);

        delete res.data.event.update.evid;
        expect(res.data.event.update).to.deep.equal(eventUpdate);
    });

    it('mutation event.delete should delete the event', async () => {
        const res = await request(`
mutation {
    event {
        delete(${dictToGraphql({ evid: newevid })}) {
            evid
            enabled
            name
            description
            start
            location
            studentSubmitDeadline
            entities
        }
    }
}
        `);

        expect(res).to.exist;
        expect(res.data).to.exist;
        expect(res.errors, 'Does not have errors').to.be.undefined;

        expect(res.data.event.delete.evid).to.eq(newevid);

        delete res.data.event.delete.evid;
        expect(res.data.event.delete).to.deep.equal(eventUpdate);


        const query = await request(`
query {
    event(${dictToGraphql({ evid: newevid })}) {
        evid
        enabled
        name
        description
        start
        location
        studentSubmitDeadline
        entities
    }
}
        `);

        expect(query.data.event).to.be.null;
    });
});
