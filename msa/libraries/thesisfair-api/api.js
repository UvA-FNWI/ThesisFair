import axios from 'axios'
import NodeCache from 'node-cache'

import GraphQLBuilder from './GraphQLBuilder.js'
import fields from './graphqlFields.js' // assert { type: 'json' };

let tracing = false
const browser = typeof localStorage !== 'undefined'

/**
 * Enable tracing for *ALL* instances of the API
 */
export const enableTrace = () => {
  if (tracing) {
    console.error('Tried to enable tracing twice!')
    return
  }
  tracing = true

  axios.interceptors.request.use(config => {
    config.startTime = Date.now()

    return config
  })

  axios.interceptors.response.use(response => {
    response.config.duration = Date.now() - response.config.startTime
    return response
  })
}

const getApiToken = () => {
  if (browser && document.cookie) {
    const cookies = document.cookie.split(';').map(cookie => cookie.split('='))
    const token = cookies.find(cookie => cookie[0].trim() === 'apiToken')

    if (token) {
      token.shift() // Remove name
      const apiToken = token.join('=') // Join the rest in case it has '='
      localStorage.setItem('apiToken', apiToken)
      document.cookie = 'apiToken=;max-age=0; Path=/;' // Clear cookies

      return apiToken
    }
  }

  return localStorage.getItem('apiToken')
}

const unpackToken = token => {
  if (!token) {
    return null
  }

  const split = token.split('.')
  if (split.length !== 3) {
    throw new Error(`Received invalid token. Token has ${split.length} parts, expected 3.`)
  }

  const payload = browser ? atob(split[1]) : new Buffer.from(split[1], 'base64').toString()
  return JSON.parse(payload)
}

const genBody = (possibleFields, projection) => {
  possibleFields = possibleFields.filter(field => !field.includes(':'))

  let fields = Object.keys(projection || {})
  let whitelist = false

  if (fields.length) {
    whitelist = !!projection[fields[0]]
    for (const val in projection) {
      if ((projection[val] && !whitelist) || (!projection[val] && whitelist)) {
        throw new Error('Mixing white and blacklist techniques')
      }
    }
  }

  if (!whitelist) {
    // Invert fields
    fields = [...possibleFields].filter(field => !fields.includes(field))
  }

  const structuredOutput = {
    $: fields.filter(v => !v.includes('.') && possibleFields.includes(v)),
  }
  for (const field of fields.filter(v => v.includes('.'))) {
    const path = field.split('.')
    const leaf = path.pop()

    let cur = structuredOutput
    for (const parent of path) {
      if (!(parent in cur)) {
        cur[parent] = { $: [] }
      }

      cur = cur[parent]
    }
    cur['$'].push(leaf)
  }

  /**
   * A recursive function to generate the requesting items of GraphQL query from a structured output dictionary.
   * @param {Dict} structuredOutput A dictionary containing the query items. { '$': [<root level items>], object: { '$': [<Nested items>], child: { '$': [<nested nested items>] } } }
   * @returns GraphQL query items.
   */
  const genString = structuredOutput => {
    let res = ''
    for (const field in structuredOutput) {
      if (field === '$') {
        res += structuredOutput[field].join(' ')
        continue
      }

      res += ` ${field} {${genString(structuredOutput[field])}}`
    }

    return res
  }

  return genString(structuredOutput)
}

function genBodyWrapped(fields, projection) {
  const ifaceMap = new Map()
  const ownFields = []

  for (const field of fields) {
    if (field.includes(':')) {
      const [iface, name] = field.split(':')
      if (!ifaceMap.get(iface)) {
        ifaceMap.set(iface, [])
      }

      ifaceMap.get(iface).push(name)
    } else {
      ownFields.push(field)
    }
  }

  const ifaceBodies = new Map(
    [...ifaceMap.entries()].map(([iface, ifaceFields]) => [iface, genBody(ifaceFields, projection)])
  )
  const ownBody = genBody(ownFields, projection)

  return (
    [...ifaceBodies.entries()].map(([iface, body]) => (body ? `... on ${iface} {${body}}` : '')).join(' ') +
    ' ' +
    ownBody
  )
}

