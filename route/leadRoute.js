const express = require('express');
const router = express.Router();
const {Lead ,Sequence} = require('../model/leadModel');
const {auth} = require('../Middleware/authorization');
const fs = require("fs-extra");
const multer = require('multer');
const storage = multer.memoryStorage(); // Store in memory for simple processing
const upload = multer({ storage });
// const excelToJson = require("convert-excel-to-json");

const dotenv = require("dotenv");
 dotenv.config()
 
// Create a new lead
 router.post('/post', auth, async (req, res) => {
  try {
    const { enquiryData, ...leadData } = req.body;

    // Create a new lead
    const newLead = new Lead(leadData);
    await newLead.save();

    // If enquiry data is provided, create a new enquiry and link it to the lead
    if (enquiryData) {
      const newEnquiry = new Enquiry(enquiryData);
      await newEnquiry.save();

      newLead.enquiry.push(newEnquiry._id);
      await newLead.save();
    }

    res.status(200).json({ message: 'Lead and enquiry created successfully!', lead: newLead });
  } catch (error) {
    console.error('Error creating lead or enquiry:', error);
    res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
});

// Get all leads
router.get('/getAll', auth, async (req, res) => {
    try {
      const { roles, _id } = req.user; // Extract user role and ID from authentication middleware
      const { page , limit } = req.query; // Pagination parameters with defaults
  
      // Build query based on roles
      let query = {};
      if (roles === 'Employee') {
        // Employees can only view their assigned leads
        query = { assignedTo: _id };
      } else if (roles === 'Manager' || roles === 'Admin') {
        // Managers and Admins can view all leads
        query = {};
      } else {
        // Restrict other roles
        return res.status(403).json({ message: 'Access denied: Unauthorized role.' });
      }
  
      // Pagination logic
      const skip = (parseInt(page) - 1) * parseInt(limit || 0); // Records to skip
  
      let leads;
      if (limit) {
        // Paginated response
        leads = await Lead.find(query)
          .populate('assignedTo', 'name email userId') // Populate assigned user's details
          .populate({
            path: "enquiry",
            select: 'enquiryTitle enquiryDate phone email price PIC detailOfEnquiry offerDate offerReferenceNumber policy createOfferDate additionalInfo status',

            options: { sort: { _id: -1 } },
            populate: [
               { path: "createdBy" }
            ]
          }) 
          
          .populate({
            path: 'offers',
            // select: 'offerTitle offerDate',
            options: { sort: { _id: -1 } }, // Sort offers by descending order
          }) 
       
          .skip(skip)
          .limit(parseInt(limit))
          .sort({ _id: -1 })
          .lean();

     // Sort the `callInfo` array by `_id` in descending order
     leads.forEach((lead) => {
      if (lead.callInfo) {
        lead.callInfo.sort((a, b) => b._id.toString().localeCompare(a._id.toString()));
      }
    });
      } else {
        // Non-paginated response (return all data)
        leads = await Lead.find(query)
        .populate('assignedTo', 'name email userId') // Populate assigned user's details
        .populate({
          path: "enquiry",
          select: 'enquiryTitle enquiryDate phone email price PIC detailOfEnquiry offerDate offerReferenceNumber policy createOfferDate additionalInfo status',

          options: { sort: { _id: -1 } },
          populate: [
             { path: "createdBy" }
          ]
        }) 
        .populate({
          path: 'offers',
          // select: 'offerTitle offerDate',
          options: { sort: { _id: -1 } }, // Sort offers by descending order
        }) 
         .skip(skip)
          .limit(parseInt(limit))
          .sort({ _id: -1 })
          .lean();

         // Sort the `callInfo` array by `_id` in descending order
      leads.forEach((lead) => {
        if (lead.callInfo) {
          lead.callInfo.sort((a, b) => b._id.toString().localeCompare(a._id.toString()));
        }
      });
      }
  
      // Total count of leads
      const totalLeads = await Lead.countDocuments(query);
      const totalPages = limit ? Math.ceil(totalLeads / parseInt(limit)) : 1;
  
      res.status(200).json({
        message: 'Leads fetched successfully!',
        data: leads,
        pagination: {
          totalLeads,
          totalPages,
          currentPage: parseInt(page),
          perPage: limit ? parseInt(limit) : totalLeads,
        },
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
  });
  

// Get a single lead by ID
router.get('/get',auth, async (req, res) => {
  const { name } = req.user
  try {
    const { id } = req.query;

    const lead = await Lead.findById(id)
  .populate('assignedTo', 'name email')
 
  .populate({
    path: "enquiry",
    select: 'enquiryTitle enquiryDate',
    options: { sort: { _id: -1 } },
    populate: [
       { path: "createdBy" }
    ]
  }) 
  .populate({
    path: 'offers', // Populate offers data
    options: { sort: { _id: -1 } },
    select: 'offerReferenceNumber offerDate price policy offerTitle',
}).lean()
   
  

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found.' });
    }
    
 // Sort the `callInfo` array by `_id` in descending order
 if (lead.callInfo) {
  lead.callInfo.sort((a, b) => b._id.toString().localeCompare(a._id.toString()));
}


    res.status(200).json({ message: 'Lead fetched successfully!', lead , name:name });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
});

// Update a lead by ID
router.post('/update',auth, async (req, res) => {
  try {
    
    const {id ,...updateData} = req.body;
// console.log(req.body)
    const updatedLead = await Lead.findByIdAndUpdate(id,  { ...updateData, updatedAt: new Date() } )// Automatically update the `updatedAt` field
 
 

    if (!updatedLead) {
      return res.status(404).json({ message: 'Lead not found.' });
    }

    res.status(200).json({ message: 'Lead updated successfully!', lead: updatedLead });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
});

 
async function getNextSeqValue(seqName) {
  const SeqDoc = await Sequence.findOneAndUpdate(
    { seqName },
    { $inc: { seqValue: 1 } },
    { new: true, upsert: true }
  );
  const SeqNumber = SeqDoc.seqValue.toString().padStart(6, '0'); 
  return `LEAD-${SeqNumber}`;
}

const uploads = multer({ dest: "uploads/" });

// router.post("/excelFile", auth, uploads.single("file"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).send("No file uploaded.");
//     }

//     if (!req.file.mimetype.includes("excel") && !req.file.mimetype.includes("spreadsheetml")) {
//       return res.status(400).send("Invalid file type. Please upload an Excel file.");
//     }

//     const filePath = "uploads/" + req.file.filename;
//     const excelData = excelToJson({
//       sourceFile: filePath,
//       header: { rows: 1 },
//       columnToKey: { "*": "{{columnHeader}}" },
//     });

//     const newJsonData = [];
//     for (let data of excelData[Object.keys(excelData)[0]]) {
      
//       data.leadId = await getNextSeqValue("leadId");
//       newJsonData.push(data);
//     }

//     const insertedLeads = await Lead.insertMany(newJsonData);
//     await fs.remove(filePath);
// console.log(insertedLeads)
//     return res.status(200).json({ message: "File processed successfully", leads: insertedLeads });
//   } catch (error) {
//     console.error("Error processing Excel file:", error);
//     return res.status(500).send(`Internal server error: ${error.message}`);
//   }
// });




// Next Follow Up API 


router.post("/followUp/post",auth, async(req,res)=>{
try {
  const {name} = req.user
  // console.log(req.user)

  const { _id, callInfo } = req.body
  // console.log(req.body)
if(!_id || !callInfo){
  return res.status(400).json({msg:'Id and CallInfo is Required'})
}
const lead = await Lead.findById(_id);
if(!lead){
  return res.status(400).json({msg:'Id is not matched'})
}
lead.callInfo.push(...callInfo);
await lead.save();
return res.status(200).json({
  msg:'Info are created successfully',
  lead:lead,
  // createdBy : name
})
} catch (error) {
  console.error('Error adding follow-up call info:', error);
    res.status(500).json({ message: `Internal server error: ${error.message}` });
}
})

router.post("/update-call", auth, async (req, res) => {
  const { leadId, callId, date, nextFollowUpdate, remark, status } = req.body;
  if (!leadId || !callId) {
    return res.status(400).json({ message: "Lead ID and Call ID are required." });
  }
  try {
    // Update the specific call in the callInfo array
    const result = await Lead.updateOne(
      { _id: leadId, "callInfo._id": callId },
      {
        $set: {
          "callInfo.$.date": date,
          "callInfo.$.nextFollowUpdate": nextFollowUpdate,
          "callInfo.$.remark": remark,
          "callInfo.$.status": status,
        },
      }
    );
    if (result.nModified === 0) {
      return res
        .status(404)
        .json({ message: "Call entry not found or no changes made." });
    }
    // Retrieve the updated call entry
    const updatedLead = await Lead.findById(leadId, {
      callInfo: { $elemMatch: { _id: callId } }, // Get the specific updated callInfo
    }).sort({ 'callInfo._id': -1 });;
    if (!updatedLead || updatedLead.callInfo.length === 0) {
      return res.status(404).json({
        message: "Updated call entry not found after update.",
      });
    }
    res.json({
      message: "Call updated successfully!",
      updatedCall: updatedLead.callInfo[0], // Send the updated call entry
    });
  } catch (error) {
    console.error("Error updating call:", error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the call." });
  }
});

module.exports = router;
