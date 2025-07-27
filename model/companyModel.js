const mongoose = require('mongoose');
const moment = require("moment");

const companySchema = new mongoose.Schema({
  companyName: { type: String }, // Added required to prevent empty names
  phoneNumber: { type: String },
  pinCode: { type: String },  
  address: { type: String },

  POSDetails: [{
    POSName: { type: String },
    POSEmail: { type: String },
    POSNumber: { type: String },
  }],

  createdAt: { type: String, default: () => moment().format("DD-MM-YYYY HH:mm") },
  updatedAt: { type: String, default: () => moment().format("DD-MM-YYYY HH:mm") },
});

// Middleware to update `updatedAt` before updates
companySchema.pre(["findOneAndUpdate", "updateMany"], function (next) {
  this.set({ updatedAt: moment().format("DD-MM-YYYY HH:mm") });
  next();
});

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
