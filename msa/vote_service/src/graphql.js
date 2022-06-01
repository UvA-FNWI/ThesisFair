import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';
// import { parse as csvParser } from 'csv-parse';

import { rgraphql } from '../../libraries/amqpmessaging/index.js';
import { Vote } from './database.js';
// import config from './config.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

schemaComposer.Query.addNestedFields({
  votesOfStudent: {
    type: '[Pid!]',
    args: {
      uid: 'ID!',
      evid: 'ID!'
    },
    resolve: (obj, args, req) => {
      if (!(req.user.type === 'a' || (req.user.type === 's' && req.user.uid === args.uid))) {
        throw new Error('UNAUTHORIZED get this students votes');
      }

      return Vote.findOne({ evid: args.evid, uid: args.uid }).then((result) => result ? result.votes.map((v) => v.pid) : null);
    }
  },
  votesOfEntity: {
    type: '[StudentVote!]',
    args: {
      enid: 'ID!',
      evid: 'ID!'
    },
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || (req.user.type === 'r' && req.user.enid === args.enid))) {
        throw new Error('UNAUTHORIZED get this entities votes');
      }

      const votes = await Vote.find({ evid: args.evid, 'votes.enid': args.enid });
      if (!votes) { return null; }

      const res = [];
      for (const studentVote of votes) {
        for (const vote of studentVote.votes) {
          if (args.enid == vote.enid) {
            res.push({ uid: studentVote.uid, pid: vote.pid })
          }
        }
      }

      return res;
    }
  },
  votesOfProject: {
    type: '[ID!]',
    args: {
      pid: 'ID!',
      evid: 'ID!'
    },
    resolve: async (obj, args, req) => {
      if (req.user.type === 's') {
        throw new Error('UNAUTHORIZED get votes of projects');
      }

      const query = { evid: args.evid };
      if (req.user.type === 'a') {
        query['votes.pid'] = args.pid;
      } else if (req.user.type === 'r') {
        query['votes'] = { $elemMatch: { pid: args.pid, enid: req.user.enid } };
      }

      return Vote.find(query).then((result) => result.map((v) => v.uid));
    }
  },
});

schemaComposer.Mutation.addNestedFields({
  // 'project.deleteOfEntity': {
  //   type: 'Boolean',
  //   args: {
  //     enid: 'ID!',
  //   },
  //   resolve: async (obj, args, req) => {
  //     if (req.user.type !== 'a') {
  //       throw new Error('UNAUTHORIZED delete project');
  //     }

  //     await Project.deleteMany({ enid: args.enid });
  //     return true
  //   }
  // },
  // 'project.import': {
  //   type: '[Project]',
  //   args: {
  //     file: 'String!',
  //     enid: 'ID!',
  //   },
  //   resolve: (obj, args, req) => {
  //     if (req.user.type !== 'a') {
  //       throw new Error('UNAUTHORIZED import projects');
  //     }

      // return new Promise((resolve, reject) => {
      //   csvParser(args.file.trim(), { columns: true }, (err, records, info) => {
      //     if (err) { reject(err); return; }

      //     resolve(
      //       Promise.all(
      //         records.map(async (record) => {
      //           const external_id = record[config.project_external_id];
      //           const project = await Project.find({ external_id: external_id });
      //           if (project.length > 0) {
      //             return null;
      //           }

      //           // TODO: Create admin representative accounts with name and email address

      //           return Project.create({
      //             name: record[config.project_name],
      //             external_id,
      //             type: 'company',
      //           })
      //         })
      //       )
      //     );
      //   });
      // });
    // }
  // }
});

const schema = schemaComposer.buildSchema();

const executeGrahpql = (query, variableValues = {}, contextValue = {}) => graphql({ schema, source: query, variableValues, contextValue });
export default executeGrahpql;
