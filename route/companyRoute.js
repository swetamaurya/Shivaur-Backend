const express = require('express');
const router = express.Router();
const { auth } = require('../Middleware/authorization');
const Company = require('../model/companyModel');

// Company CRUD Operations

// Create a new Company
router.post('/post', auth, async (req, res) => {
    try {
      const newCompany = new Company(req.body);
      await newCompany.save();
      // Log the created company if needed
      // console.log("Company Created:", newCompany);
      res.status(200).json({ 
        message: "Company created successfully", 
        data: newCompany 
      });
    } catch (error) {
      console.error("Error creating Company:", error.message);
      res.status(500).json({ error: 'Error creating Company' });
    }
  });
  

router.get('/getAll', auth, async (req, res) => {
    try {
      const { page, limit } = req.query; // Extract pagination parameters
  
      if (!page || !limit) {
        const Companys = await Company.find().sort({ _id: -1 }); // Sort by creation date descending
        return res.status(200).json({
          data: Companys,
          totalCompanys: Companys.length, // Total count of all companies
          pagination: false, // Indicate that pagination is not applied
        });
      }
  
      // If pagination parameters are provided, return paginated data
      const skip = (parseInt(page) - 1) * parseInt(limit); // Calculate documents to skip
  
      const Companys = await Company.find()
        .sort({ _id: -1 })
        .skip(skip)
        .limit(parseInt(limit));
  
      const totalCompanys = await Company.countDocuments(); // Total count of all companies
  
      res.status(200).json({
        data: Companys,
        totalCompanys,
        totalPages: Math.ceil(totalCompanys / limit), // Calculate total pages
        currentPage: parseInt(page), // Current page
        perPage: parseInt(limit), // Items per page
        pagination: true, // Indicate that pagination is applied
      });
    } catch (error) {
      console.error("Error fetching Companys:", error.message);
      res.status(500).json({ error: 'Error fetching Companys' });
    }
  });
  
  
router.post('/get', auth, async (req, res) => {
    try {
      const { _id } = req.query; // Ensure _id is provided in the query parameters
    //   console.log(req.query)
      const company = await Company.findById(_id);
      
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      
      res.status(200).json({ data: company });
    } catch (error) {
      console.error("Error fetching company:", error.message);
      res.status(500).json({ error: 'Error fetching company' });
    }
  });
  
  
  // Update a Company
router.post('/update', auth, async (req, res) => {
    try {
      const { _id, ...updateData } = req.body;
  
      const CompanyUpdate = await Company.findByIdAndUpdate(_id, updateData, { new: true });
      if (!CompanyUpdate) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.status(200).json(CompanyUpdate);
    } catch (error) {
      console.error("Error updating Company:", error.message);
      res.status(500).json({ error: 'Error updating Company' });
    }
  });
  

// // Delete a Company
// router.post('/delete', auth, async (req, res) => {
//   try {
//     const { _id } = req.body;
//     const Company = await Company.findByIdAndDelete(_id);

//     if (!Company) {
//       return res.status(404).json({ error: 'Company not found' });
//     }

//     res.status(200).json({ message: 'Company deleted successfully' });
//   } catch (error) {
//     console.error("Error deleting Company:", error.message);
//     res.status(500).json({ error: 'Error deleting Company' });
//   }
// })


module.exports = router;
