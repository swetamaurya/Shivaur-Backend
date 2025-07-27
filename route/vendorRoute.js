const express = require('express');
const { auth } = require('../Middleware/authorization');
const Vendor = require('../model/vendorModel');
const multer = require("multer")

const { uploadFileToFirebase,bucket } = require('../utils/fireBase');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get('/getAll', auth, async (req, res) => {
  try {
    const { page, limit } = req.query;

    let vendors, totalVendors, totalPages;

    if (!page || !limit) {
      // Non-paginated request: Fetch all Vendors
      vendors = await Vendor.find()
      .populate('material') // Populate tasks with relevant fields

        // .populate('task', 'title status') // Populate tasks with relevant fields
        .sort({ createdAt: -1 });

      totalVendors = vendors.length;
      totalPages = 1; // No pagination
    } else {
      // Paginated request
      const skip = (parseInt(page) - 1) * parseInt(limit);

      vendors = await Vendor.find()
      .populate('material') // Populate tasks with relevant fields

        // .populate('task', 'title status') // Populate tasks with relevant fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      totalVendors = await Vendor.countDocuments();
      totalPages = Math.ceil(totalVendors / parseInt(limit));
    }

    res.status(200).json({
      data: vendors,
      pagination: page && limit ? {
        currentPage: parseInt(page),
        pageSize: parseInt(limit),
        totalVendors,
        totalPages,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching Vendors:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});



router.get('/get', auth, async (req, res) => {
  try {
    const { id } = req.query;
    console.log(req.query); // Keep for debugging but remove in production

    // Check if ID is present in the query parameters
    if (!id) {
      return res.status(400).json({ message: 'Vendor ID is required.' });
    }

    // Fetch the vendor from the database by ID and populate related fields
    const vendor = await Vendor.findById(id)
      .populate('material') // Populate the 'projectName' field (if required, populate specific fields)
      // .populate('task', 'title status') // Uncomment this if you also need to populate 'task' field with 'title' and 'status'

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found.' });
    }

    // Send the populated vendor object as response
    res.status(200).json(vendor);

  } catch (error) {
    console.error('Error fetching Vendor:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});


router.post("/post", auth, upload.array('file'), async (req, res) => {
  try {
     let fileUrls = [];

        if (req.files && req.files.length > 0) {
              const newFileUrls = await uploadFileToFirebase(req.files); 
              fileUrls = [...fileUrls, ...newFileUrls];  
    }

     const newVendor = new Vendor({
      ...req.body,           
      files: fileUrls,           
 

    });
    // console.log(req.body)
     await newVendor.save();
    // console.log("Vendor created successfully!", newVendor);

     return res.status(200).json({ message: 'Vendor created successfully!', newVendor });

  } catch (error) {
    console.error('Error adding files to Vendor:', error);
    return res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
});

 
// Update  
router.post("/update", auth, upload.array('file'), async (req, res) => {
  try {
    const { id, ...updateData } = req.body;
    console.log('Request body: ',req.body);
    let fileUrls = [];

    // If there are new files, upload them
    if (req.files && req.files.length > 0) {
      const newFileUrls = await uploadFileToFirebase(req.files);
      fileUrls = [...fileUrls, ...newFileUrls];
    }

    // Find the current Vendor
    const currentVendor = await Vendor.findById(id);
    if (!currentVendor) {
      return res.status(404).send("Vendor not found");
    }

    // Prepare the update fields
    const updateFields = {
      ...updateData,
      files: fileUrls.length > 0 ? [...currentVendor.files, ...fileUrls] : currentVendor.files
    };

    // Update the task
    const updatedVendor = await Vendor.findByIdAndUpdate(id, updateFields, { new: true });
    console.log('My updated data is ',updatedVendor)
    return res.status(200).json({
      message: 'Vendor updated successfully!',
      updatedVendor
    });
  } catch (error) {
    console.error("Error updating  Vendor:", error);
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

 


// Update bank details route
router.post('/update-bank-details', auth, async (req, res) => {
  try {
    const { _id, bankDetails } = req.body;

    const user = await Vendor.findByIdAndUpdate(_id, { bankDetails }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.status(200).json({ message: 'Bank details updated successfully!', user });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Delete bank details route
router.post('/delete-bank-details', auth, async (req, res) => {
  try {
    const { _id } = req.body;

    const user = await Vendor.findByIdAndUpdate(_id, { bankDetails: null }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.status(200).json({ message: 'Bank details deleted successfully!', user });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}); 

router.post('/deleteFile', auth, async (req, res) => {
  const { _id, fileName } = req.body; // Expect vendor ID and file URL to delete

  if (!_id || !fileName) {
    return res.status(400).json({ message: 'Both _id and fileName are required.' });
  }

  try {
    // Find the vendor by ID
    const vendor = await Vendor.findById(_id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found.' });
    }

    // Ensure files array exists
    if (!Array.isArray(vendor.files)) {
      return res.status(400).json({ message: 'Vendor has no files to delete.' });
    }

    // Extract the file name from the URL
    const extractedFileName = fileName.split('?')[0].split('/').pop();
    console.log('Attempting to delete file:', extractedFileName);

    // Check if the file exists in the vendor's files array
    const fileUrlToDelete = vendor.files.find(fileUrl => {
      const existingFileName = fileUrl.split('?')[0].split('/').pop();
      return existingFileName === extractedFileName;
    });

    if (!fileUrlToDelete) {
      return res.status(404).json({ message: 'File not found in vendor documents.' });
    }

    // Reference to Firebase file
    const file = bucket.file(extractedFileName);
    try {
      await file.delete(); // Attempt to delete the file from Firebase Storage
      console.log(`File ${extractedFileName} deleted successfully from Firebase.`);
    } catch (error) {
      if (error.code === 404) {
        console.warn('File not found in Firebase Storage. Proceeding to remove from database.');
      } else {
        throw error; // Re-throw other errors
      }
    }

    // Remove the file URL from the vendor's files array
    vendor.files = vendor.files.filter(fileUrl => fileUrl !== fileUrlToDelete);
    await vendor.save(); // Save the updated vendor document

    res.status(200).json({ message: 'File deleted successfully from vendor.' });
  } catch (error) {
    console.error('Error deleting vendor file:', error.message);
    res.status(500).json({ message: `Failed to delete file: ${error.message}` });
  }
});

module.exports = router;
