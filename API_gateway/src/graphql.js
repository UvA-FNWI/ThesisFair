import { graphqlHTTP } from 'express-graphql';
import { print } from 'graphql';
import { introspectSchema } from '@graphql-tools/wrap';
import { stitchSchemas } from '@graphql-tools/stitch';
import debugLib from 'debug';

import { channel, rpc } from '../../libraries/amqpmessaging/index.js';
import { graphqlConfig } from './config.js';

const debug = debugLib('API_gateway:graphql');

const executor = (queue, { document, variables }) => rpc(queue, { query: print(document), variables });

const getMiddleware = async () => {
    const subschemas = [];
    for (const queue of graphqlConfig.queues) {
        debug('Loading queue %s', queue);
        await channel.assertQueue(queue, {
            durable: false,
        });

        const subexecutor = (args) => executor(queue, args);
        subschemas.push({
            schema: await introspectSchema(subexecutor),
            executor: subexecutor,
        });
    }

    const schema = stitchSchemas({
        subschemas
    });

    debug('Done initializing graphql middleware');
    return graphqlHTTP({
        schema,
        graphiql: !!process.env.DEBUG
    });
}

export default getMiddleware;
