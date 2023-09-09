export const canGetEvent = (req, args, event) => {
  if (event.enabled) {
    return true
  }

  if (req.user.type !== 'a' && req.user.type !== 'r') {
    throw new Error('UNAUTHORIZED list disabled event')
  }
}

export const canGetEvents = (req, args) => {
  if (args.all && req.user.type !== 'a') {
    throw new Error('UNAUTHORIZED list all events')
  }
}

export const entityReadAccess = (req, enid) => {
  if (req.user.type == 'r' && enid == req.user.enid) {
    return
  }

  if (req.user.type == 'a') {
    return
  }

  throw new Error('UNAUTHORIZED view information about this entity')
}
