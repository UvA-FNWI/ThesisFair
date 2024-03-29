import { graphql } from 'graphql'
import { schemaComposer } from 'graphql-compose'
import { readFileSync, mkdirSync, existsSync, constants } from 'fs'
import { writeFile, readFile, access } from 'fs/promises'
import { parse as csvParser } from 'csv-parse'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import axios from 'axios'

import { rgraphql } from '../../libraries/amqpmessaging/index.js'
import { User, Student, Representative, isValidObjectId } from './database.js'
import { canGetUser, canGetUsers } from './permissions.js'

const saltRounds = process.env.DEBUG ? 0 : 10
const hash = password => bcrypt.hash(password, saltRounds)
const randomInt = (min, max) =>
  new Promise((resolve, reject) =>
    crypto.randomInt(min, max, (err, int) => {
      if (err) {
        reject(err)
      } else {
        resolve(int)
      }
    })
  )
const randomPassword = async (length = 12) => {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#%&*()'
  let password = ''

  for (let i = 0; i < length; i++) {
    password += alphabet[await randomInt(0, alphabet.length)]
  }

  return password
}

const mail = nodemailer.createTransport({
  host: process.env.MAILHOST,
  port: parseInt(process.env.MAILPORT),
  ...(process.env.MAILUSER
    ? {
        auth: {
          user: process.env.MAILUSER,
          pass: process.env.MAILPASS,
        },
      }
    : null),
})

const genApiToken = user => {
  if (!user) {
    throw new Error('genApiToken did not get a user object.')
  }

  let additionalData
  if (user.admin) {
    additionalData = { type: 'a' }
  } else if (user instanceof Student) {
    additionalData = { type: 's' }
  } else if (user instanceof Representative) {
    additionalData = { type: 'r', enids: user.enids || [] }
    if (user.repAdmin) {
      additionalData.repAdmin = true
    }
  }

  return new Promise((resolve, reject) => {
    jwt.sign(
      {
        uid: user.uid,
        ...additionalData,
      },
      process.env.JWT_SECRET,
      {
        algorithm: 'HS512',
        expiresIn: '24h',
      },
      (err, key) => {
        if (err) {
          reject(err)
          return
        }

        resolve(key)
      }
    )
  })
}

