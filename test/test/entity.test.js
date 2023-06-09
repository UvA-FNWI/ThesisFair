import { expect } from 'chai'

import { fail } from './lib.js'
import api from './api.js'
import initDB, { init, disconnect, db, models } from './db.js'

const entity_import = {
  base: [
    {
      ID: 10101,
      name: 'UvA',
      representatives: 4,
      enabled: true,
    },
    {
      ID: 20202,
      name: 'ASML',
      representatives: 5,
      enabled: true,
    },
  ],
  update: [
    {
      ID: 10101,
      name: 'UvA Master of Software Engineering',
      representatives: 5,
      enabled: true,
    },
    {
      ID: 20202,
      name: 'ASML',
      representatives: 6,
      enabled: true,
    },
  ],

  delete: [
    {
      ID: 10101,
      name: 'UvA',
      representatives: 4,
      enabled: false,
    },
    {
      ID: 20202,
      name: 'ASML',
      representatives: 4,
      enabled: false,
    },
  ],
}

const testQuery = () => {
  it('query entity should get an entity', async () => {
    const res = await api.entity.get(db.entities[0].enid).exec()
    expect(res).to.deep.equal(db.entities[0])
  })

  it('query entities should get the correct entities', async () => {
    const res = await api.entity.getMultiple([db.entities[1].enid, db.entities[0].enid]).exec()
    expect(res).to.deep.include(db.entities[0])
    expect(res).to.deep.include(db.entities[1])
  })
}

const permissions = {
  getAll: () => {
    it('mutation getAll should hanle permissions properly', async () => {
      await fail(api.entity.getAll().exec)
    })
  },
  create: () => {
    it('mutation create should hanle permissions properly', async () => {
      const newEntity = { ...db.entities[0] }
      delete newEntity.enid

      await fail(api.entity.create(newEntity).exec)
    })
  },
  update: () => {
    it('mutation update should hanle permissions properly', async () => {
      const updatedEntity = { ...db.entities[1], enid: db.entities[0].enid }

      await fail(api.entity.update(updatedEntity).exec)
    })
  },
  delete: () => {
    it('mutation delete should hanle permissions properly', async () => {
      await fail(api.entity.delete(db.entities[0].enid).exec)
    })
  },
  import: () => {
    it('mutation import should hanle permissions properly', async () => {
      await fail(api.entity.import(entity_import.csv).exec)
    })
  },
}

