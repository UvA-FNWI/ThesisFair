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
})

export const Event = mongoose.model('Event', eventSchema);
