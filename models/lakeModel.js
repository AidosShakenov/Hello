const mongoose = require('mongoose');

const lakeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true    
  },
  area: {
    type: Number,
    required: true    
  },
  countries: [{
    countryId: {
      ref: 'country',
      type: mongoose.Schema.ObjectId
    },
    _id: false    
  }],
  fishes: [{
    fishId: {
      ref: 'fish',
      type: mongoose.Schema.ObjectId
    },
    _id: false   
  }]  
}); 

const lake = mongoose.model('lake', lakeSchema);

module.exports = lake;