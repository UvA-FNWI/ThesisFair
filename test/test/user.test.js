import { expect } from 'chai';
import { dictToGraphql, request, login } from '../../libraries/graphql-query-builder/index.js';

import initDb, { db } from './db.js';

const body = `... on UserBase {
  uid
  firstname
  lastname
  email
  phone
}
... on Student {
  studentnumber
  websites
  studies
}
... on Representative {
  enid
  repAdmin
}`

const repBody = `uid
firstname
lastname
email
phone
enid
repAdmin`


const studentBody = `uid
firstname
lastname
email
phone
studentnumber
websites
studies`

const testRepDelete = (msg, index) => {
  it('mutation user.delete should delete ' + msg, async () => {
    expect(db.users[index].enid).to.exist;
    const res = await request(`
mutation {
user {
  delete(${dictToGraphql({ uid: db.users[index].uid })}) {
    ${body}
  }
}
}
    `);

    expect(res.data).to.exist;
    expect(res.errors, 'Does not have errors').to.be.undefined;

    expect(res.data.user.delete).to.deep.equal(db.users[index]);

    const query = await request(`
    query {
      user(${dictToGraphql({ uid: db.users[index].uid })}) {
        ${body}
      }
    }
    `);

    expect(query.data.user).to.be.null;
  });
};

const testRepCreate = () => {
  it('mutation user.representative.create should create a representative', async () => {
    expect(db.users[2].enid).to.exist;
    const newRep = { ...db.users[2], email: 'new.email@email.nl' };
    delete newRep.uid;

    const res = await request(`
mutation {
  user {
    representative {
      create(${dictToGraphql(newRep)}) {
        ${repBody}
      }
    }
  }
}
    `);

    expect(res.data).to.exist;
    expect(res.errors, 'Does not have errors').to.be.undefined;

    expect(res.data.user.representative.create.uid).to.exist;
    newRep.uid = res.data.user.representative.create.uid;

    expect(res.data.user.representative.create).to.deep.equal(newRep);
  });
};

