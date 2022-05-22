import axios from 'axios';

const url = typeof window !== 'undefined' ? '/' : 'http://127.0.0.1:3000/';

const setApiToken = (token) => {
  apiToken = token;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('apiToken', apiToken);
  }
};

const unpackToken = (token) => {
  if (!token) { return null; }

  const split = token.split('.');
  if (split.length !== 3) {
    throw new Error(`Received invalid token. Token has ${split.length} parts, expected 3.`);
  }

  const payload = (new Buffer.from(split[1], 'base64')).toString();
  return JSON.parse(payload);
}

let apiToken = typeof localStorage !== 'undefined' ? localStorage.getItem('apiToken') : null;
export let apiTokenData = unpackToken(apiToken);
const login = async (email, password) => {
  const res = await axios.post(url + 'login',
    { email, password },
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${JSON.stringify(apiToken)}`
      },
    }
  );

  if (res.data.errors) {
    console.error(res.data.errors);
    throw res.data.errors;
  }

  setApiToken(res.data.data.apiToken);
  apiTokenData = unpackToken(apiToken);
};

const graphql = async (query, variables) => {
  const response = (await axios.post(
    url + 'graphql',
    { query, variables },
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${apiToken}`
      },
    }
  )).data;

  if (response.errors) {
    throw response;
  }

  return response.data;
}

class GraphQLBuilder {
  /**
   *
   * @param {Object} options
   * @param {String} [options.type=query] The type of the operation (query or mutation)
   * @param {String} [options.name] The name of the operation
   * @param {!String} options.functionPath The function path to the function that should be executed separated by dots.
   * @param {Object.<String, { type: String, value: * }>} [options.args] List of variable definitions and values to pass to GraphQL
   * @param {String} [options.body] The list of properties to return from the function or null if function returns a simple type
   */
  constructor(options) {
    this.type = options.type || 'query';
    this.name = options.name || '';
    this.functionPath = options.functionPath;
    this.args = options.args || {};
    this.body = options.body || null;

    if (!this.functionPath) {
      throw new Error('functionPath option is required');
    }
  }

  genVariableDefs = () => {
    let defs = '';
    for (const variable in this.args) {
      defs += '$' + variable + ':' + this.args[variable].type + ',';
    }

    return defs ? defs.substring(0, defs.length - 1) : '';
  }

  genArgs = () => {
    let args = '';
    for (const arg in this.args) {
      args += arg + ':$' + arg + ',';
    }

    return args ? args.substring(0, args.length - 1) : '';
  }

  genQuery = () => {
    const path = this.functionPath.split('.').reverse();
    let queryBody = `${path.shift()}(${this.genArgs()}) ${this.body === null ? '' : `{${this.body}}`}`;

    for (const name of path) {
      queryBody = `${name} {${queryBody}}`;
    }

    return `${this.type} ${this.name}(${this.genVariableDefs()}){${queryBody}}`;
  }

  genVariablesDict = () => {
    const variables = {};
    for (const variable in this.args) {
      variables[variable] = this.args[variable].value
    }

    return variables;
  }

  exec = () => graphql(this.genQuery(), this.genVariablesDict());
}

const genBody = (possibleFields, projection) => {
  let fields = Object.keys(projection || {});
  let whitelist = false;

  if (fields.length) {
    whitelist = !!projection[fields[0]];
    for (const val of projection) {
      if ((val && !whitelist) || (!val && whitelist)) {
        throw new Error('Mixing white and blacklist techniques');
      }
    }
  }

  if (!whitelist) { // Invert fields
    fields = [...possibleFields].filter((field) => !fields.includes(field));
  }

  return fields.join(' ');
};

const fields = { // TODO: Deep freeze this object
  UserBase: ['uid', 'firstname', 'lastname', 'email', 'phone'],
  Student: ['studentnumber', 'websites', 'studies', 'share'],
  Representative: ['enid', 'repAdmin'],
}

const bodies = {
  User: (projection) => `... on UserBase {${genBody(fields.UserBase, projection)}} ... on Student {${genBody(fields.Student, projection)}} ... on Representative {${genBody(fields.Representative, projection)}}`,
  Student: (projection) => `... on UserBase {${genBody(fields.UserBase, projection)}} ${genBody(fields.Student, projection)}`,
  Representative: (projection) => `... on UserBase {${genBody(fields.UserBase, projection)}} ${genBody(fields.Representative, projection)}`,
}

