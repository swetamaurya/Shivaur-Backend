const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
    seqName: { type: String, required: true, unique: true },
    seqValue: { type: Number, default: 0 },
  });
  
  
  async function getNextSequenceValue(seqName) {
      const sequenceDoc = await Sequence.findOneAndUpdate(
          { seqName },
          { $inc: { seqValue: 1 } },
          { new: true, upsert: true }
      );
       const sequenceNumber = sequenceDoc.seqValue.toString().padStart(4, '0'); // Pad the number to 3 digits
       if (seqName === 'invoiceId') {
        return `INV-${sequenceNumber}`;
    } else if (seqName === 'estimatesId') {
        return `EST-${sequenceNumber}`;
    }
  }
  
  
  const detailSchema = new mongoose.Schema({
    item: { type: String, required: true },         
    description: { type: String },                  
    unitCost: { type: String, required: true },
    qty: { type: Number, required: true },      
    amount: { type: String, required: true }        
  })

const invoiceSchema = new mongoose.Schema({
    invoiceId: {
        type: String,
     },
     client:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
     project:{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Project',
      validate: {
        validator: function(value) {
            // If project is present, ensure product is null
            if (value && this.product) {
                return false;  // Fail validation if both project and product are set
            }
            return true;
        },
        message: 'Product ID must be null if Project ID is present.'
    } 
    },
     product:{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product',
      validate: {
        validator: function(value) {
            // If product is present, ensure project is null
            if (value && this.project) {
                return false;  // Fail validation if both project and product are set
            }
            return true;
        },
        message: 'Project ID must be null if Product ID is present.'
    } 
    },

    // purchase:{ type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
    // sale:{ type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },

     email:String,
     tax:String,
     clientAddress:String,
     billingAddress:String,
     invoiceDate:String,
     dueDate: String,
     details :[detailSchema] ,
     total:String,
     discount :String,
     GrandTotal :String,
     otherInfo :String,
     
     taxType:String,
     createDate:String,
    status: {
        type: String,
     },
});

const estimatesSchema = new mongoose.Schema({
    estimatesId:String,
     client:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
     estimateDate:String,
     project:{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
     email:String,
     taxType:String,
     expiryDate:String,
     estimatesDate:String,
   
     status:String,
     clientAddress:String,
     billingAddress:String,
    
    //  dueDate: String,
    details :[detailSchema] ,
    
     total:String,
     tax:String,
     discount :String,
     GrandTotal :String,
     otherInfo :String,
     createdAt: { type: Date, default: Date.now },
    
});
invoiceSchema.pre('save', async function (next) {
    if (!this.invoiceId) {
        this.invoiceId = await getNextSequenceValue('invoiceId');
    }
    next();
  });

  estimatesSchema.pre('save', async function (next) {
    if (!this.estimatesId) {
        this.estimatesId = await getNextSequenceValue('estimatesId');
    }
    next();
  });
  const Sequence = mongoose.model("SeqInvoice", sequenceSchema);

const Invoice = mongoose.model('Invoice', invoiceSchema );
const Estimate = mongoose.model('Estimate', estimatesSchema );

module.exports = {Invoice , Sequence ,Estimate}