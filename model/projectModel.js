const mongoose = require('mongoose');
const SeqSchema = new mongoose.Schema({
  seqName: { type: String, required: true, unique: true },
  seqValue: { type: Number, default: 0 },
});

const Seq = mongoose.model("Seq", SeqSchema);

async function getNextSeqValue(seqName) {
    const SeqDoc = await Seq.findOneAndUpdate(
        { seqName },
        { $inc: { seqValue: 1 } },
        { new: true, upsert: true }
    );
     const SeqNumber = SeqDoc.seqValue.toString().padStart(4, '0'); // Pad the number to 3 digits
    return `PRO-${SeqNumber}`
}



const projectSchema = new mongoose.Schema({
  projectId: { type: String },
  projectName: { type: String },
  deadline: { type: String },
  description: { type: String },
  price: { type: String },
  tax: { type: String },
  tax_rs: { type: String },
  taxType: { type: String },
  totalPrice: { type: String },
  workAddress :{ type: String },
  siteAddress :{ type: String },
  priority: { type: String , default: 'Normal' },
  discountRupee: { type: String ,default:0},
  discountPercentage: { type: String ,default:0},
  complitionDate :{ type: String },
  timeExtensionDate :{ type: String },


  paymentDetails:[{
    netAmount:{type: String , default:0},
    paymentDate: { type: String },
    grossAmount: { type: String },
    incomeTaxDeduction: { type: String ,default:0},
    GSTDeduction: { type: String ,default:0},
    royaltyDeduction: { type: String ,default:0},
    letDeduction: { type: String ,default:0},
    securityDepositDeduction: { type: String ,default:0},
    otherDeduction: { type: String ,default:0},
    status: { type: String },
    complitionDate: { type: String },
    labourCessDeduction: { type: String ,default:0},
    mbNumber: { type: String },
    mbfile : [{ type: String }],
  }],

  income_tax_totalDeduction: { type: String ,default:0},
  GST_totalDeduction: { type: String ,default:0},
  royalty_totalDeduction: { type: String ,default:0},
  late_totalDeduction: { type: String ,default:0},
  security_deposit_totalDeduction: { type: String ,default:0},
  any_other_totalDeduction: { type: String ,default:0},
  labourCess_totalDeduction: { type: String ,default:0},

  grossTotalAmount:{type: String},
  netTotalAmount:{type: String},
  deductionTotalAmount:{type: String},

  materialDetails:[{
    material :{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    specs: { type: String },
    quantity: { type: String ,default:0 },
    unit: { type: String},
   }],


   sdDetails:[{
    amount:{type: String},
    remark: { type: String },
    amountStatus: { type: String },
    sdFiles: [{ type: String}],
   }],
   
  clientName: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  document: [{ type: String }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'Pending' },
  startDate: { type: String },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }], 
  totalTasks: String,
  block:String,
  district:String,
  // Automatically track when the document is created or updated
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
 
});

 

  

projectSchema.pre('save', async function (next) {
  if (!this.projectId) {
      this.projectId = await getNextSeqValue('projectId');
  }
  next();
});

projectSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Project = mongoose.model('Project', projectSchema);
 

module.exports = { Project, Seq};
