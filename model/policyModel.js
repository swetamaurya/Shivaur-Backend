const mongoose = require('mongoose');
 

const policySchema = new mongoose.Schema({
  policyName: {
    type: String,
  },
  description: {
    type: String,
  },
  date: {
    type: String,
  },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  files: [{ type: String }],
  createdAt: {
    type: Date,
 
  },
  updatedAt: {
    type: Date,
     
  },
});

 
 

 

const Policy = mongoose.model('Policy', policySchema);

module.exports = Policy;
