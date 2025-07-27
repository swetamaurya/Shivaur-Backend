const express = require('express');
const router = express.Router();
const Policy = require('../model/policyModel');  // Adjust the path if needed
const multer = require("multer");
const { uploadFileToFirebase } = require('../utils/fireBase');
const { auth } = require('../Middleware/authorization');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/all', auth, async (req, res) => {
  try {
    const { roles, id } = req.user; // Extract user roles and ID
    const { page, limit } = req.query;

    // Define query logic: roles with full access (Admin, Manager, HR, Employee)
    const rolesWithFullAccess = ['Admin', 'Manager', 'HR', 'Employee'];

    const query = rolesWithFullAccess.includes(roles) ? {} : { userId: id };

    if (!page || !limit) {
      // Fetch all policies without pagination
      const policies = await Policy.find(query)
        .populate('department', 'departments') // Populate department details
        // .populate('userId', 'name email') // Populate user details
        .sort({ createdAt: -1 }); // Sort by creation date (descending)

      return res.status(200).json({
        data: policies,
        totalPolicies: policies.length,
        pagination: false,
      });
    }

    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const policies = await Policy.find(query)
      .populate('department', 'departments') // Populate department details
      // .populate('userId', 'name email') // Populate user details
      .sort({ createdAt: -1 }) // Sort by creation date (descending)
      .skip(skip)
      .limit(parseInt(limit));

    const totalPolicies = await Policy.countDocuments(query);

    res.status(200).json({
      data: policies,
      totalPolicies,
      totalPages: Math.ceil(totalPolicies / limit),
      currentPage: parseInt(page),
      perPage: parseInt(limit),
      pagination: true,
    });
  } catch (error) {
    console.error("Error fetching policies:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});




// Get a specific policy by ID with authorization check
router.get('/:id', auth, async (req, res) => {
  const { roles, id: userId } = req.user;

  try {
    const policy = await Policy.findById(req.params.id).populate('department','departments');

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // // Check if the user is authorized to view this policy
    // if (roles !== 'Admin' && policy.userId.toString() !== userId) {
    //   return res.status(403).json({ error: 'Unauthorized access to this policy' });
    // }

    res.status(200).json(policy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

// Create a new policy with file upload
router.post("/post", auth, upload.array('file'), async (req, res) => {
  try {
    let fileUrls = [];

    if (req.files && req.files.length > 0) {
      const newFileUrls = await uploadFileToFirebase(req.files);
      fileUrls = [...fileUrls, ...newFileUrls];
    }

    const newPolicy = new Policy({
      ...req.body,
      files: fileUrls,
      userId: req.user.id  // Associate policy with the user creating it
    });

    const savedPolicy = await newPolicy.save();
    console.log("Policy added and saved:", savedPolicy);

    return res.status(200).send({ message: 'Policy created successfully', Policy: savedPolicy });
  } catch (error) {
    console.error('Error adding files to Policy:', error);
    return res.status(500).send({ message: `Internal server error: ${error.message}` });
  }
});


router.post('/update', auth, upload.array('file'), async (req, res) => {
  const { _id, ...updateData } = req.body;
  const { roles, id: userId } = req.user;

  try {
    // Find the policy by ID and check ownership
    const currentPolicy = await Policy.findById(_id);
    if (!currentPolicy) return res.status(404).send("Policy not found.");

    if (roles !== 'Admin' && currentPolicy.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to update this policy' });
    }

    // Handle file uploads
    let fileUrls = [];
    if (req.files && req.files.length > 0) {
      const newFileUrls = await uploadFileToFirebase(req.files);
      fileUrls = [...fileUrls, ...newFileUrls];
    }

    // Prepare update object with new files and updatedAt
    const updateFields = {
      ...updateData,
      files: fileUrls.length > 0 ? [...currentPolicy.files, ...fileUrls] : currentPolicy.files,
      updatedAt: Date.now() // Manually update the updatedAt field
    };

    // Update the policy and include the updatedAt timestamp update
    const updatedPolicy = await Policy.findByIdAndUpdate(_id, updateFields, { new: true });
    res.status(200).json({ message: 'Policy updated successfully', policy: updatedPolicy });

  } catch (error) {
    console.error(`Error updating document: ${error.message}`);
    res.status(500).send("Internal server error");
  }
});



// Delete a policy by ID with authorization check
router.post('/delete', auth, async (req, res) => {
  const { roles, id: userId } = req.user;
  const { _id } = req.body;

  try {
    const policy = await Policy.findById(_id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    // Ensure only admins or the policy owner can delete
    if (roles !== 'Admin' && policy.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to delete this policy' });
    }

    await policy.deleteOne();
    res.status(200).json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete policy' });
  }
});

module.exports = router;
