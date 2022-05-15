import { expect } from 'chai';

import { request, login, dictToGraphql } from '../../libraries/graphql-query-builder/index.js';
import initDB, { projects } from './project.db.js';

const body = `pid
enid
name
description
datanoseLink`;

const project_import = {
  csv: ``,
  data: [
  ]
};

const testQuery = () => {
  it('query project should get a project', async () => {
    const res = await request(`
query {
  project(${dictToGraphql({ pid: projects[0].pid })}) {
    ${body}
  }
}
    `);

    expect(res).to.exist;
    expect(res.data).to.exist;
    expect(res.errors, 'Does not have errors').to.be.undefined;

    expect(res.data.project).to.deep.equal(projects[0]);
  });

  it('query projects should get the correct projects', async () => {
    const res = await request(`
query {
    projects(${dictToGraphql({ pids: [projects[1].pid, projects[0].pid] })}) {
      ${body}
    }
}
    `);

    expect(res).to.exist;
    expect(res.data).to.exist;
    expect(res.errors, 'Does not have errors').to.be.undefined;

    expect(res.data.projects).to.deep.include(projects[0]);
    expect(res.data.projects).to.deep.include(projects[1]);
    expect(res.data.projects).to.not.deep.include(projects[2]);
  });

  it('query projectsOfCompany should get the correct projects', async () => {
    const res = await request(`
query {
  projectsOfCompany(${dictToGraphql({ enid: projects[0].enid })}) {
      ${body}
    }
}
    `);

    expect(res).to.exist;
    expect(res.data).to.exist;
    expect(res.errors, 'Does not have errors').to.be.undefined;

    for (const project of projects) {
      if (projects[0].enid === project.enid) {
        expect(res.data.projectsOfCompany).to.deep.include(project);
      } else {
        expect(res.data.projectsOfCompany).not.to.deep.include(project);
      }
    }
  });
}

const permissions = {
  create: () => {
    it('mutation create should hanle permissions properly', async () => {
      const newEntity = { ...projects[0] };
      delete newEntity.pid;
      const res = await request(`
  mutation {
    project {
        create(${dictToGraphql(newEntity)}) {
          ${body}
        }
    }
  }
      `, undefined, false);

      expect(res).to.exist;
      expect(res.data.project.create).to.be.null;
      expect(res.errors).to.exist;
    });
  },
  update: () => {
    it('mutation update should hanle permissions properly', async () => {
      const updatedEntity = { ...projects[1], pid: projects[0].pid };
      const res = await request(`
  mutation {
      project {
          update(${dictToGraphql(updatedEntity)}) {
            ${body}
          }
      }
  }
      `, undefined, false);

      expect(res).to.exist;
      expect(res.data.project.update).to.be.null;
      expect(res.errors).to.exist;
    });
  },
  delete: () => {
    it('mutation delete should hanle permissions properly', async () => {
      const res = await request(`
  mutation {
      project {
          delete(${dictToGraphql({ pid: projects[0].pid })}) {
            ${body}
          }
      }
  }
      `, undefined, false);

      expect(res).to.exist;
      expect(res.data.project.delete).to.be.null;
      expect(res.errors).to.exist;
    });
  },
//   import: () => {
//     it('mutation import should hanle permissions properly', async () => {
//       const res = await request(`
// mutation {
//     project {
//         import(${dictToGraphql({ file: entity_import.csv })}) {
//           ${body}
//         }
//     }
// }
//       `, undefined, false);

//       expect(res).to.exist;
//       expect(res.data.project.import).to.be.null;
//       expect(res.errors).to.exist;
//     });
//   },
}

