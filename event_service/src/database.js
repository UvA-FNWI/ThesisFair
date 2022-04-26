import mongoose from 'mongoose';

export const connect = () => mongoose.connect('mongodb://mongodb/event_service');

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
