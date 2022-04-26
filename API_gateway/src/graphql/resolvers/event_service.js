import { channel, rpc } from "../../messaging.js";

const queue = 'API_events'
channel.assertQueue(queue, {
  durable: false,
});

export const Query = {
    event: {
        type: 'Event',
        args: {
            evid: 'ID!',
        },
        resolve: async (obj, args, context, info) => {
            const query = `
            query {
              event(evid: "${args.evid}") {
                name
                description
                location
                entities
              }
            }
            `;

            // info.variableValues // TODO
            const res = await rpc(queue, Buffer.from(query));
            return res.data.event;
        },
    },

    // eventResolved: {
        // type: 'EventResolved'
    // },
};

export const Mutation = {

};
