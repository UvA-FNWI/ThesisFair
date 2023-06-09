import crypto from 'node:crypto'

/**
 * This file is used by sso.js to store the SSO verifier code as a cookie
 * on the users computer.
 */

const algorithm = 'AES-256-CBC'
const encoding = 'base64'
const key = Buffer.from(process.env.JWT_SECRET).subarray(0, 32)

/**
 * Encrypts the given contents
 * @param {String} content The string to be encrypted
 * @returns JSON string with the iv and encrypted data.
 */
export const encrypt = content => {
  if (typeof content !== 'string') {
    return
  }

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(content, 'utf8', encoding)
  encrypted += cipher.final(encoding)

  return JSON.stringify({
    iv: iv.toString(encoding),
    data: encrypted,
  })
}

/**
 * Decrypts the given contents
 * @param {String} payload The JSON encoded payload with the iv and data
 * @returns The unencrypted JSON string
 */
export const decrypt = payload => {
  if (typeof payload !== 'string') {
    return
  }

  let { iv, data } = JSON.parse(payload)
  if (!iv || !data) {
    throw new Error('Invalid payload object ' + payload)
  }

  iv = Buffer.from(iv, encoding)
  data = Buffer.from(data, encoding)

  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decrypted = decipher.update(data, encoding, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
