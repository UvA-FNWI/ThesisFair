import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';
import jwt from 'jsonwebtoken';

import { User, Student, Representative } from './database.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.types.get('User').setResolveType((value) => {
  if (value instanceof Student) {
    return 'Student';
  } else if (value instanceof Representative) {
    return 'Representative';
  }

  console.error('Could not resolve: ', value);
  throw new Error('Could not resolve user type');
})

schemaComposer.Query.addNestedFields({
  user: {
    type: 'User',
    args: {
      uid: 'ID!',
    }, // TODO: Add permission checks
    resolve: (obj, args) => User.findById(args.uid),
  },
  'apiToken': {
    type: 'String',
    args: {
      email: 'String!',
      password: 'String!',
    },
    resolve: async (obj, args) => {
      const user = await User.findOne({ email: args.email });
      if (!user) { throw new Error('No user with that email found.'); }

      if (user.password !== args.password) {
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

      // TODO: Generate random password
      args.password = 'hi';

      // TODO: Send mail

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
        uid === req.user.uid ||
        (req.user.repAdmin === true &&
          req.user.enid == (await Representative.findById(uid, { enid: 1 })).enid)
      )) {
        throw new Error('UNAUTHORIZED update representative');
      }

      if (args.enid && req.user.type !== 'a') {
        throw new Error('UNAUTHORIZED update enid of representative');
      }

      if (args.password) { // TODO: finish
        // args.password =
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
});

const schema = schemaComposer.buildSchema();

const execute = (query, variableValues = {}, contextValue = {}) => graphql({ schema, source: query, variableValues, contextValue });
export default execute;
