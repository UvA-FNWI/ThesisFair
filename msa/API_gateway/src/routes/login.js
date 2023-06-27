import { Router } from 'express'
import { rgraphql } from '../../../libraries/amqpmessaging/index.js'

const loginRouter = Router()

/**
 * Login using an email and password.
 * This manual forward to the user service is needed because this and SSO are
 * the only routes which are allowed to be called when not logged in.
 */
loginRouter.post('/', async (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    next({ status: 401, message: 'No email or password supplied' })
    return
  }

  const result = await rgraphql(
    'api-user',
    'query($email:String!,$password:String!) { login(email:$email, password:$password) }',
    { email: req.body.email, password: req.body.password }
  )
  if (result.errors) {
    res.send(result)
    return
  }

  res.send(result.data.login)
})

export default loginRouter
