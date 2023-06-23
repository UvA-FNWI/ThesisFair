/**
 * Dictionary of error messages. It standardizes the error messages by allowing
 * microservices to throw error codes using the first word of the error message.
 *
 * For example:
 * "UNAUTHORIZED look at this user" -> "You are not authorized to look at this user"
 * With status code 401.
 */

const errors = {
  UNAUTHORIZED: {
    message: 'You are not authorized to ',
    statusCode: 401,
  },
}

export default errors
