import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

import { Student, Representative, isValidObjectId, Event } from './database.js';
import { rgraphql } from '../../libraries/amqpmessaging/index.js';

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

const getRepresentativeEnid = async (uid) => {
  const res = await rgraphql('api-user', 'query($uid: ID!) { user(uid: $uid) { ... on Representative { enid } } }', { uid: uid });
  const user = res.data.user;
  if (!user) { return null; }

  return user.enid;
}

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
  'user_service_write': {
    type: 'String',
    description: JSON.stringify({}),
    resolve: (obj, args) => 'placeholder_query',
  }
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
You can log in at https://TODO.nl/login

Your credentials are:
Email: ${args.email}
Password: ${password}
`
      })

      const representative = new Representative(args);
      await representative.validate();

      await Event.create({
        operation: 'representative.create',
        data: representative.toObject(),
      })

      return representative;
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
          req.user.enid == await getRepresentativeEnid(uid))
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

      const representative = new Representative(args);
      await representative.validate();

      await Event.create({
        operation: 'representative.update',
        data: args,
        identifier: uid,
      })

      return null;
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
    description: JSON.stringify({
      caching: { type: 'user', key: 'uid', update: true },
    }),
    resolve: async (obj, args, req) => {
      const uid = args.uid;
      delete args.uid;

      if (!(req.user.type === 'a' || (req.user.type === 's' && req.user.uid === uid))) {
        throw new Error('UNAUTHORIZED update student');
      }

      await Event.create({
        operation: 'student.update',
        data: args,
        identifier: uid,
      })

      return null;
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

      await Event.create({
        operation: 'student.uploadCV',
        data: { cv: args.file },
        identifier: args.uid,
      })

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

      await Event.create({
        operation: 'student.shareInfo',
        data: { enid: args.enid, shareState: args.share },
        identifier: args.uid,
      })

      return null;
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
        const enid = await getRepresentativeEnid(args.uid);
        if (!enid) { return false; }

        return req.user.enid == enid;
      }
      if (!(req.user.type === 'a' ||
        req.user.uid === args.uid ||
        (req.user.type === 'r' && req.user.repAdmin === true && await checkEnid())
      )) {
        throw new Error('UNAUTHORIZED delete user');
      }

      await Event.create({
        operation: 'delete',
        identifier: args.uid,
      });

      return null;
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

      await Event.create({
        operation: 'deleteOfEntity',
        data: { enid: args.enid },
      });

      return true;
    },
  },
});

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
