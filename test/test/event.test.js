import { expect } from 'chai'

import { fail } from './lib.js'
import api from './api.js'
import initDb, { init, disconnect, db, models } from './db.js'

const nonExistingId = '6272838d6a373ac04510b798'

const gen_event_import = () => ({
  base: [
    {
      ID: 10101,
      enabled: true,
      name: 'First event',
      description: 'First event description',
      start: '1970-01-01T00:00:01.000Z',
      location: 'UvA SP',
      entities: [db.entities[0].external_id, db.entities[1].external_id],
    },
    {
      ID: 20202,
      enabled: true,
      name: 'Second event',
      description: 'Second event description',
      start: '1970-01-01T00:00:02.000Z',
      location: 'UvA RoetersEiland',
      entities: [db.entities[0].external_id],
    },
  ],
  update: [
    {
      ID: 10101,
      enabled: true,
      name: 'First event updated',
      description: 'First event description updated',
      start: '1970-01-01T00:01:01.000Z',
      location: 'UvA SP new place',
      entities: [db.entities[1].external_id],
    },
    {
      ID: 20202,
      enabled: true,
      name: 'Second event updated',
      description: 'Second event description updated',
      start: '1970-01-01T00:01:02.000Z',
      location: 'UvA RoetersEiland new place',
      entities: [db.entities[0].external_id, db.entities[1].external_id],
    },
  ],
  delete: [
    {
      ID: 10101,
      enabled: false,
      name: 'First event updated',
      description: 'First event description updated',
      start: '1970-01-01T00:01:01.000Z',
      location: 'UvA SP new place',
      entities: [db.entities[1].external_id],
    },
    {
      ID: 20202,
      enabled: false,
      name: 'Second event updated',
      description: 'Second event description updated',
      start: '1970-01-01T00:01:02.000Z',
      location: 'UvA RoetersEiland new place',
      entities: [db.entities[0].external_id, db.entities[1].external_id],
    },
  ],
  invalidEntity: [
    {
      ID: 10101,
      enabled: true,
      name: 'First event updated',
      description: 'First event description updated',
      start: '1970-01-01T00:01:01.000Z',
      location: 'UvA SP new place',
      entities: [10101],
    },
    {
      ID: 20202,
      enabled: true,
      name: 'Second event updated',
      description: 'Second event description updated',
      start: '1970-01-01T00:01:02.000Z',
      location: 'UvA RoetersEiland new place',
      entities: [10101, 20202],
    },
  ],
  expected: [
    {
      external_id: 10101,
      enabled: true,
      name: 'First event',
      description: 'First event description',
      start: '1970-01-01T00:00:01.000Z',
      location: 'UvA SP',
      entities: [db.entities[0].enid, db.entities[1].enid],
      studentSubmitDeadline: null,
    },
    {
      external_id: 20202,
      enabled: true,
      name: 'Second event',
      description: 'Second event description',
      start: '1970-01-01T00:00:02.000Z',
      location: 'UvA RoetersEiland',
      entities: [db.entities[0].enid],
      studentSubmitDeadline: null,
    },
  ],
})

const checkPremissions = () => {
  it('should enforce permissions properly', async () => {
    expect(db.events[1].enabled).to.be.false

    const createData = { ...db.events[0] }
    delete createData.evid

    await Promise.all([
      fail(api.event.getAll(true).exec),
      fail(api.event.get(db.events[1].evid).exec),
      fail(api.event.create(createData).exec),
      fail(api.event.update({ ...db.events[0], evid: db.events[1].evid }).exec),
      fail(api.event.updateImage(db.events[1].evid, 'testing').exec),
      fail(api.event.delete(db.events[0].evid).exec),
      fail(api.event.entity.add(db.events[0].evid, db.entities[1].enid).exec),
      fail(api.event.entity.del(db.events[0].evid, db.events[0].entities[0]).exec),
    ])
  })
}

const testQuery = () => {
  it('query event should get a specific event', async () => {
    const res = await api.event.get(db.events[0].evid).exec()
    expect(res).to.deep.equal(db.events[0])
  })
}

