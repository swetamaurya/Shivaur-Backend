const express = require('express');
const {Purchase ,PurchaseInvoice} = require('../model/purchaseModel');
const { auth } = require('../Middleware/authorization');
const multer = require("multer")
const { uploadFileToFirebase, bucket } = require('../utils/fireBase');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
  

// Create a new purchase
router.post('/post',auth, async (req, res) => {
  try {
    const newPurchase = new Purchase(req.body);
    const savedPurchase = await newPurchase.save();
    res.status(200).json({ message: 'Purchase Created Successfully!', purchase: savedPurchase });
  } catch (error) {
    console.error('Error creating purchase:', error.message);
    res.status(500).json({ error: 'Internal server error while creating purchase' });
  }
});

// Get all purchases
router.get("/getAll",auth, async (req, res) => {
    try {
      let { page, limit } = req.query;
      page = parseInt(page, 10) || 1;  
      limit = parseInt(limit, 10) || 10;  
      const skip = (page - 1) * limit;
  
      // Fetch total record count
      const totalRecords = await Purchase.countDocuments()
  
      // Fetch paginated purchases
      const purchases = await Purchase.find()
      .populate("invoice") 
      .populate("purchaseVendor" ,"vendorName vendorId")
      .populate("material" ,"material productId")
      .populate("project" ,"projectName projectId")
      .populate("user" ,"name userId")
        .sort({ _id: -1 }) // Sort by newest first
        .skip(skip)
        .limit(limit);
  
      res.status(200).json({
        message: "Purchases fetched successfully",
        purchases,
        pagination: {
          totalRecords, // Total number of records
          currentPage: page, // Current page number
          perPage: limit, // Records per page
          totalPages: Math.ceil(totalRecords / limit), // Total number of pages
        },
      });
    } catch (error) {
      console.error("Error fetching purchases:", error.message);
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });
  

// Get a single purchase by ID
router.get('/get',auth, async (req, res) => {
  try {
    const { _id } = req.query;

    const purchase = await Purchase.findById(_id) 
    .populate("invoice")     
    .populate("purchaseVendor" ,"vendorName vendorId")
    .populate("material" ,"material productId")
    .populate("project" ,"projectName projectId")
    .populate("user" ,"name userId")
  ;
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    res.status(200).json({ message: 'Purchase fetched successfully', purchase });
  } catch (error) {
    console.error('Error fetching purchase:', error.message);
    res.status(500).json({ error: 'Internal server error while fetching purchase' });
  }
});


router.post('/update',auth, async (req, res) => {
  try {
    const { _id } = req.body;
        const updatedPurchase = await Purchase.findByIdAndUpdate(_id, req.body, {
      new: true,
     });
    if (!updatedPurchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    res.status(200).json({ message: 'Purchase updated successfully', purchase: updatedPurchase });
  } catch (error) {
    console.error('Error updating purchase:', error.message);
    res.status(500).json({ error: 'Internal server error while updating purchase' });
  }
});

 
 
//////////////////////////////////////////// invoice /////////////////////////////////////////////////////////

router.post("/invoice/post", auth, upload.array('file'), async (req, res) => {
  try {
    const { purchaseId, ...invoiceData } = req.body;

    // Validate if `purchaseId` exists
    if (!purchaseId) {
      return res.status(400).json({ error: "Missing purchaseId in request body" });
    }

    // Fetch the Purchase
    const salePurchase = await Purchase.findById(purchaseId);
    if (!salePurchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }
  
 
 // Handle file uploads
 let fileUrls = [];
 if (req.files && req.files.length > 0) {
   try {
     fileUrls = await uploadFileToFirebase(req.files);
   } catch (fileUploadError) {
     console.error("Error uploading files to Firebase:", fileUploadError.message);
     return res.status(500).json({ error: "Failed to upload files to Firebase" });
   }
 }

// Create the Invoice
const newInvoice = new PurchaseInvoice({
  ...invoiceData, // Include all invoice fields from the request body
  purchase: salePurchase._id, // Link the purchase to the invoice
  document: fileUrls, // Uploaded files
});

    
    const savedInvoice = await newInvoice.save();

    
    // Link the Invoice to the Purchase
    salePurchase.invoice = savedInvoice._id;
    await salePurchase.save();

    res.status(200).json({
      message: "Invoice created successfully",
      invoice: savedInvoice,
      purchase: salePurchase,
    });
  } catch (error) {
    console.error("Error creating invoice:", error.message);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});


router.get("/invoice/getAll", auth, async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 10;
    const skip = (page - 1) * limit;

    const totalRecords = await PurchaseInvoice.countDocuments();

    const purchaseInvoice  = await PurchaseInvoice.find()
      .populate({
        path: "purchase",
        populate: [
          { path: "material", select: "material productId" },
           {path: "purchaseVendor", select: "vendorName vendorId"},
         ],
      })
      // .populate("sale", "client customerOrderRef quantity unitCost") // Populate sale fields
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      message: "Purchase Invoice fetched successfully",
      purchaseInvoice ,
      pagination: {
        totalRecords,
        currentPage: page,
        perPage: limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching Purchase Invoice:", error.message);
    res.status(500).json({ error: "Failed to fetch Purchase Invoice" });
  }
});

  
router.get("/invoice/get", auth, async (req, res) => {
  try {
    const { _id } = req.query;

 

    const invoice = await PurchaseInvoice.findById(_id) 
    .populate({
      path: "purchase",
      populate: [
        { path: "material", select: "material productId" },
        {path: "purchaseVendor", select: "vendorName vendorId"},
      ],
    })
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.status(200).json({ message: "Invoice fetched successfully", invoice });
  } catch (error) {
    console.error("Error fetching invoice:", error.message);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});


router.post("/invoice/update",auth,  upload.array('file'), async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;

    let fileUrls = [];

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const newFileUrls = await uploadFileToFirebase(req.files);
      fileUrls = [...fileUrls, ...newFileUrls];
    }

        // Find the document by ID
    const currentDocument = await PurchaseInvoice.findById(_id);

     if (!currentDocument) {
          return res.status(404).send("Document not found.");
        }
    
          // Prepare update object
    const updateFields = {
      $set: updateData,
    };


      // Append file URLs to the existing `document` field, if there are new files
      if (fileUrls.length > 0) {
        updateFields.$push = { document: { $each: fileUrls } };
      }
  
    const updatedPurchaseInvoice = await PurchaseInvoice.findByIdAndUpdate(_id, updateFields, { new: true });
    if (!updatedPurchaseInvoice) {
      return res.status(404).json({ error: "Purchase Invoice record not found" });
    }
    res.status(200).json({ message: "Purchase  Invoice record updated successfully", PurchaseInvoice: updatedPurchaseInvoice });
  } catch (error) {
    console.error("Error updating Purchase Invoice record:", error.message);
    res.status(500).json({ error: "Failed to update Purchase Invoice record" });
  }
});

module.exports = router;
