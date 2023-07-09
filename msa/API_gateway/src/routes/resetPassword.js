import { Router } from 'express'
import { rgraphql } from '../../../libraries/amqpmessaging/index.js'

const resetPasswordRouter = Router()

/**
 * Request a password reset
 * This manual forward to the user service is needed because this needs to be
 * called when not logged in.
 */
resetPasswordRouter.post('/', async (req, res, next) => {
  if (!req.body.email || !req.body.resetCode || !req.body.password) {
    next({ status: 401, message: 'No email, password reset code or password supplied' })
    return
  }

  const result = await rgraphql(
    'api-user',
    'query($email:String!, $resetCode:String!, $password:String!) { resetPassword(email:$email, resetCode:$resetCode, password:$password) }',
    { email: req.body.email, resetCode: req.body.resetCode, password: req.body.password }
  )
  if (result.errors) {
    res.send(result)
    return
  }

  res.send(result.data)
})

export default resetPasswordRouter