describe('User', () => {
  beforeEach(async () => {
    await initDb();
  });

  it('login should function', async () => {
    expect(db.users[5].email).to.equal('admin');
    const tokenData = await login('admin', 'admin');

    expect(tokenData.uid).to.equal(db.users[5].uid);
    expect(tokenData.type).to.equal('a');
  });

  //* Admin

  describe('admin', () => {
    beforeEach(async () => {
      await login('admin', 'admin');
    });

    it('query user should return a student', async () => {
      expect(db.users[0].studentnumber).to.exist;
      const res = await request(`
query {
  user(${dictToGraphql({ uid: db.users[0].uid })}) {
    ${body}
  }
}
    `);

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.user).to.deep.equal(db.users[0]);
    });

    it('query user should return a representative', async () => {
      expect(db.users[2].enid).to.exist;
      const res = await request(`
query {
  user(${dictToGraphql({ uid: db.users[2].uid })}) {
    ${body}
  }
}
    `);

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.user).to.deep.equal(db.users[2]);
    });

    testRepCreate();

    it('mutation user.representative.create should check for double email address', async () => {
      expect(db.users[2].enid).to.exist;
      const newRep = { ...db.users[2] };
      delete newRep.uid;

      const res = await request(`
  mutation {
    user {
      representative {
        create(${dictToGraphql(newRep)}) {
          ${repBody}
        }
      }
    }
  }
      `, undefined, false);

      expect(res.errors).to.exist;
      expect(res.data.user.representative.create).to.be.null;
    });

    it('mutation user.representative.update should update a representative', async () => {
      expect(db.users[2].enid).to.exist;
      expect(db.users[4].enid).to.exist;
      const updatedRep = { ...db.users[4], uid: db.users[2].uid, email: 'new.email@email.nl' };

      const res = await request(`
mutation {
  user {
    representative {
      update(${dictToGraphql(updatedRep)}) {
        ${repBody}
      }
    }
  }
}
      `);

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.user.representative.update).to.deep.equal(updatedRep);
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
      };
      const updateQuery = { ...updatedStudent };
      delete updateQuery.studentnumber;
      delete updateQuery.studies;

      const res = await request(`
mutation {
  user {
    student {
      update(${dictToGraphql(updateQuery)}) {
        ${studentBody}
      }
    }
  }
}
      `);

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.user.student.update).to.deep.equal(updatedStudent);
    });

    it('mutation user.delete should delete a student', async () => {
      expect(db.users[0].studentnumber).to.exist;
      const res = await request(`
mutation {
  user {
    delete(${dictToGraphql({ uid: db.users[0].uid })}) {
      ${body}
    }
  }
}
      `);

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.user.delete).to.deep.equal(db.users[0]);

      const query = await request(`
      query {
        user(${dictToGraphql({ uid: db.users[0].uid })}) {
          ${body}
        }
      }
      `);

      expect(query.data.user).to.be.null;
    });

    testRepDelete('a representative', 2);
  });


  //* Representative


  describe('Representative', () => {
    beforeEach(async () => {
      expect(db.users[2].enid).to.exist;
      expect(db.users[2].repAdmin).to.be.false;
      await login('rep', 'rep');
    });

    it('mutation user.representative.update should update a representative', async () => {
      expect(db.users[2].enid).to.exist;
      const newRep = { ...db.users[2], email: 'new.email@email.nl' };
      delete newRep.uid;

      const res = await request(`
mutation {
  user {
    representative {
      create(${dictToGraphql(newRep)}) {
        ${repBody}
      }
    }
  }
}
      `, undefined, false);

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.exist;

      expect(res.data.user.representative.create).to.be.null;
    });

    it('mutation user.representative.update should allow a representative to update self', async () => {
      expect(db.users[2].enid).to.exist;
      expect(db.users[4].enid).to.exist;
      const updatedRep = { ...db.users[4], uid: db.users[2].uid, enid: db.users[2].enid, email: 'new.email@email.nl' };
      const updateQuery = { ...updatedRep };
      delete updateQuery.enid;

      const res = await request(`
mutation {
  user {
    representative {
      update(${dictToGraphql(updateQuery)}) {
        ${repBody}
      }
    }
  }
}
      `);

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.user.representative.update).to.deep.equal(updatedRep);
    });

    it('mutation user.representative.update should not allow to update other representative', async () => {
      expect(db.users[2].enid).to.exist;
      expect(db.users[4].enid).to.exist;
      const updatedRep = { ...db.users[2], uid: db.users[4].uid, email: 'new.email@email.nl' };
      delete updatedRep.enid;

      const res = await request(`
mutation {
  user {
    representative {
      update(${dictToGraphql(updatedRep)}) {
        ${repBody}
      }
    }
  }
}
      `, undefined, false);

      expect(res.data).to.exist;
      expect(res.errors).to.be.exist;

      expect(res.data.user.representative.update).to.be.null;
    });

    it('mutation user.representative.update should not be be able to update enid', async () => {
      expect(db.users[2].enid).to.exist;
      expect(db.users[4].enid).to.exist;
      const updatedRep = { ...db.users[3], uid: db.users[2].uid, email: 'new.email@email.nl' };

      const res = await request(`
mutation {
  user {
    representative {
      update(${dictToGraphql(updatedRep)}) {
        ${repBody}
      }
    }
  }
}
      `, undefined, false);

      expect(res.data).to.exist;
      expect(res.errors).to.be.exist;

      expect(res.data.user.representative.update).to.be.null;
    });

    testRepDelete('self', 2);
  });

  //* Admin representative

  describe('Admin Representative', () => {
    beforeEach(async () => {
      expect(db.users[3].repAdmin).to.be.true;
      await login('repAdmin', 'repAdmin');
    });

    testRepCreate();

    it('mutation user.representative.update should allow to update other representatives from same entity', async () => {
      expect(db.users[2].enid).to.exist;
      expect(db.users[3].enid).to.exist;
      const updatedRep = { ...db.users[3], uid: db.users[2].uid, email: 'new.email@email.nl' };
      const updateQuery = { ...updatedRep };
      delete updateQuery.enid;

      const res = await request(`
mutation {
  user {
    representative {
      update(${dictToGraphql(updateQuery)}) {
        ${repBody}
      }
    }
  }
}
      `);

      expect(res.data).to.exist;
      expect(res.errors).not.to.exist;

      expect(res.data.user.representative.update).to.deep.equal(updatedRep);
    });

    it('mutation user.representative.update should not allow to update other representatives from other entity', async () => {
      expect(db.users[3].enid).to.exist;
      expect(db.users[4].enid).to.exist;
      const updatedRep = { ...db.users[3], uid: db.users[4].uid, email: 'new.email@email.nl' };
      const updateQuery = { ...updatedRep };
      delete updateQuery.enid;

      const res = await request(`
mutation {
  user {
    representative {
      update(${dictToGraphql(updateQuery)}) {
        ${repBody}
      }
    }
  }
}
      `, undefined, false);

      expect(res.data).to.exist;
      expect(res.errors).to.exist;

      expect(res.data.user.representative.update).to.be.null;
    });

    it('mutation user.delete should delete a representative from the same entity', async () => {
      expect(db.users[2].enid).to.exist;
      const res = await request(`
mutation {
  user {
    delete(${dictToGraphql({ uid: db.users[2].uid })}) {
      ${body}
    }
  }
}
      `);

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.user.delete).to.deep.equal(db.users[2]);

      const query = await request(`
      query {
        user(${dictToGraphql({ uid: db.users[2].uid })}) {
          ${body}
        }
      }
      `);

      expect(query.data.user).to.be.null;
    });

    testRepDelete('another representative from the same entity', 2);
    testRepDelete('self', 3);

  });


  //* Student

  describe('Student', () => {
    beforeEach(async () => {
      expect(db.users[0].studentnumber).to.exist;
      await login('student', 'student');
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
      };
      const updateQuery = {...updatedStudent};
      delete updateQuery.studentnumber;
      delete updateQuery.studies;

      const res = await request(`
mutation {
  user {
    student {
      update(${dictToGraphql(updateQuery)}) {
        ${studentBody}
      }
    }
  }
}
      `);

      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.user.student.update).to.deep.equal(updatedStudent);
    });

  });
});
