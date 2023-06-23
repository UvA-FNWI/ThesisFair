export const canGetAllEntities = (req, args) => {
  if (req.user.type !== 'a') {
    throw new Error('UNAUTHORIZED get all entities')
  }
}