const bodies = Object.fromEntries(
  Object.entries(fields).map(([type, fields]) => [type, projection => genBodyWrapped(fields, projection)])
)

export default url => {
  url ||= typeof window !== 'undefined' ? '/' : 'http://172.16.239.130:3000/'
  let trace = []
  let caching = false
  let cache
  let tokenChangeCallback = () => {}

  let apiToken = browser ? getApiToken() : null
  let apiTokenData = unpackToken(apiToken) || null
  let apiTokenDataOverride = browser ? JSON.parse(localStorage.getItem('apiTokenOverride')) : null

  const requestPasswordReset = async email => {
    const res = await axios.post(
      url + 'requestPasswordReset',
      { email },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    )

    if (res.data.errors) {
      console.error(res.data.errors)
      throw res.data.errors
    }

    if (tracing) {
      trace.push({
        fn: 'user.requestPasswordReset',
        startTime: res.config.startTime,
        duration: res.config.duration,
      })
    }

    return res.data
  }

  const resetPassword = async (email, resetCode, password) => {
    const res = await axios.post(
      url + 'resetPassword',
      { email, resetCode, password },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    )

    if (res.data.errors) {
      console.error(res.data.errors)
      throw res.data.errors
    }

    if (tracing) {
      trace.push({
        fn: 'user.resetPassword',
        startTime: res.config.startTime,
        duration: res.config.duration,
      })
    }

    return res.data
  }

  const login = async (email, password) => {
    const res = await axios.post(
      url + 'login',
      { email, password },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    )

    if (res.data.errors) {
      console.error(res.data.errors)
      throw res.data.errors
    }

    if (tracing) {
      trace.push({
        fn: 'user.login',
        startTime: res.config.startTime,
        duration: res.config.duration,
      })
    }

    apiToken = res.data
    if (browser) {
      localStorage.setItem('apiToken', apiToken)
    }
    apiTokenData = unpackToken(apiToken)
    tokenChangeCallback(apiTokenData)
  }

  const logout = () => {
    if (localStorage) {
      localStorage.clear()
      apiToken = null
      apiTokenData = null
      tokenChangeCallback()
    }
  }

  const getMarketplace = async () => {
    const response = await axios.post(
      url + 'marketplace',
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/JSON',
        },
      }
    )

    if (response.data.errors) {
      console.error(response.data.errors)
      throw response.data.errors
    }

    return response.data
  }

  const graphql = async (functionPath, query, variables) => {
    let response
    try {
      response = await axios.post(
        url + 'graphql',
        { query, variables },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${apiToken}`,
          },
        }
      )
    } catch (error) {
      if (!error.response || !error.response.status) {
        throw error
      }

      if (error.response.status === 401) {
        if (!apiTokenData) {
          throw new Error('APItoken expired and already logged out')
        }

        if (Date.now() > apiTokenData.exp) {
          logout()
          throw new Error('APItoken expired')
        }

        throw new Error('APItoken does not give rights to access this resource')
      } else if (error.response.status === 413) {
        throw new Error('Payload too big')
      }

      throw error.response.data
    }

    if (tracing) {
      trace.push({
        fn: functionPath,
        startTime: response.config.startTime,
        duration: response.config.duration,
      })
    }

    const data = response.data
    if (data.errors) {
      throw data
    }

    return data.data
  }

  const genGraphQLBuilder = options => new GraphQLBuilder({ ...options, executor: graphql })

  return {
    clearTrace: () => {
      trace = []
    },
    getTrace: () => trace,
    enableCaching: ttl => {
      if (caching) {
        console.error('Tried to enable caching twice!')
        return
      }
      caching = true

      cache = new NodeCache({
        deleteOnExpire: true,
        checkperiod: ttl + 1,
        stdTTL: ttl,
        useClones: false,
      })
    },
    api: {
      getApiTokenData: () => apiTokenDataOverride || apiTokenData,
      overrideApiTokenData: newData => {
        if (browser) {
          localStorage.setItem('apiTokenOverride', JSON.stringify(newData))
        }
        apiTokenDataOverride = newData
        tokenChangeCallback(apiTokenDataOverride)
      },
      apiTokenOverriden: () => !!apiTokenDataOverride,
      setTokenChangeCallback: cb => {
        tokenChangeCallback = cb
      },
      user: {
        login: login,
        logout: logout,
        requestPasswordReset: requestPasswordReset,
        resetPassword: resetPassword,

        get: (uid, projection) =>
          genGraphQLBuilder({
            name: 'getUser',
            functionPath: 'user',
            body: bodies.User(projection),
            args: {
              uid: { value: uid, type: 'ID!' },
            },
            cache: caching ? { instance: cache, type: 'user', key: 'uid' } : false,
          }),

        getMultiple: (uids, projection) =>
          genGraphQLBuilder({
            name: 'getUsers',
            functionPath: 'users',
            body: bodies.User(projection),
            args: {
              uids: { value: uids, type: '[ID!]!' },
            },
            cache: caching ? { instance: cache, type: 'user', key: 'uid', keys: 'uids' } : false,
          }),

        getOfEntity: (enid, projection) =>
          genGraphQLBuilder({
            name: 'getUsersOfEntity',
            functionPath: 'usersOfEntity',
            body: bodies.User(projection),
            args: {
              enid: { value: enid, type: 'ID!' },
            },
          }),

        /**
         *
         * @typedef {'student'|'representative'|'admin'} getAllUsersFilter
         * @param {getAllUsersFilter} filter
         * @param {*} projection
         * @returns
         */
        getAll: (filter, projection) =>
          genGraphQLBuilder({
            name: 'getAllUsers',
            functionPath: 'usersAll',
            body: bodies.User(projection),
            args: {
              filter: { value: filter, type: 'String' },
            },
          }),

        delete: (uid, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'delUser',
            functionPath: 'user.delete',
            body: bodies.User(projection),
            args: {
              uid: { value: uid, type: 'ID!' },
            },
            cache: caching ? { instance: cache, type: 'user', key: 'uid', delete: true } : false,
          }),

        ssoLogin: (student, external_id, email, firstname, lastname) => {
          if (process.env.NODE_ENV === 'production') {
            throw new Error(
              'This route is only for testing the proper implementation of the permissions and should NEVER succeed.'
            )
          }

          return genGraphQLBuilder({
            name: 'testssoLogin',
            functionPath: 'ssoLogin',
            args: {
              student: { value: student, type: 'Boolean!' },
              external_id: { value: external_id, type: 'ID!' },
              email: { value: email, type: 'String!' },
              firstname: { value: firstname, type: 'String' },
              lastname: { value: lastname, type: 'String' },
            },
          })
        },

        admin: {
          update: (admin, projection) =>
            genGraphQLBuilder({
              type: 'mutation',
              name: 'updateAdministrator',
              functionPath: 'user.admin.update',
              body: bodies.User(projection),
              args: {
                uid: { value: admin.uid, type: 'ID!' },
                email: { value: admin.email, type: 'String' },
              },
              cache: caching ? { instance: cache, type: 'user', key: 'uid', update: true } : false,
            }),
        },

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
            genGraphQLBuilder({
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
              cache: caching ? { instance: cache, type: 'user', key: 'uid', create: true } : false,
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
            genGraphQLBuilder({
              type: 'mutation',
              name: 'updateRepresentative',
              functionPath: 'user.representative.update',
              body: bodies.Representative(projection),
              args: {
                uid: { value: representative.uid, type: 'ID!' },
                enid: { value: representative.enid, type: 'ID' },
                firstname: { value: representative.firstname, type: 'String' },
                lastname: { value: representative.lastname, type: 'String' },
                email: { value: representative.email, type: 'String' },
                phone: { value: representative.phone, type: 'String' },
                repAdmin: { value: representative.repAdmin, type: 'Boolean' },
                password: { value: representative.password, type: 'String' },
              },
              cache: caching ? { instance: cache, type: 'user', key: 'uid', update: true } : false,
            }),
          import: file =>
            genGraphQLBuilder({
              type: 'mutation',
              name: 'importRepresentatives',
              functionPath: 'user.representative.import',
              args: {
                file: { value: file, type: 'String!' },
              },
            }),
        },

        student: {
          getCV: (uid, check = false) =>
            genGraphQLBuilder({
              name: 'getCVStudent',
              functionPath: 'cv',
              args: {
                uid: { value: uid, type: 'ID!' },
                check: { value: check, type: 'Boolean' },
              },
              cache: caching ? { instance: cache, type: 'userCV', key: 'uid' } : false,
            }),
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
            genGraphQLBuilder({
              type: 'mutation',
              name: 'updateStudent',
              functionPath: 'user.student.update',
              body: bodies.Student(projection),
              args: {
                uid: { value: student.uid, type: 'ID!' },
                firstname: { value: student.firstname, type: 'String' },
                lastname: { value: student.lastname, type: 'String' },
                email: { value: student.email, type: 'String' },
                phone: { value: student.phone, type: 'String' },
                websites: { value: student.websites, type: '[String!]' },
              },
              cache: caching ? { instance: cache, type: 'user', key: 'uid', update: true } : false,
            }),
          uploadCV: (uid, file) =>
            genGraphQLBuilder({
              type: 'mutation',
              name: 'uploadCVStudent',
              functionPath: 'user.student.uploadCV',
              args: {
                uid: { value: uid, type: 'ID!' },
                file: { value: file, type: 'String!' },
              },
              cache: caching ? { instance: cache, type: 'userCV', key: 'uid', update: true } : false,
            }),
          shareInfo: (uid, enid, share, projection) =>
            genGraphQLBuilder({
              type: 'mutation',
              name: 'updateStudentShare',
              functionPath: 'user.student.shareInfo',
              body: bodies.Student(projection),
              args: {
                uid: { value: uid, type: 'ID!' },
                enid: { value: enid, type: 'ID!' },
                share: { value: share, type: 'Boolean!' },
              },
              cache: caching ? { instance: cache, type: 'user', key: 'uid', update: true } : false,
            }),
          getWhoManuallyShared: (enid, projection) =>
            genGraphQLBuilder({
              name: 'getStudentsWhoManuallyShared',
              functionPath: 'studentsWhoManuallyShared',
              body: bodies.Student(projection),
              args: {
                enid: { value: enid, type: 'ID!' },
              },
            }),
        },
      },
      entity: {
        get: (enid, projection) =>
          genGraphQLBuilder({
            name: 'getEntity',
            functionPath: 'entity',
            body: bodies.Entity(projection),
            args: {
              enid: { value: enid, type: 'ID!' },
            },
            cache: caching ? { instance: cache, type: 'entity', key: 'enid' } : false,
          }),
        getFairs: enid =>
          genGraphQLBuilder({
            name: 'getFairs',
            functionPath: 'fairs',
            args: {
              enid: { value: enid, type: 'ID!' },
            },
          }),
        getPaymentLink: (enid, evid) =>
          genGraphQLBuilder({
            name: 'getPaymentLink',
            functionPath: 'paymentLink',
            args: {
              enid: { value: enid, type: 'ID!' },
              evid: { value: evid, type: 'ID!' },
            },
          }),
        getAll: projection =>
          genGraphQLBuilder({
            name: 'getAllEntity',
            functionPath: 'entitiesAll',
            body: bodies.Entity(projection),
            cache: caching ? { instance: cache, type: 'entity', key: 'enid', multiple: true } : false,
          }),
        getMultiple: (enids, projection) =>
          genGraphQLBuilder({
            name: 'getEntities',
            functionPath: 'entities',
            body: bodies.Entity(projection),
            args: {
              enids: { value: enids, type: '[ID!]!' },
            },
            cache: caching ? { instance: cache, type: 'entity', key: 'enid', keys: 'enids' } : false,
          }),

        create: (entity, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'createEntity',
            functionPath: 'entity.create',
            body: bodies.Entity(projection),
            args: {
              name: { value: entity.name, type: 'String!' },
              description: { value: entity.description, type: 'String' },
              type: { value: entity.type, type: 'String!' },
              contact: {
                value: entity.contact,
                type: '[EntityContactInfoIn!]',
              },
              external_id: { value: entity.external_id, type: 'String' },
              representatives: { value: entity.representatives, type: 'Int' },
              location: { value: entity.location, type: 'String' },
            },
            cache: caching ? { instance: cache, type: 'entity', key: 'enid', create: true } : false,
          }),
        update: (entity, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'updateEntity',
            functionPath: 'entity.update',
            body: bodies.Entity(projection),
            args: {
              enid: { value: entity.enid, type: 'ID!' },
              name: { value: entity.name, type: 'String' },
              description: { value: entity.description, type: 'String' },
              type: { value: entity.type, type: 'String' },
              contact: {
                value: entity.contact,
                type: '[EntityContactInfoIn!]',
              },
              external_id: { value: entity.external_id, type: 'String' },
              representatives: { value: entity.representatives, type: 'Int' },
              location: { value: entity.location, type: 'String' },
            },
            cache: caching ? { instance: cache, type: 'entity', key: 'enid', update: true } : false,
          }),
        delete: (enid, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'deleteEntity',
            functionPath: 'entity.delete',
            body: bodies.Entity(projection),
            args: {
              enid: { value: enid, type: 'ID!' },
            },
            cache: caching ? { instance: cache, type: 'entity', key: 'enid', delete: true } : false,
          }),
        acceptPayment: (enid, evid) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'acceptPayment',
            functionPath: 'entity.acceptPayment',
            args: {
              enid: { value: enid, type: 'ID!' },
              evid: { value: evid, type: 'ID!' },
            },
          }),
        requestChanges: (enid, pid) =>
          genGraphQLBuilder({
            name: 'requestChanges',
            functionPath: 'entity.requestChanges',
            args: {
              enid: { value: enid, type: 'ID!' },
              pid: { value: pid, type: 'ID!' },
            },
          }),
        requestInvoice: (enid, evid) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'requestInvoice',
            functionPath: 'entity.requestInvoice',
            args: {
              enid: { value: enid, type: 'ID!' },
              evid: { value: evid, type: 'ID!' },
            },
          }),
        import: (entities, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'importEntity',
            functionPath: 'entity.import',
            body: bodies.EntityImportResult(projection),
            args: {
              entities: { value: entities, type: '[EntityImport!]!' },
            },
          }),
      },
      event: {
        get: (evid, projection) =>
          genGraphQLBuilder({
            name: 'getEvent',
            functionPath: 'event',
            body: bodies.Event(projection),
            args: {
              evid: { value: evid, type: 'ID!' },
            },
            cache: caching ? { instance: cache, type: 'event', key: 'evid' } : false,
          }),
        getImage: (evid, type) =>
          genGraphQLBuilder({
            name: 'getEventImage',
            functionPath: 'eventImage',
            args: {
              evid: { value: evid, type: 'ID!' },
              type: { value: type, type: 'String!' },
            },
          }),
        getOfEntity: (enid, projection) =>
          genGraphQLBuilder({
            name: 'getEventsOfEntity',
            functionPath: 'eventsOfEntity',
            body: bodies.Event(projection),
            args: {
              enid: { value: enid, type: 'ID!' },
            },
          }),
        getActive: projection =>
          genGraphQLBuilder({
            name: 'getActiveEvents',
            functionPath: 'active',
            body: bodies.Event(projection),
            args: {},
            cache: caching ? { instance: cache, type: 'event', key: 'evid', multiple: true } : false,
          }),
        getAll: projection =>
          genGraphQLBuilder({
            name: 'getAllEvents',
            functionPath: 'events',
            body: bodies.Event(projection),
            args: {},
            cache: caching ? { instance: cache, type: 'event', key: 'evid', multiple: true } : false,
          }),
        create: (event, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'createEvent',
            functionPath: 'event.create',
            body: bodies.Event(projection),
            args: {
              enabled: { value: event.enabled, type: 'Boolean' },
              name: { value: event.name, type: 'String!' },
              description: { value: event.description, type: 'String' },
              start: { value: event.start, type: 'Date' },
              end: { value: event.end, type: 'Date' },
              degrees: { value: event.degrees, type: '[Degree]' },
              location: { value: event.location, type: 'String' },
              studentSubmitDeadline: { value: event.studentSubmitDeadline, type: 'Date' },
              entities: { value: event.entities, type: '[ID!]' },
              external_id: { value: event.external_id, type: 'String' },
              isMarketplace: { value: event.isMarketplace, type: 'Boolean' },
            },
            cache: caching ? { instance: cache, type: 'event', key: 'evid', create: true } : false,
          }),
        update: (event, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'updateEvent',
            functionPath: 'event.update',
            body: bodies.Event(projection),
            args: {
              evid: { value: event.evid, type: 'ID!' },
              enabled: { value: event.enabled, type: 'Boolean' },
              name: { value: event.name, type: 'String!' },
              description: { value: event.description, type: 'String' },
              start: { value: event.start, type: 'Date' },
              end: { value: event.end, type: 'Date' },
              degrees: { value: event.degrees, type: '[Degree]' },
              location: { value: event.location, type: 'String' },
              studentSubmitDeadline: { value: event.studentSubmitDeadline, type: 'Date' },
              entities: { value: event.entities, type: '[ID!]' },
              external_id: { value: event.external_id, type: 'String' },
              isMarketplace: { value: event.isMarketplace, type: 'Boolean' },
            },
            cache: caching ? { instance: cache, type: 'event', key: 'evid', update: true } : false,
          }),
        updateImage: (evid, type, image) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'updateEventImage',
            functionPath: 'event.updateImage',
            args: {
              evid: { value: evid, type: 'ID!' },
              type: { value: type, type: 'String!' },
              image: { value: image, type: 'String!' },
            },
          }),
        delete: (evid, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'deleteEvent',
            functionPath: 'event.delete',
            body: bodies.Event(projection),
            args: {
              evid: { value: evid, type: 'ID!' },
            },
            cache: caching ? { instance: cache, type: 'event', key: 'evid', delete: true } : false,
          }),
        import: (events, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'importEvents',
            functionPath: 'event.import',
            body: bodies.EventImportResult(projection),
            args: {
              events: { value: events, type: '[EventImport!]!' },
            },
          }),
        entity: {
          add: (evid, enid, projection) =>
            genGraphQLBuilder({
              type: 'mutation',
              name: 'addEntityToEvent',
              functionPath: 'event.entity.add',
              body: bodies.Event(projection),
              args: {
                evid: { value: evid, type: 'ID!' },
                enid: { value: enid, type: 'ID!' },
              },
              cache: caching ? { instance: cache, type: 'event', key: 'evid', update: true } : false,
            }),
          del: (evid, enid, projection) =>
            genGraphQLBuilder({
              type: 'mutation',
              name: 'delEntityToEvent',
              functionPath: 'event.entity.del',
              body: bodies.Event(projection),
              args: {
                evid: { value: evid, type: 'ID!' },
                enid: { value: enid, type: 'ID!' },
              },
              cache: caching ? { instance: cache, type: 'event', key: 'evid', update: true } : false,
            }),
        },
      },
      project: {
        marketplace: getMarketplace,
        getCSV: () =>
          genGraphQLBuilder({
            name: 'getCSVprojects',
            functionPath: 'csv',
            args: {},
            cache: caching ? { instance: cache, type: 'projectCSV', key: '' } : false,
          }),
        tags: projection =>
          genGraphQLBuilder({
            name: 'getAllTags',
            functionPath: 'tags',
            // body: bodies.Project(projection),
          }),
        get: (pid, projection) =>
          genGraphQLBuilder({
            name: 'getProject',
            functionPath: 'project',
            body: bodies.Project(projection),
            args: {
              pid: { value: pid, type: 'ID!' },
            },
            cache: caching ? { instance: cache, type: 'project', key: 'pid' } : false,
          }),
        getMultiple: (pids, projection) =>
          genGraphQLBuilder({
            name: 'getProjects',
            functionPath: 'projects',
            body: bodies.Project(projection),
            args: {
              pids: { value: pids, type: '[ID!]!' },
            },
            cache: caching ? { instance: cache, type: 'project', key: 'pid', keys: 'pids' } : false,
          }),
        getOfEntity: (evid, enid, projection) =>
          genGraphQLBuilder({
            name: 'getProjectsOfEntity',
            functionPath: 'projectsOfEntity',
            body: bodies.Project(projection),
            args: {
              evid: { value: evid, type: 'ID' },
              enid: { value: enid, type: 'ID!' },
            },
            cache: caching ? { instance: cache, type: 'project', key: 'pid', multiple: true } : false,
          }),
        getOfEvent: (evid, projection) =>
          genGraphQLBuilder({
            name: 'getProjectsOfEvent',
            functionPath: 'projectsOfEvent',
            body: bodies.Project(projection),
            args: {
              evid: { value: evid, type: 'ID!' },
            },
            cache: caching ? { instance: cache, type: 'project', key: 'pid', multiple: true } : false,
          }),
        getApprovedOfEvent: (evid, projection) =>
          genGraphQLBuilder({
            name: 'getApprovedProjectsOfEvent',
            functionPath: 'approvedProjectsOfEvent',
            body: bodies.Project(projection),
            args: {
              evid: { value: evid, type: 'ID!' },
            },
            cache: caching ? { instance: cache, type: 'project', key: 'pid', multiple: true } : false,
          }),
        create: (project, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'createProject',
            functionPath: 'project.create',
            body: bodies.Project(projection),
            args: {
              enid: { value: project.enid, type: 'ID!' },
              evid: { value: project.evid, type: 'ID' },
              evids: { value: project.evids, type: '[ID]' },
              name: { value: project.name, type: 'String!' },
              description: { value: project.description, type: 'String' },
              degrees: { value: project.degrees, type: '[Degree]' },
              tags: { value: project.tags, type: '[String]' },
              attendance: { value: project.attendance, type: 'Attendance' },
              environment: { value: project.environment, type: 'String' },
              expectations: { value: project.expectations, type: 'String' },
              email: { value: project.email, type: 'String' },
              numberOfStudents: { value: project.numberOfStudents, type: 'Int' },
              datanoseLink: { value: project.datanoseLink, type: 'String' },
              external_id: { value: project.external_id, type: 'String' },
            },
            cache: caching ? { instance: cache, type: 'project', key: 'pid', create: true } : false,
          }),
        update: (project, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'updateProject',
            functionPath: 'project.update',
            body: bodies.Project(projection),
            args: {
              pid: { value: project.pid, type: 'ID!' },
              enid: { value: project.enid, type: 'ID' },
              evid: { value: project.evid, type: 'ID' },
              evids: { value: project.evids, type: '[ID]' },
              name: { value: project.name, type: 'String' },
              description: { value: project.description, type: 'String' },
              degrees: { value: project.degrees, type: '[Degree]' },
              tags: { value: project.tags, type: '[String]' },
              attendance: { value: project.attendance, type: 'Attendance' },
              environment: { value: project.environment, type: 'String' },
              expectations: { value: project.expectations, type: 'String' },
              email: { value: project.email, type: 'String' },
              numberOfStudents: { value: project.numberOfStudents, type: 'Int' },
              datanoseLink: { value: project.datanoseLink, type: 'String' },
            },
            cache: caching ? { instance: cache, type: 'project', key: 'pid', update: true } : false,
          }),
        comment: (pid, comment, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'leaveNewComment',
            functionPath: 'project.comment',
            body: bodies.Project(projection),
            args: {
              pid: { value: pid, type: 'ID!' },
              comment: { value: comment, type: 'String!' },
            },
          }),
        setApproval: (pid, approval, degree, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'setProjectApproval',
            functionPath: 'project.approval',
            body: bodies.Project(projection),
            args: {
              pid: { value: pid, type: 'ID!' },
              approval: { value: approval, type: 'ApprovalStatus!' },
              degree: { value: degree, type: 'Degree' },
            },
          }),
        delete: (pid, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'deleteProject',
            functionPath: 'project.delete',
            body: bodies.Project(projection),
            args: {
              pid: { value: pid, type: 'ID!' },
            },
            cache: caching ? { instance: cache, type: 'project', key: 'pid', delete: true } : false,
          }),
        deleteOfEntity: enid =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'deleteProjectOfEntity',
            functionPath: 'project.deleteOfEntity',
            args: {
              enid: { value: enid, type: 'ID!' },
            },
          }),
        import: (projects, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'importProject',
            functionPath: 'project.import',
            body: bodies.ProjectImportResult(projection),
            args: {
              projects: { value: projects, type: '[ProjectImport!]!' },
            },
            cache: caching ? { instance: cache, type: 'project', key: 'pid', multiple: true } : false,
          }),
      },
      votes: {
        getOfStudent: uid =>
          genGraphQLBuilder({
            name: 'getVotesOfStudent',
            functionPath: 'votesOfStudent',
            args: {
              uid: { value: uid, type: 'ID!' },
            },
          }),
        getOfEntity: (enid, evid, projection) =>
          genGraphQLBuilder({
            name: 'getVotesOfEntity',
            functionPath: 'votesOfEntity',
            body: bodies.StudentVote(projection),
            args: {
              enid: { value: enid, type: 'ID!' },
              evid: { value: evid, type: 'ID' },
            },
          }),
        getOfProject: (pid, evid) =>
          genGraphQLBuilder({
            name: 'getVotesOfProject',
            functionPath: 'votesOfProject',
            args: {
              pid: { value: pid, type: 'ID!' },
              evid: { value: evid, type: 'ID' },
            },
          }),
        import: (votes, evid, projection) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'importVotes',
            functionPath: 'vote.import',
            body: bodies.VoteImportResult(projection),
            args: {
              votes: { value: votes, type: '[VoteImport!]!' },
              evid: { value: evid, type: 'ID!' },
            },
          }),
        add: (uid, pid) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'voteProject',
            functionPath: 'vote.add',
            args: {
              uid: { value: uid, type: 'ID!' },
              pid: { value: pid, type: 'ID!' },
            },
          }),
        remove: (uid, pid) =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'unvoteProject',
            functionPath: 'vote.remove',
            args: {
              uid: { value: uid, type: 'ID!' },
              pid: { value: pid, type: 'ID!' },
            },
          }),
        hide: pid =>
          genGraphQLBuilder({
            type: 'mutation',
            name: 'hideProject',
            functionPath: 'voteHide',
            args: {
              pid: { value: pid, type: 'ID!' },
            },
          }),
      },
    },
  }
}
