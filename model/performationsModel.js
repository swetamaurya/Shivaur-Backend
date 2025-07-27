// models/Resignation.js
const mongoose = require('mongoose');

const ResignationSchema = new mongoose.Schema({
   employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email : String,
   noticeDate: String, // Change to Date type
   resignationDate: String, // Change to Date type
   reason: String,
   approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
   status :{type :String , default :"Pending"}
}, {
   timestamps: true
});
 

const TerminationSchema = new mongoose.Schema({
   employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
   email:String,
   TerminationType: String,
 
   terminationDate: String, // Change to Date type
   reason: String,
   status :{type :String , default :"Pending"}
}, {
   timestamps: true
});

 
const Resignation = mongoose.model('Resignation', ResignationSchema);
const Termination = mongoose.model('Termination', TerminationSchema);
module.exports = {Termination, Resignation};