const getStudies = async studentnumber => {
  const result = await axios({
    method: 'get',
    baseURL: 'https://api.datanose.nl/Programmes/',
    url: studentnumber,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!Array.isArray(result.data)) {
    console.error('Could not get studies from ' + studentnumber)
    return []
  }

  let programmes = result.data
  programmes = programmes.map(study => study.Code.replace(/\s/g, ''))
  // Datanose MAY return the programme code of computer science as 'CPS', so we
  // convert it to the proper 'CS'
  if (programmes.find(code => code == "MScCPS")) {
    programmes[programmes.indexOf("MScCPS")] = "MScCS"
  }
  return programmes
}

const checkStudentVotedForEntity = async (uid, enid) => {
  const res = await rgraphql(
    'api-vote',
    'query checkStudentVotedForEntity($uid: ID!, $enid: ID!) { voteStudentForEntity(uid: $uid, enid: $enid) }',
    { uid, enid }
  )

  if (res.errors || !res.data) {
    console.error(res)
    throw new Error('An unkown error occured while checking if the student voted for the entity')
  }

  return res.data.voteStudentForEntity
}

/**
 *
 * @param {Object} rep
 * @param {String} rep.enid
 * @param {String} rep.firstname
 * @param {String} rep.lastname
 * @param {String} rep.email
 * @param {String} rep.phone
 * @param {String} rep.repAdmin
 * @returns {Object} The new representative
 */
const createRepresentative = async rep => {
  const password = await randomPassword()
  rep.password = await hash(password)

  await mail.sendMail({
    from: 'UvA ThesisFair <thesisfair-IvI@uva.nl>',
    to: process.env.OVERRIDEMAIL || rep.email,
    subject: 'ThesisFair representative account created',
    text: `
  Dear Madam/Sir,

  Your UvA Thesis Fair ${rep.repAdmin ? 'admin ' : ''}representative account has been created.
  You can log in at https://thesisfair.ivi.uva.nl/

  ${
    rep.repAdmin
      ? `This admin account gives you the ability to create additional logins for representatives from your organisation.
Please create subaccounts for all your colleague representatives attending before the event.
Please ask your colleagues to check their spam folder in case they do not receive an email.

  You can create subaccounts by going the bottom of the organisation page and pressing the "Create new account" button.
   `
      : ''
  }

  Your credentials are:
  Email: ${rep.email}
  Password: ${password}

  Please update your password to a more secure one as soon as possible.

  Kind regards,

  The Thesis Fair Team
  `,
  })

  return await Representative.create(rep)
}

const requestPasswordReset = async email => {
  const caseInsensitiveEmailRegex = new RegExp(`^${email}$`, 'i')

  const user = await User.findOne({ email: caseInsensitiveEmailRegex })
  if (!user) {
    throw new Error('No user with that email found.')
  }

  const resetCode = await randomPassword()
  const resetCodeHash = await hash(resetCode)

  await mail.sendMail({
    from: 'UvA ThesisFair <thesisfair-IvI@uva.nl>',
    to: process.env.OVERRIDEMAIL || email,
    subject: 'ThesisFair password reset request',
    text: `
  Dear Madam/Sir,

  Your password reset code is: ${resetCode}

  If you did not request a password reset you can safely ignore this email.

  Kind regards,

  The Thesis Fair Team
  `,
  })

  return await User.findByIdAndUpdate(user.uid, { $set: { resetCode: resetCodeHash } })
}

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'))

schemaComposer.types.get('User').setResolveType(value => {
  if (value instanceof Student) {
    return 'Student'
  } else if (value instanceof Representative) {
    return 'Representative'
  } else {
    return 'Admin'
  }
})

schemaComposer.Query.addNestedFields({
  user: {
    type: 'User',
    args: {
      uid: 'ID!',
    },
    description: 'Get a user by its id.',
    resolve: async (obj, args, req) => {
      const user = await User.findById(args.uid)
      if (!user) {
        return null
      }

      canGetUser(req, args, user)
      return user
    },
  },
  student: {
    type: 'User',
    args: {
      studentnumber: 'ID!',
    },
    description: 'Get a student by its studentnumber',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'system') {
        throw new Error('UNAUTHORIZED to use this route.')
      }

      return await Student.findOneAndUpdate({ studentnumber: args.studentnumber }, {}, { new: true, upsert: true }) // Automic find or create
    },
  },
  users: {
    type: '[User]',
    args: {
      uids: '[ID!]!',
    },
    description: 'Get a list of users using their ids. Result is not in original order!',
    resolve: async (obj, args, req) => {
      const users = await User.find({ _id: { $in: args.uids } })
      for (let i = 0; i < users.length; i++) {
        try {
          canGetUser(req, args, users[i])
        } catch (error) {
          users[i] = null
        }
      }

      return users
    },
  },
  usersOfEntity: {
    type: '[User]',
    args: {
      enid: 'ID!',
    },
    description: 'Get all users of an entity.',
    resolve: async (obj, args, req) => {
      const users = await Representative.find({ enids: args.enid })
      canGetUsers(req, args, users)
      return users
    },
  },
  usersAll: {
    type: '[User]',
    args: {
      filter: 'String',
    },
    description: 'Get all users.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED to get all users')
      }

      switch (args.filter) {
        case 'student':
          return await Student.find()

        case 'representative':
          return await Representative.find()

        case 'admin':
          return await User.find({ admin: true })

        default:
          return await User.find()
      }
    },
  },
  studentsWhoManuallyShared: {
    type: '[Student]',
    description: 'Get all users who manually shared their info with all entities.',
    resolve: async (obj, args, req) => {
      return await Student.find({
        manuallyShared: true,
      })
    },
  },
  cv: {
    type: 'String',
    args: {
      uid: 'ID!',
      check: 'Boolean',
    },
    description: 'Get a students CV or check if a student has uploaded a CV.',
    resolve: async (obj, args, req) => {
      if (!isValidObjectId(args.uid)) {
        throw new Error('Invalid uid supplied')
      }

      const user = await User.findById(args.uid)
      if (!user) {
        return null
      }

      canGetUser(req, args, user)

      const file = `./data/${args.uid}`
      try {
        await access(file, constants.R_OK)
      } catch (error) {
        return null
      }

      if (args.check) {
        return 'present'
      }

      return readFile(file).then(content => content.toString())
    },
  },
  requestPasswordReset: {
    type: 'Boolean',
    args: {
      email: 'String!',
    },
    description: 'Request a password reset -- sends an email and stores the reset code',
    resolve: async (obj, args, req) => {
      return !!(await requestPasswordReset(args.email))
    },
  },
  resetPassword: {
    type: 'Boolean',
    args: {
      email: 'String!',
      resetCode: 'String!',
      password: 'String!',
    },
    description: 'Reset a password',
    resolve: async (obj, args, req) => {
      const user = await User.findOne({ email: args.email })
      if (!user) {
        throw new Error('No user with that email found.')
      }

      if (!user.resetCode) {
        throw new Error('No password reset code found, please contact a system administrator')
      }

      const password = await hash(args.password)

      if (await bcrypt.compare(args.resetCode, user.resetCode)) {
        await User.findByIdAndUpdate(user.uid, { password, resetCode: null })
        return true
      }

      throw new Error('Incorrect password reset code')
    },
  },
  login: {
    type: 'String!',
    args: {
      email: 'String!',
      password: 'String!',
    },
    description: 'Login a user via email/password combination and return the JWT string.',
    resolve: async (obj, args) => {
      const caseInsensitiveEmailRegex = new RegExp(`^${args.email}$`, 'i')

      const user = await User.findOne({ email: caseInsensitiveEmailRegex })
      if (!user) {
        throw new Error('No user with that email found.')
      }

      // if (process.env.NODE_ENV !== 'development' && user.admin === true) {
      //   throw new Error('SSO only account. Please login via Single Sign-on')
      // }

      if (!user.password) {
        throw new Error('No password set. Please use the "forgot password" function.')
      }

      if (!(await bcrypt.compare(args.password, user.password))) {
        throw new Error('Incorrect password')
      }

      if (user instanceof Representative && !user.admin && (!user.enids || user.enids.length === 0)) {
        throw new Error('No organisation found: ask a colleague to add you back.')
      }

      return await genApiToken(user)
    },
  },
  ssoLogin: {
    type: 'String!',
    args: {
      student: 'Boolean!',
      external_id: 'ID!',
      email: 'String!',
      firstname: 'String',
      lastname: 'String',
    },
    description: 'Internal only route.',
    /**
     * Check if user exists based on external_id.
     * - If the user does not exist, create it.
     * - If the user is an empty placeholder, update it with the SSO email and name.
     * - Return a JWT string for the (newly created) user.
     */
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'system') {
        throw new Error('UNAUTHORIZED to generate apiTokens')
      }

      let user
      if (args.student) {
        user = await Student.findOne({ studentnumber: args.external_id })

        if (!user) {
          // User does not exist
          const studies = await getStudies(args.external_id)
          const caseInsensitiveEmailRegex = new RegExp(`^${args.email}$`, 'i')

          user = await Student.findOneAndUpdate(
            { email: caseInsensitiveEmailRegex },
            { studentnumber: args.external_id, firstname: args.firstname, lastname: args.lastname, studies },
            { upsert: true, new: true }
          )
        } else if (!user.email && !user.firstname && !user.lastname) {
          // Current user data is a placeholder created by "query student", this is the first time the user is logging in via SSO.
          const studies = await getStudies(args.external_id)
          await Student.findByIdAndUpdate(user.uid, {
            email: args.email,
            firstname: args.firstname,
            lastname: args.lastname,
            studies,
          })
        }
      } else {
        user = await Representative.findOne({ external_id: args.external_id })
        if (!user) {
          const caseInsensitiveEmailRegex = new RegExp(`^${args.email}$`, 'i')

          user = await Representative.findOneAndUpdate(
            { email: caseInsensitiveEmailRegex },
            { external_id: args.external_id, firstname: args.firstname, lastname: args.lastname }
          )

          if (!user) {
            user = await User.findOne({ email: args.email, admin: true }) // Admin login

            if (!user) {
              throw new Error(
                `No representative account found with your unique ID or email address. Please ask an admin representative to create an account for you with your employee email address ${user.email}.`
              )
            }
          }
        }
      }

      return await genApiToken(user)
    },
  },
})