describe('Entity', () => {
  before(init)
  after(disconnect)
  beforeEach(initDB)

  describe('Admin', () => {
    beforeEach(async () => {
      await api.user.login('admin', 'admin')
    })

    testQuery()

    it('query entitiesAll should get all entities', async () => {
      const res = await api.entity.getAll().exec()
      expect(res).to.deep.equal(db.entities)
    })

    it('mutation entity.create should create an entity', async () => {
      const entity = {
        name: 'New name',
        description: 'New description',
        type: 'company',
        contact: [
          { type: 'website', content: 'qrcsoftware.nl' },
          { type: 'phonenumber', content: '06 12345678' },
        ],
        external_id: 100,
        representatives: 2,
        location: 'Stand 2b',
      }

      const res = await api.entity.create(entity).exec()

      expect(res.enid).to.exist
      expect(res).to.deep.equal({ ...entity, enid: res.enid })
    })

    it('should check enum values properly', async () => {
      const check = async entity => {
        await fail(api.entity.create(entity).exec)
      }

      let entity = JSON.parse(JSON.stringify(db.entities[0]))
      delete entity.enid
      entity.type = 'invalidType'
      await check(entity)

      entity = JSON.parse(JSON.stringify(db.entities[0]))
      delete entity.enid
      entity.contact[0].type = 'invalidType'
      await check(entity)
    })

    it('mutation entity.update should update the entity', async () => {
      const updatedEntity = { ...db.entities[1], enid: db.entities[0].enid, external_id: db.entities[0].external_id }
      const res = await api.entity.update(updatedEntity).exec()
      expect(res).to.deep.equal(updatedEntity)
    })

    it('mutation entity.delete should delete the entity, linked projects, schedules, votes, representatives and remove enid from student shares list and event list', async () => {
      const res = await api.entity.delete(db.entities[0].enid).exec()
      expect(res).to.deep.equal(db.entities[0])

      const query = await api.entity.get(db.entities[0].enid).exec()
      expect(query).to.be.null

      const schedules = await models.Schedule.find({ enid: db.entities[0].enid })
      expect(schedules).to.have.length(0)

      const votes = await models.Vote.find({ enid: db.entities[0].enid })
      expect(votes).to.have.length(0)

      const representatives = await models.Representative.find({ enid: db.entities[0].enid })
      expect(representatives).to.have.length(0)

      const studentsThatShared = await models.Student.find({ share: db.entities[0].enid })
      expect(studentsThatShared).to.have.length(0)

      const projects = await models.Project.find({ enid: db.entities[0].enid })
      expect(projects).to.have.length(0)

      const events = await models.Event.find({ entities: db.entities[0].enid })
      expect(events).to.have.length(0)
    })

    it('mutation entity.import should import entities', async () => {
      const res = await api.entity.import(entity_import.base).exec()
      expect(res.map(e => e.entity.name)).to.deep.equal(entity_import.base.map(e => e.name))
      expect(res.map(e => e.entity.external_id)).to.deep.equal(entity_import.base.map(e => e.ID))
      expect(res.map(e => e.entity.representatives)).to.deep.equal(entity_import.base.map(e => e.representatives))
    })

    it('mutation entity.import should update entities when they already exist', async () => {
      await api.entity.import(entity_import.base).exec()

      const res = await api.entity.import(entity_import.update).exec()
      expect(res.map(e => e.entity.name)).to.deep.equal(entity_import.update.map(e => e.name))
      expect(res.map(e => e.entity.external_id)).to.deep.equal(entity_import.update.map(e => e.ID))
      expect(res.map(e => e.entity.representatives)).to.deep.equal(entity_import.update.map(e => e.representatives))
    })

    it('mutation entity.import should conditonally delete entities and users', async () => {
      const userCountBefore = (await models.User.find()).length

      const entities = await api.entity.import(entity_import.base).exec()
      for (const { entity } of entities) {
        await api.user.representative
          .create({
            enid: entity.enid,
            firstname: 'firstname',
            lastname: 'lastname',
            email: 'whoo@' + entity.enid,
          })
          .exec()
      }
      expect((await models.User.find()).length).to.equal(userCountBefore + entities.length)

      const res = await api.entity.import(entity_import.delete).exec()
      for (const item of res) {
        expect(item.error).to.be.null
        expect(item.entity).to.be.null
      }
      const userCountAfter = (await models.User.find()).length

      expect(userCountAfter).to.equal(userCountBefore)
    })

    it('mutation entity.import should properly handle double deletes', async () => {
      await api.entity.import(entity_import.base).exec()
      let res = await api.entity.import(entity_import.delete).exec()
      for (const item of res) {
        expect(item.error).to.be.null
        expect(item.entity).to.be.null
      }

      res = await api.entity.import(entity_import.delete).exec()
      for (const item of res) {
        expect(item.error).to.be.null
        expect(item.entity).to.be.null
      }
    })

    it('mutation entity.import should not double import entities', async () => {
      const userCountBefore = models.User.find().length
      await api.entity.import(entity_import.base).exec()
      const res = await api.entity.import(entity_import.base).exec()

      expect(res.map(e => e.entity.name)).to.deep.equal(entity_import.base.map(e => e.name))
      expect(res.map(e => e.entity.external_id)).to.deep.equal(entity_import.base.map(e => e.ID))

      const userCountAfter = models.User.find().length
      expect(userCountAfter).to.equal(userCountBefore)
    })
  })

  describe('Admin representative', () => {
    beforeEach(async () => {
      await api.user.login('repAdmin', 'repAdmin')
    })

    testQuery()

    permissions.getAll()
    permissions.create()

    it('mutation entity.update should update the entity', async () => {
      const updatedEntity = {
        ...db.entities[1],
        enid: db.entities[0].enid,
        type: db.entities[0].type,
        external_id: db.entities[0].external_id,
      }
      const updateQuery = { ...updatedEntity }
      delete updateQuery.type
      const res = await api.entity.update(updateQuery).exec()
      expect(res).to.deep.equal(updatedEntity)
    })

    it('mutation entity.update should not allow admin representatives to update entity type', async () => {
      await fail(api.entity.update({ enid: db.entities[0].enid, type: 'research' }).exec)
    })

    permissions.delete()
    permissions.import()
  })

  describe('Representative', () => {
    beforeEach(async () => {
      await api.user.login('rep', 'rep')
    })

    testQuery()

    permissions.create()
    permissions.update()
    permissions.delete()
    permissions.import()
  })

  describe('Student', () => {
    beforeEach(async () => {
      await api.user.login('student', 'student')
    })

    testQuery()

    permissions.getAll()
    permissions.create()
    permissions.update()
    permissions.delete()
    permissions.import()
  })
})
