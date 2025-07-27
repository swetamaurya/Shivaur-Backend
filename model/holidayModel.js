const mongoose = require('mongoose');
 

// Holiday Schema
const holidaySchema = new mongoose.Schema({
    holidayName: { type: String, required: true },
    holidayDate: { type: String, required: true },
    offDays: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Leave Type Schema
const leaveTypeSchema = new mongoose.Schema({
    leaveName: { type: String, required: true },
    day: { type: String, required: true },
    durationLeave: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Leaves Schema
const leavesSchema = new mongoose.Schema({
    leaveId: { type: String },
    todayPresents: { type: String, default: "0" },
    plannedLeaves: { type: String, default: "0" },
    unplannedLeaves: { type: String, default: "0" },
    pendingRequests: { type: String, default: "0" },
    leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType' },
    daysLeaveType: { type: String },
    leaveStatus: { type: String, default: 'Pending' },
    from: { type: String },
    to: { type: String },
    halfDay: {
        type: String,
        enum: ['First Half', 'Second Half'],
        default: null
    },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    totalLeaves: { type: String, default: "0" },
    leavesTaken: { type: String, default: "0" },
    leavesAbsent: { type: String, default: "0" },
    pendingApproval: { type: String },
    workingDays: { type: String, default: "0" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    noOfDays: { type: String, default: "0" },
    remainingLeave: { type: String },
    reason: { type: String },
    status: { type: String },
    remark: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook to format `from` and `to` dates
// leavesSchema.pre('save', function (next) {
//     if (this.from) {
//         this.from = moment(this.from).format('DD MMM YYYY');
//     }
//     if (this.to) {
//         this.to = moment(this.to).format('DD MMM YYYY');
//     }
//     next();
// });

const Leaves = mongoose.model('Leaves', leavesSchema);
const LeaveType = mongoose.model('LeaveType', leaveTypeSchema); // Changed model name for consistency
const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = { Leaves, LeaveType, Holiday };
