import axios from 'axios'

import { Payments } from './database.js'

async function updatePaymentStatuses() {
  // Get open payments, only their state can change
  const payments = await Payments.find({status: 'open'})

  // Get info about all of these payments
  const results = await Promise.all(payments.map(payment => axios({
    method: 'get',
    baseURL: process.env.DATANOSE_API_URL,
    url: `Payments/${payment.externalId}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PAYMENT_API_TOKEN}`,
    },
  })))

  // Match them back up to their internal IDs
  const paymentStates = results.map(res => ({
    '_id': payments.find(payment => payment.externalId == res.data.Id)._id,
    'status': res.data.Status,
  }))

  // Update each record with the new state
  await Promise.all(paymentStates.map(({_id, status}) => Payments.findByIdAndUpdate(_id, {status})))
}

export default function scheduleUpdates() {
  return setInterval(updatePaymentStatuses, 10 * 1000)
}
