const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
  seqName: { type: String, unique: true },
  seqValue: { type: Number, default: 0 },
});

const Sequence = mongoose.model('SequenceLead', sequenceSchema);

async function getNextSeqValue(seqName) {
  const SeqDoc = await Sequence.findOneAndUpdate(
    { seqName },
    { $inc: { seqValue: 1 } },
    { new: true, upsert: true }
  );
  const SeqNumber = SeqDoc.seqValue.toString().padStart(6, '0'); // Pad the number to 4 digits
  return `LEAD-${SeqNumber}`;
}


const leadSchema = new mongoose.Schema({
  leadId: {
    type: String,
  },
  leadName: {
    type: String,

  },
  file: String,
  enquiry: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry' }],
  // offers: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: String },
  email: {
    type: [String], // Array of strings for multiple email addresses

    validate: [arrayLimit, 'Email array exceeds the limit of 5'], // Optional: Limit to 5 emails
  },
  mobile: {
    type: [String], // Array of strings for multiple mobile numbers

    validate: [arrayLimit, 'Mobile array exceeds the limit of 5'], // Optional: Limit to 5 numbers
  },
  department: {
    type: String,

  },

  designation: {
    type: String,
    // 
  },
  company: {
    type: String,
    // 
  },
  address: {
    type: String,
    // 
  },
  date: {
    type: String,

  },
  callInfo: [{
    createdByFollowUp: String,
    date: String,
    nextFollowUpdate: String,
    remark: String,
    status: String
  }],
  status: {
    type: String,
  },
  enquiryStatus: {
    type: String,
  },
  description: {
    type: String,
  },
  zipCode: {
    type: String,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

leadSchema.virtual('offers', {
  ref: 'Offer',
  localField: '_id',
  foreignField: 'lead',
});

leadSchema.set('toObject', { virtuals: true });
leadSchema.set('toJSON', { virtuals: true });

// Custom validator to limit the number of emails/mobiles in the array
function arrayLimit(val) {
  return val.length <= 5; // Limit array size to 5 items
}

leadSchema.pre('save', async function (next) {
  if (!this.leadId) {
    this.leadId = await getNextSeqValue('leadId');
  }
  next();
});

leadSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});
const Lead = mongoose.model('Lead', leadSchema);

module.exports = { Lead, Sequence };