describe('Event', () => {
  before(init)
  after(disconnect)
  beforeEach(initDb)

  describe('admin', () => {
    beforeEach(async () => {
      await api.user.login('admin', 'admin')
    })

    testQuery()

    it('query events(all:false) should get all enabled events', async () => {
      const res = await api.event.getAll().exec()

      expect(res).to.be.a('array')
      for (const i in db.events) {
        const event = db.events[i]
        if (event.enabled) {
          expect(res, `Should include event of index ${i}`).to.deep.include(event)
        } else {
          expect(res, `Should not include event of index ${i}`).not.to.deep.include(event)
        }
      }
    })

    it('query events(all:true) should get all events', async () => {
      const res = await api.event.getAll(true).exec()
      expect(res).to.be.a('array')
      for (const i in db.events) {
        expect(res, `Should include event of index ${i}`).to.deep.include(db.events[i])
      }
    })

    it('mutation event.create should create an event', async () => {
      const event = { ...db.events[0], external_id: 10101 }
      delete event.evid

      const res = await api.event.create(event).exec()
      expect(res.evid).to.exist
      expect(res).to.deep.equal({ ...event, evid: res.evid })
    })

    it('mutation event.create should check if the entities exist', async () => {
      const event = { ...db.events[0], external_id: 10101, entities: [nonExistingId] }
      delete event.evid

      await fail(api.event.create(event).exec)
    })

    it('mutation event.update should update the event', async () => {
      const eventUpdate = {
        ...db.events[1],
        evid: db.events[0].evid,
        external_id: 10101,
      }

      const res = await api.event.update(eventUpdate).exec()
      expect(res).to.deep.equal(eventUpdate)
    })

    it('mutation event.update should check if the entities exist', async () => {
      const eventUpdate = {
        evid: db.events[0].evid,
        entities: [nonExistingId],
        external_id: 10101,
      }

      await fail(api.event.update(eventUpdate).exec)
    })

    for (const type of ['student', 'rep']) {
      it(`mutation event.updateImage update the event ${type} image`, async () => {
        const image = 'New and epic image!'
        await api.event.updateImage(db.events[0].evid, type, image).exec()

        const savedImage = await api.event.getImage(db.events[0].evid, type).exec()
        expect(savedImage).to.equal(image)
      })
    }

    it('mutation event.delete should delete the event and its linked schedule, votes and remove evid from projects', async () => {
      const evid = db.events[4].evid
      const res = await api.event.delete(evid).exec()
      expect(res).to.deep.equal(db.events[4])

      const query = await api.event.get(evid).exec()
      expect(query).to.be.null

      const projects = await models.Project.find({ evids: evid })
      expect(projects).to.have.length(0)

      const schedules = await models.Schedule.find({ evid: evid })
      expect(schedules).to.have.length(0)

      const votes = await models.Vote.find({ evid: evid })
      expect(votes).to.have.length(0)
    })

    it('mutation event.entity.add should add the entity', async () => {
      const res = await api.event.entity.add(db.events[0].evid, db.entities[0].enid).exec()
      expect(res.entities).to.include(db.entities[0].enid)
    })

    it('mutation event.entity.add should check if entity exists', async () => {
      await fail(api.event.entity.add(db.events[0].evid, nonExistingId).exec)
    })

    it('mutation event.entity.del should del the entity', async () => {
      const res = await api.event.entity.del(db.events[0].evid, db.events[0].entities[0]).exec()
      expect(res.entities).not.to.include(db.events[0].entities[0])
    })

    it('mutation event.import should import events', async () => {
      const event_import = gen_event_import()
      const res = await api.event.import(event_import.base).exec()

      for (let i = 0; i < event_import.base.length; i++) {
        const actual = res[i]
        delete actual.event.evid

        expect(actual.error).to.be.null
        expect(actual.event).to.deep.equal(event_import.expected[i])
      }
    })

    it('mutation event.import should properly update events', async () => {
      const event_import = gen_event_import()
      await api.event.import(event_import.base).exec()
      const res = await api.event.import(event_import.update).exec()

      for (const result of res) {
        expect(result.error).to.be.null
      }
    })

    it('mutation event.import should properly delete events', async () => {
      const event_import = gen_event_import()
      await api.event.import(event_import.base).exec()
      const res = await api.event.import(event_import.delete).exec()

      for (const result of res) {
        expect(result.error).to.be.null
      }
    })
  })

  describe('Representative', () => {
    beforeEach(async () => {
      await api.user.login('rep', 'rep')
    })

    it('query events should return a list of events the company is participating in', async () => {
      const res = await api.event.getAll().exec()

      expect(res).to.be.a('array')
      expect(res).to.deep.include(db.events[0])
      expect(res).not.to.deep.include(db.events[1])
      expect(res).not.to.deep.include(db.events[2])
      expect(res).not.to.deep.include(db.events[3])
    })

    checkPremissions()
  })

  describe('Student', () => {
    beforeEach(async () => {
      await api.user.login('student', 'student')
    })

    testQuery()

    checkPremissions()
  })
})
