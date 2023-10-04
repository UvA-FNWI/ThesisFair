export const canGetUser = (req, args, user) => {
  // TODO: improve security by looking for votes in projects, 'shared all' users, etc.
  return

  if (
    !(
      req.user.type === 'a' ||
      req.user.uid == user.uid ||
      ((user.__typename || user.__t) === 'Student' && req.user.type === 'r' && user.share.includes(req.user.enid)) ||
      ((user.__typename || user.__t) === 'Representative' &&
        req.user.type === 'r' &&
        req.user.repAdmin === true &&
        req.user.enid == user.enid)
    )
  ) {
    throw new Error(
      'UNAUTHORIZED to get this ' + ((user.__typename || user.__t) === 'Student' ? 'student' : 'representative')
    )
  }
}

export const canGetUsers = (req, args, users) => {
  for (const user of users) {
    canGetUser(req, args, user)
  }
}
