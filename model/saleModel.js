const mongoose = require("mongoose");

// Sequence Schema and Model
const sequenceSchema = new mongoose.Schema({
  seqName: { type: String, required: true, unique: true },
  seqValue: { type: Number, default: 0 },
});

const SequenceOrderInvoice = mongoose.model("SequenceOrderInvoice", sequenceSchema);

// Function to Generate Next Sequence Value
async function getNextSequenceValue(seqName) {
  try {
    const sequenceDoc = await SequenceOrderInvoice.findOneAndUpdate(
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

// Invoice Schema and Model
const invoiceSchema = new mongoose.Schema({
  invoiceDate: { type: String, default: () => new Date().toISOString().split("T")[0] }, // Default to today's date
  invoiceNo: { type: String },
  totalInvoiceAmount: { type: String },
  salesInvoice: { type: String },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" }, // Link to Sale
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

// Sale Schema and Model
const saleSchema = new mongoose.Schema(
  {
    orderCategory: { type: String },
    project:{ type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    status: { type: String },
    client:{ type: mongoose.Schema.Types.ObjectId, ref: "User" },
    saleTo:{ type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerOrderRef: { type: String },
    orderDate: { type: String },
    complitionDate: { type: String },
    material: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    quantity: { type: String },
    unit: { type: String },
    deliveryDateToCustomer: { type: String },
    orderRef: { type: String },
    price :{type :String},
    dues: { type: String, default: "0" },
    netAmount: { type: String, default: "0" },

    paymentDetails:[{
      paymentDate: { type: String },
      terms: { type: String },
      amountDetails: { type: String },
      status: { type: String },
      transactionType: { type: String },
      amount: { type: String },
      date: { type: String},
    }],
    totalReceivedAmount:{type: String},
    totalDeductionAmount:{type: String},
    description: { type: String },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "SaleInvoice" }, // Reference to the invoice
  },
  { timestamps: true }
);

const Sale = mongoose.model("Sale", saleSchema);
const SaleInvoice = mongoose.model("SaleInvoice", invoiceSchema);

module.exports = { Sale, SaleInvoice, SequenceOrderInvoice };
