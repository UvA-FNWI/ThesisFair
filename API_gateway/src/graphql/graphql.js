import { graphqlHTTP } from 'express-graphql';
import { schemaComposer } from 'graphql-compose';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { readFile, readdir } from 'fs/promises';
import debugLib from 'debug';

const debug = debugLib('API_gateway:graphql')

const getMiddleware = async () => {
    const rootDir = dirname(fileURLToPath(import.meta.url));
    const typesDir = join(rootDir, './types');
    const resolveDir = join(rootDir, './resolvers');

    debug('Loading typedefs(%s) and resolvers(%s)', typesDir, resolveDir);
    for (const filename of await readdir(typesDir)) {
        if (!filename.endsWith('.graphql')) continue;

        const jsfilename = filename.replace('.graphql', '.js');
        const [typedefs, module] = await Promise.all([
            readFile(join(typesDir, filename)),
            import(join(resolveDir, jsfilename)),
        ])

        schemaComposer.addTypeDefs(typedefs.toString('utf8'));
        debug('Loaded typedef file: %s', filename);

        if (module.Query) {
            schemaComposer.Query.addNestedFields(module.Query);
            debug('Loaded query fields from: %s', jsfilename);
        }
        if (module.Mutation) {
            schemaComposer.Mutation.addNestedFields(module.Mutation);
            debug('Loaded mutation fields from: %s', jsfilename);
        }
    }

    return graphqlHTTP({
        schema: schemaComposer.buildSchema(),
        graphiql: !!process.env.DEBUG
    })
}

export default getMiddleware;
