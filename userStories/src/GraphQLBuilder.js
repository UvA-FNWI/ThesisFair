export default class GraphQLBuilder {
  /**
   *
   * @param {Object} options
   * @param {String} [options.type=query] The type of the operation (query or mutation)
   * @param {String} [options.name] The name of the operation
   * @param {!String} options.functionPath The function path to the function that should be executed separated by dots.
   * @param {Object.<String, { type: String, value: * }>} [options.args] List of variable definitions and values to pass to GraphQL
   * @param {String} [options.body] The list of properties to return from the function or null if function returns a simple type
   * @param {Function} options.executor The function that will execute the query. Will receive be called with functionPath, graphQL query, graphQL variables
   */
  constructor(options) {
    this.type = options.type || 'query';
    this.name = options.name || '';
    this.functionPath = options.functionPath;
    this.args = options.args || {};
    this.body = options.body || null;
    this.executor = options.executor

    if (!this.functionPath) {
      throw new Error('functionPath option is required');
    }
  }

  genVariableDefs = () => {
    let defs = '';
    for (const variable in this.args) {
      defs += '$' + variable + ':' + this.args[variable].type + ',';
    }

    return defs ? `(${defs.substring(0, defs.length - 1)})` : '';
  }

  genArgs = () => {
    let args = '';
    for (const arg in this.args) {
      args += arg + ':$' + arg + ',';
    }

    return args ? `(${args.substring(0, args.length - 1)})` : '';
  }

  genQuery = () => {
    const path = this.functionPath.split('.').reverse();
    let queryBody = `${path.shift()}${this.genArgs()} ${this.body === null ? '' : `{${this.body}}`}`;

    for (const name of path) {
      queryBody = `${name} {${queryBody}}`;
    }

    return `${this.type} ${this.name}${this.genVariableDefs()}{${queryBody}}`;
  }

  genVariablesDict = () => {
    const variables = {};
    for (const variable in this.args) {
      variables[variable] = this.args[variable].value
    }

    return variables;
  }

  exec = async () => {
    let res = await this.executor(this.functionPath, this.genQuery(), this.genVariablesDict());

    for (const key of this.functionPath.split('.')) {
      res = res[key];
    }

    return res;
  }
}
