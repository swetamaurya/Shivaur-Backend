const express = require("express")
const {User  } = require('../model/userModel')
const { uploadFileToFirebase , bucket} = require('../utils/fireBase');
const bcryptjs = require("bcryptjs")
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv");
const {auth} = require("../Middleware/authorization");
 const multer = require('multer');
//  const { logger } = require("../utils/logger");
const sendOTPEmail = require("../utils/mailSent");
const { Project } = require("../model/projectModel");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }); 
const route = express.Router()
const ExcelJS = require('exceljs');

dotenv.config()
 
// Generate OTP
function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }


// User Registration API
route.post("/register", async (req, res) => {
  try {
    const { name, email, mobile, password, roles ="Admin" } = req.body;
// console.log(req.body)
    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create and save the user
    const user = new User({
      name,
      email,
      mobile,
      password: hashedPassword,
      roles,
    });

    await user.save();
    res.status(200).json({
      message: "Registration Successfully!",
      user
    });
      } catch (error) {
    console.error("Registration Error:", error.message);
    res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
});

// User Login API
route.post("/login", async (req, res) => {
  const { email, password } = req.body;
// console.log(req.body)
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the entered password matches the stored hashed password
    const isPasswordMatch = await bcryptjs.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid login credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { user: { id: user._id, roles: user.roles ,name: user.name } },
      process.env.SECRET_KEY,
      { expiresIn: "9h" }
    );

    res.status(200).json({
      message: "Login Successfully!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});


route.post("/sendResetOtp", async (req, res) => {
    // console.log("calling api sent opt")
    const { email } = req.body;
  console.log(req.body)
    if (!email) {
      return res.status(400).send("Email is required.");
    }
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(400).send("User not found.");
      
      const otp = generateOtp();
  console.log(otp)
  user.currentOtp = otp;
      await user.save();
  
      // Send OTP email
      sendOTPEmail(user.email, otp);
  // console.log(otp)
      res.status(200).json({message:"OTP sent to email successfully."});
    } catch (error) {
      console.error("Internal server error:", error.message);
      res.status(500).send("Internal server error");
    }
  });


route.post('/verifyOtp', async (req, res) => {
  const { email, currentOtp } = req.body;
  console.log(req.body)
  if (!email || !currentOtp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    // Find user by email and OTP
    const user = await User.findOne({ email: email.toLowerCase(), currentOtp });

    if (!user) {
      return res.status(404).json({ message: 'User not found or invalid OTP' });
    }

    // Mark the user as verified
    // user.registrationVerified = true;
    user.currentOtp   // Clear OTP after verification
    await user.save();

    res.status(200).json({
      message: 'OTP verified successfully',
    });
  } catch (error) {
    logger.error(`Error managing encryption keys: ${error.message}`);
    res.status(500).json({ message: 'Internal server error' });
  }
});

  
route.post('/resetPassword', async (req, res) => {
  const { email, currentOtp, newPassword } = req.body;
console.log(req.body)
  if (!email || !currentOtp || !newPassword) {
    return res.status(400).send("Email, OTP, and new password are required.");
  }

  try {
    let user = await User.findOne({ email, currentOtp });

    if (!user) {
      return res.status(404).send("Invalid OTP or User not found.");
    }

    // if (!user.passwordResetApproved) {
    //   return res.status(200).send("Password reset request not approved by admin.");
    // }

    const hashNewPassword = await bcryptjs.hash(newPassword, 10);
    user.password = hashNewPassword;
    user.currentOtp = null; // Clear OTP after reset
    // user.passwordResetApproved = false; // Reset approval flag

    await user.save();

    res.status(200).json({message:"Your password changed successfully."});
  } catch (error) {
    logger.error(`Error managing encryption keys: ${error.message}`);
        res.status(500).send("Internal server error");
  }
});


route.get("/roles/get", auth, async (req, res) => {
  try {
    const { roles, id } = req.user; // Get roles and id from authenticated user
console.log(req.user)
    // Find the user by id and verify their roles
    const role = await User.find({ _id: id, roles: { $in: roles } });
console.log("4567890-user",role)
    if (!role) {
      return res.status(404).json({ message: "User not found or roles mismatch" });
    }

    // Return the user roles or other relevant information
    return res.status(200).json({ role });
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

 
 

route.get("/check",async (req,res)=>{
  return res.status(200).send("Welcome Shivour👍")
})

 



// update Admin / user By Id 
route.post(
  "/update",
  auth,
  upload.fields([
    { name: "image", maxCount: 1 }, // Single file
    { name: "aadharImage", maxCount: 2 }, // Multiple files
    { name: "panImage", maxCount: 1 }, // Single file
    { name: "pfFiles", maxCount: 10 }, // Multiple files
    { name: "additionalFiles", maxCount: 10 }, // Multiple files
  ]),
  async (req, res) => {
    try {
      console.log("Request Payload:", req.body);
      const { _id, ...updateData } = req.body;

      // Check if the User exists
      const existingUser = await User.findById(_id);
      if (!existingUser) {
        return res.status(404).send({ msg: "User not found" });
      }

      // Initialize file URLs with existing user data if they exist
      let imageUrl = existingUser.image || "";
      let aadharImages = existingUser.aadharImage || [];
      let panImageUrl = existingUser.panImage || "";
      let pfFilesUrls = existingUser.pfFiles || [];
      let additionalFilesUrls = existingUser.additionalFiles || [];

      // Process uploaded files
      if (req.files?.image) {
        const uploadedUrl = await uploadFileToFirebase(req.files.image);
        imageUrl = uploadedUrl[0];
      }

      if (req.files?.aadharImage) {
        aadharImages = await Promise.all(
          req.files.aadharImage.map((file) => uploadFileToFirebase(file))
        );
      }

      if (req.files?.panImage) {
        const uploadedUrl = await uploadFileToFirebase(req.files.panImage);
        panImageUrl = uploadedUrl[0];
      }

      if (req.files?.pfFiles) {
        pfFilesUrls = await Promise.all(
          req.files.pfFiles.map((file) => uploadFileToFirebase(file))
        );
      }

      if (req.files?.additionalFiles) {
        additionalFilesUrls = await Promise.all(
          req.files.additionalFiles.map((file) => uploadFileToFirebase(file))
        );
      }

      // Update the user with new data and uploaded file URLs
      updateData.image = imageUrl;
      updateData.aadharImage = aadharImages;
      updateData.panImage = panImageUrl;
      updateData.pfFiles = pfFilesUrls;
      updateData.additionalFiles = additionalFilesUrls;

      const updatedUser = await User.findByIdAndUpdate(_id, updateData, {
        new: true,
      });

      if (!updatedUser) {
        return res.status(500).send({ msg: "Error updating user data" });
      }

      return res.status(200).send({
        msg: "User updated successfully",
        updatedUser,
      });
    } catch (error) {
      console.error("Error updating User:", error);
      return res
        .status(500)
        .send({ error: `Internal server error: ${error.message}` });
    }
  }
);









 
route.get('/data/get', auth, async (req, res) => {
  try {
    const { roles, id } = req.user; // Extract roles and user ID from authenticated user
    const { page, limit } = req.query; // Extract pagination parameters

    const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
    const limitValue = limit ? parseInt(limit) : null;

    let users = {};
    let totalEmployees = 0;
    let totalClients = 0;

    if (roles === "Admin" || roles === "HR" || roles === "Manager") {
      // Admin, HR, and Manager can see all data
      const employees = await User.find({ roles: { $in: ["Employee", "Supervisor", "Manager",'HR'] } })
        .populate("assigned", "projectName projectId")
        .populate("leave")
        .populate("attendance")
        .populate("departments", "departments")
        .populate("designations", "designations")
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limitValue);

      const clients = await User.find({ roles: "Client" })
        .populate("assigned", "projectName projectId")
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limitValue);

      totalEmployees = await User.countDocuments({ roles: { $in: ["Employee", "Supervisor", "Manager" ,"HR"] } });
      totalClients = await User.countDocuments({ roles: "Client" });

      users = { employees, clients };
    } else if (roles === "Employee") {
      // Employee can only see their own data
      const employee = await User.findOne({ _id: id })
        .populate("assigned", "projectName projectId")
        .populate("leave", "totalLeaves")
        .populate("attendance")
        .populate("departments", "departments")
        .populate("designations", "designations");

      users = { employee };
      totalEmployees = 1;
    } else {
      // For any other roles, deny access
      return res.status(403).json({ message: "Access denied: Unrecognized role." });
    }

    res.status(200).json({
      users,
      totalEmployees,
      totalClients,
      totalPagesEmployees: limitValue ? Math.ceil(totalEmployees / limitValue) : 1,
      totalPagesClients: limitValue ? Math.ceil(totalClients / limitValue) : 1,
      currentPage: page ? parseInt(page) : 1,
      perPage: limitValue,
      pagination: Boolean(page && limit), // Indicate if pagination is applied
    });
  } catch (error) {
    console.error(`Error fetching users: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});







route.get('/get/:id', auth, async (req, res) => {
  try {
    const { id } = req.params; // Get the project ID from the request parameters
// console.log(id)
     const user = await User.findById(id)
     .populate("assigned", "projectName projectId")
     .populate("clientName", "name userId")
     .populate('leave')
    .populate({
      path: "attendance",
      select: "date status checkIn checkOut" // Populate attendance details with date, status, etc.
    })  .populate('departments','departments') 
    .populate('designations','designations');
    if (!user) {
      return res.status(404).json({ message: 'user not found' });
    }
    console.log(user);
    res.status(200).json(user);
  } catch (error) {
    logger.error(`Error fetching user: ${error.message}`);
    res.status(400).send(`Internal server error: ${error.message}`);
  }
});

 

 

 
route.post(
  "/post",
  auth,
  upload.fields([
    { name: "image", maxCount: 1 }, // Single file
    { name: "aadharImage", maxCount: 5 }, // Multiple files
    { name: "panImage", maxCount: 1 }, // Single file
    { name: "pfFiles", maxCount: 10 }, // Multiple files
    { name: "additionalFiles", maxCount: 10 }, // Multiple files
  ]),
  async (req, res) => {
    try {
      console.log("Request Body:", req.body);
       // Hash the password before saving
      if (req.body.password) {
        req.body.password = await bcryptjs.hash(req.body.password, 10);
      }

      let profileImageUrl = '';
      let panImageUrl = '';
      let aadharImageUrl = [];
      let pfFilesUrl = [];
      let additionalFilesUrls = [];

      // Upload profile image
    
      
 // Handle single file upload for image
 if (req.files?.image) {
  const uploadedimage = await uploadFileToFirebase(req.files.image);
  profileImageUrl = uploadedimage[0]; // Use the first uploaded image for thumbnail
  image = profileImageUrl; // Add thumbnail URL to course data
}
    
      if (req.files?.panImage) {
        const uploadedpanImage = await uploadFileToFirebase(req.files.panImage);
        panImageUrl = uploadedpanImage[0]; // Use the first uploaded image for panImage
        panImage = panImageUrl; // Add thumbnail URL to course data
      }

       
      // Handle multiple file uploads for materials
      if (req.files?.aadharImage) {
        aadharImageUrl = await uploadFileToFirebase(req.files.aadharImage);
        req.body.aadharImage = aadharImageUrl; // Add file URLs to course data
      }

      // Upload multiple documents
      if (req.files?.pfFiles) {
        pfFilesUrl = await  uploadFileToFirebase(req.files.pfFiles);
        req.body.pfFiles = pfFilesUrl; // Add file URLs to course data
      }

      
      if (req.files?.additionalFiles) {
        additionalFilesUrls = await  uploadFileToFirebase(req.files.additionalFiles);
        req.body.additionalFiles = additionalFilesUrls; // Add file URLs to course data
      }

      const user = new User({
        ...req.body,
        image: profileImageUrl,
        aadharImage: aadharImageUrl,
        panImage: panImageUrl,
        pfFiles: pfFilesUrl,
        additionalFiles: additionalFilesUrls,
      });

      await user.save();
      res.status(200).json(user);
    } catch (error) {
      console.error(`Error creating user: ${error.message}`);
      res.status(400).json({ error: `Internal server error: ${error.message}` });
    }
  }
);


 

 
// Update bank details route
route.post('/update-bank-details', auth, async (req, res) => {
  try {
    const { _id, bankDetails } = req.body;

    const user = await User.findByIdAndUpdate(_id, { bankDetails }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Bank details updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Delete bank details route
route.post('/delete-bank-details', auth, async (req, res) => {
  try {
    const { _id } = req.body;

    const user = await User.findByIdAndUpdate(_id, { bankDetails: null }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Bank details deleted successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

 





 

  
route.post("/error", auth, async (req, res) => {
  try {
    // console.log(req.body, "frontEnd")
    const { mobile, email } = req.body;
    // console.log(req.body, "BackendEnd")
    // console.log(email, "Email")
    // console.log(mobile, "Mobile")

    const existingUser = await User.findOne({
      $or: [{ mobile: mobile }, { email: email }],
    });
    // console.log("existingUser", existingUser);

    if (existingUser) {
      return res.status(409).send("Mobile or Email already exists.");
    } else {
      return res.status(200).send("No existing User found. You can proceed.");
    }
  } catch (error) {
    console.error("Error assigning Users:", error);
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});


 

module.exports = route
