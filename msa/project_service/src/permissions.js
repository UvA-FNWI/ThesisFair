import { Project } from './database.js'

export function entityWriteAccess(user, entity) {
  if (entity == null) {
    throw new Error('BAD REQUEST invalid entity or project ID')
  }

  switch (user.type) {
    case 'a':
      return true

    case 'r':
      if (user.enid === entity.enid.toString()) return true

      throw new Error('UNAUTHORIZED representative has no access to entity')

    case 's':
      throw new Error('UNAUTHORIZED students cannot create/edit a project')

    default:
      throw new Error('UNAUTHORIZED invalid user type')
  }
}

export async function projectWriteAccess(user, project) {
  if (project.pid) {
    project = await Project.findById(project.pid)
  }

  return entityWriteAccess(user, project)
}
