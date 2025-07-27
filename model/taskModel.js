const mongoose = require('mongoose');
const moment = require("moment");

const SeqSchema = new mongoose.Schema({
  seqName: { type: String, required: true, unique: true },
  seqValue: { type: Number, default: 0 },
});

const Seq = mongoose.model("SeqTask", SeqSchema);

async function getNextSeqValue(seqName) {
    const SeqDoc = await Seq.findOneAndUpdate(
        { seqName },
        { $inc: { seqValue: 1 } },
        { new: true, upsert: true }
    );
     const SeqNumber = SeqDoc.seqValue.toString().padStart(4, '0'); // Pad the number to 3 digits
    return `TASK-${SeqNumber}`
}

// Define the Task Schema
const taskSchema = new mongoose.Schema({
  taskId: String,
    title: String,
    startDate: String,
    complateDate: String,
    deadlineDate :String,
    siteAddress  :String,
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Reference to Project model
    status: { type: String, default: "Ready to Start" },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contractor' }], // Array of references to User model (multiple users)
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to User model (task creator)
    taskDescription: String,
    files: [String],
    subTask:[{
      date:String,
      workStatus:String,
      remark:String
    }],
    materialManagement:[{
      material: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      specs: { type: String },
      quantity: { type: String },
      unit: { type: String },
    }],
    
      createdAt: { type: String, default: () => moment().format("DD-MM-YYYY HH:mm") },
      updatedAt: { type: String, default: () => moment().format("DD-MM-YYYY HH:mm") },
    
    });
    
    // Middleware to update `updatedAt` before updates
    taskSchema.pre(["findOneAndUpdate", "updateMany"], function (next) {
        this.set({ updatedAt: moment().format("DD-MM-YYYY HH:mm") });
        next();
      });
 

taskSchema.pre('save', async function (next) {
    if (!this.taskId) {
        this.taskId = await getNextSeqValue('taskId');
    }
    next();
  });
// Middleware to update `updatedAt` before saving
taskSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Create the Task Model from the schema
const Task = mongoose.model('Task', taskSchema);

// Export the Task model
module.exports = {Task , Seq};
