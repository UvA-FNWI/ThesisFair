import { expect } from 'chai';

import { fail } from './lib.js';
import api from '../../userStories/api.js';
import initDB, { init, disconnect, db } from './db.js';

describe('Vote', () => {
  before(init);
  after(disconnect);
  beforeEach(initDB);

  //* Admin

  describe('admin', () => {
    beforeEach(async () => {
      await api.user.login('admin', 'admin');
    });

    it('query votesOfStudent should properly query a student', testVotesOfStudent);
    it('query votesOfStudent should properly query a student and filter on event', async () => {
      const res = await api.votes.getOfStudent(db.users[1].uid, db.events[0].evid).exec();
      expect(res).to.be.null;
    });

    it('query votesOfEntity should properly query votes of an entity', testVotesOfEntity);

    it('query votesOfProject should properly query votes of an project', testVotesOfProject);
  });

  //* Representative

  describe('representative', () => {
    beforeEach(async () => {
      await api.user.login('rep', 'rep');
    });

    it('query votesOfStudent should enforce permissions', async () => {
      await fail(api.votes.getOfStudent(db.users[0].uid, db.events[0].evid).exec);
    });

    it('query votesOfEntity should properly query votes of the same entity', testVotesOfEntity);
    it('query votesOfEntity should fail querying votes of another entity', async () => {
      await fail(api.votes.getOfEntity(db.entities[1].enid, db.events[0].evid).exec);
    });


    it('query votesOfProject should properly query votes of an project', testVotesOfProject);
    it('query votesOfProject should not query votes of another entities project', async () => {
      const res = await api.votes.getOfProject(db.projects[2].pid, db.events[0].evid).exec();
      expect(res).to.have.length(0);
    });
  });

  //* Student

  describe('student', () => {
    beforeEach(async () => {
      await api.user.login('student', 'student');
    });

    it('query votesOfStudent should properly query its own votes', testVotesOfStudent);
    it('query votesOfStudent should not allow to query other students votes', async () => {
      await fail(api.votes.getOfStudent(db.users[1].uid, db.events[0].evid).exec);
    });

    it('query votesOfEntity should enforce permissions', async () => {
      await fail(api.votes.getOfEntity(db.entities[1].enid, db.events[0].evid).exec);
    });
    it('query votesOfProject should enforce permissions', async () => {
      await fail(api.votes.getOfProject(db.projects[2].pid, db.events[0].evid).exec);
    });

  });
});

async function testVotesOfStudent(studentIndex = 0, eventIndex = 0) {
  const res = await api.votes.getOfStudent(db.users[studentIndex].uid, db.events[eventIndex].evid).exec();

  expect(res).to.be.a('array');
  expect(res).to.deep.equal(db.votes[studentIndex].votes.map((v) => v.pid));
}

async function testVotesOfEntity(entityIndex = 0, eventIndex = 0) {
  const res = await api.votes.getOfEntity(db.entities[entityIndex].enid, db.events[eventIndex].evid).exec();

  expect(res).to.be.a('array');

  for (const studentVote of db.votes) {
    for (const vote of studentVote.votes) {
      const doc = { uid: studentVote.uid, pid: vote.pid };
      if (studentVote.evid === db.events[eventIndex].evid && vote.enid === db.entities[entityIndex].enid) {
        expect(res).to.deep.include(doc);
      } else {
        expect(res).not.to.deep.include(doc);
      }
    }
  }
}

async function testVotesOfProject(projectIndex = 0, eventIndex = 0) {
  const res = await api.votes.getOfProject(db.projects[projectIndex].pid, db.events[eventIndex].evid).exec();

  expect(res).to.be.a('array');

  let voted;
  for (const studentVote of db.votes) {
    voted = studentVote.votes.filter(
      (vote) => studentVote.evid === db.events[eventIndex].evid && vote.pid === db.projects[projectIndex].pid
    ).length === 1;

    if (voted) {
      expect(res).to.deep.include(studentVote.uid);
    } else {
      expect(res).not.to.deep.include(studentVote.uid);
    }
  }
}