describe('project', () => {
  beforeEach(async () => {
    await initDB();
  });

  describe('Admin', () => {
    before(async () => {
      await login('admin', 'admin');
    });

    testQuery();

    it('mutation project.create should create an project', async () => {
      const project = {
        enid: projects[0].enid,
        name: 'New name',
        description: 'New description',
        datanoseLink: 'https://datanose.nl/projects/newNew',
      }

      const res = await request(`
  mutation {
    project {
        create(${dictToGraphql(project)}) {
          ${body}
        }
    }
  }
      `)


      expect(res).to.exist;
      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.project.create.pid).to.exist;
      project.pid = res.data.project.create.pid;

      expect(res.data.project.create).to.deep.equal(project);
    });

    it('mutation project.create should properly check if entity exists', async () => {
      const project = {
        enid: '62728401a41b2cfc83a7035b',
        name: 'New name',
        description: 'New description',
        datanoseLink: 'https://datanose.nl/projects/newNew',
      }

      const res = await request(`
  mutation {
    project {
        create(${dictToGraphql(project)}) {
          ${body}
        }
    }
  }
      `, undefined, false)


      expect(res).to.exist;
      expect(res.data.project.create).to.be.null;
      expect(res.errors, 'Does not have errors').to.exist;
    });

    it('mutation project.update should update the project', async () => {
      const updatedEntity = { ...projects[1], pid: projects[0].pid };
      const res = await request(`
mutation {
    project {
        update(${dictToGraphql(updatedEntity)}) {
          ${body}
        }
    }
}
      `);

      expect(res).to.exist;
      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.project.update).to.deep.equal(updatedEntity);
    });


    it('mutation project.update should properly check if the entity exists', async () => {
      const updatedEntity = { ...projects[1], pid: projects[0].pid, enid: '62728401a41b2cfc83a7035b' };
      const res = await request(`
mutation {
    project {
        update(${dictToGraphql(updatedEntity)}) {
          ${body}
        }
    }
}
      `, undefined, false);

      expect(res).to.exist;
      expect(res.data.project.update).to.be.null;
      expect(res.errors).to.exist;
    });

    it('mutation project.delete should delete the project', async () => {
      const res = await request(`
  mutation {
      project {
          delete(${dictToGraphql({ pid: projects[0].pid })}) {
            ${body}
          }
      }
  }
          `);

      expect(res).to.exist;
      expect(res.data).to.exist;
      expect(res.errors, 'Does not have errors').to.be.undefined;

      expect(res.data.project.delete).to.deep.equal(projects[0]);


      const query = await request(`
  query {
      project(${dictToGraphql({ pid: projects[0].pid })}) {
        ${body}
      }
  }
          `);

      expect(query.data.project).to.be.null;
    });

    //     it('mutation project.import should import projects', async () => {
    //       const res = await request(`
    // mutation {
    //     project {
    //         import(${dictToGraphql({ file: entity_import.csv })}) {
    //           ${body}
    //         }
    //     }
    // }
    //     `);

    //     expect(res).to.exist;
    //     expect(res.data).to.exist;
    //     expect(res.errors).to.be.undefined;

    //     expect(res.data.project.import.map((e) => e.name)).to.deep.equal(entity_import.data.map((e) => e.name));
    //     expect(res.data.project.import.map((e) => e.external_id)).to.deep.equal(entity_import.data.map((e) => e.external_id));
    //     });

    //     it('mutation project.import should not double import projects', async () => {
    //       await request(`
    // mutation {
    //     project {
    //         import(${dictToGraphql({ file: entity_import.csv })}) {
    //           ${body}
    //         }
    //     }
    // }
    //     `);

    //     const res = await request(`
    //     mutation {
    //         project {
    //             import(${dictToGraphql({ file: entity_import.csv })}) {
    //               ${body}
    //             }
    //         }
    //     }
    //         `);

    //     expect(res).to.exist;
    //     expect(res.data).to.exist;
    //     expect(res.errors).to.be.undefined;

    //     expect(res.data.project.import.every((v) => v === null), 'All returned projects are null').to.be.true;

    //     });
    //   });

    describe('Representative', () => {
      beforeEach(async () => {
        await login('rep', 'rep', { pid: projects[0].pid });
      });

      testQuery();

      permissions.create();
      permissions.update();
      permissions.delete();
      // permissions.import();
    });

    describe('Student', () => {
      before(async () => {
        await login('student', 'student');
      });

      testQuery();

      permissions.create();
      permissions.update();
      permissions.delete();
      // permissions.import();
    });
  });
});
