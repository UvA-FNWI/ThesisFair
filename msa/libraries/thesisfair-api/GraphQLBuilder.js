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
   * @param {Object} [options.cache]
   * @param {Object} [options.cache.instance] The cache instance
   * @param {String} [options.cache.key] The key which should be used for identifying resources
   * @param {Boolean} [options.cache.keys] The name of the array with which multiple documents are queried at once.
   * @param {Boolean} [options.cache.multiple] Indicate that multiple resources with request-time unkown ID's are requested
   * @param {Boolean} [options.cache.create] Indicate that the resource is beign create and the id is not present in the arguments
   * @param {Boolean} [options.cache.update] Indicate that the resource is beign updated and the cache should be updated accordingly
   * @param {Boolean} [options.cache.delete] Indicate that the resource is beign deleted and the cache should be updated accordingly
   */
  constructor(options) {
    this.type = options.type || 'query'
    this.name = options.name || ''
    this.functionPath = options.functionPath
    this.args = options.args || {}
    this.body = options.body || null
    this.executor = options.executor
    this.cache = options.cache

    if (!this.functionPath) {
      throw new Error('functionPath option is required')
    }
  }

  genVariableDefs = () => {
    let defs = ''
    for (const variable in this.args) {
      defs += '$' + variable + ':' + this.args[variable].type + ','
    }

    return defs ? `(${defs.substring(0, defs.length - 1)})` : ''
  }

  genArgs = () => {
    let args = ''
    for (const arg in this.args) {
      args += arg + ':$' + arg + ','
    }

    return args ? `(${args.substring(0, args.length - 1)})` : ''
  }

  genQuery = () => {
    const path = this.functionPath.split('.').reverse()
    let queryBody = `${path.shift()}${this.genArgs()} ${this.body === null ? '' : `{${this.body}}`}`

    for (const name of path) {
      queryBody = `${name} {${queryBody}}`
    }

    return `${this.type} ${this.name}${this.genVariableDefs()}{${queryBody}}`
  }

  genVariablesDict = () => {
    const variables = {}
    for (const variable in this.args) {
      variables[variable] = this.args[variable].value
    }

    return variables
  }

  exec = async (cache = true) => {
    const result = []
    if (this.cache && !this.cache.multiple && !this.cache.create && !this.cache.update && !this.cache.delete && cache) {
      if (this.cache.keys) {
        const keys = this.args[this.cache.keys].value

        let cachedResult
        for (let i = 0; i < keys.length; ) {
          cachedResult = this.cache.instance.get(`${this.cache.type}.${keys[i]}`)
          if (cachedResult) {
            result.push(cachedResult)
            keys.splice(i, 1)
            continue
          }

          ++i
        }

        if (keys.length === 0) {
          return result
        }
      } else {
        const cachedResult = this.cache.instance.get(`${this.cache.type}.${this.args[this.cache.key].value}`)
        if (cachedResult) {
          return cachedResult
        }
      }
    }

    let res = await this.executor(this.functionPath, this.genQuery(), this.genVariablesDict())

    for (const key of this.functionPath.split('.')) {
      res = res[key]
    }

    if (res && this.cache) {
      if (this.cache.keys || this.cache.multiple) {
        for (const doc of res) {
          const id = doc[this.cache.key]
          if (id) {
            this.cache.instance.set(`${this.cache.type}.${id}`, doc)
          }
        }

        result.push(...res)
        res = result
      } else {
        if (this.cache.delete) {
          this.cache.instance.del(`${this.cache.type}.${this.args[this.cache.key].value}`)
        } else {
          const id = res[this.cache.key]
          if (id) {
            this.cache.instance.set(`${this.cache.type}.${id}`, res)
          }
        }
      }
    }

    return res
  }
}
