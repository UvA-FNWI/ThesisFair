import { expect } from 'chai';
import { dictToGraphql, request, login } from '../../libraries/graphql-query-builder/index.js';

import initDB, { init, disconnect, db } from './db.js';

describe('Vote', () => {
  before(init);
  after(disconnect);
  beforeEach(initDB);

  //* Admin

  describe('admin', () => {
    beforeEach(async () => {
      await login('admin', 'admin');
    });

    it('query votesOfStudent should properly query a student', testVotesOfStudent);
    it('query votesOfStudent should properly query a student and filter on event', async () => {
      const res = await request(`query { votesOfStudent(${dictToGraphql({ uid: db.users[1].uid, evid: db.events[0].evid })}) }`);

      expect(res.data.votesOfStudent).to.be.null;
    });

    it('query votesOfEntity should properly query votes of an entity', testVotesOfEntity);

    it('query votesOfProject should properly query votes of an project', testVotesOfProject);
  });

  //* Representative

  describe('representative', () => {
    beforeEach(async () => {
      await login('rep', 'rep');
    });

    it('query votesOfStudent should enforce permissions', async () => {
      const res = await request(`query { votesOfStudent(${dictToGraphql({ uid: db.users[0].uid, evid: db.events[0].evid })}) }`, null, false);

      expect(res.errors).to.exist;
      expect(res.data.votesOfStudent).to.be.null;
    });

    it('query votesOfEntity should properly query votes of the same entity', testVotesOfEntity);
    it('query votesOfEntity should fail querying votes of another entity', testVotesOfEntityFail);


    it('query votesOfProject should properly query votes of an project', testVotesOfProject);
    it('query votesOfProject should not query votes of another entities project', testVotesOfProjectsFail);
  });

  //* Student

  describe('student', () => {
    beforeEach(async () => {
      await login('student', 'student');
    });

    it('query votesOfStudent should properly query its own votes', testVotesOfStudent);
    it('query votesOfStudent should not allow to query other students votes', async () => {
      const res = await request(`query { votesOfStudent(${dictToGraphql({ uid: db.users[1].uid, evid: db.events[0].evid })}) }`, null, false);

      expect(res.errors).to.exist;
      expect(res.data.votesOfStudent).to.be.null;
    });

    it('query votesOfEntity should enforce permissions', testVotesOfEntityFail);
    it('query votesOfProject should enforce permissions', testVotesOfEntityFail);

  });
});

async function testVotesOfStudent(studentIndex = 0, eventIndex = 0) {
  const res = await request(`query { votesOfStudent(${dictToGraphql({ uid: db.users[studentIndex].uid, evid: db.events[eventIndex].evid })}) }`);

  expect(res.data.votesOfStudent).to.be.a('array');
  expect(res.data.votesOfStudent).to.deep.equal(db.votes[studentIndex].votes.map((v) => v.pid));
}

async function testVotesOfEntity(entityIndex = 0, eventIndex = 0) {
  const res = await request(`query { votesOfEntity(${dictToGraphql({ enid: db.entities[entityIndex].enid, evid: db.events[eventIndex].evid })}) {
    uid
    pid
  } }`);

  expect(res.data.votesOfEntity).to.be.a('array');

  for (const studentVote of db.votes) {
    for (const vote of studentVote.votes) {
      const doc = { uid: studentVote.uid, pid: vote.pid };
      if (studentVote.evid === db.events[eventIndex].evid && vote.enid === db.entities[entityIndex].enid) {
        expect(res.data.votesOfEntity).to.deep.include(doc);
      } else {
        expect(res.data.votesOfEntity).not.to.deep.include(doc);
      }
    }
  }
}

async function testVotesOfProject(projectIndex = 0, eventIndex = 0) {
  const res = await request(`query { votesOfProject(${dictToGraphql({ pid: db.projects[projectIndex].pid, evid: db.events[eventIndex].evid })}) }`);

  expect(res.data.votesOfProject).to.be.a('array');

  let voted;
  for (const studentVote of db.votes) {
    voted = studentVote.votes.filter(
      (vote) => studentVote.evid === db.events[eventIndex].evid && vote.pid === db.projects[projectIndex].pid
    ).length === 1;

    if (voted) {
      expect(res.data.votesOfProject).to.deep.include(studentVote.uid);
    } else {
      expect(res.data.votesOfProject).not.to.deep.include(studentVote.uid);
    }
  }
}

async function testVotesOfEntityFail(entityIndex = 1, eventIndex = 0) {
  const res = await request(`query { votesOfEntity(${dictToGraphql({ enid: db.entities[entityIndex].enid, evid: db.events[eventIndex].evid })}) {
    uid
    pid
  } }`, null, false);

  expect(res.errors).to.exist;
  expect(res.data.votesOfEntity).to.be.null;
}

async function testVotesOfProjectsFail(projectIndex = 2, eventIndex = 0) {
  const res = await request(`query { votesOfProject(${dictToGraphql({ pid: db.projects[projectIndex].pid, evid: db.events[eventIndex].evid })}) }`, null, false);

  expect(res.data.votesOfProject).to.have.length(0);
}
