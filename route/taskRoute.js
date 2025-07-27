const express = require("express");
const route = express.Router();
const {auth} = require("../Middleware/authorization");
const {Task} = require("../model/taskModel");
const multer = require("multer")
const { uploadFileToFirebase , bucket} = require('../utils/fireBase');
const { logger } = require("../utils/logger");
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

    // Updated query: Employees see tasks assigned to them + tasks from their projects
    const query = fullAccessRoles.includes(roles)
      ? {} 
      : { 
          $or: [
            { assignedTo: id }, // Employee is directly assigned to the task
            { project: { $in: await Project.find({ assignedTo: id }).distinct('_id') } } // Employee's project contains tasks
          ]
        };

    if (!page || !limit) {
      const tasks = await Task.find(query)
        .populate('project')
        .populate('assignedBy', 'name email userId')
        .populate({ path: 'assignedTo', select: 'ContractorName contractorId' })
        .populate({
          path: 'materialManagement.material', // Populate material inside materialManagement
          model: 'Product', // Ensure this matches your Product model name
          select: 'material productId quantity unit' // Select specific fields
      })        .sort({ _id: -1 }) // Sort in descending order
        .exec();

      return res.status(200).json({
        data: tasks,
        totalTasks: tasks.length,
        pagination: false,
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tasks = await Task.find(query)
      .populate('project')
      .populate('assignedBy', 'name email userId')
      .populate({ path: 'assignedTo', select: 'ContractorName contractorId' })
      .populate({
        path: 'materialManagement.material', // Populate material inside materialManagement
        model: 'Product', // Ensure this matches your Product model name
        select: 'material productId quantity unit' // Select specific fields
    })      .sort({ _id: -1 }) // Sort in descending order
      .skip(skip)
      .limit(parseInt(limit))
      .exec();

    const totalTasks = await Task.countDocuments(query);

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
    const task = await Task.findById(_id)
    .populate({
      path: "project",
      populate: {
        path: "tasks", // Populate tasks within the project
        options: { sort: { _id: -1 } }, // Sort tasks in descending order
      },
    })    
    .populate("assignedBy", "name email userId")
    .populate({ path: 'assignedTo', select: 'ContractorName contractorId' })
    .populate({
      path: 'materialManagement.material', // Populate material inside materialManagement
      model: 'Product', // Ensure this matches your Product model name
      select: 'material productId quantity unit' // Select specific fields
  })     
   .exec();
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

     const newTask = new Task({
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
    const currentTask = await Task.findById(_id);
    if (!currentTask) {
      return res.status(404).send("Task not found");
    }

    // Prepare the update fields
    const updateFields = {
      ...updateData,
      files: fileUrls.length > 0 ? [...currentTask.files, ...fileUrls] : currentTask.files
    };

    // Update the task
    const updatedTask = await Task.findByIdAndUpdate(_id, updateFields, { new: true });

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
    const deletedTasks = await Task.deleteMany({ _id: { $in: _idArray } });

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

    // Check for both `assignedTo` and `userIds` fields in the request body
    let userIds = req.body.assignedTo || req.body.userIds;

    // If `assignedTo` or `userIds` is a single ID, convert it to an array
    if (!Array.isArray(userIds)) {
      userIds = [userIds];
    }

    // Create a single task with multiple assignees
    const newTask = new Task({
      ...taskData,
      files: fileUrls,
      assignedBy: req.user.id,
      assignedTo: userIds, // Assign multiple users in one task
      project: project,
    });

    const savedTask = await newTask.save();

    // Update the Project with the new task ID
    let updatedProject;
    if (project) {
      updatedProject = await Project.findByIdAndUpdate(
        project,
        { $push: { tasks: savedTask._id } }, // Add the single task ID
        { new: true, useFindAndModify: false }
      )
      .populate({
        path: 'tasks',
        options: { sort: { _id: -1 } }, // Sort tasks in descending order
      });
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
      ) 
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
  const { _id, fileName } = req.body; // Expect project ID and file URL to delete

  if (!fileName) {
      return res.status(400).json({ message: 'fileName is required.' });
  }

  try {
      // Find the project by ID
      const task = await Task.findById(_id);
      if (!task) {
          return res.status(404).send({ message: 'Task not found' });
      }

      // Extract the file name from the URL
      const extractedFileName = fileName.split('?')[0].split('/').pop(); // Gets "491428495.png"
      console.log("Extracted File Name:", extractedFileName);  

      // Find the exact URL in the document array that contains the file name
      const fileUrlToDelete = task.files.find(fileUrl => {
          const existingFileName = fileUrl.split('?')[0].split('/').pop();
          return existingFileName === extractedFileName;
      });

      if (!fileUrlToDelete) {
          return res.status(404).send({ message: 'File not found in task.' });
      }

      // Delete the file from Firebase Storage using the extracted file name
      const file = bucket.file(extractedFileName); // Reference to Firebase file
      await file.delete(); // Delete file from Firebase

      // Remove the deleted file URL from the task document array
      task.files = task.files.filter(fileUrl => fileUrl !== fileUrlToDelete);
      await task.save();

      res.status(200).send({ message: 'File deleted successfully from task.' });
  } catch (error) {
      console.error('Error deleting task file:', error);
      res.status(500).send({ error: `Failed to delete file: ${error.message}` });
  }
});



module.exports = route;