schemaComposer.Mutation.addNestedFields({
  'user.representative.create': {
    type: 'Representative',
    args: {
      enid: 'ID',
      enids: '[ID]',
      firstname: 'String',
      lastname: 'String',
      email: 'String!',
      phone: 'String',
      repAdmin: 'Boolean',
    },
    description: 'Create a representative account OR add specified enids to an existing account.',
    resolve: async (obj, args, req) => {
      if (args.enid) {
        if (args.enids) {
          args.enids.push(args.enid)
        } else {
          args.enids = [args.enid]
        }
      }

      if (!args.enids) {
        throw new Error('Must specify an entity id to create a new user')
      }

      delete args.enid

      if (
        !(
          req.user.type === 'a' ||
          (req.user.type === 'r' &&
            req.user.repAdmin === true &&
            args.enids.every(enid => req.user.enids.includes(enid)))
        )
      ) {
        throw new Error('UNAUTHORIZED create user accounts for this entity')
      }

      const caseInsensitiveEmailRegex = new RegExp(`^${args.email}$`, 'i')
      const user = await Representative.findOne({ email: caseInsensitiveEmailRegex })

      if (user) {
        return await Representative.findByIdAndUpdate(user.uid, { $addToSet: { enids: { $each: args.enids } } })
      }

      return await createRepresentative(args)
    },
  },
  'user.representative.update': {
    type: 'Representative',
    args: {
      uid: 'ID!',
      enid: 'ID',
      enids: '[ID]',
      firstname: 'String',
      lastname: 'String',
      email: 'String',
      phone: 'String',
      repAdmin: 'Boolean',
      password: 'String',
    },
    description: 'Update a representative account.',
    resolve: async (obj, args, req) => {
      const uid = args.uid
      delete args.uid

      if (args.enid) {
        if (args.enids) {
          args.enids.push(args.enid)
        } else {
          args.enids = [args.enid]
        }
      }

      delete args.enid

      // TODO: repadmin should only be able to change if the change pertains to one of their organizations
      if (
        !(
          req.user.type === 'a' ||
          req.user.uid === uid ||
          (req.user.repAdmin === true &&
            (await Representative.findById(uid, { enids: 1 }).enids).some(enid =>
              req.user.enids.includes(enid.toString())
            ))
        )
      ) {
        throw new Error('UNAUTHORIZED update representative')
      }

      if (args.enids && req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update enids of representative')
      }

      if (args.password) {
        if (req.user.uid !== uid) {
          throw new Error('UNAUTHORIZED update other peoples passwords')
        }

        args.password = await hash(args.password)
      }

      return await Representative.findByIdAndUpdate(uid, { $set: args }, { new: true })
    },
  },
  'user.admin.update': {
    type: 'User',
    args: {
      uid: 'ID!',
      email: 'String',
    },
    description: 'Update an admin account.',
    resolve: async (obj, args, req) => {
      const uid = args.uid
      delete args.uid

      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update admin')
      }

      return await User.findByIdAndUpdate(uid, { $set: args }, { new: true })
    },
  },
  'user.student.update': {
    type: 'Student',
    args: {
      uid: 'ID!',
      firstname: 'String',
      lastname: 'String',
      email: 'String',
      phone: 'String',
      websites: '[String!]',
    },
    description: 'Update a student account.',
    resolve: async (obj, args, req) => {
      const uid = args.uid
      delete args.uid

      if (!(req.user.type === 'a' || (req.user.type === 's' && req.user.uid === uid))) {
        throw new Error('UNAUTHORIZED update student')
      }

      return await Student.findByIdAndUpdate(uid, { $set: args }, { new: true })
    },
  },
  'user.student.uploadCV': {
    type: 'Boolean',
    args: {
      uid: 'ID!',
      file: 'String!',
    },
    description: 'Upload a CV',
    resolve: async (obj, args, req) => {
      if (!isValidObjectId(args.uid)) {
        throw new Error('Invalid uid supplied')
      }

      if (!(req.user.type === 'a' || (req.user.type === 's' && req.user.uid === args.uid))) {
        throw new Error('UNAUTHORIZED update student')
      }

      await writeFile(`./data/${args.uid}`, args.file)
      return true
    },
  },
  'user.student.shareInfo': {
    type: 'Student',
    args: {
      uid: 'ID!',
      share: 'Boolean!',
    },
    description: 'Allow or disallow all companies to see student data.',
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || (req.user.type === 's' && req.user.uid === args.uid))) {
        throw new Error('UNAUTHORIZED update share information')
      }

      return await Student.findByIdAndUpdate(args.uid, { $set: { manuallyShared: args.share } }, { new: true })
    },
  },
  'user.delete': {
    type: 'User',
    args: {
      uid: 'ID!',
    },
    description: 'Delete a user',
    resolve: async (obj, args, req) => {
      const checkEnid = async () => {
        const user = await Representative.findById(args.uid, { enids: 1 })
        if (!user) {
          return false
        }

        return user.enids.every(enid => req.user.enids.includes(enid.toString()))
      }
      if (
        !(
          req.user.type === 'a' ||
          req.user.uid === args.uid ||
          (req.user.type === 'r' && req.user.repAdmin === true && (await checkEnid()))
        )
      ) {
        throw new Error('UNAUTHORIZED delete user')
      }

      return await User.findByIdAndDelete(args.uid)
    },
  },
  'user.deleteOfEntity': {
    type: 'Boolean',
    args: {
      enid: 'ID!',
    },
    description: 'Remove all representatives from an entity.',
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete entities')
      }

      await Representative.updateMany({ $pull: { enids: args.enid } })
      await Student.updateMany({ $pull: { share: args.enid } })
      return true
    },
  },
})

if (!existsSync('./data')) {
  mkdirSync('./data')
}

const schema = schemaComposer.buildSchema()

const executeGraphql = ({ query, variables = {}, context = {} }) =>
  graphql({ schema, source: query, variableValues: variables, contextValue: context })
export default executeGraphql
