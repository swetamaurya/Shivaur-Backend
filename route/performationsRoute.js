const express = require('express');
const router = express.Router();
const { Resignation, Termination } = require('../model/performationsModel');
const { auth } = require('../Middleware/authorization');

// Route to add a new resignation
router.post('/resignation/post', auth, async (req, res) => {
    try {
        const { noticeDate, resignationDate, ...otherData } = req.body;
        
        const resignation = new Resignation({
            ...otherData,
            noticeDate: noticeDate,
            resignationDate:  resignationDate,
            employee: req.user.id  // Assign the logged-in user's ID to the employee field
        });

        await resignation.save();
        res.status(201).json({ message: 'Resignation added successfully', resignation });
    } catch (error) {
        res.status(500).json({ message: 'Error adding resignation', error });
    }
});

router.get('/resignation/getAll', auth, async (req, res) => {
  try {
    const { roles, _id: userId } = req.user;
    const { page, limit } = req.query;

    // Roles with full access
    const fullAccessRoles = ['Admin', 'Manager', 'HR'];

    // Query based on roles
    const query = fullAccessRoles.includes(roles) ? {} : { employee: userId };

    if (!page || !limit) {
      const resignations = await Resignation.find(query)
        .populate('employee', 'name email')
        .sort({ _id: -1 });

      return res.status(200).json({
        data: resignations,
        totalResignations: resignations.length,
        pagination: false,
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const resignations = await Resignation.find(query)
      .populate('employee', 'name email')
      .sort({ _id: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalResignations = await Resignation.countDocuments(query);

    res.status(200).json({
      data: resignations,
      totalResignations,
      totalPages: Math.ceil(totalResignations / limit),
      currentPage: parseInt(page),
      perPage: parseInt(limit),
      pagination: true,
    });
  } catch (error) {
    console.error('Error retrieving resignations:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  

// Route to get a specific resignation by ID
router.get('/resignation/getSingle/:_id', auth, async (req, res) => {
    try {
        const { roles, _id: userId } = req.user;
        
        const resignation = await Resignation.findById(req.params._id)
            .populate('employee', 'name email');
        
        if (!resignation) return res.status(404).json({ message: 'Resignation not found' });

      

        res.status(200).json(resignation);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving resignation', error });
    }
});

// Route to update a resignation (Admins only, or the user's own resignation)
router.post('/resignation/update', auth, async (req, res) => {
    try {
      const { roles, _id: userId } = req.user;
      const { _id, ...updateData } = req.body;

      const resignation = await Resignation.findById(_id);
      if (!resignation) return res.status(404).json({ message: 'Resignation not found' });

      if (roles !== 'Admin' && resignation.employee.toString() !== userId.toString()) {
          return res.status(403).json({ message: 'Access denied: Unauthorized to update this resignation.' });
      }

      const updatedResignation = await Resignation.findByIdAndUpdate(_id, updateData, { new: true });
      res.json(updatedResignation);
    } catch (error) {
      console.error("Error updating resignation:", error);
      res.status(500).json({ message: 'Error updating resignation', error });
    }
});

// Route to delete a resignation (Admins only, or the user's own resignation)
router.post("/resignation/delete/:_id", auth, async (req, res) => {
  try {
      const { roles, _id: userId } = req.user;
      const { _id } = req.params;

      const resignation = await Resignation.findById(_id);
      if (!resignation) return res.status(404).json({ message: 'Resignation not found' });

      if (roles !== 'Admin' && resignation.employee.toString() !== userId.toString()) {
          return res.status(403).json({ message: 'Access denied: Unauthorized to delete this resignation.' });
      }

      await resignation.deleteOne();
      res.status(200).send({ message: 'Resignation deleted successfully.' });
  } catch (error) {
      console.error("Error deleting resignation:", error);
      res.status(500).send({ message: `Internal server error: ${error.message}` });
  }
});

// Route to approve or decline a resignation request (Admins only)
router.post('/resignation/approve', auth, async (req, res) => {
  const { _id, status } = req.body; // Extracting _id and resignationStatus from the request body
  const approvedBy = req.user.id; // Getting the admin's ID from the authenticated user

  // Check if the user is an admin
  if (req.user.roles !== 'Admin') {
      return res.status(403).json({ 
          message: 'Access denied: Only admins can approve or decline resignation requests.' 
      });
  }

  // Validate the input fields
  if (!_id || !status || 
      (status !== 'Approved' && status !== 'Declined')) {
      return res.status(400).json({ 
          message: 'Missing or invalid fields. Status must be either "Approved" or "Declined".' 
      });
  }

  try {
      // Update the resignation request in the database
      const updatedResignation = await Resignation.findByIdAndUpdate(
          _id,
          { status, approvedBy }, // Update status and admin who approved
          { new: true } // Return the updated document
      );

      // If the resignation request was not found
      if (!updatedResignation) {
          return res.status(404).json({ 
              message: 'Resignation request not found' 
          });
      }

      // Respond with the updated resignation data
      res.status(200).json({ 
          message: `Resignation request successfully ${status.toLowerCase()}`, 
          resignation: updatedResignation 
      });
  } catch (error) {
      // Handle unexpected errors
      console.error(`Error updating resignation request: ${error.message}`);
      res.status(500).json({ 
          message: 'Internal server error' 
      });
  }
});

///////////////////////////////////////// Termination //////////////////////////////////

// Route to add a new termination
router.post('/termination/post', auth, async (req, res) => {
    try {
        const { noticeDate, terminationDate, ...otherData } = req.body;

        const termination = new Termination({
            ...otherData,
            noticeDate: new Date(noticeDate),
            terminationDate: new Date(terminationDate)
         });

        await termination.save();
        res.status(201).json({ message: 'Termination added successfully', termination });
    } catch (error) {
        res.status(500).json({ message: 'Error adding termination', error });
    }
});

router.get('/termination/getAll', auth, async (req, res) => {
  try {
    const { roles, _id: userId } = req.user; // Extract user roles and ID
    const { page, limit } = req.query;

    // Roles with full access
    const fullAccessRoles = ['Admin', 'Manager', 'HR'];

    // Query logic based on roles
    const query = fullAccessRoles.includes(roles) ? {} : { employee: userId };

    if (!page || !limit) {
      // Fetch all terminations without pagination
      const terminations = await Termination.find(query)
        .populate('employee', 'name userId') // Populate employee details
        .sort({ _id: -1 }); // Sort by most recent

      return res.status(200).json({
        data: terminations,
        totalTerminations: terminations.length,
        pagination: false,
      });
    }

    // Pagination logic
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const terminations = await Termination.find(query)
      .populate('employee', 'name userId') // Populate employee details
      .sort({ _id: -1 }) // Sort by most recent
      .skip(skip)
      .limit(parseInt(limit));

    const totalTerminations = await Termination.countDocuments(query);

    // Return paginated data
    res.status(200).json({
      data: terminations,
      totalTerminations,
      totalPages: Math.ceil(totalTerminations / limit),
      currentPage: parseInt(page),
      perPage: parseInt(limit),
      pagination: true,
    });
  } catch (error) {
    console.error("Error retrieving terminations:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

  

// Route to get a specific termination by ID
router.get('/termination/getSingle/:_id', auth, async (req, res) => {
    try {
        const { roles, _id: userId } = req.user;
        
        const termination = await Termination.findById(req.params._id)
            .populate('employee', 'name userId');
        
        if (!termination) return res.status(404).json({ message: 'Termination not found' });

        if (roles !== 'Admin' && termination.employee._id.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Access denied: Unauthorized to view this termination.' });
        }

        res.status(200).json(termination);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving termination', error });
    }
});

// Route to update a termination (Admins only, or the user's own termination)
router.post('/termination/update', auth, async (req, res) => {
    try {
      const { roles, _id: userId } = req.user;
      const { _id, ...updateData } = req.body;

      const termination = await Termination.findById(_id);
      if (!termination) return res.status(404).json({ message: 'Termination not found' });

      if (roles !== 'Admin' && termination.employee.toString() !== userId.toString()) {
          return res.status(403).json({ message: 'Access denied: Unauthorized to update this termination.' });
      }

      const updatedTermination = await Termination.findByIdAndUpdate(_id, updateData, { new: true });
      res.json(updatedTermination);
    } catch (error) {
      console.error("Error updating termination:", error);
      res.status(500).json({ message: 'Error updating termination', error });
    }
});

// Route to delete a termination (Admins only, or the user's own termination)
router.post("/termination/delete/:_id", auth, async (req, res) => {
  try {
      const { roles, _id: userId } = req.user;
      const { _id } = req.params;

      const termination = await Termination.findById(_id);
      if (!termination) return res.status(404).json({ message: 'Termination not found' });

      if (roles !== 'Admin' && termination.employee.toString() !== userId.toString()) {
          return res.status(403).json({ message: 'Access denied: Unauthorized to delete this termination.' });
      }

      await termination.deleteOne();
      res.status(200).send({ message: 'Termination deleted successfully.' });
  } catch (error) {
      console.error("Error deleting termination:", error);
      res.status(500).send({ message: `Internal server error: ${error.message}` });
  }
});

module.exports = router;
