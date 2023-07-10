import { Project } from './database.js'

export function entityWriteAccess(user, entity) {
  if (entity == null || entity.enid == null) {
    throw new Error('BAD REQUEST missing entity ID')
  }

  switch (user.type) {
    case 'a':
      return true

    case 'r':
      if (user.enids.includes(entity.enid.toString())) return true

      throw new Error('UNAUTHORIZED representative has no access to entity')

    case 's':
      throw new Error('UNAUTHORIZED students cannot create/edit a project')

    default:
      throw new Error('UNAUTHORIZED invalid user type')
  }
}

export async function projectWriteAccess(user, project) {
  if (project.pid) {
    project = await Project.findById(project.pid).exec()
  } else if (project.enid == null) {
    throw new Error('BAD REQUEST missing entity ID')
  }

  if (project == null || project.enid == null) {
    throw new Error('BAD REQUEST invalid project ID')
  }

  return entityWriteAccess(user, project)
}
