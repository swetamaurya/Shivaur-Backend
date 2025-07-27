const mongoose = require('mongoose');

// Sequence schema for generating sequential IDs based on roles or asset type
const sequenceSchema = new mongoose.Schema({
  seqName: { type: String, required: true, unique: true },
  seqValue: { type: Number, default: 0 },
});

const Sequence = mongoose.model('Sequence', sequenceSchema);

// Function to generate sequential IDs for users based on roles or for assets
async function getNextSequenceValue(type) {
  const prefixMap = {
    Admin: 'ADM',
    Employee: 'EMP',
    Supervisor: 'SPV',
    Client: 'CLT',
    HR : "HR",
    Manager:"MMG"
  
  };

  const prefix = prefixMap[type] || 'USR';

  const sequenceDoc = await Sequence.findOneAndUpdate(
    { seqName: type },
    { $inc: { seqValue: 1 } },
    { new: true, upsert: true }
  );

  const sequenceNumber = sequenceDoc.seqValue.toString().padStart(4, '0');
  return `${prefix}-${sequenceNumber}`;
}

 
 

// User schema with primary and secondary contact details, and bank details
const userSchema = new mongoose.Schema({
  userId: { type: String },  // Auto-generated unique ID
  name: { type: String  },
  email: { type: String  },
  password: { type: String  },
  mobile: { type: String },
  roles: { type: String  },
  document: [String],
  assigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  clientName: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // permissions: { type: [String] },
 
  image: { type: String },
  aadharImage: [{ type: String }],
  panImage: { type: String },
  pfFiles: [{ type: String }],
  additionalFiles: [{ type: String }],
  PANNumber: { type: String },
  aadharNumber: { type: String },
  pfNumber: { type: String },
  DOB: { type: String },
  remarks: [{ type: String }],
  project: { type: String },
  personalEmail: { type: String },
  startDate: { type: String },
  leaveDates: [{ type: String }],
  address: { type: String },
  gender: { type: String },
  status: { type: String, default: 'Pending' },
  joiningDate: { type: String },
  departments: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  designations: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  contactName: { type: String },
  contactEmail: { type: String },
  contactMobile: { type: String },
    leave:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Leaves' }],
  attendance:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }],
  Manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Manager field
  Supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Supe
  primaryContact: {
    name: { type: String },
    relationship: { type: String },
    phone: { type: String },
    address: { type: String },
  },

  // Secondary Contact Information
  secondaryContact: {
    name: { type: String },
    relationship: { type: String },
    phone: { type: String },
    address: { type: String },
  },

  // Bank Details
  bankDetails: {
    bankName: { type: String },
    accountNumber: { type: String },
    accountHolder: { type: String },
    IFSCCode: { type: String },
    branchName: { type: String },
    accountType: { type: String, enum: ['Savings', 'Current'] },
   
  },
resignation :  { type: mongoose.Schema.Types.ObjectId, ref: 'Resignation' }, 
termination :  { type: mongoose.Schema.Types.ObjectId, ref: 'Termination' }, 


  currentOtp: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware to generate unique userId based on role before saving
userSchema.pre('save', async function (next) {
  if (!this.userId && this.roles) {
    this.userId = await getNextSequenceValue(this.roles);
  } else if (!this.roles) {
    return next(new Error('roles is required to generate userId'));
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = { User, Sequence  };
