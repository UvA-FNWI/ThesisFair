import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync, mkdirSync, existsSync, constants } from 'fs';
import { writeFile, readFile, access } from 'fs/promises';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

import { User, Student, Representative, isValidObjectId } from './database.js';
import { canGetUser, canGetUsers } from './permissions.js';

const saltRounds = process.env.DEBUG ? 0 : 10;
const hash = (password) => bcrypt.hash(password, saltRounds);
const randomInt = (min, max) => new Promise((resolve, reject) => crypto.randomInt(min, max, (err, int) => { if (err) { reject(err) } else { resolve(int) } }));
const randomPassword = async (length = 12) => {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#%&*()';
  let password = '';

  for (let i = 0; i < length; i++) {
    password += alphabet[await randomInt(0, alphabet.length)];
  }

  return password;
};

const mail = nodemailer.createTransport({
  host: 'mailhog',
  port: 1025,
});

const genApiToken = (user) => {
  if (!user) { throw new Error('genApiToken did not get a user object.'); }

  let additionalData;
  if (user.admin) {
    additionalData = { type: 'a' };
  } else if (user instanceof Student) {
    additionalData = { type: 's' };
  } else if (user instanceof Representative) {
    additionalData = { type: 'r', enid: user.enid };
    if (user.repAdmin) {
      additionalData.repAdmin = true;
    }
  }

  return new Promise((resolve, reject) => {
    jwt.sign({
      uid: user.uid,
      ...additionalData,
    }, process.env.jwtKey, {
      algorithm: 'HS512',
      expiresIn: '24h',
    }, (err, key) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(key);
    });
  });
}

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.types.get('User').setResolveType((value) => {
  if (value instanceof Student) {
    return 'Student';
  } else if (value instanceof Representative) {
    return 'Representative';
  } else {
    return 'Admin';
  }
})

schemaComposer.Query.addNestedFields({
  user: {
    type: 'User',
    args: {
      uid: 'ID!',
    },
    description: JSON.stringify({
      checkPermissions: canGetUser.toString(),
      caching: { type: 'user', key: 'uid' },
    }),
    resolve: async (obj, args, req) => {
      const user = await User.findById(args.uid);
      if (!user) { return null; }

      canGetUser(req, args, user);
      return user;
    },
  },
  student: {
    type: 'User',
    args: {
      studentnumber: 'ID!',
    },
    description: JSON.stringify({
      checkPermissions: canGetUser.toString(),
      caching: { type: 'user', key: 'uid' },
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'system') {
        throw new Error('UNAUTHORIZED to use this route.');
      }

      return await Student.findOneAndUpdate({ studentnumber: args.studentnumber }, {}, { new: true, upsert: true }); // Automic find or create
    },
  },
  users: {
    type: '[User]',
    args: {
      uids: '[ID!]!',
    },
    description: JSON.stringify({
      checkPermissions: canGetUsers.toString(),
      caching: { type: 'user', key: 'uid', keys: 'uids' },
    }),
    resolve: async (obj, args, req) => {
      const users = await User.find({ _id: { $in: args.uids } });
      canGetUsers(req, args, users);
      return users;
    },
  },
  usersOfEntity: { // TODO: Auto test this
    type: '[User]',
    args: {
      enid: 'ID!',
    },
    description: JSON.stringify({
    }),
    resolve: async (obj, args, req) => {
      const users = await Representative.find({ enid: args.enid });
      canGetUsers(req, args, users);
      return users;
    }
  },
  usersAll: { // TODO: Auto test this
    type: '[User]',
    description: JSON.stringify({
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED to get all users');
      }

      const users = await User.find();
      return users;
    }
  },
  cv: {
    type: 'String',
    args: {
      uid: 'ID!',
      check: 'Boolean'
    },
    description: JSON.stringify({
      checkPermissions: canGetUser.toString(),
      caching: { type: 'userCV', key: 'uid' },
    }),
    resolve: async (obj, args, req) => {
      if (!isValidObjectId(args.uid)) {
        throw new Error('Invalid uid supplied');
      }

      const user = await User.findById(args.uid);
      if (!user) {
        return null;
      }

      canGetUser(req, args, user);

      const file = `./data/${args.uid}`;
      try {
        await access(file, constants.R_OK);
      } catch (error) {
        return null;
      }

      if (args.check) {
        return 'present';
      }

      return readFile(file).then((content) => content.toString());
    }
  },
  login: {
    type: 'String!',
    args: {
      email: 'String!',
      password: 'String!',
    },
    description: JSON.stringify({
    }),
    resolve: async (obj, args) => {
      const user = await User.findOne({ email: args.email });
      if (!user) { throw new Error('No user with that email found.'); }

      if (!(await bcrypt.compare(args.password, user.password))) {
        throw new Error('Incorrect password');
      }

      return await genApiToken(user);
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
    description: JSON.stringify({
    }),
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'system') {
        throw new Error('UNAUTHORIZED to generate apiTokens');
      }

      let user;
      if (args.student) {
        user = await Student.findOne({ studentnumber: args.external_id });
        if (!user.email && !user.firstname && !user.lastname) { // Current user data is a placeholder created by "query student", this is the first time the user is logging in via SSO.
          await Student.findByIdAndUpdate(user.uid, { email: args.email, firstname: args.firstname, lastname: args.lastname });
        } else if (!user) {
          user = await Student.findOneAndUpdate({ email: args.email }, { studentnumber: args.external_id, firstname: args.firstname, lastname: args.lastname }, { upsert: true, new: true });
        }
      } else {
        user = await Representative.findOne({ external_id: args.external_id });
        if (!user) {
          user = await Representative.findOneAndUpdate({ email: args.email }, { external_id: args.external_id, firstname: args.firstname, lastname: args.lastname }, { upsert: true, new: true });
        }
      }

      return await genApiToken(user);
    },
  },
});

