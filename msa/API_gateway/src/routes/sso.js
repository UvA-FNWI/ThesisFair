import { Router } from 'express';
import { Issuer, generators, custom } from 'openid-client';

import { rgraphql } from '../../../libraries/amqpmessaging/index.js';

const router = Router();

const issuer = await Issuer.discover(process.env.OPENID_ISSUER_URL);
const client = new issuer.Client({
  client_id: process.env.OPENID_CLIENT_ID,
  client_secret: process.env.OPENID_CLIENT_SECRET,
  redirect_uris: [process.env.OPENID_REDIRECT_URL],
  response_types: ['code'],
});
client[custom.clock_tolerance] = 5;

const ssoLogin = async (student, external_id, email, firstname, lastname) => {
  const variables = {
    student,
    external_id,
    email,
    firstname,
    lastname,
  }
  const res = await rgraphql('api-user', `query ssoLogin($student: Boolean!, $external_id: ID!, $email: String!, $firstname: String, $lastname: String) { ssoLogin(student: $student, external_id: $external_id, email: $email, firstname: $firstname, lastname: $lastname) } `, variables, { user: { type: 'system' } });
  if (res.errors) {
    throw new Error(res.errors[0].message);
  }

  return res.data.ssoLogin;
}

let code_verifier; // TODO
router.get('/login', (req, res) => {
  code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);

  const authUrl = client.authorizationUrl({
    scope: 'openid email profile',
    resource: process.env.OPENID_RESOURCE,
    code_challenge,
    code_challenge_method: 'S256',
  });

  res.redirect(authUrl);
})

router.get('/loggedin', async (req, res) => {
  const params = client.callbackParams(req);
  let tokenSet;
  try {
    tokenSet = await client.callback(process.env.OPENID_REDIRECT_URL, params, { code_verifier });
  } catch (error) {
    res.status(401).send('Invalid code').end();
    return;
  }

  if (!tokenSet.access_token) {
    console.error('No access_token was returned after sso login');
    res.status(500).end();
    return;
  }

  const userInfo = await client.userinfo(tokenSet.access_token);

  if (!userInfo.eduperson_affiliation) {
    console.error(`User with email ${userInfo.email} does not have an person affiliation set.`);
    throw new Error('No affiliation set for this account.');
  }

  const student = userInfo.eduperson_affiliation.includes('student');
  const external_uid = userInfo.sub;
  const firstname = userInfo.given_name;
  const lastname = userInfo.family_name;
  const email = userInfo.email;

  let apiToken;
  try {
    apiToken = await ssoLogin(student, external_uid, email, firstname, lastname);
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }

  res.cookie('apiToken', apiToken, {
    secure: true,
    sameSite: true
  }).redirect('/');
});

export default router;
