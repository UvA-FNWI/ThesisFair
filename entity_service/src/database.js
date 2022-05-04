import mongoose from 'mongoose';
import debugLib from 'debug';

const debug = debugLib('entity_service:database');

export const connect = async () => {
    const conStr = process.env.mongodbConStr || 'mongodb://mongodb/entity_service';
    const conn = await mongoose.connect(conStr);
    debug(`Connected to database: ${conStr}`);
    return conn;
}

const entitySchema = new mongoose.Schema({
    name: String,
    description: String,
    type: String,
    contact: [new mongoose.Schema({
      type: String,
      content: String,
    })],
});
entitySchema.virtual('enid').get(function() { return this._id; }); // Create _id alias

export const Entity = mongoose.model('Entity', entitySchema);
