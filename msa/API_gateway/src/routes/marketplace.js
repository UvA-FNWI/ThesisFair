import { Router } from 'express'
import { rgraphql } from '../../../libraries/amqpmessaging/index.js'

const marketplaceRouter = Router()

/**
 * Request the marketplace without being logged in.
 */
marketplaceRouter.post('/', async (req, res, next) => {
  const projectResult = await rgraphql(
    'api-project',
    'query { approvedProjects { pid, name, degrees, evids, enid, tags, description, environment, expectations, email, numberOfStudents, attendance } }'
  )

  if (projectResult.errors) {
    res.send(projectResult)
    return
  }

  const eventResult = await rgraphql('api-event', 'query { active { evid, enabled, degrees, isMarketplace } }')

  if (eventResult.errors) {
    res.send(eventResult)
    return
  }

  const enids = [...new Set(projectResult.data.approvedProjects.map(project => project.enid))]

  const entityResult = await rgraphql('api-entity', 'query($enids:[ID!]!) { entities(enids:$enids) { enid, name } }', {
    enids,
  })

  if (entityResult.errors) {
    res.send(entityResult)
    return
  }

  res.send({
    projects: projectResult.data.approvedProjects,
    events: eventResult.data.active,
    entities: entityResult.data.entities,
  })
})

export default marketplaceRouter
