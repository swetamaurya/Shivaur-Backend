const express = require("express")
const { auth } = require("../Middleware/authorization");
const route = express.Router()
const dotenv = require("dotenv")
dotenv.config()
const multer = require("multer")
const { uploadFileToFirebase, bucket } = require('../utils/fireBase');
// const { logger } = require("../utils/logger");
const { Project, Seq } = require("../model/projectModel");
const upload = multer({ storage: multer.memoryStorage() });
const { Task } = require("../model/taskModel");

async function getNextSeqValue(seqName) {
  const SeqDoc = await Seq.findOneAndUpdate(
      { seqName },
      { $inc: { seqValue: 1 } },
      { new: true, upsert: true }
  );
   const SeqNumber = SeqDoc.seqValue.toString().padStart(4, '0'); // Pad the number to 3 digits
  return `PRO-${SeqNumber}`
}
 
route.get('/get/:id', auth, async (req, res) => {
  try {
    const { id } = req.params; // Get the project ID
    console.log("Project ID Requested:", id);
    
    const { fromDate, toDate } = req.query; // Get date range filters from query parameters

    // Date filter setup if provided
    let dateFilter = {};
    if (fromDate && toDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(fromDate),
          $lte: new Date(toDate)
        }
      };
    }

    // Fetch the project by ID and populate required fields
    const project = await Project.findById(id)
      .populate("assignedTo", "name email userId roles")
      .populate({ path: 'clientName', select: 'name userId email' })
      .populate({
        path: "tasks",
        match: dateFilter,
        options: { sort: { _id: -1 } },
        populate: [
          { path: "assignedTo", select: "ContractorName contractorId email" },
          { path: "assignedBy", select: "name email userId roles" },
          {
            path: 'materialManagement.material',
            select: 'material productId quantity unit'
          }
        ]
      })
      .populate({
        path: 'materialDetails.material',
        select: 'material productId quantity unit'
      })
      .exec();

    // If the project is not found
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Extract all tasks
    const tasks = project?.tasks || [];

    // Count workStatus occurrences in subTasks
    const subTaskStatusCounts = {};
    let totalSubTasks = 0;

    tasks.forEach(task => {
      if (task.subTask) {
        task.subTask.forEach(subTask => {
          subTaskStatusCounts[subTask.workStatus] = (subTaskStatusCounts[subTask.workStatus] || 0) + 1;
          totalSubTasks++;
        });
      }
    });

    // Calculate subTask status percentages
    const subTaskPercentages = {};
    for (const [status, count] of Object.entries(subTaskStatusCounts)) {
      subTaskPercentages[status] = totalSubTasks > 0 ? ((count / totalSubTasks) * 100).toFixed(2) : '0.00';
    }

    // Calculate task status counts
    const totalTasks = tasks.length;
    const taskCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    // Calculate task status percentages
    const taskPercentages = {};
    for (const [status, count] of Object.entries(taskCounts)) {
      taskPercentages[status] = totalTasks > 0 ? ((count / totalTasks) * 100).toFixed(2) : '0.00';
    }

    // Count overdue tasks
    const overdueTasks = tasks.filter(task =>
      new Date(task.deadlineDate) < new Date() && task.status !== 'Completed'
    ).length;

    // Return the response with task and subTask statistics
    res.status(200).json({
      projectDetails: project,
      taskStatistics: {
        totalTasks,
        overdueTasks,
        taskCounts,
        percentages: taskPercentages
      },
      subTaskStatistics: {
        totalSubTasks,
        subTaskStatusCounts,
        percentages: subTaskPercentages
      }
    });

  } catch (error) {
    console.error(`Error fetching project: ${error.message}`);
    res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
});







