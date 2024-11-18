const mongoose = require('mongoose');

const fishSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true        
  },
  size: {
    type: Number,
    required: true    
  },
  updatedBy: {
    type: String
  },
  updatedAt: {
    type: Date
  },
  lakes: [{
    lakeId: {
      ref: 'lake',
      type: mongoose.Schema.ObjectId
    },
    _id: false   
  }]  
}); 

const fish = mongoose.model('fish', fishSchema);

module.exports = fish;