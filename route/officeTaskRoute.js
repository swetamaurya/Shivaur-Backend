const express = require("express");
const route = express.Router();
const {auth} = require("../Middleware/authorization");
const {OfficeTask} = require("../model/officeTaskModel");
const multer = require("multer")
const { uploadFileToFirebase , bucket} = require('../utils/fireBase');
// const { logger } = require("../utils/logger");
const { Project } = require("../model/projectModel");
const Contractor = require("../model/contractorModel");
// const { Project } = require("../model/projectModel");
const upload = multer({ storage: multer.memoryStorage() });
 
route.get('/get', auth, async (req, res) => {
  try {
    const { roles, id } = req.user;
    const { page, limit } = req.query;

    // Roles with full access
    const fullAccessRoles = ['Admin', 'Manager', 'HR'];

    // Query based on roles
    const query = fullAccessRoles.includes(roles) ? {} : { assignedTo: id };

    if (!page || !limit) {
      const tasks = await OfficeTask.find(query)
        .populate('project', 'projectName projectId')
        .populate('assignedBy', 'name email userId')
        .populate('assignedTo', 'name email userId')
        .sort({ _id: -1 })
        .exec();

      return res.status(200).json({
        data: tasks,
        totalTasks: tasks.length,
        pagination: false,
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tasks = await OfficeTask.find(query)
      .populate('project', 'projectName projectId')
      .populate('assignedBy', 'name email userId')
      .populate('assignedTo', 'name email userId')
      .sort({ _id: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .exec();

    const totalTasks = await OfficeTask.countDocuments(query);

    res.status(200).json({
      data: tasks,
      totalTasks,
      totalPages: Math.ceil(totalTasks / limit),
      currentPage: parseInt(page),
      perPage: parseInt(limit),
      pagination: true,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Get a single task by ID - Only assigned tasks for non-admins
route.get("/get/:_id", auth, async (req, res) => {
  try {
    const { _id } = req.params;
    const { roles, id } = req.user; // Extract user role and ID

    // Find the task by ID
    const task = await OfficeTask.findById(_id)
    .populate("project", "projectName projectId")
    .populate("assignedBy", "name email userId")
    .populate('assignedTo', 'name email userId')
     
    .sort({ _id: -1 }).exec();
    if (!task) {
      return res.status(404).send("Task not found");
    }

     

    res.status(200).json(task);
  } catch (error) {
    console.error("Error fetching task by ID:", error);
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});




route.post("/create", auth, upload.array('file'), async (req, res) => {
  try {
     let fileUrls = [];

        if (req.files && req.files.length > 0) {
              const newFileUrls = await uploadFileToFirebase(req.files); 
              fileUrls = [...fileUrls, ...newFileUrls];  
    }

     const newTask = new OfficeTask({
      ...req.body,           
      files: fileUrls,           
       assignedBy:req.user.id, 


    });
    console.log(req.body)
     const savedTask = await newTask.save();
    console.log("Task added and saved:", savedTask);

     return res.status(200).send({ message: 'Task created successfully', Task: savedTask });

  } catch (error) {
    console.error('Error adding files to Task:', error);
    return res.status(500).send({ message: `Internal server error: ${error.message}` });
  }
});

 
// Update  
route.post("/update", auth, upload.array('file'), async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    let fileUrls = [];

    // If there are new files, upload them
    if (req.files && req.files.length > 0) {
      const newFileUrls = await uploadFileToFirebase(req.files);
      fileUrls = [...fileUrls, ...newFileUrls];
    }

    // Find the current task
    const currentTask = await OfficeTask.findById(_id);
    if (!currentTask) {
      return res.status(404).send("Task not found");
    }

    // Prepare the update fields
    const updateFields = {
      ...updateData,
      files: fileUrls.length > 0 ? [...currentTask.files, ...fileUrls] : currentTask.files
    };

    // Update the task
    const updatedTask = await OfficeTask.findByIdAndUpdate(_id, updateFields, { new: true });

    return res.status(200).json({
      message: 'Task updated successfully',
      Task: updatedTask
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});



//  Delete  
route.post("/delete", auth, async (req, res) => {
  try {
    const { _id} = req.body;

    if (!_id || (Array.isArray(_id) && _id.length === 0)) {
      return res.status(400).send("No _id provided for deletion.");
    }

     const _idArray = Array.isArray(_id) ? _id : [_id];

    // Delete multiple items if _id is an array, otherwise delete a single item
    const deletedTasks = await OfficeTask.deleteMany({ _id: { $in: _idArray } });

    if (deletedTasks.deletedCount === 0) {
      return res.status(404).send("No Tasks found for the provided ID(s).");
    }

    return res.status(200).send({
      message: `${deletedTasks.deletedCount} Task deleted successfully.`,
      deletedTasks
    });
  } catch (error) {
    console.error("Error deleting Tasks:", error);
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});



route.post("/create-and-assign", auth, upload.array('file'), async (req, res) => {
  try {
    let fileUrls = [];

    // Handle file uploads to Firebase
    if (req.files && req.files.length > 0) {
      const newFileUrls = await uploadFileToFirebase(req.files);
      fileUrls = [...fileUrls, ...newFileUrls];
    }

    // Destructure project and other task data from the request body
    let { project, ...taskData } = req.body;
console.log("frontend data",req.body)
    // Check for both `assignedTo` and `userIds` fields in the request body
    let userIds = req.body.assignedTo || req.body.userIds;

    // If `assignedTo` or `userIds` is a single ID, convert it to an array
    if (!Array.isArray(userIds)) {
      userIds = [userIds];
    }

    // Create a single task with multiple assignees
    const newTask = new OfficeTask({
      ...taskData,
      files: fileUrls,
      assignedBy: req.user.id,
      assignedTo: userIds, // Assign multiple users in one task
      project: project,
    });

    const savedTask = await newTask.save();
console.log("savedTask",savedTask)
    // Update the Project with the new task ID
    let updatedProject;
    if (project) {
      updatedProject = await Project.findByIdAndUpdate(
        project,
        { $push: { tasks: savedTask._id } }, // Add the single task ID
        { new: true, useFindAndModify: false }
      ).populate('tasks'); // Populate the tasks array with the full task details
    }


    // Update each assigned contractor's `task` and `projectName` fields
    if (userIds && userIds.length > 0) {
      await Promise.all(
        userIds.map(async (contractorId) => {
          await Contractor.findByIdAndUpdate(
            contractorId,
            {
              $addToSet: { task: savedTask._id, projectName: project }, // Ensure no duplicates
            },
            { new: true, useFindAndModify: false }
          );
        })
      );
    }

    return res.status(200).send({
      message: 'Task created and assigned successfully',
      project: updatedProject, // Send back the full updated project with all tasks
    });

  } catch (error) {
    console.error('Error creating and assigning tasks:', error);
    return res.status(500).send({
      message: `Internal server error: ${error.message}`,
    });
  }
});

route.post('/deleteFile', auth, async (req, res) => {
  const { _id, fileName } = req.body; // Expect vendor ID and file URL to delete

  if (!_id || !fileName) {
    return res.status(400).json({ message: 'Both _id and fileName are required.' });
  }

  try {
    // Find the vendor by ID
    const office = await OfficeTask.findById(_id);
    if (!office) {
      return res.status(404).json({ message: 'office not found.' });
    }

    // Ensure files array exists
    if (!Array.isArray(office.files)) {
      return res.status(400).json({ message: 'Office has no files to delete.' });
    }

    // Extract the file name from the URL
    const extractedFileName = fileName.split('?')[0].split('/').pop();
    console.log('Attempting to delete file:', extractedFileName);

    // Check if the file exists in the vendor's files array
    const fileUrlToDelete = office.files.find(fileUrl => {
      const existingFileName = fileUrl.split('?')[0].split('/').pop();
      return existingFileName === extractedFileName;
    });

    if (!fileUrlToDelete) {
      return res.status(404).json({ message: 'File not found in office documents.' });
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
    office.files = office.files.filter(fileUrl => fileUrl !== fileUrlToDelete);
    await office.save(); // Save the updated vendor document

    res.status(200).json({ message: 'File deleted successfully from office.' });
  } catch (error) {
    console.error('Error deleting vendor file:', error.message);
    res.status(500).json({ message: `Failed to delete file: ${error.message}` });
  }
});




module.exports = route;
