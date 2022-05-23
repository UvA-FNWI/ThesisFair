import { expect } from 'chai';

import { fail } from './lib.js';
import api, { apiTokenData } from '../../userStories/api.js';
import initDB, { init, disconnect, db } from './db.js';

describe('User', () => {
  before(init);
  after(disconnect);
  beforeEach(initDB);

  it('login should function', async () => {
    expect(db.users[5].email).to.equal('admin');
    await api.user.login('admin', 'admin');

    expect(apiTokenData.uid).to.equal(db.users[5].uid);
    expect(apiTokenData.type).to.equal('a');
  });

  //* Admin

  describe('admin', () => {
    beforeEach(async () => {
      await api.user.login('admin', 'admin');
    });

    it('query user should return a student', async () => {
      expect(db.users[0].studentnumber).to.exist;
      const res = await api.user.get(db.users[0].uid).exec();

      expect(res.user).to.deep.equal(db.users[0]);
    });

    it('query user should return a representative', async () => {
      expect(db.users[2].enid).to.exist;
      const res = await api.user.get(db.users[2].uid).exec();

      expect(res.user).to.deep.equal(db.users[2]);
    });

    testRepCreate();

    it('mutation user.representative.create should check for double email address', async () => {
      expect(db.users[2].enid).to.exist;
      const newRep = { ...db.users[2] };
      delete newRep.uid;

      await fail(api.user.representative.create(newRep).exec);
    });

    it('mutation user.representative.update should update a representative', async () => {
      expect(db.users[2].enid).to.exist;
      expect(db.users[4].enid).to.exist;
      const updatedRep = { ...db.users[4], uid: db.users[2].uid, email: 'new.email@email.nl' };

      const res = await api.user.representative.update(updatedRep).exec();
      expect(res.user.representative.update).to.deep.equal(updatedRep);
    });

    it('mutation user.student.update should update a student', async () => {
      expect(db.users[0].studentnumber).to.exist;
      expect(db.users[1].studentnumber).to.exist;
      const updatedStudent = {
        ...db.users[1],
        uid: db.users[0].uid,
        studentnumber: db.users[0].studentnumber,
        studies: db.users[0].studies,
        email: 'new.email@email.nl',
        share: db.users[0].share,
      };
      const updateQuery = { ...updatedStudent };
      delete updateQuery.studentnumber;
      delete updateQuery.studies;
      delete updateQuery.share;

      const res = await api.user.student.update(updateQuery).exec();
      expect(res.user.student.update).to.deep.equal(updatedStudent);
    });

    it('mutation user.delete should delete a student', async () => {
      expect(db.users[0].studentnumber).to.exist;
      const res = await api.user.delete(db.users[0].uid).exec();
      expect(res.user.delete).to.deep.equal(db.users[0]);

      const query = await api.user.get(db.users[0].uid).exec();
      expect(query.user).to.be.null;
    });

    testRepDelete('a representative', 2);
  });


  //* Representative


  describe('Representative', () => {
    beforeEach(async () => {
      expect(db.users[2].email).to.equal('rep');
      expect(db.users[2].enid).to.exist;
      expect(db.users[2].repAdmin).to.be.false;
      await api.user.login('rep', 'rep');
    });

    it('query user should return a student', async () => {
      expect(db.users[0].studentnumber).to.exist;

      const res = await api.user.get(db.users[0].uid).exec();
      expect(res.user).to.deep.equal(db.users[0]);
    });

    it('query user should check if the user shared its data', async () => {
      expect(db.users[1].studentnumber).to.exist;
      try {
        await api.user.get(db.users[1].uid).exec();
        expect(true, 'code should not come here').to.be.null;
      } catch (error) {
        expect(error.errors).to.exist;
        expect(error.data.user).to.be.null;
      }
    });

    it('query user should check if the representative is an admin', async () => {
      expect(db.users[3].enid).to.exist;

      try {
        await api.user.get(db.users[3].uid).exec();
        expect(true, 'code should not come here').to.be.null;
      } catch (error) {
        expect(error.errors).to.exist;
        expect(error.data.user).to.be.null;
      }
    });

    it('mutation user.representative.update should not be able to update another representative', async () => {
      expect(db.users[2].enid).to.exist;
      const newRep = { ...db.users[2], email: 'new.email@email.nl' };
      delete newRep.uid;

      try {
        await api.user.representative.create(newRep).exec();
        expect(true, 'code should not come here').to.be.null;
      } catch (error) {
        expect(error.errors).to.exist;
        expect(error.data.user.representative.create).to.be.null;
      }
    });

    it('mutation user.representative.update should allow a representative to update self', async () => {
      expect(db.users[2].enid).to.exist;
      expect(db.users[4].enid).to.exist;
      const updatedRep = { ...db.users[4], uid: db.users[2].uid, enid: db.users[2].enid, email: 'new.email@email.nl' };
      const updateQuery = { ...updatedRep, password: 'newPWD' };
      delete updateQuery.enid;

      const res = await api.user.representative.update(updateQuery).exec();

      expect(res.user.representative.update).to.deep.equal(updatedRep);
      await api.user.login('new.email@email.nl', 'newPWD');
    });

    it('mutation user.representative.update should not allow to update other representative', async () => {
      expect(db.users[2].enid).to.exist;
      expect(db.users[4].enid).to.exist;
      const updatedRep = { ...db.users[2], uid: db.users[4].uid, email: 'new.email@email.nl' };
      delete updatedRep.enid;

      await fail(api.user.representative.update(updatedRep).exec);
    });

    it('mutation user.representative.update should not be be able to update enid', async () => {
      expect(db.users[2].enid).to.exist;
      expect(db.users[4].enid).to.exist;
      const updatedRep = { ...db.users[3], uid: db.users[2].uid, email: 'new.email@email.nl' };
      await fail(api.user.representative.update(updatedRep).exec);
    });

    testRepDelete('self', 2);

    it('mutation user.delete should not allow to delete other representatives', async () => {
      expect(db.users[3].enid).to.exist;
      await fail(api.user.delete(db.users[3].uid).exec);
    })
  });

  //* Admin representative

  describe('Admin Representative', () => {
    beforeEach(async () => {
      expect(db.users[3].email).to.equal('repAdmin');
      expect(db.users[3].repAdmin).to.be.true;
      await api.user.login('repAdmin', 'repAdmin');
    });

    it('query user should get a representative', async () => {
      expect(db.users[2].enid).to.exist;
      const res = await api.user.get(db.users[2].uid).exec();
      expect(res.user).to.deep.equal(db.users[2]);
    });

    it('query user should check if the representative is from the same entity', async () => {
      expect(db.users[4].enid).to.exist;

      await fail(api.user.get(db.users[4].uid).exec);
    });

    testRepCreate();

    it('mutation user.representative.update should allow to update other representatives from same entity', async () => {
      expect(db.users[2].enid).to.exist;
      expect(db.users[3].enid).to.exist;
      const updatedRep = { ...db.users[3], uid: db.users[2].uid, email: 'new.email@email.nl' };
      const updateQuery = { ...updatedRep };
      delete updateQuery.enid;

      const res = await api.user.representative.update(updateQuery).exec();
      expect(res.user.representative.update).to.deep.equal(updatedRep);
    });

    it('mutation user.representative.update should not allow to update other representatives passwords', async () => {
      expect(db.users[2].enid).to.exist;
      expect(db.users[3].enid).to.exist;
      const updatedRep = { ...db.users[3], uid: db.users[2].uid, email: 'new.email@email.nl' };
      const updateQuery = { ...updatedRep, password: 'newPWD' };
      delete updateQuery.enid;

      await fail(api.user.representative.update(updateQuery).exec);
    });

    it('mutation user.representative.update should not allow to update other representatives from other entity', async () => {
      expect(db.users[3].enid).to.exist;
      expect(db.users[4].enid).to.exist;
      const updatedRep = { ...db.users[3], uid: db.users[4].uid, email: 'new.email@email.nl' };
      const updateQuery = { ...updatedRep };
      delete updateQuery.enid;

      await fail(api.user.representative.update(updateQuery).exec);
    });

    it('mutation user.delete should delete a representative from the same entity', async () => {
      expect(db.users[2].enid).to.exist;
      const res = await api.user.delete(db.users[2].uid).exec();
      expect(res.user.delete).to.deep.equal(db.users[2]);

      const query = await api.user.get(db.users[2].uid).exec();
      expect(query.user).to.be.null;
    });

    testRepDelete('another representative from the same entity', 2);
    testRepDelete('self', 3);

  });


  //* Student

  describe('Student', () => {
    beforeEach(async () => {
      expect(db.users[0].studentnumber).to.exist;
      await api.user.login('student', 'student');
    });

    it('mutation user.student.update should allow a user to update self', async () => {
      expect(db.users[0].studentnumber).to.exist;
      expect(db.users[1].studentnumber).to.exist;
      const updatedStudent = {
        ...db.users[1],
        uid: db.users[0].uid,
        studentnumber: db.users[0].studentnumber,
        studies: db.users[0].studies,
        email: 'new.email@email.nl',
        share: db.users[0].share,
      };
      const updateQuery = { ...updatedStudent };
      delete updateQuery.studentnumber;
      delete updateQuery.studies;
      delete updateQuery.share;

      const res = await api.user.student.update(updateQuery).exec();

      expect(res.user.student.update).to.deep.equal(updatedStudent);
      await api.user.login('new.email@email.nl', 'student');
    });

    it('mutation user.student.shareInfo should let a user share info with an entity', async () => {
      expect(db.users[0].studentnumber).to.exist;
      const res = await api.user.student.shareInfo(db.users[0].uid, db.entities[1].enid, true).exec();

      db.users[0].share.push(db.entities[1].enid);
      expect(res.user.student.shareInfo).to.deep.equal(db.users[0]);
    });

    it('mutation user.student.shareInfo should revoke sharing info with an entity', async () => {
      expect(db.users[0].studentnumber).to.exist;
      const res = await api.user.student.shareInfo(db.users[0].uid, db.entities[0].enid, false).exec();
      expect(res.user.student.shareInfo).to.deep.equal({ ...db.users[0], share: [] });
    });

    it('mutation user.representative.create should fail', async () => {
      expect(db.users[3].enid).to.exist;

      await fail(api.user.representative.create({...db.users[3], email: 'new@new.nl'}).exec);
    });

    it('mutation user.representative.update should fail', async () => {
      expect(db.users[3].enid).to.exist;

      await fail(api.user.representative.update(db.users[3]).exec);
    });
  });
});


function testRepDelete(msg, index) {
  it('mutation user.delete should delete ' + msg, async () => {
    expect(db.users[index].enid).to.exist;
    const res = await api.user.delete(db.users[index].uid).exec();
    expect(res.user.delete).to.deep.equal(db.users[index]);

    const query = await api.user.get(db.users[index].uid).exec();
    expect(query.user).to.be.null;
  });
};

function testRepCreate() {
  it('mutation user.representative.create should create a representative', async () => {
    expect(db.users[2].enid).to.exist;
    const newRep = { ...db.users[2], email: 'new.email@email.nl' };
    delete newRep.uid;

    const res = await api.user.representative.create(newRep).exec();

    expect(res.user.representative.create.uid).to.exist;
    newRep.uid = res.user.representative.create.uid;

    expect(res.user.representative.create).to.deep.equal(newRep);
  });
};
