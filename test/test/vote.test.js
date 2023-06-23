import { expect } from 'chai'

import { fail } from './lib.js'
import api from './api.js'
import initDB, { init, disconnect, db, models } from './db.js'

const gen_vote_import = () => ({
  base: [
    {
      studentnumber: db.users[6].studentnumber,
      projectID: db.projects[0].external_id,
      enabled: true,
    },
    {
      studentnumber: db.users[6].studentnumber,
      projectID: db.projects[2].external_id,
      enabled: true,
    },
  ],
  newStudentNumber: [
    {
      studentnumber: db.users[6].studentnumber,
      projectID: db.projects[0].external_id,
      enabled: true,
    },
    {
      studentnumber: 10101,
      projectID: db.projects[2].external_id,
      enabled: true,
    },
    {
      studentnumber: 20202,
      projectID: db.projects[2].external_id,
      enabled: true,
    },
  ],
  update: [
    {
      studentnumber: db.users[6].studentnumber,
      projectID: db.projects[0].external_id,
      enabled: true,
    },
    {
      studentnumber: db.users[6].studentnumber,
      projectID: db.projects[1].external_id,
      enabled: true,
    },
    {
      studentnumber: db.users[6].studentnumber,
      projectID: db.projects[2].external_id,
      enabled: false,
    },
  ],
  delete: [
    {
      studentnumber: db.users[6].studentnumber,
      projectID: db.projects[0].external_id,
      enabled: false,
    },
    {
      studentnumber: db.users[6].studentnumber,
      projectID: db.projects[1].external_id,
      enabled: false,
    },
    {
      studentnumber: db.users[6].studentnumber,
      projectID: db.projects[2].external_id,
      enabled: false,
    },
  ],
  invalidProjectID: [
    {
      studentnumber: db.users[0].studentnumber,
      projectID: 10101,
      enabled: false,
    },
  ],

  data: [
    {
      uid: db.users[6].uid,
      evid: db.events[0].evid,
      votes: [
        { pid: db.projects[0].pid, enid: db.projects[0].enid },
        { pid: db.projects[2].pid, enid: db.projects[2].enid },
      ],
    },
  ],
  updatedData: [
    {
      uid: db.users[6].uid,
      evid: db.events[0].evid,
      votes: [
        { pid: db.projects[0].pid, enid: db.projects[0].enid },
        { pid: db.projects[1].pid, enid: db.projects[1].enid },
      ],
    },
  ],
})

