import { findFairs } from './fairs'

export const getParticipatingFairs = async (getProjectsOfEntity, allEventsByEvid, entity) => {
  const projects = await getProjectsOfEntity(null, entity.enid, { evids: true }).exec()

  if (!projects) return []

  const events = [...new Set(projects.map(project => project.evids).flat())]
    .map(evid => allEventsByEvid[evid])
    .filter(event => event !== undefined && event.enabled)
    .filter(event => !event.isMarketplace)

  if (!events) return []

  return findFairs(events) || []
}
