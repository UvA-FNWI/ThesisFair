import { expect } from 'chai'

import { fail } from './lib.js'
import api from './api.js'
import initDB, { init, disconnect, db } from './db.js'

describe('User', () => {
  before(init)
  after(disconnect)
  beforeEach(initDB)

  it('login should function', async () => {
    expect(db.users[5].email).to.equal('admin')
    await api.user.login('admin', 'admin')

    expect(api.getApiTokenData().uid).to.equal(db.users[5].uid)
    expect(api.getApiTokenData().type).to.equal('a')
  })

  //* Admin

  describe('admin', () => {
    beforeEach(async () => {
      await api.user.login('admin', 'admin')
    })

    it('query user should return a student', async () => {
      expect(db.users[0].studentnumber).to.exist
      const res = await api.user.get(db.users[0].uid).exec()

      expect(res).to.deep.equal(db.users[0])
    })

    it('query user should return a representative', async () => {
      expect(db.users[2].enid).to.exist
      const res = await api.user.get(db.users[2].uid).exec()

      expect(res).to.deep.equal(db.users[2])
    })

    it('query users should return the correct users', async () => {
      const res = await api.user.getMultiple(db.users.filter(user => !user.admin).map(user => user.uid)).exec()
      expect(res).to.deep.equal(db.users.filter(user => !user.admin))
    })

    describe('query userAll', () => {
      const normalizeUsers = users => {
        for (const user of users) {
          for (const key in user) {
            if (user[key] === null) {
              delete user[key]
            }
          }
        }

        return users
      }

      it('query userAll should get all users of the given type', async () => {
        const users = normalizeUsers(await api.user.getAll().exec())
        for (const user of db.users) {
          delete user.admin
          expect(users).to.deep.contain(user)
        }
      })

      it('query userAll with filter admin should only give admins', async () => {
        const users = normalizeUsers(await api.user.getAll('admin').exec())
        for (const user of db.users) {
          if (user.admin) {
            delete user.admin
            expect(users).to.deep.contain(user)
          } else {
            expect(users).not.to.deep.contain(user)
          }
        }
      })
      it('query userAll with filter student should only give students', async () => {
        const users = normalizeUsers(await api.user.getAll('student').exec())
        for (const user of db.users) {
          if (user.studentnumber) {
            expect(users).to.deep.contain(user)
          } else {
            expect(users).not.to.deep.contain(user)
          }
        }
      })
      it('query userAll with filter representative should only give representatives', async () => {
        const users = normalizeUsers(await api.user.getAll('representative').exec())
        for (const user of db.users) {
          if (user.enid) {
            expect(users).to.deep.contain(user)
          } else {
            expect(users).not.to.deep.contain(user)
          }
        }
      })
    })

    it('query usersOfEntity should return all the representatives of the entity', async () => {
      const users = await api.user.getOfEntity(db.entities[0].enid).exec()
      for (const user of db.users) {
        if (user.enid === db.entities[0].enid) {
          expect(users).to.deep.contain(user)
        } else {
          expect(users).not.to.deep.contain(user)
        }
      }
    })

    testRepCreate()

    it('mutation user.representative.create should check for double email address', async () => {
      expect(db.users[2].enid).to.exist
      const newRep = { ...db.users[2] }
      delete newRep.uid

      await fail(api.user.representative.create(newRep).exec)
    })

    it('mutation user.representative.update should update a representative', async () => {
      expect(db.users[2].enid).to.exist
      expect(db.users[4].enid).to.exist
      const updatedRep = { ...db.users[4], uid: db.users[2].uid, email: 'new.email@email.nl' }

      const res = await api.user.representative.update(updatedRep).exec()
      expect(res).to.deep.equal(updatedRep)
    })

    it('mutation user.student.update should update a student', async () => {
      expect(db.users[0].studentnumber).to.exist
      expect(db.users[1].studentnumber).to.exist
      const updatedStudent = {
        ...db.users[1],
        uid: db.users[0].uid,
        studentnumber: db.users[0].studentnumber,
        studies: db.users[0].studies,
        email: 'new.email@email.nl',
        share: db.users[0].share,
        manuallyShared: db.users[0].manuallyShared,
      }
      const updateQuery = { ...updatedStudent }
      delete updateQuery.studentnumber
      delete updateQuery.studies
      delete updateQuery.share

      const res = await api.user.student.update(updateQuery).exec()
      expect(res).to.deep.equal(updatedStudent)
    })

    it('mutation user.student.uploadCV should a upload a CV to a specific user', async () => {
      expect(db.users[1].studentnumber).to.exist
      const cv = 'This is my epic CV'
      const res = await api.user.student.uploadCV(db.users[1].uid, cv).exec()
      expect(res).to.be.true

      const storedCV = await api.user.student.getCV(db.users[1].uid).exec()
      expect(storedCV).to.equal(cv)
    })

    it('mutation user.delete should delete a student', async () => {
      expect(db.users[0].studentnumber).to.exist
      const res = await api.user.delete(db.users[0].uid).exec()
      expect(res).to.deep.equal(db.users[0])

      const query = await api.user.get(db.users[0].uid).exec()
      expect(query).to.be.null
    })

    testRepDelete('a representative', 2)

    testApiTokenPermissions()
  })

  //* Representative

  describe('Representative', () => {
    beforeEach(async () => {
      expect(db.users[2].email).to.equal('rep')
      expect(db.users[2].enid).to.exist
      expect(db.users[2].repAdmin).to.be.false
      await api.user.login('rep', 'rep')
    })

    it('query user should return a student', async () => {
      expect(db.users[0].studentnumber).to.exist

      const res = await api.user.get(db.users[0].uid).exec()
      expect(res).to.deep.equal(db.users[0])

      await api.user.student.getCV(db.users[0].uid).exec()
    })

    it('query user should check if the user shared its data', async () => {
      expect(db.users[6].studentnumber).to.exist
      await fail(api.user.get(db.users[6].uid).exec)
    })

    it('query cv should check if the user shared its data', async () => {
      expect(db.users[6].studentnumber).to.exist
      await fail(api.user.student.getCV(db.users[6].uid).exec)
    })

    it('query user should check if the representative is an admin when querying fellow representative', async () => {
      expect(db.users[3].enid).to.exist
      await fail(api.user.get(db.users[3].uid).exec)
    })

    it('query users should return the correct users', async () => {
      const res = await api.user.getMultiple([db.users[0].uid]).exec()
      expect(res).to.deep.equal([db.users[0]])
    })

    it('query users should check if the user shared its data', async () => {
      expect(db.users[6].studentnumber).to.exist
      const res = await api.user.getMultiple([db.users[6].uid]).exec()

      expect(res).to.be.a('array')
      expect(res).to.have.length(1)
      expect(res[0]).to.be.null
    })

    it('query usersWhoManuallyShared should get the correct users', async () => {
      const res = await api.user.student.getWhoManuallyShared(api.getApiTokenData().enid).exec()

      expect(res).to.be.a('array')
      for (const user of db.users) {
        if (user.studentnumber && user.manuallyShared.includes(api.getApiTokenData().enid)) {
          expect(res).to.deep.contain(user)
        } else {
          expect(res).not.to.deep.contain(user)
        }
      }
    })

    it('query users should check if the representative is an admin', async () => {
      expect(db.users[3].enid).to.exist
      const res = await api.user.getMultiple([db.users[3].uid]).exec()

      expect(res).to.be.a('array')
      expect(res).to.have.length(1)
      expect(res[0]).to.be.null
    })

    it('mutation user.representative.update should not be able to update another representative', async () => {
      expect(db.users[2].enid).to.exist
      const newRep = { ...db.users[2], email: 'new.email@email.nl' }
      delete newRep.uid
      await fail(api.user.representative.create(newRep).exec)
    })

    it('mutation user.representative.update should allow a representative to update self', async () => {
      expect(db.users[2].enid).to.exist
      expect(db.users[4].enid).to.exist
      const updatedRep = { ...db.users[4], uid: db.users[2].uid, enid: db.users[2].enid, email: 'new.email@email.nl' }
      const updateQuery = { ...updatedRep, password: 'newPWD' }
      delete updateQuery.enid

      const res = await api.user.representative.update(updateQuery).exec()

      expect(res).to.deep.equal(updatedRep)
      await api.user.login('new.email@email.nl', 'newPWD')
    })

    it('mutation user.representative.update should not allow to update other representative', async () => {
      expect(db.users[2].enid).to.exist
      expect(db.users[4].enid).to.exist
      const updatedRep = { ...db.users[2], uid: db.users[4].uid, email: 'new.email@email.nl' }
      delete updatedRep.enid

      await fail(api.user.representative.update(updatedRep).exec)
    })

    it('mutation user.representative.update should not be be able to update enid', async () => {
      expect(db.users[2].enid).to.exist
      expect(db.users[4].enid).to.exist
      const updatedRep = { ...db.users[3], uid: db.users[2].uid, email: 'new.email@email.nl' }
      await fail(api.user.representative.update(updatedRep).exec)
    })

    testRepDelete('self', 2)

    it('mutation user.delete should not allow to delete other representatives', async () => {
      expect(db.users[3].enid).to.exist
      await fail(api.user.delete(db.users[3].uid).exec)
    })

    testApiTokenPermissions()
  })

  //* Admin representative

  describe('Admin Representative', () => {
    beforeEach(async () => {
      expect(db.users[3].email).to.equal('repAdmin')
      expect(db.users[3].repAdmin).to.be.true
      await api.user.login('repAdmin', 'repAdmin')
    })

    it('query user should get a representative', async () => {
      expect(db.users[2].enid).to.exist
      const res = await api.user.get(db.users[2].uid).exec()
      expect(res).to.deep.equal(db.users[2])
    })

    it('query user should check if the representative is from the same entity', async () => {
      expect(db.users[4].enid).to.exist

      await fail(api.user.get(db.users[4].uid).exec)
    })

    it('query users should return the correct users', async () => {
      const res = await api.user.getMultiple([db.users[2].uid, db.users[3].uid]).exec()
      expect(res).to.deep.include(db.users[2])
      expect(res).to.deep.include(db.users[3])
    })

    testRepCreate()

    it('mutation user.representative.update should allow to update other representatives from same entity', async () => {
      expect(db.users[2].enid).to.exist
      expect(db.users[3].enid).to.exist
      const updatedRep = { ...db.users[3], uid: db.users[2].uid, email: 'new.email@email.nl' }
      const updateQuery = { ...updatedRep }
      delete updateQuery.enid

      const res = await api.user.representative.update(updateQuery).exec()
      expect(res).to.deep.equal(updatedRep)
    })

    it('mutation user.representative.update should not allow to update other representatives passwords', async () => {
      expect(db.users[2].enid).to.exist
      expect(db.users[3].enid).to.exist
      const updatedRep = { ...db.users[3], uid: db.users[2].uid, email: 'new.email@email.nl' }
      const updateQuery = { ...updatedRep, password: 'newPWD' }
      delete updateQuery.enid

      await fail(api.user.representative.update(updateQuery).exec)
    })

    it('mutation user.representative.update should not allow to update other representatives from other entity', async () => {
      expect(db.users[3].enid).to.exist
      expect(db.users[4].enid).to.exist
      const updatedRep = { ...db.users[3], uid: db.users[4].uid, email: 'new.email@email.nl' }
      const updateQuery = { ...updatedRep }
      delete updateQuery.enid

      await fail(api.user.representative.update(updateQuery).exec)
    })

    it('mutation user.delete should delete a representative from the same entity', async () => {
      expect(db.users[2].enid).to.exist
      const res = await api.user.delete(db.users[2].uid).exec()
      expect(res).to.deep.equal(db.users[2])

      const query = await api.user.get(db.users[2].uid).exec()
      expect(query).to.be.null
    })

    testRepDelete('another representative from the same entity', 2)
    testRepDelete('self', 3)

    testApiTokenPermissions()
  })

  //* Student

  describe('Student', () => {
    beforeEach(async () => {
      expect(db.users[0].studentnumber).to.exist
      await api.user.login('student', 'student')
    })

    it('mutation user.student.update should allow a user to update self', async () => {
      expect(db.users[0].studentnumber).to.exist
      expect(db.users[1].studentnumber).to.exist
      const updatedStudent = {
        ...db.users[1],
        uid: db.users[0].uid,
        studentnumber: db.users[0].studentnumber,
        studies: db.users[0].studies,
        email: 'new.email@email.nl',
        share: db.users[0].share,
        manuallyShared: db.users[0].manuallyShared,
      }
      const updateQuery = { ...updatedStudent }
      delete updateQuery.studentnumber
      delete updateQuery.studies
      delete updateQuery.share

      const res = await api.user.student.update(updateQuery).exec()

      expect(res).to.deep.equal(updatedStudent)
      await api.user.login('new.email@email.nl', 'student')
    })

    it('mutation user.student.uploadCV should allow a student to upload their CV', async () => {
      expect(db.users[0].studentnumber).to.exist
      const cv = 'This is my epic CV'
      const res = await api.user.student.uploadCV(db.users[0].uid, cv).exec()
      expect(res).to.be.true

      const storedCV = await api.user.student.getCV(db.users[0].uid).exec()
      expect(storedCV).to.equal(cv)
    })

    it('mutation user.student.uploadCV should not allow a student to upload someone elses CV', async () => {
      await fail(api.user.student.uploadCV(db.users[1].uid, 'hi').exec)
    })

    it('mutation user.student.shareInfo should let a user share info with an entity', async () => {
      expect(db.users[0].studentnumber).to.exist
      const res = await api.user.student.shareInfo(db.users[0].uid, db.entities[1].enid, true).exec()

      db.users[0].share.push(db.entities[1].enid)
      db.users[0].manuallyShared.push(db.entities[1].enid)
      expect(res).to.deep.equal(db.users[0])
    })

    it('mutation user.student.shareInfo should revoke sharing info with an entity', async () => {
      expect(db.users[0].studentnumber).to.exist
      const res = await api.user.student.shareInfo(db.users[0].uid, db.entities[2].enid, false).exec()
      expect(res).to.deep.equal({
        ...db.users[0],
        share: db.users[0].share.filter(v => v !== db.entities[2].enid),
        manuallyShared: db.users[0].manuallyShared.filter(v => v !== db.entities[2].enid),
      })
    })

    it('mutation user.student.shareInfo should refuse unsharing info with entity student has voted for', async () => {
      expect(db.users[0].studentnumber).to.exist
      const res = await fail(api.user.student.shareInfo(db.users[0].uid, db.entities[0].enid, false).exec)
      expect(res.errors[0].message).to.contain('vote')
    })

    it('mutation user.student.shareInfo should revuse unsharing info with entity student has scheduled a meeting with', async () => {
      expect(db.users[0].studentnumber).to.exist
      const res = await fail(api.user.student.shareInfo(db.users[0].uid, db.entities[3].enid, false).exec)
      expect(res.errors[0].message).to.contain('schedule')
    })

    it('mutation user.representative.create should fail', async () => {
      expect(db.users[3].enid).to.exist

      await fail(api.user.representative.create({ ...db.users[3], email: 'new@new.nl' }).exec)
    })

    it('mutation user.representative.update should fail', async () => {
      expect(db.users[3].enid).to.exist

      await fail(api.user.representative.update(db.users[3]).exec)
    })

    it('query users should check permissions', async () => {
      const res = await api.user.getMultiple([db.users[0].uid, db.users[1].uid]).exec()

      expect(res).to.be.a('array')
      for (const result of res) {
        if (result && result.uid === db.users[0].uid) {
          expect(result).to.deep.equal(db.users[0])
        } else {
          expect(result).to.be.null
        }
      }
    })

    testApiTokenPermissions()
  })
})

function testRepDelete(msg, index) {
  it('mutation user.delete should delete ' + msg, async () => {
    expect(db.users[index].enid).to.exist
    const res = await api.user.delete(db.users[index].uid).exec()
    expect(res).to.deep.equal(db.users[index])

    const query = await api.user.get(db.users[index].uid).exec()
    expect(query).to.be.null
  })
}

function testRepCreate() {
  it('mutation user.representative.create should create a representative', async () => {
    expect(db.users[2].enid).to.exist
    const newRep = { ...db.users[2], email: 'new.email@email.nl' }
    delete newRep.uid

    const res = await api.user.representative.create(newRep).exec()

    expect(res.uid).to.exist
    expect(res).to.deep.equal({ ...newRep, uid: res.uid })
  })
}

function testApiTokenPermissions() {
  it('query ssoLogin should never work', async () => {
    const error = await fail(api.user.ssoLogin(true, '10101', 'email@email.email', 'firstname', 'lastname').exec)
    expect(error.errors[0].message).to.contain('UNAUTHORIZED')
  })
}
