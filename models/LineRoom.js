var mongoose = require('mongoose');

var LineRoomSchema = new mongoose.Schema({
  line_id: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  type: {
      type: String
  }
});

module.exports = mongoose.model('LineRoom', LineRoomSchema);