const mongoose = require('mongoose');
const SeqSchema = new mongoose.Schema({
  seqName: { type: String, required: true, unique: true },
  seqValue: { type: Number, default: 0 },
});

const Seq = mongoose.model("SeqVendor", SeqSchema);

async function getNextSeqValue(seqName) {
  const SeqDoc = await Seq.findOneAndUpdate(
    { seqName },
    { $inc: { seqValue: 1 } },
    { new: true, upsert: true }
  );
  const SeqNumber = SeqDoc.seqValue.toString().padStart(4, '0'); // Pad the number to 4 digits
  return `VEN-${SeqNumber}`;
}

const vendorSchema = new mongoose.Schema({
  vendorName: { type: String },
  vendorId: { type: String },
  email: { type: String },
  mobile: { type: String },
  address: { type: String },
  material: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // Updated to handle multiple tasks
  // task: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }], // Updated to handle multiple tasks
  aadharNumber: { type: String },
  panNumber: { type: String },
  GST: { type: String },
  files:[String],
  gender: { type: String },
  remark: { type: String },
  vendorExpertise:{type:String},
  expertise: [{ type: String }],
    // Bank Details
    bankDetails: {
      bankName: { type: String },
      accountNumber: { type: String },
      accountHolder: { type: String },
      IFSCCode: { type: String },
      branchName: { type: String },
      accountType: { type: String, },
     },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

vendorSchema.pre('save', async function (next) {
  if (!this.vendorId) {
    this.vendorId = await getNextSeqValue('vendorId');
  }
  next();
});

vendorSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
