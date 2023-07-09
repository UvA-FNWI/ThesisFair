import { Router } from 'express'
import { rgraphql } from '../../../libraries/amqpmessaging/index.js'

const requestPasswordResetRouter = Router()

/**
 * Request a password reset
 * This manual forward to the user service is needed because this needs to be
 * called when not logged in.
 */
requestPasswordResetRouter.post('/', async (req, res, next) => {
  if (!req.body.email) {
    next({ status: 401, message: 'No email supplied' })
    return
  }

  const result = await rgraphql(
    'api-user',
    'query($email:String!) { requestPasswordReset(email:$email) }',
    { email: req.body.email }
  )
  if (result.errors) {
    res.send(result)
    return
  }

  res.send(result.data)
})

export default requestPasswordResetRouter
