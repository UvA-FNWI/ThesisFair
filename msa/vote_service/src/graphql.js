import { graphql } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { readFileSync } from 'fs';
import { parse as csvParser } from 'csv-parse';

import { rgraphql } from '../../libraries/amqpmessaging/index.js';
import { Vote } from './database.js';
import { canGetStudentVotes, canGetEntityVotes, canGetProjectVotes } from './permissions.js';
import config from './config.js';

schemaComposer.addTypeDefs(readFileSync('./src/schema.graphql').toString('utf8'));

const getUid = async (studentnumber) => {
  const res = await rgraphql('api-user', 'query getUid($studentnumber: ID!) { student(studentnumber: $studentnumber) { ... on Student { uid } } }', { studentnumber }, { user: { type: 'system' } });
  if (res.errors || !res.data) {
    console.error(res);
    throw new Error('An unkown error occured while getting the user uid');
  }

  if (!res.data.student) {
    return false;
  }

  return res.data.student.uid;
}

const shareInfo = async (uid, enid, share=true) => {
  const res = await rgraphql('api-user', 'mutation shareInfo($uid: ID!, $enid: ID!, $share: Boolean!) { user { student { shareInfo(uid: $uid, enid: $enid, share: $share) { uid } } } }', { uid, enid, share });
  if (res.errors || !res.data) {
    console.error(res);
    throw new Error('An unkown error occured while checking if the enid is valid');
  }
}

const getProjectData = async (external_pid) => {
  const res = await rgraphql('api-project', 'query getPid($external_id: ID!) { projectByExtID(external_id: $external_id) { pid enid } }', { external_id: external_pid });
  if (res.errors || !res.data) {
    console.error(res);
    throw new Error('An unkown error occured while looking up the project');
  }

  if (!res.data.projectByExtID) {
    return false;
  }

  return res.data.projectByExtID;
};

const evidExists = async (evid) => {
  const res = await rgraphql('api-event', 'query checkEVID($evid: ID!) { event(evid: $evid) { evid } }', { evid });
  if (res.errors || !res.data) {
    console.error(res);
    throw new Error('An unkown error occured while checking if the evid is valid');
  }

  if (!res.data.event) {
    return false;
  }

  return true;
};


schemaComposer.Query.addNestedFields({
  votesOfStudent: {
    type: '[Pid!]',
    args: {
      uid: 'ID!',
      evid: 'ID!'
    },
    description: JSON.stringify({
      checkPermissions: canGetStudentVotes.toString(),
    }),
    resolve: (obj, args, req) => {
      canGetStudentVotes(req, args);
      return Vote.findOne({ evid: args.evid, uid: args.uid }).then((result) => result ? result.votes.map((v) => v.pid) : null);
    }
  },
  votesOfEntity: {
    type: '[StudentVote!]',
    args: {
      enid: 'ID!',
      evid: 'ID!'
    },
    description: JSON.stringify({
      checkPermissions: canGetEntityVotes.toString(),
    }),
    resolve: async (obj, args, req) => {
      canGetEntityVotes(req, args);

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
    description: JSON.stringify({
      checkPermissions: canGetProjectVotes.toString(),
    }),
    resolve: async (obj, args, req) => {
      canGetProjectVotes(req, args);

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
  'vote.import': {
    type: '[VoteImportResult!]!',
    args: {
      file: 'String!',
      evid: 'ID!',
    },
    resolve: async (obj, args, req) => {
      if (!(req.user.type === 'a' || req.user.type === 'service')) {
        throw new Error('UNAUTHORIZED import votes');
      }

      if (!(await evidExists(args.evid))) {
        throw new Error('Event does not exist!');
      }

      return new Promise((resolve, reject) => {
        csvParser(args.file.trim(), { columns: true }, (err, records, info) => {
          if (err) { reject(err); return; }

          if (records.length === 0) {
            reject(new Error('No row provided to import'));
            return;
          }

          if (!Object.values(config.fields).every((key) => key in records[0])) {
            reject(new Error('Not all required fields supplied! Required fields are: ' + Object.values(config.fields).join(',')));
            return;
          }

          resolve(
            Promise.all(
              records.map(async (record) => {
                const studentnumber = record[config.fields.studentnumber].trim();
                const external_pid = record[config.fields.external_pid].trim();
                const enabled = record[config.fields.enabled].trim() !== '0';
                let uid, project;

                try {
                  [uid, project] = await Promise.all([
                    getUid(studentnumber),
                    getProjectData(external_pid),
                  ]);
                } catch (error) {
                  console.log(error);
                  return { error };
                }

                if (!uid) {
                  return { error: 'Student not found with given studentnumber.' };
                }

                if (!project) {
                  return { error: 'Project not found with given project_id.' };
                }

                const votes = await Vote.findOneAndUpdate({ uid: uid, evid: args.evid }, {}, { new: true, upsert: true }); // Automic find or create

                const contains = !!votes.votes.find(({ pid: votePid }) => votePid == project.pid);
                const voteItem = { pid: project.pid, enid: project.enid };
                if (enabled && !contains) {
                  await Vote.updateOne({ _id: votes._id }, { $push: { votes: [voteItem] } });
                  await shareInfo(uid, project.enid);
                } else if (!enabled && contains) {
                  await Vote.updateOne({ _id: votes._id }, { $pull: { votes: voteItem } });
                }

                return {};
              })
            )
          );
        });
      });
    }
  }
});

const schema = schemaComposer.buildSchema();

const executeGraphql = ({ query, variables = {}, context = {} }) => graphql({ schema, source: query, variableValues: variables, contextValue: context });
export default executeGraphql;