route.get('/get', auth, async (req, res) => {
  try {
    const { id, roles } = req.user; // Extract user details from the request
    const { page, limit,   } = req.query; // Extract pagination and data query parameters

    let projects;
    let totalProjects;

    if (!page || !limit) {
      // Fetch all projects if 'data=all' is specified
      if (roles === 'Admin' || roles === 'HR' || roles === 'Manager') {
        // Admin and HR can see all projects
        projects = await Project.find()
          .populate("assignedTo", "name email userId")
          .populate({ path: 'clientName', select: 'name userId email' }) // Populate clientName with required fields
      
          .populate({
            path: "tasks",
            options: { sort: { _id: -1 } },
            populate: [
              { path: "assignedTo", select: "ContractorName email contractorId" },
              { path: "assignedBy", select: "name email userId" },
              {
                path: 'materialManagement.material', // Fix: Ensure this correctly populates material
                select: 'material productId quantity unit'
              }
            ]
          })
          .populate({
            path: 'materialDetails.material', //  Fix: Correct .populate() syntax
            select: 'material productId quantity unit'
          })

          .sort({ _id: -1 }).exec();
      
      } else if (roles === 'Supervisor') {
        // Supervisors can see projects assigned to their team
        projects = await Project.find({ supervisor: id })
          .populate("assignedTo", "name email userId")
          .populate({ path: 'clientName', select: 'name userId email' }) // Populate clientName with required fields
      
          .populate({
            path: "tasks",
            options: { sort: { _id: -1 } },
            populate: [
              { path: "assignedTo", select: "ContractorName email contractorId" },
              { path: "assignedBy", select: "name email userId" },
              {
                path: 'materialManagement.material', // Fix: Ensure this correctly populates material
                select: 'material productId quantity unit'
              }
            ]
          })
          .populate({
            path: 'materialDetails.material', //  Fix: Correct .populate() syntax
            select: 'material productId quantity unit'
          }) .sort({ _id: -1 }).exec();
      } else {
        // Non-admin roles can only see projects assigned to them
        projects = await Project.find({ assignedTo: id })
          .populate("assignedTo", "name email userId")
          .populate({ path: 'clientName', select: 'name userId email' }) // Populate clientName with required fields
      
          .populate({
            path: "tasks",
            options: { sort: { _id: -1 } },
            populate: [
              { path: "assignedTo", select: "ContractorName email contractorId " },
              { path: "assignedBy", select: "name email userId" },
              {
                path: 'materialManagement.material', // Fix: Ensure this correctly populates material
                select: 'material productId quantity unit'
              }
            ]
          })
          .populate({
            path: 'materialDetails.material', //  Fix: Correct .populate() syntax
            select: 'material productId quantity unit'
          })
          .sort({ _id: -1 }).exec();
      }

      res.status(200).json({
        data: projects,
        totalProjects: projects.length,
        pagination: false, // Indicate that pagination is not applied
      });
    } else if (page && limit) {
      // Apply pagination if 'page' and 'limit' are provided
      const skip = (page - 1) * limit;

      if (roles === 'Admin' || roles === 'HR' || roles === 'Manager') {
        // Admin and HR can see all projects
        projects = await Project.find()
          .populate("assignedTo", "name email userId")
          .populate({ path: 'clientName', select: 'name userId email' }) // Populate clientName with required fields
      
          .populate({
            path: "tasks",
            options: { sort: { _id: -1 } },
            populate: [
              { path: "assignedTo", select: "ContractorName email contractorId " },
              { path: "assignedBy", select: "name email userId" },
              {
                path: 'materialManagement.material', // Fix: Ensure this correctly populates material
                select: 'material productId quantity unit'
              }
            ]
          })
          .populate({
            path: 'materialDetails.material', //  Fix: Correct .populate() syntax
            select: 'material productId quantity unit'
          })
          .sort({ _id: -1 })
          .skip(skip)
          .limit(parseInt(limit)).exec();

        totalProjects = await Project.countDocuments();
       } else if (roles === 'Supervisor') {
        // Supervisors can see projects assigned to their team
        projects = await Project.find({ supervisor: id })
          .populate("assignedTo", "name email userId")
          .populate({ path: 'clientName', select: 'name userId email' }) // Populate clientName with required fields
      
          .populate({
            path: "tasks",
            options: { sort: { _id: -1 } },
            populate: [
              { path: "assignedTo", select: "ContractorName email contractorId " },
              { path: "assignedBy", select: "name email userId" },
              {
                path: 'materialManagement.material', // Fix: Ensure this correctly populates material
                select: 'material productId quantity unit'
              }
            ]
          })
          .populate({
            path: 'materialDetails.material', //  Fix: Correct .populate() syntax
            select: 'material productId quantity unit'
          })
          .sort({ _id: -1 })
          .skip(skip)
          .limit(parseInt(limit)).exec();

        totalProjects = await Project.countDocuments({ supervisor: id });
      } else {
        // Non-admin roles can only see projects assigned to them OR where they have assigned tasks
        projects = await Project.find({
          $or: [
            { assignedTo: id }, // Employee is assigned to the project
            { tasks: { $in: await Task.find({ assignedTo: id }).distinct('_id') } } // Employee has a task in the project
          ]
        })
          .populate("assignedTo", "name email userId")
          .populate({ path: 'clientName', select: 'name userId email' }) // Populate clientName with required fields
          .populate({
            path: "tasks",
            options: { sort: { _id: -1 } },
            populate: [
              { path: "assignedTo", select: "ContractorName email contractorId " },
              { path: "assignedBy", select: "name email userId" },
              {
                path: 'materialManagement.material', // Fix: Ensure this correctly populates material
                select: 'material productId quantity unit'
              }
            ]
          })
          .populate({
            path: 'materialDetails.material', //  Fix: Correct .populate() syntax
            select: 'material productId quantity unit'
          })
          .sort({ _id: -1 })
          .skip(skip)
          .limit(parseInt(limit)).exec();
      
        totalProjects = await Project.countDocuments({
          $or: [
            { assignedTo: id },
            { tasks: { $in: await Task.find({ assignedTo: id }).distinct('_id') } }
          ]
        });
      }
      

      res.status(200).json({
        data: projects,
        totalProjects,
        totalPages: Math.ceil(totalProjects / limit),
        currentPage: parseInt(page),
        perPage: parseInt(limit),
        pagination: true, // Indicate that pagination is applied
      });
    } else {
      // Missing or invalid query parameters
      res.status(400).json({ message: 'Invalid request. Provide either "data=all" or "page" and "limit".' });
    }
  } catch (error) {
    console.error(`Error fetching projects: ${error.message}`);
    res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
});



 

route.post("/post", auth, upload.fields([
  { name: 'mbfile', maxCount: 100 },
  { name: 'sdFiles', maxCount: 100 },
  { name: 'file', maxCount: 100 }
]), async (req, res) => {
  try {
    // Initialize arrays for file URLs
    let mbfileUrls = [];
    let sdfileUrls = [];
    let fileUrls = [];

    console.log(req.files)
    // Handle file upload for 'mbfile'
    if (req.files?.mbfile?.length > 0) {
      mbfileUrls = await uploadFileToFirebase(req.files.mbfile);
    }

    // Handle file upload for 'sdFiles'
    if (req.files?.sdFiles?.length > 0) {
      sdfileUrls = await uploadFileToFirebase(req.files.sdFiles);
    }

    // Handle file upload for 'file'
    if (req.files?.file?.length > 0) {
      fileUrls = await uploadFileToFirebase(req.files.file);
    }

    // Ensure paymentDetails and sdDetails are arrays before mapping
    const paymentDetailsArray = Array.isArray(req.body.paymentDetails) ? req.body.paymentDetails : [];
    const sdDetailsArray = Array.isArray(req.body.sdDetails) ? req.body.sdDetails : [];

    // Create the new project object
    const newProject = new Project({
      ...req.body, // Extract the project details from the request body
      document: fileUrls, // Attach the uploaded files to the 'document' field

      paymentDetails: paymentDetailsArray.map(payment => {
        if (!payment.mbfile) payment.mbfile = []; // Ensure it's an array
        if (mbfileUrls.length > 0) {
          payment.mbfile = [...payment.mbfile, ...mbfileUrls]; // Add uploaded mbfile URLs
        }
        return payment;
      }),

      sdDetails: sdDetailsArray.map(sd => {
        if (!sd.sdFiles) sd.sdFiles = []; // Ensure it's an array
        if (sdfileUrls.length > 0) {
          sd.sdFiles = [...sd.sdFiles, ...sdfileUrls]; // Add uploaded sdFiles URLs
        }
        return sd;
      }),
    });

    // Generate projectId using the sequence generator
    newProject.projectId = await getNextSeqValue('projectId');

    // Save the new project to the database
    const savedProject = await newProject.save();

    console.log("Project created and saved:", savedProject);

    // Return success response
    return res.status(200).send({ message: 'Project created successfully', project: savedProject });

  } catch (error) {
    console.error('Error creating project:', error.message);
    return res.status(500).send({ message: `Internal server error: ${error.message}` });
  }
});






route.post("/update", auth, upload.fields([
  { name: 'mbfile', maxCount: 100 },
  { name: 'sdFiles', maxCount: 100 },
  { name: 'file', maxCount: 100 }
]), async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    console.log("Request body:", req.body);

    // Initialize file URLs for each type of file
    let mbfileUrls = [];
    let sdfileUrls = [];
    let fileUrls = [];

    // Handle file uploads for 'file' field
    if (req.files.file && req.files.file.length > 0) {
      const newFileUrls = await uploadFileToFirebase(req.files.file);
      fileUrls = [...fileUrls, ...newFileUrls];
    }

    // Handle file uploads for 'mbfile' field
    if (req.files.mbfile && req.files.mbfile.length > 0) {
      mbfileUrls = await uploadFileToFirebase(req.files.mbfile);
    }

    // Handle file uploads for 'sdFiles' field
    if (req.files.sdFiles && req.files.sdFiles.length > 0) {
      sdfileUrls = await uploadFileToFirebase(req.files.sdFiles);
    }

    // Find the document by ID
    const currentDocument = await Project.findById(_id);

    if (!currentDocument) {
      return res.status(404).send("Document not found.");
    }

    // Prepare the update object
    const updateFields = {
      $set: updateData,  // Update the fields provided in the request body
    };

    // If new files are uploaded, append them to the relevant fields
    if (fileUrls.length > 0) {
      updateFields.$push = { document: { $each: fileUrls } };  // Append files to 'document'
    }
    if (mbfileUrls.length > 0) {
      updateFields.$push = { mbfile: { $each: mbfileUrls } };  // Append files to 'mbfile' field
    }
    if (sdfileUrls.length > 0) {
      updateFields.$push = { sdFiles: { $each: sdfileUrls } };  // Append files to 'sdFiles' field
    }

    // Update the document with new data and appended files
    const updatedDocument = await Project.findByIdAndUpdate(
      _id,
      updateFields,
      { new: true }  // Return the updated document
    );

    console.log("Updated document:", updatedDocument);
    return res.status(200).send(updatedDocument);

  } catch (error) {
    console.error(`Error updating document: ${error.message}`);
    return res.status(500).send("Internal server error");
  }
});


 