describe('Vote', () => {
  before(init)
  after(disconnect)
  beforeEach(initDB)

  //* Admin

  describe('admin', () => {
    beforeEach(async () => {
      await api.user.login('admin', 'admin')
    })

    it('query votesOfStudent should properly query a student', testVotesOfStudent)
    it('query votesOfStudent should properly query a student and filter on event', async () => {
      const res = await api.votes.getOfStudent(db.users[1].uid, db.events[1].evid).exec()
      expect(res).to.be.null
    })

    it('query votesOfEntity should properly query votes of an entity', testVotesOfEntity)

    it('query votesOfProject should properly query votes of an project', testVotesOfProject)

    it('mutation vote.import should import votes', async () => {
      const vote_import = gen_vote_import()
      const res = await api.votes.import(vote_import.base, db.events[0].external_id).exec()

      for (const result of res) {
        expect(result.error).to.be.null
      }

      const votes = await api.votes.getOfStudent(db.users[6].uid, db.events[0].evid).exec()
      const user = await models.User.findById(db.users[6].uid)
      for (const { pid, enid } of vote_import.data[0].votes) {
        expect(votes).to.contain(pid)
        expect(user.share).to.contain(enid)
      }
    })

    it('mutation vote.import should properly handle new student numbers while importing votes', async () => {
      const vote_import = gen_vote_import()
      const userCount = (await models.User.find()).length
      await api.votes.import(vote_import.newStudentNumber, db.events[0].external_id).exec()

      const newUserCount = (await models.User.find()).length
      expect(newUserCount).to.equal(userCount + 2)
    })

    it('mutation vote.import should update already existing votes', async () => {
      const vote_import = gen_vote_import()
      await api.votes.import(vote_import.base, db.events[0].external_id).exec()
      const res = await api.votes.import(vote_import.update, db.events[0].external_id).exec()

      for (const result of res) {
        expect(result.error).to.be.null
      }

      const votes = await api.votes.getOfStudent(db.users[6].uid, db.events[0].evid).exec()
      const user = await models.User.findById(db.users[6].uid)
      expect(votes).to.have.length(vote_import.updatedData[0].votes.length)
      for (const { pid, enid } of vote_import.updatedData[0].votes) {
        expect(votes).to.contain(pid)
        expect(user.share).to.contain(enid)
      }
    })

    it('mutation vote.import should delete properly delete votes', async () => {
      const vote_import = gen_vote_import()
      await api.votes.import(vote_import.base, db.events[0].external_id).exec()
      const res = await api.votes.import(vote_import.delete, db.events[0].external_id).exec()

      for (const result of res) {
        expect(result.error).to.be.null
      }

      const votes = await api.votes.getOfStudent(db.users[6].uid, db.events[0].evid).exec()
      expect(votes).to.have.length(0)
    })

    it('mutation vote.import should properly handle incorrect project id', async () => {
      const vote_import = gen_vote_import()
      const res = await api.votes.import(vote_import.invalidProjectID, db.events[0].external_id).exec()

      expect(res[0].error).to.be.a.string
      expect(res[0].error).to.have.length.above(0)
    })
  })

  //* Representative

  describe('representative', () => {
    beforeEach(async () => {
      await api.user.login('rep', 'rep')
    })

    it('query votesOfStudent should enforce permissions', async () => {
      await fail(api.votes.getOfStudent(db.users[0].uid, db.events[0].evid).exec)
    })

    it('query votesOfEntity should properly query votes of the same entity', testVotesOfEntity)
    it('query votesOfEntity should fail querying votes of another entity', async () => {
      await fail(api.votes.getOfEntity(db.entities[1].enid, db.events[0].evid).exec)
    })

    it('query votesOfProject should properly query votes of an project', testVotesOfProject)
    it('query votesOfProject should not query votes of another entities project', async () => {
      const res = await api.votes.getOfProject(db.projects[2].pid, db.events[0].evid).exec()
      expect(res).to.have.length(0)
    })

    it('mutation vote.import should check permissions properly', async () => {
      await fail(api.votes.import(gen_vote_import().csv, db.events[0].evid).exec)
    })
  })

  //* Student

  describe('student', () => {
    beforeEach(async () => {
      await api.user.login('student', 'student')
    })

    it('query votesOfStudent should properly query its own votes', testVotesOfStudent)
    it('query votesOfStudent should not allow to query other students votes', async () => {
      await fail(api.votes.getOfStudent(db.users[1].uid, db.events[0].evid).exec)
    })

    it('query votesOfEntity should enforce permissions', async () => {
      await fail(api.votes.getOfEntity(db.entities[1].enid, db.events[0].evid).exec)
    })
    it('query votesOfProject should enforce permissions', async () => {
      await fail(api.votes.getOfProject(db.projects[2].pid, db.events[0].evid).exec)
    })

    it('mutation vote.import should check permissions properly', async () => {
      await fail(api.votes.import(gen_vote_import().csv, db.events[0].evid).exec)
    })
  })
})

async function testVotesOfStudent(studentIndex = 0, eventIndex = 0) {
  const res = await api.votes.getOfStudent(db.users[studentIndex].uid, db.events[eventIndex].evid).exec()

  expect(res).to.be.a('array')
  expect(res).to.deep.equal(db.votes[studentIndex].votes.map(v => v.pid))
}

async function testVotesOfEntity(entityIndex = 0, eventIndex = 0) {
  const res = await api.votes.getOfEntity(db.entities[entityIndex].enid, db.events[eventIndex].evid).exec()

  expect(res).to.be.a('array')

  const correct = []
  for (const studentVote of db.votes) {
    if (studentVote.evid === db.events[eventIndex].evid) {
      for (const vote of studentVote.votes) {
        if (vote.enid === db.entities[entityIndex].enid) {
          correct.push({ uid: studentVote.uid, pid: vote.pid })
        }
      }
    }
  }

  expect(res).to.deep.equal(correct)
}

async function testVotesOfProject(projectIndex = 0, eventIndex = 0) {
  const res = await api.votes.getOfProject(db.projects[projectIndex].pid, db.events[eventIndex].evid).exec()

  expect(res).to.be.a('array')

  const correct = []
  for (const studentVote of db.votes) {
    const voted =
      studentVote.votes.filter(
        vote => studentVote.evid === db.events[eventIndex].evid && vote.pid === db.projects[projectIndex].pid
      ).length === 1

    if (voted) {
      correct.push(studentVote.uid)
    }
  }
  expect(res).to.deep.equal(correct)
}
