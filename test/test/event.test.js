import { expect } from 'chai';

import { fail } from './lib.js';
import api from '../../userStories/src/api.js';
import initDb, { init, disconnect, db } from './db.js';

const nonExistingId = '6272838d6a373ac04510b798';

const checkPremissions = () => {
  it('should enforce permissions properly', async () => {
    expect(db.events[1].enabled).to.be.false;

    const createData = { ...db.events[0] };
    delete createData.evid;

    await Promise.all([
      fail(api.event.getAll(true).exec),
      fail(api.event.get(db.events[1].evid).exec),
      fail(api.event.create(createData).exec),
      fail(api.event.update({ ...db.events[0], evid: db.events[1].evid }).exec),
      fail(api.event.delete(db.events[0].evid).exec),
      fail(api.event.entity.add(db.events[0].evid, db.entities[1].enid).exec),
      fail(api.event.entity.del(db.events[0].evid, db.events[0].entities[0]).exec),
    ]);
  });
};

const testQuery = () => {
  it('query event should get a specific event', async () => {
    const res = await api.event.get(db.events[0].evid).exec();
    expect(res).to.deep.equal(db.events[0]);
  });
};

describe('Event', () => {
  before(init);
  after(disconnect);
  beforeEach(initDb);

  describe('admin', () => {
    beforeEach(async () => {
      await api.user.login('admin', 'admin');
    });

    testQuery();

    it('query events(all:false) should get all enabled events', async () => {
      const res = await api.event.getAll().exec();

      expect(res).to.be.a('array');
      for (const i in db.events) {
        const event = db.events[i];
        if (event.enabled) {
          expect(res, `Should include event of index ${i}`).to.deep.include(event);
        } else {
          expect(res, `Should not include event of index ${i}`).not.to.deep.include(event);
        }
      }
    });

    it('query events(all:true) should get all events', async () => {
      const res = await api.event.getAll(true).exec();
      expect(res).to.be.a('array');
      for (const i in db.events) {
        expect(res, `Should include event of index ${i}`).to.deep.include(db.events[i]);
      }
    });

    it('mutation event.create should create an event', async () => {
      const event = { ...db.events[0] };
      delete event.evid;

      const res = await api.event.create(event).exec();
      expect(res.evid).to.exist;
      expect(res).to.deep.equal({ ...event, evid: res.evid });
    });

    it('mutation event.create should check if the entities exist', async () => {
      const event = { ...db.events[0], entities: [nonExistingId] };
      delete event.evid;

      await fail(api.event.create(event).exec);
    });

    it('mutation event.update should update the event', async () => {
      const eventUpdate = {
        ...db.events[1],
        evid: db.events[0].evid,
      }

      const res = await api.event.update(eventUpdate).exec();
      expect(res).to.deep.equal(eventUpdate);
    });

    it('mutation event.update should check if the entities exist', async () => {
      const eventUpdate = {
        evid: db.events[0].evid,
        entities: [nonExistingId],
      }

      await fail(api.event.update(eventUpdate).exec);
    });

    it('mutation event.delete should delete the event', async () => {
      const res = await api.event.delete(db.events[0].evid).exec();
      expect(res).to.deep.equal(db.events[0]);


      const query = await api.event.get(db.events[0].evid).exec();
      expect(query).to.be.null;
    });

    it('mutation event.entity.add should add the entity', async () => {
      const res = await api.event.entity.add(db.events[0].evid, db.entities[0].enid).exec();
      expect(res.entities).to.include(db.entities[0].enid);
    });

    it('mutation event.entity.add should check if entity exists', async () => {
      await fail(api.event.entity.add(db.events[0].evid, nonExistingId).exec);
    });

    it('mutation event.entity.del should del the entity', async () => {
      const res = await api.event.entity.del(db.events[0].evid, db.events[0].entities[0]).exec();
      expect(res.entities).not.to.include(db.events[0].entities[0]);
    });
  });

  describe('Representative', () => {
    beforeEach(async () => {
      await api.user.login('rep', 'rep');
    });

    it('query events should return a list of events the company is participating in', async () => {
      const res = await api.event.getAll().exec();

      expect(res).to.be.a('array');
      expect(res).to.deep.include(db.events[0]);
      expect(res).not.to.deep.include(db.events[1]);
      expect(res).not.to.deep.include(db.events[2]);
      expect(res).not.to.deep.include(db.events[3]);
    });

    checkPremissions();
  });

  describe('Student', () => {
    beforeEach(async () => {
      await api.user.login('student', 'student');
    });

    testQuery();

    checkPremissions();
  })
});
