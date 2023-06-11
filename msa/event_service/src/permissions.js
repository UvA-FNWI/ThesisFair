export const canGetEvent = (req, args, event) => {
  if (!event.enabled && req.user.type !== 'a') {
    throw new Error('UNAUTHORIZED list disabled event')
  }
}

export const canGetEvents = (req, args) => {
  if (args.all && req.user.type !== 'a') {
    throw new Error('UNAUTHORIZED list all events')
  }
}
