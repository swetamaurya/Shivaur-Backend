const mongoose = require('mongoose');

// Sequence Schema for unique number generation
const sequenceSchema = new mongoose.Schema({
    seqName: { type: String, unique: true }, // Unique identifier for the sequence
    seqValue: { type: Number, default: 0 },  // Starting value of the sequence
});

const Sequence = mongoose.model('SSIN_Seq', sequenceSchema);

// Function to generate sequential IDs for users based on roles or for assets
async function getNextSequenceValue(type) {
    const prefixMap = {
        offerReferenceNumber: 'OFFER',
        'EMD.emdInstumentNumber': 'SSIN' 
    };

    const prefix = prefixMap[type]; // Get the correct prefix

    if (!prefix) {
        throw new Error(`Invalid sequence type: ${type}`);
    }

    const sequenceDoc = await Sequence.findOneAndUpdate(
        { seqName: type },
        { $inc: { seqValue: 1 } },
        { new: true, upsert: true }
    );

    const sequenceNumber = sequenceDoc.seqValue.toString().padStart(4, '0');
    return `${prefix}-${sequenceNumber}`;
}

// Offer Schema
const offerSchema = new mongoose.Schema({
    offerReferenceNumber: { type: String },
    offerDate: { type: String },
    detailOfEnquiry: { type: String },
    PIC: { type: String },
    email: { type: String },
    phone: { type: String },
    department: { type: String },
    designation: { type: String },
    company: { type: String },
    price: { type: String },
    policy: { type: String },
    additionalInfo: { type: String },
    emd_Status: { type: String },
    EMD: {
        emdAmount: { type: String },
        emdDate: { type: String },
        emdInstumentNumber: { type: String }, // Unique EMD Instrument Number
        emdRemark: { type: String },
    },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null }, // Reference to Enquiry
    enquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry', default: null }, // Reference to Enquiry
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null }, // Link to Lead
    enquiryTitle: { type: String },
    offerTitle: { type: String },
    offerConvertStatus: { type: String },
    lostOrderReason: { type: String },
    remark: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Middleware to auto-generate `offerReferenceNumber` and `emdInstumentNumber`
offerSchema.pre('save', async function (next) {
    try {
        // Auto-generate `emdInstumentNumber` if not set in `EMD`
        if (this.EMD && !this.EMD.emdInstumentNumber) {
            this.EMD.emdInstumentNumber = await getNextSequenceValue('EMD.emdInstumentNumber');
        }

        // Auto-generate `offerReferenceNumber` if not set
        if (!this.offerReferenceNumber) {
            this.offerReferenceNumber = await getNextSequenceValue('offerReferenceNumber');
        }

        this.updatedAt = Date.now(); // Update the `updatedAt` field on every save
        next();
    } catch (error) {
        return next(error); // Pass error to the next middleware
    }
});

const Offer = mongoose.model('Offer', offerSchema);
module.exports = Offer;
