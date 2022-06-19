export const canGetUser = (req, args, user) => {
  console.log(req.user, user.share)
  if (!(req.user.type === 'a' ||
    req.user.uid === user.uid ||
    ((user.__typename === 'Student' || user instanceof Student) && req.user.type === 'r' && user.share.includes(req.user.enid)) ||
    ((user.__typename === 'Representative' || user instanceof Representative) && req.user.type === 'r' && req.user.repAdmin === true && req.user.enid == user.enid))) {
      throw new Error('UNAUTHORIZED to get this ' + ((user.__typename === 'Student' || user instanceof Student) ? 'student' : 'representative'));
  }
}

export const canGetUsers = (req, args, users) => {
  for (const user of users) {
    canGetUser(req, user);
  }
}
