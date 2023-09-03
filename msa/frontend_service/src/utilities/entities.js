import { findFairs } from './fairs'

export const getParticipatingFairs = async (
  getProjectsOfEntity,
  allEventsByEvid,
  entity,
  approvalStates = ['approved', 'preliminary']
) => {
  let projects = await getProjectsOfEntity(null, entity.enid, { evids: true, adminApproval: true }).exec()
  projects = projects.filter(project => approvalStates.includes(project.approval))

  if (!projects) return []

  const events = [...new Set(projects.map(project => project.evids).flat())]
    .map(evid => allEventsByEvid[evid])
    .filter(event => event !== undefined && event.enabled)
    .filter(event => !event.isMarketplace)

  if (!events) return []

  return findFairs(events) || []
}
