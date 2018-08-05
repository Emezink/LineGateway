var mongoose = require('mongoose');

var ReplyTempSchema = new mongoose.Schema({
    line_id: {
        type: String
    },
    reply_token: {
        type: String
    },
    type: {
        type: String
    },
    timestamp: { 
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ReplyTemp', ReplyTempSchema);