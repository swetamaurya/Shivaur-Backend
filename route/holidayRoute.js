const express = require('express');
const { auth } = require('../Middleware/authorization');
const { Holiday, Leaves ,LeaveType } = require('../model/holidayModel');
const { User } = require('../model/userModel');
const route = express.Router();

// Holiday CRUD Operations

// Route to create a new holiday
route.post('/holiday/post', auth, async (req, res) => {
    if (req.user.roles !== 'Admin') {
        return res.status(403).send('Access denied: Only admins can create holidays.');
    }
    
    const createHoliday = new Holiday(req.body);
    try {
        const savedHoliday = await createHoliday.save();
        res.status(200).send(savedHoliday);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Route to fetch all holidays (accessible to all authenticated users)
route.get('/holiday/get', auth, async (req, res) => {
    try {
      const { page, limit } = req.query; // Extract pagination parameters
  
      if (!page || !limit) {
        // If pagination parameters are not provided, return all holidays
        const holidays = await Holiday.find().sort({ _id: -1 }); // Sort by creation date descending
        return res.status(200).json({
          data: holidays,
          totalHolidays: holidays.length, // Total count of all holidays
          pagination: false, // Indicate that pagination is not applied
        });
      }
  
      // If pagination parameters are provided, return paginated data
      const skip = (parseInt(page) - 1) * parseInt(limit); // Calculate documents to skip
  
      const holidays = await Holiday.find()
        .sort({ _id: -1 }) // Sort by creation date descending
        .skip(skip)
        .limit(parseInt(limit));
  
      const totalHolidays = await Holiday.countDocuments(); // Total count of holidays
  
      res.status(200).json({
        data: holidays,
        totalHolidays,
        totalPages: Math.ceil(totalHolidays / limit), // Calculate total pages
        currentPage: parseInt(page), // Current page
        perPage: parseInt(limit), // Items per page
        pagination: true, // Indicate that pagination is applied
      });
    } catch (error) {
      console.error("Error fetching holidays:", error.message);
      res.status(500).json({ error: 'Error fetching holidays' });
    }
  });
  

// Route to update a holiday (Admins only)
route.post('/holiday/update', auth, async (req, res) => {
    if (req.user.roles !== 'Admin') {
        return res.status(403).send('Access denied: Only admins can update holidays.');
    }
    
    const { _id } = req.body;
    try {
        const updateHoliday = await Holiday.findByIdAndUpdate(_id, req.body, { new: true });
        if (!updateHoliday) return res.status(404).send('Holiday not found');
        res.status(200).send(updateHoliday);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Route to delete a holiday (Admins only)
route.post('/holiday/delete', auth, async (req, res) => {
    if (req.user.roles !== 'Admin') {
        return res.status(403).send('Access denied: Only admins can delete holidays.');
    }
    
    const { _id } = req.body;
    try {
        const deleteHoliday = await Holiday.findByIdAndDelete(_id);
        if (!deleteHoliday) return res.status(404).send('Holiday not found');
        res.status(200).send(deleteHoliday);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Leaves CRUD Operations

// Route to create a new leave request
route.post('/leaves/post', auth, async (req, res) => {
    try {
        const addLeave = new Leaves({
            ...req.body,
            employee: req.user.id, // Associate leave request with the logged-in user
            approvedBy: null, // Approval will be set later
        });
        await addLeave.save();
        console.log(addLeave)
// Link the leave to the user's document
await User.findByIdAndUpdate(req.user.id, { $push: { leave: addLeave._id } });

        res.status(200).json({ message: 'Leave request created successfully', leave: addLeave });    } catch (error) {
        console.error('Error creating leave:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});


route.get('/leaves/get', auth, async (req, res) => {
    try {
      const { roles, id: userId } = req.user; // Extract user roles and ID
      const { page, limit } = req.query; // Extract pagination parameters
  
      // Define the query based on role
      let query = {};
      if (roles === "Employee") {
        query = { employee: userId }; // Employees can only view their own leaves
      }
  
      const skip = (parseInt(page) - 1) * parseInt(limit); // Calculate documents to skip
      const totalLeaves = await Leaves.countDocuments(query); // Total count of leave requests
  
      // Fetch all leaves based on the query with pagination and populate fields
      const leaves = await Leaves.find(query)
        .populate('employee', 'name email')
        .populate('approvedBy', 'name email')
        .populate('leaveType', 'leaveName')
        .sort({ createdAt: -1 })
        .skip(page ? skip : 0)
        .limit(page ? parseInt(limit) : totalLeaves); // If no pagination, return all
  
      // Categorize leaves and get counts
      const approvedCount = await Leaves.countDocuments({ ...query, leaveStatus: 'Approved' });
      const pendingCount = await Leaves.countDocuments({ ...query, leaveStatus: 'Pending' });
      const otherLeavesCount = await Leaves.countDocuments({ 
        ...query, 
        'leaveType.leaveName': 'Other Leave' 
      });
      const unplannedCount = await Leaves.countDocuments({ 
        ...query, 
        'leaveType.leaveName': 'LOP' 
      });
  
      // Response object
      res.status(200).json({
        summary: {
          totalPendingRequests: pendingCount,
          totalApprovedLeaves: approvedCount,
          totalUnplannedLeaves: unplannedCount,
          totalOtherLeaves: otherLeavesCount,
          totalRecords: totalLeaves,
          totalPages: Math.ceil(totalLeaves / (limit || totalLeaves)),
          currentPage: page ? parseInt(page) : 1,
          perPage: limit ? parseInt(limit) : totalLeaves,
          pagination: !!page, // Indicate if pagination is applied
        },
        leaves, // Return all leave data in the response
      });
    } catch (error) {
      console.error('Error fetching leaves:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  });
  

  



// Route to get a specific leave request by ID
route.get('/leaves/get/:id', auth, async (req, res) => {
    try {
        const {id} = req.params
        // console.log(req.params)
        // console.log("hi helly bro :- ",id)
         const leave = await Leaves.findById(id)
            .populate('employee', 'name email userId')
            .populate('approvedBy', 'name email userId')
            .populate('leaveType', 'leaveName').sort({_id:-1})

        console.log("leave : - ",leave);

        if (!leave) return res.status(404).json({ error: 'Leave not found' });

        // if (req.user.roles !== 'Admin' && leave.employee._id.toString() !== req.user._id.toString()) {
        //     return res.status(403).json({ message: 'Access denied: Unauthorized to view this leave request.' });
        // }

        res.status(200).json(leave);
    } catch (error) {
        console.error('Error fetching leave:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Route to update a leave request (Admins only or employee updating their own leave)
route.post('/leaves/update', auth, async (req, res) => {
    const { _id } = req.body;
    try {
        const leave = await Leaves.findById(_id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });

        // if (req.user.roles !== 'Admin' && leave.employee.toString() !== req.user._id.toString()) {
        //     return res.status(403).json({ message: 'Access denied: Unauthorized to update this leave.' });
        // }

        const updatedLeave = await Leaves.findByIdAndUpdate(_id, req.body, { new: true });
        res.status(200).send(updatedLeave);
    } catch (error) {
        console.error('Error updating leave:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Route to delete a leave (Admins only or employee deleting their own leave)
route.post("/leaves/delete", auth, async (req, res) => {
    const { _id } = req.body;
    try {
        const leave = await Leaves.findById(_id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });

        if (req.user.roles !== 'Admin' && leave.employee.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied: Unauthorized to delete this leave.' });
        }

        await leave.deleteOne();
        res.status(200).send({ message: 'Leave deleted successfully.' });
    } catch (error) {
        console.error("Error deleting leave:", error);
        return res.status(500).send(`Internal server error: ${error.message}`);
    }
});

// Route to approve or decline a leave request (Admins only)
route.post('/leaves/approve', auth, async (req, res) => {
    const { _id, leaveStatus } = req.body;
    const approvedBy = req.user.id;

    if (req.user.roles !== 'Admin') {
        return res.status(403).json({ message: 'Access denied: Only admins can approve or decline leave requests.' });
    }

    if (!_id || !leaveStatus || (leaveStatus !== 'Approved' && leaveStatus !== 'Declined')) {
        return res.status(400).json({ message: 'Missing or invalid fields. Status must be either "Approved" or "Declined".' });
    }

    try {
        const updatedLeave = await Leaves.findByIdAndUpdate(
            _id,
            { leaveStatus, approvedBy },
            { new: true }
        );

        if (!updatedLeave) return res.status(404).json({ message: 'Leave request not found' });

        res.status(200).json( {leave: updatedLeave });
    } catch (error) {
        console.error(`Error updating leave request: ${error}`);
        res.status(500).json({ message: 'Internal server error' });
    }
});



///////////////////////////// Leave type /////////////////////
route.post('/leavesType/post', auth, async (req, res) => {
    try {
        const{leaveName,durationLeave,day} =req.body

        const addLeave = new LeaveType({
            leaveName,durationLeave,day

    });
     
        await addLeave.save();
        console.log("addLeave",addLeave)
        res.status(200).send(addLeave);
    } catch (error) {
        console.error('Error creating leave:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});
 

route.get('/leavesType/get', auth, async (req, res) => {
    try {
      const { page, limit } = req.query; // Extract pagination parameters
  
      if (!page || !limit) {
        // If pagination parameters are not provided, return all leave types
        const leaveTypes = await LeaveType.find().sort({ _id: -1 }); // Sort by creation date descending
        return res.status(200).json({
          data: leaveTypes,
          totalLeaveTypes: leaveTypes.length, // Total count of all leave types
          pagination: false, // Indicate that pagination is not applied
        });
      }
  
      // If pagination parameters are provided, return paginated data
      const skip = (parseInt(page) - 1) * parseInt(limit); // Calculate documents to skip
  
      const leaveTypes = await LeaveType.find()
        .sort({ _id: -1 }) // Sort by creation date descending
        .skip(skip)
        .limit(parseInt(limit));
  
      const totalLeaveTypes = await LeaveType.countDocuments(); // Total count of leave types
  
      res.status(200).json({
        data: leaveTypes,
        totalLeaveTypes,
        totalPages: Math.ceil(totalLeaveTypes / limit), // Calculate total pages
        currentPage: parseInt(page), // Current page
        perPage: parseInt(limit), // Items per page
        pagination: true, // Indicate that pagination is applied
      });
    } catch (error) {
      console.error('Error fetching leave types:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  });
  

route.get('/leavesType/get/:id', auth, async (req, res) => {
    try {
        const {id} = req.params
        console.log("leave type",req.params)
         const leaves = await LeaveType.findById(id)

        res.status(200).send(leaves);
    } catch (error) {
        console.error('Error creating leave:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

 route.post('/leavesType/update', auth, async (req, res) => {
    const { _id } = req.body;
    try {
        const leave = await LeaveType.findById(_id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });

        if (req.user.roles !== 'Admin' && leave.employee.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied: Unauthorized to update this leave.' });
        }

        const updatedLeave = await LeaveType.findByIdAndUpdate(_id, req.body, { new: true });
        res.status(200).send(updatedLeave);
    } catch (error) {
        console.error('Error updating leave:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});


route.post("/leavesType/delete", auth, async (req, res) => {
    const { _id } = req.body;
    try {
        const leave = await LeaveType.findById(_id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });

        if (req.user.roles !== 'Admin' && leave.employee.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied: Unauthorized to delete this leave.' });
        }

        await leave.deleteOne();
        res.status(200).send({ message: 'Leave deleted successfully.' });
    } catch (error) {
        console.error("Error deleting leave:", error);
        return res.status(500).send(`Internal server error: ${error.message}`);
    }
});

module.exports = route;
