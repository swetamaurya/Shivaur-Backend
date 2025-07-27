const mongoose = require('mongoose');
const SeqSchema = new mongoose.Schema({
  seqName: { type: String, required: true, unique: true },
  seqValue: { type: Number, default: 0 },
});

const Seq = mongoose.model("SeqContractor", SeqSchema);

async function getNextSeqValue(seqName) {
  const SeqDoc = await Seq.findOneAndUpdate(
    { seqName },
    { $inc: { seqValue: 1 } },
    { new: true, upsert: true }
  );
  const SeqNumber = SeqDoc.seqValue.toString().padStart(4, '0'); // Pad the number to 4 digits
  return `CON-${SeqNumber}`;
}

const ContractorSchema = new mongoose.Schema({
  ContractorName: { type: String },
  contractorId: { type: String },
  email: { type: String },
  mobile: { type: String },
  address: { type: String },
  projectName: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }], // Updated to handle multiple tasks
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }], // Updated to handle multiple tasks
  aadharNumber: { type: String },
  panNumber: { type: String },
  GST: { type: String },
  files:[String],
  gender: { type: String },
  expertise: [{ type: String }],
  contractorExpertise:[{type:String}],
  remark:{type: String},
   // Bank Details
   bankDetails: {
    bankName: { type: String },
    accountNumber: { type: String },
    accountHolder: { type: String },
    IFSCCode: { type: String },
    branchName: { type: String },
    accountType: { type: String  },
   },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ContractorSchema.pre('save', async function (next) {
  if (!this.contractorId) {
    this.contractorId = await getNextSeqValue('contractorId');
  }
  next();
});

ContractorSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Contractor = mongoose.model('Contractor', ContractorSchema);

module.exports = Contractor;
