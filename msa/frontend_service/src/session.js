import api from './api'

const browser = typeof localStorage !== 'undefined'

export const getSessionData = item => {
  if (browser && document.cookie) {
    const cookies = document.cookie.split(';').map(cookie => cookie.split('='))
    const token = cookies.find(cookie => cookie[0].trim() === item)

    if (token) {
      token.shift() // Remove name
      const value = token.join('=') // Join the rest in case it has '='
      localStorage.setItem(item, value)
      document.cookie = `${item}=;max-age=0; Path=/;` // Clear cookies

      return value
    }
  }

  return localStorage.getItem(item)
}

export const setSessionData = (item, value) => localStorage.setItem(item, value)

export const getEnid = () => {
  let enid = getSessionData('enid')

  if (!enid || enid === 'NO ENTITIES FOR USER' || api.apiTokenOverriden()) {
    const enids = api.getApiTokenData()?.enids
    enid = enids && enids.length > 0 ? enids[0] : 'NO ENTITIES FOR USER'
    setSessionData('enid', enid)
  }

  return enid
}
