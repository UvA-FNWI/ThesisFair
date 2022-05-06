import { expect } from 'chai';
import { dictToGraphql, request, login } from '../../libraries/graphql-query-builder/index.js';

let disabledEvent;
const newEnid = '6272838d6a373ac04510b798';
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
event(${dictToGraphql({ evid: disabledEvent.evid })}) {
  evid
}
}
    `, undefined, false);
    checkResponse(res, 'event');

    const createData = {...event};
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
    update(${dictToGraphql(eventUpdate)}) {
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
    delete(${dictToGraphql({ evid: event.evid })}) {
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
      add(${dictToGraphql({ evid: event.evid, enid: '6266fb7b25f56e50b2309d0a' })}) {
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
      del(${dictToGraphql({ evid: event.evid, enid: '6266fb7b25f56e50b2306d0f' })}) {
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
  describe('admin', () => {
    before(() => {
      login('admin', 'admin');
    });

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
          `);


      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.event.create.evid).to.exist;
      event.evid = res.data.event.create.evid;

      expect(res.data.event.create).to.deep.equal(event);


      disabledEvent = { ...event, enabled: false }
      delete disabledEvent.evid;
      disabledEvent = (await request(`
  mutation {
    event {
      create(${dictToGraphql(disabledEvent)}) {
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
                  `)).data.event.create;

    });

    it('query event should get the new event', async () => {
      const res = await request(`
  query {
    event(${dictToGraphql({ evid: event.evid })}) {
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
      expect(res.errors, `Does not have errors: ${res.errors}`).to.be.undefined;

      expect(res.data.event).to.deep.equal(event);
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
      expect(res.errors, `Does not have errors: ${JSON.stringify(res.errors)}`).to.be.undefined;

      expect(res.data.events).to.be.a('array');
      expect(res.data.events).to.deep.include(event);
      expect(res.data.events).not.to.deep.include(disabledEvent);
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
      expect(res.data.events, 'Include event').to.deep.include(event);
      expect(res.data.events, 'Include disabled event').to.deep.include(disabledEvent);
    });

    it('mutation event.entity.add should add the entity', async () => {
      const res = await request(`
  mutation {
    event {
      entity {
        add(${dictToGraphql({ evid: event.evid, enid: newEnid })}) {
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
        del(${dictToGraphql({ evid: event.evid, enid: newEnid })}) {
          evid
          entities
        }
      }
    }
  }
          `);

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.event.entity.del.entities).not.to.include(newEnid);
    });

    it('mutation event.update should update the event', async () => {
      eventUpdate.evid = event.evid;
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
      delete(${dictToGraphql({ evid: event.evid })}) {
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

      expect(res.data.event.delete).to.deep.equal(eventUpdate);


      const query = await request(`
  query {
    event(${dictToGraphql({ evid: event.evid })}) {
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

  describe('Representative', () => {
    before(() => {
      login('rep', 'rep');
    });

    checkPremissions();
  });

  describe('Student', () => {
    before(() => {
      login('student', 'student');
    });

    checkPremissions();
  })
});
