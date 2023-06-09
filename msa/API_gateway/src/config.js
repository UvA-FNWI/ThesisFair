/**
 * Configuration of GraphQL
 * It lists all the message queues the API gateway should facilitate by asking
 * its GraphQL scheme and exposing it via HTTP to the outside world.
 */

export const graphqlConfig = {
  queues: ['api-event', 'api-entity', 'api-project', 'api-user', 'api-vote', 'api-schedule'],
}
