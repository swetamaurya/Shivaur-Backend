const mongoose = require('mongoose');

// Enquiry Schema definition
const enquirySchema = new mongoose.Schema({
    enquiryTitle:{type:String},
    enquiryDate: { type: String },
    PIC: { type: String },
    detailOfEnquiry: { type: String },
    offerDate: { type: String },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" }, // Correctly reference Lead model
    offerReferenceNumber: { type: String },
    createOfferDate: { type: String },
    price: { type: String },  
    policy: { type: String },
    phone:{ type: String },
    email:{ type: String },
    company:{ type: String },
    department:{ type: String },
    designation:{ type: String },
    additionalInfo: { type: String },
 
     company:{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    status :String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });
  
 enquirySchema.virtual('offers', {
  ref: 'Offer',
  localField: '_id',
  foreignField: 'enquiry',
});

enquirySchema.set('toObject', { virtuals: true });
enquirySchema.set('toJSON', { virtuals: true });

 const Enquiry = mongoose.model('Enquiry', enquirySchema);
module.exports = Enquiry;
