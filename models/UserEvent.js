var mongoose = require('mongoose');

var UserEventSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'LineUser'
    },
    direction: {
        type: String
    },
    sender: {
        type: String
    },
    version: {
        type: String,
        default: '1'
    },
    type: {
        type: String
    },
    message: {
        type: Array
    },
    timestamp: { 
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('UserEvent', UserEventSchema);