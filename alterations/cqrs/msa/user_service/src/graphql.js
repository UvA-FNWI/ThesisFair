import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync, constants } from 'fs';
import { readFile, access } from 'fs/promises';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { User, Student, Representative, isValidObjectId } from './database.js';
import { canGetUser, canGetUsers } from './permissions.js';

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
  cv: {
    type: 'String',
    args: {
      uid: 'ID!',
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

      return readFile(file).then((content) => content.toString());
    }
  },
  'apiToken': {
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

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
