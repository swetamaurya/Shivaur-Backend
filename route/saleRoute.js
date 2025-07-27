const express = require("express");
const router = express.Router();
const {Sale , SaleInvoice} = require("../model/saleModel");
const { auth } = require("../Middleware/authorization");
const mongoose = require("mongoose");
 
// CREATE: Add a new sale entry
router.post("/post", auth, async (req, res) => {
  try {
    const newSale = new Sale(req.body);  
    const savedSale = await newSale.save();  
    res.status(200).json({ message: "Sale created successfully", sale: savedSale });
  } catch (error) {
    console.error("Error creating sale:", error.message);
    res.status(500).json({ error: "Failed to create sale" });
  }
});


router.get("/getAll", auth, async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Fetch total record count
    const totalRecords = await Sale.countDocuments();

    // Fetch paginated sales with populated invoice
    const sales = await Sale.find()
      .populate("invoice")  
      .populate("material", "material productId")  
      .populate("project", "projectName projectId")  
      .populate("client", "name userId")   
      .populate("saleTo", "name userId")  

      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);
      // console.log("Fetched Sales:", sales);
    res.status(200).json({
      message: "Sales fetched successfully",
      sales,
      pagination: {
        totalRecords,
        currentPage: page,
        perPage: limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching sales:", error.message);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});



  

router.get("/get", auth, async (req, res) => {
  try {
    const { _id } = req.query;

    const sale = await Sale.findById(_id)
    .populate("invoice")
    .populate("material", "material productId")  
    .populate("project", "projectName projectId")  
    .populate("client", "name userId")  
    .populate("saleTo", "name userId")  


    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    res.status(200).json({ message: "Sale fetched successfully", sale });
  } catch (error) {
    console.error("Error fetching sale:", error.message);
    res.status(500).json({ error: "Failed to fetch sale" });
  }
});



// UPDATE: Update a sale entry by ID
router.post("/update",auth, async (req, res) => {
  try {
    const { _id } = req.body;
    const updatedSale = await Sale.findByIdAndUpdate(_id, req.body, { new: true });
    if (!updatedSale) {
      return res.status(404).json({ error: "Sale record not found" });
    }
    res.status(200).json({ message: "Sale record updated successfully", sale: updatedSale });
  } catch (error) {
    console.error("Error updating sale record:", error.message);
    res.status(500).json({ error: "Failed to update sale record" });
  }
});

 
//////////////////////////////////////////// invoice /////////////////////////////////////////////////////////

router.post("/invoice/post", auth, async (req, res) => {
  try {
    const { saleId} = req.body;

    // Validate Sale ID
    if (!mongoose.Types.ObjectId.isValid(saleId)) {
      return res.status(400).json({ error: "Invalid Sale ID" });
    }

    // Fetch the Sale
    const sale = await Sale.findById(saleId);
    if (!saleId) {
      return res.status(404).json({ error: "Sale not found" });
    }

    // Create the Invoice
    const newInvoice = new SaleInvoice({
      ...req.body,
      sale: sale._id,
      
    });
    const savedInvoice = await newInvoice.save();

    // Update the Sale to reference the Invoice
    sale.invoice = savedInvoice._id;
    await sale.save();

    res.status(200).json({
      message: "Invoice created successfully",
      invoice: savedInvoice,
      sale,
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

    const totalRecords = await SaleInvoice.countDocuments();

    const salesInvoice  = await SaleInvoice.find()
      .populate({
        path: "sale",
        populate: [
          { path: "material", select: "material productId" },
           {path: "project", select: "projectName projectId"},
           {path:"client",select: "name userId"}
        ],
      })
      // .populate("sale", "client customerOrderRef quantity unitCost") // Populate sale fields
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      message: "Sales Invoice fetched successfully",
      salesInvoice ,
      pagination: {
        totalRecords,
        currentPage: page,
        perPage: limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching Sales Invoice:", error.message);
    res.status(500).json({ error: "Failed to fetch Sales Invoice" });
  }
});

  

router.get("/invoice/get", auth, async (req, res) => {
  try {
    const { _id } = req.query;

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ error: "Invalid Invoice ID" });
    }

    const invoice = await SaleInvoice.findById(_id) 
    .populate({
      path: "sale",
      populate: [
        { path: "material", select: "material productId" },
         {path: "project", select: "projectName projectId"},
         {path:"client",select: "name userId"}
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



// UPDATE: Update a sale entry by ID
router.post("/invoice/update",auth, async (req, res) => {
  try {
    const updatedSaleInvoice = await SaleInvoice.findByIdAndUpdate(req.body._id, req.body, { new: true });
    if (!updatedSaleInvoice) {
      return res.status(404).json({ error: "Sale Invoice record not found" });
    }
    res.status(200).json({ message: "Sale  Invoice record updated successfully", saleInvoice: updatedSaleInvoice });
  } catch (error) {
    console.error("Error updating sale Invoice record:", error.message);
    res.status(500).json({ error: "Failed to update sale Invoice record" });
  }
});
module.exports = router;
