export const projectWriteAccess = entityWriteAccess;

export const entityWriteAccess = (user, entity) => {
  switch (user.type) {
    case 'a':
      return true;

    case 'r':
      if (user.enid == entity.enid) return true;

      throw new Error('UNAUTHORIZED representative has no access to entity');

    case 's':
      throw new Error('UNAUTHORIZED students cannot create/edit a project');

    default:
      throw new Error('UNAUTHORIZED invalid user type');
  }
}
