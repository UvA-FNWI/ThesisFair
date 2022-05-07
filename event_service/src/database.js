import mongoose from 'mongoose';
import debugLib from 'debug';

const debug = debugLib('event_service:database');

export const connect = async () => {
    const conStr = process.env.mongodbConStr || 'mongodb://localhost/event_service';
    const conn = await mongoose.connect(conStr);
    debug(`Connected to database: ${conStr}`);
    return conn;
}

const eventSchema = new mongoose.Schema({
    enabled: Boolean,
    name: String,
    description: String,
    start: Date,
    location: String,
    studentSubmitDeadline: Date,
    entities: [mongoose.Schema.ObjectId],
});
eventSchema.virtual('evid').get(function() { return this._id; }); // Create _id alias

export const Event = mongoose.model('Event', eventSchema);
