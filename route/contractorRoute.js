const express = require('express');
const Contractor = require('../model/contractorModel'); // Adjust the path to your model
const { auth } = require('../Middleware/authorization');
const multer = require("multer")

const { uploadFileToFirebase, bucket } = require('../utils/fireBase');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get('/getAll', auth, async (req, res) => {
  try {
    const { page, limit } = req.query;

    let contractors, totalContractors, totalPages;

    if (!page || !limit) {
      // Non-paginated request: Fetch all contractors
      contractors = await Contractor.find()
  
      .populate({
        path: "projectName",
        options: { sort: { _id: -1 } },
        populate: [
          { path: "clientName", select: "name email userId" },
          { path: "assignedTo", select: "name email userId" },

          { path: "tasks"  }
        ]
      })  

        .populate('tasks') // Populate tasks with relevant fields
        .sort({ createdAt: -1 });

      totalContractors = contractors.length;
      totalPages = 1; // No pagination
    } else {
      // Paginated request
      const skip = (parseInt(page) - 1) * parseInt(limit);

      contractors = await Contractor.find()
      .populate({
        path: "projectName",
        options: { sort: { _id: -1 } },
        populate: [
          { path: "clientName", select: "name email userId" },
          { path: "assignedTo", select: "name email userId" },
          { path: "tasks"  }
        ]
      }) 
        .populate('tasks') // Populate tasks
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      totalContractors = await Contractor.countDocuments();
      totalPages = Math.ceil(totalContractors / parseInt(limit));
    }

    res.status(200).json({
      data: contractors,
      pagination: page && limit ? {
        currentPage: parseInt(page),
        pageSize: parseInt(limit),
        totalContractors,
        totalPages,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching contractors:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});



router.get('/get', auth, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: 'Contractor ID is required.' });
    }

    const contractor = await Contractor.findById(id)
    .populate({
      path: "projectName",
      options: { sort: { _id: -1 } },
      populate: [
          { path: "clientName", select: "name email userId" },
          { path: "assignedTo", select: "name email userId" },
        { path: "tasks"  }
      ]
    })   
    .populate('tasks'); // Populate tasks with relevant fields

    if (!contractor) {
      return res.status(404).json({ message: 'Contractor not found.' });
    }

    res.status(200).json(contractor);
  } catch (error) {
    console.error('Error fetching contractor:', error);
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

     const newContractor = new Contractor({
      ...req.body,           
      files: fileUrls,           
 

    });
    // console.log(req.body)
     await newContractor.save();
    // console.log("Contractor created successfully!", newContractor);

     return res.status(200).json({ message: 'Contractor created successfully!', newContractor });

  } catch (error) {
    console.error('Error adding files to Contractor:', error);
    return res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
});

 
// Update  
router.post("/update", auth, upload.array('file'), async (req, res) => {
  try {
    const { id, ...updateData } = req.body;
    // console.log(req.body)
    let fileUrls = [];

    // If there are new files, upload them
    if (req.files && req.files.length > 0) {
      const newFileUrls = await uploadFileToFirebase(req.files);
      fileUrls = [...fileUrls, ...newFileUrls];
    }

    // Find the current Contractor
    const currentContractor = await Contractor.findById(id);
    if (!currentContractor) {
      return res.status(404).send("Contractor not found");
    }

    // Prepare the update fields
    const updateFields = {
      ...updateData,
      files: fileUrls.length > 0 ? [...currentContractor.files, ...fileUrls] : currentContractor.files
    };

    // Update the task
    const updatedContractor = await Contractor.findByIdAndUpdate(id, updateFields, { new: true });

    return res.status(200).json({
      message: 'Contractor updated successfully!',
      updatedContractor
    });
  } catch (error) {
    console.error("Error updating  Contractor:", error);
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

 
 


// Update bank details route
router.post('/update-bank-details', auth, async (req, res) => {
  try {
    const { _id, bankDetails } = req.body;

    const user = await Contractor.findByIdAndUpdate(_id, { bankDetails }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'Contractor not found' });
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

    const user = await Contractor.findByIdAndUpdate(_id, { bankDetails: null }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'Contractor not found' });
    }

    res.status(200).json({ message: 'Bank details deleted successfully!', user });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});


router.post('/deleteFile', auth, async (req, res) => {
  const { _id, fileName } = req.body; // Expect project ID and file URL to delete

  if (!_id || !fileName) {
    return res.status(400).json({ message: 'Both _id and fileName are required.' });
  }

  try {
    // Find the contractor by ID
    const contractor = await Contractor.findById(_id);
    if (!contractor) {
      return res.status(404).json({ message: 'Contractor not found.' });
    }

        // Ensure files array exists
        if (!Array.isArray(contractor.files)) {
          return res.status(400).json({ message: 'Contractor has no files to delete.' });
        }

    // Extract the file name from the URL
    const extractedFileName = fileName.split('?')[0].split('/').pop();
    console.log('Attempting to delete file:', extractedFileName);

    // Check if the file exists in the contractor's files array
    const fileUrlToDelete = contractor.files.find(fileUrl => {
      const existingFileName = fileUrl.split('?')[0].split('/').pop();
      return existingFileName === extractedFileName;
    });

    if (!fileUrlToDelete) {
      return res.status(404).json({ message: 'File not found in contractor documents.' });
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

    // Remove the file URL from the contractor's files array
    contractor.files = contractor.files.filter(fileUrl => fileUrl !== fileUrlToDelete);
    await contractor.save(); // Save the updated contractor document

    res.status(200).json({ message: 'File deleted successfully from contractor.' });
  } catch (error) {
    console.error('Error deleting contractor file:', error.message);
    res.status(500).json({ message: `Failed to delete file: ${error.message}` });
  }
});



 
 

module.exports = router;
