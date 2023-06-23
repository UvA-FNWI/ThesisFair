import { expect } from 'chai'

import { fail } from './lib.js'
import api from './api.js'
import initDB, { init, disconnect, db, models } from './db.js'

describe('Schedule', () => {
  before(init)
  after(disconnect)
  beforeEach(initDB)

  //* Admin

  describe('admin', () => {
    beforeEach(async () => {
      await api.user.login('admin', 'admin')
    })

    it('mutation schedule.generate should generate a schedule', async () => {
      const countBefore = (await models.Schedule.find()).length
      const res = await api.schedule.generate(db.events[0].evid).exec()
      expect(res).to.be.null
      expect((await models.Schedule.find()).length).to.be.greaterThan(countBefore)
    })

    it('mutation schedule.generate should not generate a schedule twice', async () => {
      await api.schedule.generate(db.events[0].evid).exec()
      const res = await api.schedule.generate(db.events[0].evid).exec()
      expect(res).to.be.a('string')
      expect(res).to.have.length.greaterThan(0)
    })

    it('mutation schedule.import should import a schedule', async () => {
      const csvImport = `
Slot,StudentID,Org
Slot1,${db.users[0].studentnumber},${db.entities[0].name}
Slot1,${db.users[0].studentnumber},${db.entities[3].name}
Slot1,${db.users[6].studentnumber},${db.entities[0].name}
      `
      const countBefore = (await models.Schedule.find()).length
      const res = await api.schedule.import(db.events[0].evid, csvImport).exec()
      expect(res).to.be.null
      expect((await models.Schedule.find()).length).to.be.greaterThan(countBefore)

      const student1 = await api.user.get(db.users[0].uid).exec()
      expect(student1.share).to.include(db.entities[0].enid)
      expect(student1.share).to.include(db.entities[3].enid)

      const student2 = await api.user.get(db.users[6].uid).exec()
      expect(student2.share).to.include(db.entities[0].enid)
    })

    it('mutation schedule.update should update the schedule', async () => {
      const data = {
        ...db.schedule[0],
        uid: db.users[1].uid,
        enid: db.entities[1].enid,
        slot: 'newSlot!',
      }
      delete data.evid

      const res = await api.schedule.update(data).exec()
      expect(res).to.deep.equal(data)
    })
  })

  //* Representative

  describe('representative', () => {
    beforeEach(async () => {
      await api.user.login('rep', 'rep')
    })

    it('query scheduleStudent should return the student schedule', async () => {
      const res = await api.schedule.representative.get(api.getApiTokenData().enid, db.events[4].evid).exec()

      for (const schedule of db.schedule) {
        delete schedule.evid

        if (schedule.enid == api.getApiTokenData().enid) {
          expect(res).to.deep.contain(schedule)
        } else {
          expect(res).to.not.deep.contain(schedule)
        }
      }
    })
  })

  //* Student

  describe('student', () => {
    beforeEach(async () => {
      await api.user.login('student', 'student')
    })

    it('query scheduleStudent should return the student schedule', async () => {
      const res = await api.schedule.student.get(api.getApiTokenData().uid, db.events[4].evid).exec()

      for (const schedule of db.schedule) {
        delete schedule.evid

        if (schedule.uid == api.getApiTokenData().uid) {
          expect(res).to.deep.contain(schedule)
        } else {
          expect(res).to.not.deep.contain(schedule)
        }
      }
    })
  })
})