schemaComposer.Mutation.addNestedFields({
  'user.representative.create': {
    type: 'Representative',
    args: {
      enid: 'ID!',
      firstname: 'String',
      lastname: 'String',
      email: 'String!',
      phone: 'String',
      repAdmin: 'Boolean',
    },
    description: JSON.stringify({
      caching: { type: 'user', key: 'uid', create: true },
    }),
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' ||
        (req.user.type === 'r' &&
          req.user.repAdmin === true &&
          req.user.enid === args.enid))
      ) {
        throw new Error('UNAUTHORIZED create user accounts for this entity');
      }

      const password = await randomPassword();
      args.password = await hash(password);

      await mail.sendMail({
        from: 'UvA ThesisFair <quintencoltof1@gmail.com>',
        to: args.email,
        subject: 'ThesisFair representative account created',
        text: `
Dear ${args.firstname} ${args.lastname},

Your UvA ThesisFair ${args.repAdmin ? 'admin ' : ''}representative account has been created.
You can log in at https://thesisfair.ivi.uva.nl/

Your credentials are:
Email: ${args.email}
Password: ${password}

Please update your password to a more secure one as soon as possible.
`
      })

      return Representative.create(args);
    }
  },
  'user.representative.update': {
    type: 'Representative',
    args: {
      uid: 'ID!',
      enid: 'ID',
      firstname: 'String',
      lastname: 'String',
      email: 'String',
      phone: 'String',
      repAdmin: 'Boolean',
      password: 'String',
    },
    description: JSON.stringify({
      caching: { type: 'user', key: 'uid', update: true },
    }),
    resolve: async (obj, args, req) => {
      const uid = args.uid;
      delete args.uid;

      if (!(req.user.type === 'a' ||
        req.user.uid === uid ||
        (req.user.repAdmin === true &&
          req.user.enid == (await Representative.findById(uid, { enid: 1 })).enid)
      )) {
        throw new Error('UNAUTHORIZED update representative');
      }

      if (args.enid && req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update enid of representative');
      }

      if (args.password) {
        if (req.user.uid !== uid) {
          throw new Error('UNAUTHORIZED update other peoples passwords');
        }

        args.password = await hash(args.password);
      }

      return Representative.findByIdAndUpdate(uid, { $set: args }, { new: true });
    },
  },
  'user.admin.update': {
    type: 'User',
    args: {
      uid: 'ID!',
      email: 'String',
      password: 'String'
    },
    description: {},
    resolve: async (obj, args, req) => {
      const uid = args.uid;
      delete args.uid;

      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update admin');
      }

      if (args.password) {
        args.password = await hash(args.password);
      }

      return User.findByIdAndUpdate(uid, { $set: args }, { new: true });
    }
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
    description: JSON.stringify({
      caching: { type: 'user', key: 'uid', update: true },
    }),
    resolve: async (obj, args, req) => {
      const uid = args.uid;
      delete args.uid;

      if (!(req.user.type === 'a' || (req.user.type === 's' && req.user.uid === uid))) {
        throw new Error('UNAUTHORIZED update student');
      }

      return Student.findByIdAndUpdate(uid, { $set: args }, { new: true });
    },
  },
  'user.student.uploadCV': {
    type: 'Boolean',
    args: {
      uid: 'ID!',
      file: 'String!',
    },
    description: JSON.stringify({
      caching: { type: 'userCV', key: 'uid', update: true },
    }),
    resolve: async (obj, args, req) => {
      if (!isValidObjectId(args.uid)) {
        throw new Error('Invalid uid supplied');
      }

      if (!(req.user.type === 'a' || (req.user.type === 's' && req.user.uid === args.uid))) {
        throw new Error('UNAUTHORIZED update student');
      }

      await writeFile(`./data/${args.uid}`, args.file);
      return true;
    },
  },
  'user.student.shareInfo': {
    type: 'Student',
    args: {
      uid: 'ID!',
      enid: 'ID!',
      share: 'Boolean!'
    },
    description: JSON.stringify({
      caching: { type: 'user', key: 'uid', update: true },
    }),
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || (req.user.type === 's' && req.user.uid === args.uid))) {
        throw new Error('UNAUTHORIZED update share information');
      }

      let operation;
      if (args.share) {
        operation = { $push: { share: args.enid } };
      } else {
        operation = { $pull: { share: args.enid } };
      }

      return Student.findByIdAndUpdate(args.uid, operation, { new: true });
    }
  },
  'user.delete': {
    type: 'User',
    args: {
      uid: 'ID!',
    },
    description: JSON.stringify({
      caching: { type: 'user', key: 'uid', delete: true },
    }),
    resolve: async (obj, args, req) => {
      const checkEnid = async () => {
        const user = await Representative.findById(args.uid, { enid: 1 });
        if (!user) { return false; }

        return req.user.enid == user.enid;
      }
      if (!(req.user.type === 'a' ||
        req.user.uid === args.uid ||
        (req.user.type === 'r' && req.user.repAdmin === true && await checkEnid())
      )) {
        throw new Error('UNAUTHORIZED delete user');
      }

      return User.findByIdAndDelete(args.uid);
    },
  },
  'user.deleteOfEntity': {
    type: 'Boolean',
    args: {
      enid: 'ID!',
    },
    resolve: async (obj, args, req) => {
      if (req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED delete entities');
      }

      await Representative.deleteMany({ enid: args.enid });
      return true;
    },
  },
});

if (!existsSync('./data')) {
  mkdirSync('./data');
}

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