export default {
  user: {
    login: login,
    logout: () => {
      if (localStorage) {
        localStorage.clear();
        apiToken = null;
        apiTokenData = null;
      }
    },

    get: (uid, projection) =>
      new GraphQLBuilder({
        name: 'getUser',
        functionPath: 'user',
        args: 'uid: $uid',
        body: bodies.User(projection),
        args: {
          uid: { value: uid, type: 'ID!' },
        },
      }
      )
    ,

    delete: (uid, projection) =>
      new GraphQLBuilder({
        type: 'mutation',
        name: 'delUser',
        functionPath: 'user.delete',
        body: bodies.User(projection),
        args: {
          uid: { value: uid, type: 'ID!' },
        },
      }
      ),

    representative: {
      /**
       * @param {Object} representative
       * @param {String} representative.enid
       * @param {String} representative.firstname
       * @param {String} representative.lastname
       * @param {String} representative.email
       * @param {String} representative.phone
       * @param {Boolean} representative.repAdmin
       * @returns Representative
       */
      create: (representative, projection) =>
        new GraphQLBuilder({
          type: 'mutation',
          name: 'createRepresentative',
          functionPath: 'user.representative.create',
          body: bodies.Representative(projection),
          args: {
            enid: { value: representative.enid, type: 'ID!' },
            firstname: { value: representative.firstname, type: 'String' },
            lastname: { value: representative.lastname, type: 'String' },
            email: { value: representative.email, type: 'String!' },
            phone: { value: representative.phone, type: 'String' },
            repAdmin: { value: representative.repAdmin, type: 'Boolean' },
          },
        }),

      /**
       * @param {Object} representative
       * @param {String} representative.uid
       * @param {String} representative.enid
       * @param {String} representative.firstname
       * @param {String} representative.lastname
       * @param {String} representative.email
       * @param {String} representative.phone
       * @param {Boolean} representative.repAdmin
       * @param {String} representative.password
       * @returns Representative
       */
      update: (representative, projection) =>
        new GraphQLBuilder({
          type: 'mutation',
          name: 'updateRepresentative',
          functionPath: 'user.representative.update',
          body: bodies.Representative(projection),
          args: {
            uid: { value: representative.uid, type: 'ID!' },
            enid: { value: representative.enid, type: 'ID!' },
            firstname: { value: representative.firstname, type: 'String' },
            lastname: { value: representative.lastname, type: 'String' },
            email: { value: representative.email, type: 'String!' },
            phone: { value: representative.phone, type: 'String' },
            repAdmin: { value: representative.repAdmin, type: 'Boolean' },
            password: { value: representative.password, type: 'String' },
          },
        }),
    },

    student: {
      /**
       * @param {Object} student
       * @param {String} student.uid
       * @param {String} student.firstname
       * @param {String} student.lastname
       * @param {String} student.email
       * @param {String} student.phone
       * @param {[String]} student.websites
       * @returns student
       */
      update: (student, projection) =>
        new GraphQLBuilder({
          type: 'mutation',
          name: 'updateStudent',
          functionPath: 'user.student.update',
          body: bodies.Student(projection),
          args: {
            uid: { value: student.uid, type: 'ID!' },
            firstname: { value: student.firstname, type: 'String' },
            lastname: { value: student.lastname, type: 'String' },
            email: { value: student.email, type: 'String!' },
            phone: { value: student.phone, type: 'String' },
            websites: { value: student.websites, type: '[String!]' },
          },
        }),

      shareInfo: (uid, enid, share, projection) =>
      new GraphQLBuilder({
        type: 'mutation',
        name: 'updateStudentShare',
        functionPath: 'user.student.shareInfo',
        body: bodies.Student(projection),
        args: {
          uid: { value: student.uid, type: 'ID!' },
          firstname: { value: student.firstname, type: 'String' },
          lastname: { value: student.lastname, type: 'String' },
          email: { value: student.email, type: 'String!' },
          phone: { value: student.phone, type: 'String' },
          websites: { value: student.websites, type: '[String!]' },
        },
      }),
    },
  }
}
