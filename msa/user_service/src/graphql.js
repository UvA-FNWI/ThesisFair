import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

import { User, Student, Representative } from './database.js';

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
    resolve: async (obj, args, req) => {
      const user = await User.findById(args.uid);
      if (!user) {
        return null;
      }

      if (!(req.user.type === 'a' ||
        req.user.uid === args.uid ||
        (user instanceof Student && req.user.type === 'r' && user.share.includes(req.user.enid)) ||
        (user instanceof Representative && req.user.type === 'r' && req.user.repAdmin === true && req.user.enid == user.enid))) {
        throw new Error('UNAUTHORIZED to get this ' + (user instanceof Student ? 'student' : 'representative'));
      }

      return user;
    },
  },
  users: {
    type: '[User]',
    args: {
      uids: '[ID!]!',
    },
    resolve: async (obj, args, req) => {
      const users = await User.find({ _id: { $in: args.uids } });

      if (req.user.type !== 'a') {
        for (const user of users) {
          if (!(
            (user instanceof Student && req.user.type === 'r' && user.share.includes(req.user.enid)) ||
            (user instanceof Representative && req.user.type === 'r' && req.user.repAdmin === true && req.user.enid == user.enid))) {
              throw new Error('UNAUTHORIZED to get ' + (user instanceof Student ? 'student' : 'representative') + ' with uid ' + user.uid);
          }
        }
      }

      return users;
    },
  },
  'apiToken': {
    type: 'String!',
    args: {
      email: 'String!',
      password: 'String!',
    },
    resolve: async (obj, args) => {
      const user = await User.findOne({ email: args.email });
      if (!user) { throw new Error('No user with that email found.'); }

      if (!(await bcrypt.compare(args.password, user.password))) {
        throw new Error('Incorrect password');
      }

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
You can log in at https://TODO.nl/login

Your credentials are:
Email: ${args.email}
Password: ${password}
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
    resolve: async (obj, args, req) => {
      const uid = args.uid;
      delete args.uid;

      if (!(req.user.type === 'a' || (req.user.type === 's' && req.user.uid === uid))) {
        throw new Error('UNAUTHORIZED update student');
      }

      return Student.findByIdAndUpdate(uid, { $set: args }, { new: true });
    },
  },
  'user.student.shareInfo': {
    type: 'Student',
    args: {
      uid: 'ID!',
      enid: 'ID!',
      share: 'Boolean!'
    },
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

const schema = schemaComposer.buildSchema();

const execute = (query, variableValues = {}, contextValue = {}) => graphql({ schema, source: query, variableValues, contextValue });
export default execute;