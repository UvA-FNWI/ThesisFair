export const canGetStudentVotes = (req, args) => {
  if (!(req.user.type === 'a' || (req.user.type === 's' && req.user.uid === args.uid))) {
    throw new Error('UNAUTHORIZED get this students votes');
  }
}

export const canGetEntityVotes = (req, args) => {
  if (!(req.user.type === 'a' || (req.user.type === 'r' && req.user.enid === args.enid))) {
    throw new Error('UNAUTHORIZED get this entities votes');
  }
}

export const canGetProjectVotes = (req, args) => { // TODO: Check if representative belongs to the same entity as project
  if (req.user.type === 's') {
    throw new Error('UNAUTHORIZED get votes of projects');
  }
}
