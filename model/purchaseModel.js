const mongoose = require("mongoose");

// Sequence Schema and Model
const sequenceSchema = new mongoose.Schema({
  seqName: { type: String, required: true, unique: true },
  seqValue: { type: Number, default: 0 },
});

const SequencePurchaseInvoice = mongoose.model("SequencePurchaseInvoice", sequenceSchema);

// Function to Generate Next Sequence Value
async function getNextSequenceValue(seqName) {
  try {
    const sequenceDoc = await SequencePurchaseInvoice.findOneAndUpdate(
      { seqName },
      { $inc: { seqValue: 1 } },
      { new: true, upsert: true }
    );
    const sequenceNumber = sequenceDoc.seqValue.toString().padStart(4, "0"); // Pad the number to 4 digits
    return `INV-${sequenceNumber}`;
  } catch (error) {
    console.error("Error generating sequence value:", error.message);
    throw new Error("Failed to generate sequence value");
  }
}

const invoiceSchema = new mongoose.Schema({
  invoiceDate: { type: String },
  invoiceNo: { type: String },
  remark: { type: String },
  invoiceValue: { type: String },
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase" }, // Rename orderPurchase to purchase
  document: [{ type: String }],
});


// Middleware to Auto-generate Invoice Number
invoiceSchema.pre("save", async function (next) {
  try {
    if (!this.invoiceNo) {
      this.invoiceNo = await getNextSequenceValue("invoiceNo");
    }
    next();
  } catch (error) {
    console.error("Error generating invoice number:", error.message);
    next(error);
  }
});


const purchaseSchema = new mongoose.Schema(
  {
    status :{ type: String },
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    purchaseVendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    purchasePurpose: { type: String },
    purchaseOrderDate: { type: String,  },
    poAmount: { type: String,  },
    quantity: { type: String,  },
    unit: { type: String,  },
    dispatchDate: { type: String },
    deliveredDate: { type: String },
    netAmount: { type: String },
    duesAmount: { type: String, default: "0" },
    stock: { type: String   },
    orderedBy: { type: String },
    transporterDetails: { type: String },
    
    paymentDetails:[{
      paymentDate: { type: String },
      terms: { type: String },
      amountDetails: { type: String },
      status: { type: String },
      transactionType: { type: String },
      amount: { type: String },
      date: { type: String},
    }],

    totalFreightChargesAmount: { type: String, default: "0" },
    totalReceivedAmount:{type: String, default: "0" },
    totalDeductionAmount:{type: String, default: "0" },
    remarks: { type: String },

    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseInvoice" },
    selectPrjClnt: { type: String },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  },
  { timestamps: true }
);

const Purchase = mongoose.model('Purchase', purchaseSchema);
const PurchaseInvoice = mongoose.model('PurchaseInvoice', invoiceSchema);

module.exports = {Purchase ,PurchaseInvoice ,SequencePurchaseInvoice}
 