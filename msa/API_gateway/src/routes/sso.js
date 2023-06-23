import { Router } from 'express'
import cookieParser from 'cookie-parser'
import { Issuer, generators, custom } from 'openid-client'

import { encrypt, decrypt } from '../encryption.js'
import { rgraphql } from '../../../libraries/amqpmessaging/index.js'

const router = Router()

const issuer = await Issuer.discover(process.env.OPENID_ISSUER_URL)
const client = new issuer.Client({
  client_id: process.env.OPENID_CLIENT_ID,
  client_secret: process.env.OPENID_CLIENT_SECRET,
  redirect_uris: [process.env.OPENID_REDIRECT_URL],
  response_types: ['code'],
})
client[custom.clock_tolerance] = 5

/**
 * Call the ssoLogin query on the user service which optionally creates the user and generates the JWT token.
 * @param {Boolean} student Is the user a student?
 * @param {String} external_id The external identifier supplied by the SSO instance
 * @param {String} email The email address
 * @param {String} firstname The users first name
 * @param {String} lastname The users last name
 * @returns JWT token string
 */
const ssoLogin = async (student, external_id, email, firstname, lastname) => {
  const variables = {
    student,
    external_id,
    email,
    firstname,
    lastname,
  }
  const res = await rgraphql(
    'api-user',
    `query ssoLogin($student: Boolean!, $external_id: ID!, $email: String!, $firstname: String, $lastname: String) { ssoLogin(student: $student, external_id: $external_id, email: $email, firstname: $firstname, lastname: $lastname) } `,
    variables,
    { user: { type: 'system' } }
  )
  if (res.errors) {
    throw new Error('api-user: ' + res.errors[0].message)
  }

  return res.data.ssoLogin
}

/**
 * Login route to start the SSO process.
 * The code verifier is encrypted and stored as a cookie in the users browser
 */
router.get('/login', (req, res) => {
  const code_verifier = generators.codeVerifier()
  const code_challenge = generators.codeChallenge(code_verifier)

  const authUrl = client.authorizationUrl({
    scope: 'openid email profile',
    resource: process.env.OPENID_RESOURCE,
    code_challenge,
    code_challenge_method: 'S256',
  })

  const code_verifier_encrypted = encrypt(code_verifier)

  res.cookie('c', code_verifier_encrypted, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV !== 'development',
    maxAge: 300000,
  })
  res.redirect(authUrl)
})

/**
 * The route the user is redirected towards after SSO login is complete.
 * Retrieves the code varifier using the cookie "c" which is encrypted.
 */
router.get('/loggedin', cookieParser(), async (req, res) => {
  if (!req.cookies.c) {
    res.status(400).send('No code cookie set').end()
    return
  }

  const params = client.callbackParams(req)
  let tokenSet
  try {
    tokenSet = await client.callback(process.env.OPENID_REDIRECT_URL, params, { code_verifier: decrypt(req.cookies.c) })
  } catch (error) {
    res.status(401).send('Invalid code').end()
    return
  }

  if (!tokenSet.access_token) {
    console.error('No access_token was returned after sso login')
    res.status(500).end()
    return
  }

  const userInfo = await client.userinfo(tokenSet.access_token)

  if (!userInfo.eduperson_affiliation) {
    console.error(`User with email ${userInfo.email} does not have an person affiliation set.`)
    throw new Error('No affiliation set for this account.')
  }

  const student = userInfo.eduperson_affiliation.includes('student')
  const external_uid = userInfo.uids[0]
  const firstname = userInfo.given_name
  const lastname = userInfo.family_name
  const email = userInfo.email

  let apiToken
  try {
    apiToken = await ssoLogin(student, external_uid, email, firstname, lastname)
  } catch (error) {
    res.redirect('/error#' + error)
    return
  }

  res
    .cookie('apiToken', apiToken, {
      secure: true,
      sameSite: true,
    })
    .redirect('/')
})

export default router
