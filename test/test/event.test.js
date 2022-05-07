import { expect } from 'chai';
import { dictToGraphql, request, login } from '../../libraries/graphql-query-builder/index.js';

import initDb, { events } from './event.db.js';

// TODO: Run test within docker container. Connect to mongodb directly (by creating an external test network) and reload database between every call.

const checkPremissions = () => {
  it('should enforce permissions properly', async () => {
    const checkResponse = (res, name) => {
      expect(res.errors).to.exist;
      expect(res.errors[0].message).to.include('UNAUTHORIZED');
      let data = res.data;
      for (const key of name.split('.')) {
        data = data[key];
      }
      expect(data).to.be.null;
    }

    let res = await request(`
query {
  events(all: true) {
    evid
  }
}
    `, undefined, false);
    checkResponse(res, 'events');

    res = await request(`
query {
  event(${dictToGraphql({ evid: events[1].evid })}) {
    evid
  }
}
    `, undefined, false);
    checkResponse(res, 'event');

    const createData = { ...events[0] };
    delete createData.evid;
    res = await request(`
mutation {
  event {
    create(${dictToGraphql(createData)}) {
      evid
    }
  }
}
    `, undefined, false);
    checkResponse(res, 'event.create');

    res = await request(`
mutation {
  event {
    update(${dictToGraphql({ ...events[0], evid: events[1].evid })}) {
      evid
    }
  }
}
    `);
    checkResponse(res, 'event.update');

    expect(res.errors).to.exist;
    expect(res.errors[0].message).to.include('UNAUTHORIZED');
    expect(res.data.event.update).to.be.null;

    res = await request(`
mutation {
  event {
    delete(${dictToGraphql({ evid: events[0].evid })}) {
      evid
    }
  }
}
    `);
    checkResponse(res, 'event.delete');


    res = await request(`
mutation {
  event {
    entity{
      add(${dictToGraphql({ evid: events[0].evid, enid: '6266fb7b25f56e50b2309d0a' })}) {
        evid
      }
    }
  }
}
    `);
    checkResponse(res, 'event.entity.add');

    res = await request(`
mutation {
  event {
    entity{
      del(${dictToGraphql({ evid: events[0].evid, enid: '6266fb7b25f56e50b2306d0f' })}) {
        evid
      }
    }
  }
}
    `);
    checkResponse(res, 'event.entity.del');
  });
};


describe.only('Event', () => {
  beforeEach(async () => {
    await initDb();
  });

  describe('admin', () => {
    before(async () => {
      await login('admin', 'admin');
    });

    it('query event should get a specific event', async () => {
      const res = await request(`
  query {
    event(${dictToGraphql({ evid: events[0].evid })}) {
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

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.event).to.deep.equal(events[0]);
    });

    it('query events(all:false) should get all enabled events', async () => {
      const res = await request(`
  query {
    events(all: false) {
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

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.events).to.be.a('array');
      for (const i in events) {
        const event = events[i];
        if (event.enabled) {
          expect(res.data.events, `Should include event of index ${i}`).to.deep.include(event);
        } else {
          expect(res.data.events, `Should not include event of index ${i}`).not.to.deep.include(event);
        }
      }
    });

    it('query events(all:true) should get all events', async () => {
      const res = await request(`
  query {
    events(all: true) {
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

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.events).to.be.a('array');
      for (const i in events) {
        expect(res.data.events, `Should include event of index ${i}`).to.deep.include(events[i]);
      }
    });

    it('mutation event.create should create an event', async () => {
      const event = {
        enabled: true,
        name: 'New name',
        description: 'New description',
        start: '2022-04-27T22:00:00.000Z',
        location: 'New location',
        studentSubmitDeadline: '2022-04-30T22:00:00.000Z',
        entities: ['6266fb7b25f56e50b2306d0f', '6266fb7b25f56e50b2306d0e'],
      }

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
          `);


      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.event.create.evid).to.exist;
      event.evid = res.data.event.create.evid;

      expect(res.data.event.create).to.deep.equal(event);
    });

    it('mutation event.update should update the event', async () => {
      const eventUpdate = {
        evid: events[0].evid,
        enabled: false,
        name: 'Changed name',
        description: 'Changed description',
        start: '2022-04-28T22:00:00.000Z',
        location: 'Changed location',
        studentSubmitDeadline: '2022-05-01T22:00:00.000Z',
        entities: ['6266fb7b25f56e50b2306dab', '6266fb7b25f56e50b2306dcd'],
      }

      const res = await request(`
  mutation {
    event {
      update(${dictToGraphql(eventUpdate)}) {
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

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.event.update).to.deep.equal(eventUpdate);
    });

    it('mutation event.delete should delete the event', async () => {
      const res = await request(`
  mutation {
    event {
      delete(${dictToGraphql({ evid: events[0].evid })}) {
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

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.event.delete).to.deep.equal(events[0]);


      const query = await request(`
  query {
    event(${dictToGraphql({ evid: events[0].evid })}) {
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

    it('mutation event.entity.add should add the entity', async () => {
      const newEnid = '6272838d6a373ac04510b798';

      const res = await request(`
  mutation {
    event {
      entity {
        add(${dictToGraphql({ evid: events[0].evid, enid: newEnid })}) {
          evid
          entities
        }
      }
    }
  }
          `);

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.event.entity.add.entities).to.include(newEnid);
    });

    it('mutation event.entity.del should del the entity', async () => {
      const res = await request(`
  mutation {
    event {
      entity {
        del(${dictToGraphql({ evid: events[0].evid, enid: events[0].entities[0] })}) {
          evid
          entities
        }
      }
    }
  }
          `);

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.event.entity.del.entities).not.to.include(events[0].entities[0]);
    });
  });

  describe('Representative', () => {
    before(async () => {
      await login('rep', 'rep');
    });

    it('query events should return a list of events the company is participating in', () => {

    });

    checkPremissions();
  });

  describe('Student', () => {
    before(async () => {
      await login('student', 'student');
    });

    checkPremissions();
  })
});
