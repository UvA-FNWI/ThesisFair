const normalize = (objects, hide = []) => {
  // hide ||= [];

  // The logical OR above does not work in node 12, so we need to do this:
  hide || (hide = [])

  const normalizeValue = value => {
    if (value instanceof Object) {
      // The check below needs to hapen dirty because every ObjectId is from another mongoose library instance.
      if (value.constructor.name === 'ObjectId') {
        return value.toString()
      } else if (value instanceof Date) {
        return value.toISOString()
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          return value
        }

        for (const i in value) {
          value[i] = normalizeValue(value[i])
        }
      }
    }

    return value
  }

  const normalizeDocument = object => {
    delete object.id
    delete object._id
    delete object.__v
    delete object.__t

    for (const key of hide) {
      delete object[key]
    }

    for (const key in object) {
      object[key] = normalizeValue(object[key])
    }

    return object
  }

  return objects.map(object =>
    object.toObject({
      virtuals: true,
      transform: (_, doc) => normalizeDocument(doc),
    })
  )
}

export class MongoDBProvisioner {
  constructor(configs) {
    this.configs = configs

    this.db = null
    this.models = null
    this.libraries = null
  }

  /**
   * Import libraries once
   */
  importLibraries = async () => {
    let promises = []
    for (const name in this.configs) {
      promises.push(this.configs[name].library)
    }
    promises = await Promise.all(promises)

    const libs = {}
    let i = 0
    for (const name in this.configs) {
      libs[name] = promises[i]
      i += 1
    }

    return libs
  }

  init = async () => {
    this.libraries = await this.importLibraries()

    this.models = {}
    const promises = []
    for (const name in this.configs) {
      const config = this.configs[name]
      promises.push(this.libraries[name].connect(config.uri))

      for (const object of config.objects || [config.object]) {
        if (object in this.models) {
          throw new Error(`Duplicate model name '${object}'! Could not merge into one models object.`)
        }

        this.models[object] = this.libraries[name][object]
      }
    }

    await Promise.all(promises)
  }

  provision = async () => {
    if (!this.libraries) {
      throw new Error('init function needs to be called before main')
    }

    this.db = {}
    for (const name in this.configs) {
      const config = this.configs[name]

      const lib = this.libraries[name]

      await lib[config.object].deleteMany()
      this.db[name] = normalize(
        await lib[config.object].insertMany(await config.get(this.db, this.models)),
        config.hide
      )
    }
  }

  disconnect = async () => {
    const promises = []
    for (const name in this.configs) {
      promises.push(this.libraries[name].disconnect())
    }

    await Promise.all(promises)
  }
}
