var mongoose = require('mongoose');

var LineUserSchema = new mongoose.Schema({
  line_id: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  name: {type: String, default: '#'},
  picture: {type: String, default: process.env.DEFAULT_PICTURE},
  status_message: {type: String, default: '#'}
});

module.exports = mongoose.model('LineUser', LineUserSchema);