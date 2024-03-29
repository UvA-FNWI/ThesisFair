export const isAIEvent = event => event.degrees !== null && event.degrees.includes('MScAI')
export const isMarketplaceOnlyEvent = event => event.isMarketplace

export const getEventType = event => (isAIEvent(event) ? 'AI' : 'General')

export const getFairLabel = events => {
  if (!events || !events.every(e => e)) return

  const AICount = events.filter(isAIEvent).length
  const MarketplaceCount = events.filter(isMarketplaceOnlyEvent).length
  const GeneralCount = events.length - AICount - MarketplaceCount

  if (MarketplaceCount > 0) return 'Marketplace only'
  if (AICount > 0 && GeneralCount > 0) return 'Thesis Fair & AI Thesis Fair'
  if (AICount > 0 && GeneralCount === 0) return 'AI Thesis Fair'
  if (AICount === 0 && GeneralCount > 0) return 'General Thesis Fair'
}

export const getPaymentTooltip = (events, date, paymentStatus) => {
  const plural = events.length > 1
  const eventNames = `${events.map(event => getEventType(event)).join(' & ')} Thesis Fair${plural ? 's' : ''}`

  let dateIndicator

  try {
    dateIndicator = `held on ${date.toLocaleDateString('en-GB')}`
  } catch (error) {
    console.log(error)
    dateIndicator = 'held someday'
  }

  let status = ''

  switch (paymentStatus) {
    case 'invoice':
      status = 'an invoice has been requested'
      break
    case 'failed':
    case 'open':
      status = 'the payment is being processed'
      break
    case 'paid':
      status = 'the payment has been completed'
      break
    default:
      status = 'the payment is incomplete'
      break
  }

  return `The payment status for ${eventNames} ${dateIndicator}: ${status}.`
}

export const getPaymentTagClassName = status => {
  switch (status) {
    case 'invoice':
      return 'tag--payment-ir'
    case 'failed':
    case 'open':
      return 'tag--payment-pp'
    case 'paid':
      return 'tag--payment-pc'
    default:
      return 'tag--payment-pi'
  }
}

const groupFairsByDate = events =>
  events
    .map(event => ({ ...event, date: new Date(event.start).setHours(0, 0, 0, 0) }))
    .reduce((fairs, event) => {
      const identicalDate = fairs.find(fair => fair.date === event.date)

      if (identicalDate) identicalDate.events.push(event)
      else fairs.push({ date: event.date, events: [event] })

      return fairs
    }, [])

export const findFairs = events => {
  const activeEvents = events.filter(event => event.enabled)
  if (!activeEvents) return []

  const fairs = groupFairsByDate(activeEvents)

  return fairs?.map(fair => ({ events: fair.events, date: new Date(fair.date), name: getFairLabel(fair.events) })) || []
}
