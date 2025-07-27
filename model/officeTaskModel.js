const mongoose = require('mongoose');
const SeqSchema = new mongoose.Schema({
  seqName: { type: String, required: true, unique: true },
  seqValue: { type: Number, default: 0 },
});

const Seq = mongoose.model("SeqOfficeTask", SeqSchema);

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
    // siteAddress  :String,
    // quantity :String,
    // unit :String,
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Reference to Project model
    status: { type: String, default: "Ready to Start" },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of references to User model (multiple users)
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to User model (task creator)
    taskDescription: String,
    files: [String], // Array of strings to store file URLs or paths
    createdAt: { type: Date, default: Date.now }, // Timestamp for creation
    updatedAt: { type: Date, default: Date.now }  // Timestamp for last update
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
const OfficeTask = mongoose.model('OfficeTask', taskSchema);

// Export the Task model
module.exports = {OfficeTask , Seq};