route.post("/delete", auth, async (req, res) => {
  try {
    const { _id } = req.body;

    if (!_id || (Array.isArray(_id) && _id.length === 0)) {
      return res.status(400).send("No _id provided for deletion.");
    }

    const _idArray = Array.isArray(_id) ? _id : [_id];

    // Delete multiple items if _id is an array, otherwise delete a single item
    const deletedProjects = await Project.deleteMany({ _id: { $in: _idArray } });

    if (deletedProjects.deletedCount === 0) {
      return res.status(404).send("No Projects found for the provided ID(s).");
    }

    return res.status(200).send({
      message: `${deletedProjects.deletedCount} Project deleted successfully.`,
      deletedProjects
    });
  } catch (error) {
    console.error("Error deleting Projects:", error);
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});




// Assign a project to a user
route.post('/assign', auth, async (req, res) => {
  try {
    const { projectId, userId } = req.body;
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { assignedTo: userId },
      { new: true }
    );
    return res.status(200).json(updatedProject);
  } catch (error) {
    logger.error(`Error managing encryption keys: ${error.message}`);
    return res.status(500).json({ message: error.message });
  }
});


 

route.post('/deleteFile', auth, async (req, res) => {
  const { _id, fileName } = req.body; // Expect project ID and file URL to delete

  if (!fileName) {
      return res.status(400).json({ message: 'fileName is required.' });
  }

  try {
      // Find the project by ID
      const project = await Project.findById(_id);
      if (!project) {
          return res.status(404).send({ message: 'Project not found' });
      }

      // Extract the file name from the URL
      const extractedFileName = fileName.split('?')[0].split('/').pop(); // Gets "491428495.png"
      console.log("Extracted File Name:", extractedFileName); // Debug log

      // Find the exact URL in the document array that contains the file name
      const fileUrlToDelete = project.document.find(fileUrl => {
          const existingFileName = fileUrl.split('?')[0].split('/').pop();
          return existingFileName === extractedFileName;
      });

      if (!fileUrlToDelete) {
          return res.status(404).send({ message: 'File not found in project.' });
      }

      // Delete the file from Firebase Storage using the extracted file name
      const file = bucket.file(extractedFileName); // Reference to Firebase file
      await file.delete(); // Delete file from Firebase

      // Remove the deleted file URL from the project document array
      project.document = project.document.filter(fileUrl => fileUrl !== fileUrlToDelete);
      await project.save();

      res.status(200).send({ message: 'File deleted successfully from project.' });
  } catch (error) {
      console.error('Error deleting project file:', error);
      res.status(500).send({ error: `Failed to delete file: ${error.message}` });
  }
});

module.exports = route
