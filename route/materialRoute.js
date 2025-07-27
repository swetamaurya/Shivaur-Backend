const express = require("express");
const {auth} = require("../Middleware/authorization");
const dotenv = require("dotenv");
const multer = require("multer");
const { uploadFileToFirebase } = require('../utils/fireBase');
const  {Product ,Category} = require("../model/materialModel");
const Vendor = require("../model/vendorModel");
// const { logger } = require("../utils/logger");
 
 dotenv.config();

const route = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

route.get('/get', auth, async (req, res) => {
  try {
    const { roles } = req.user;
    const { page, limit } = req.query;

    // Roles with full access
    const fullAccessRoles = ['Admin', 'Manager', 'HR' ,'Employee'];

    // Check if the user's role is authorized
    if (!fullAccessRoles.includes(roles)) {
      return res.status(403).json({ message: "Unauthorized access for this role." });
    }

    let products;
    let totalProducts;

    if (!page || !limit) {
      // Fetch all products without pagination
      products = await Product.find()
        .populate("category", "category")
        .populate("vendor", "vendorName")
        .populate("material")

        .sort({ _id: -1 });

      totalProducts = products.length;

      return res.status(200).json({
        data: products,
        totalProducts,
        pagination: false,
      });
    }

    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    products = await Product.find()
      .populate("category", "category")
      .populate("vendor", "vendorName")
      

      .sort({ _id: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    totalProducts = await Product.countDocuments();

    // Return paginated data
    res.status(200).json({
      data: products,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: parseInt(page),
      perPage: parseInt(limit),
      pagination: true,
    });
  } catch (error) {
    console.error(`Error fetching products: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});




// GET a single product by ID
route.get('/get/:_id', auth, async (req, res) => {
  try {
    const { _id } = req.params;

    const product = await Product.findById(_id)
    .populate("category","category")        .populate("vendor", "vendorName")
    ;

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(product);
  } catch (error) {
    // logger.error(`Error fetching product: ${error.message}`);
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});


// CREATE a new product with file upload
route.post("/post", auth, upload.array('file'), async (req, res) => {
  try {
    let fileUrls = [];

    if (req.files && req.files.length > 0) {
      const newFileUrls = await uploadFileToFirebase(req.files);
      fileUrls = [...fileUrls, ...newFileUrls];
    }

    // Extract data from req.body using spread operator
    const newProductData = {
      ...req.body,
      images: fileUrls,
     };

    if (!newProductData.vendor || !newProductData.material) {
      return res.status(400).send({ message: 'Vendor and Material are required fields.' });
    }

    // Create a new product
    const newProduct = new Product(newProductData);

    // Save the product
    const savedProduct = await newProduct.save();

    // Update the vendor's product list
    await Vendor.findByIdAndUpdate(
      newProductData.vendor,
      { $push: { material: savedProduct._id } },
      { new: true }
    );


    res.status(200).send({ message: 'Material Created Successfully!', product: savedProduct });
  } catch (error) {
    console.error('Error adding files to product:', error);
    res.status(500).send({ message: `Internal server error: ${error.message}` });
  }
});


// UPDATE product details and add new files
route.post("/update", auth, upload.array('file'), async (req, res) => {
  try {
    const { _id, ...updateData } = req.body; // Extract _id and update fields from req.body

    // Validate _id
    if (!_id) {
      return res.status(400).send({ message: "Product ID is required." });
    }

    // Fetch the current product
    const currentProduct = await Product.findById(_id);
    if (!currentProduct) {
      return res.status(404).send({ message: "Product not found." });
    }

    // Handle file uploads if any
    let fileUrls = [];
    if (req.files && req.files.length > 0) {
      const newFileUrls = await uploadFileToFirebase(req.files);
      fileUrls = [...newFileUrls];
    }

    // Prepare fields to update
    const updateFields = {
      ...updateData,
    };

    // Add new files to the images array
    if (fileUrls.length > 0) {
      updateFields.images = [...(currentProduct.images || []), ...fileUrls];
    }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      _id,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(500).send({ message: "Error updating product." });
    }

    res.status(200).send({
      message: "Product updated successfully.",
      product: updatedProduct,
    });
  } catch (error) {
    console.error(`Error updating product: ${error.message}`);
    res.status(500).send({ message: `Internal server error: ${error.message}` });
  }
});



// DELETE one or multiple products
route.post("/delete", auth, async (req, res) => {
  try {
    const { _id } = req.body;

    if (!_id || (Array.isArray(_id) && _id.length === 0)) {
      return res.status(400).send("No _id provided for deletion.");
    }

    const _idArray = Array.isArray(_id) ? _id : [_id];

    const deletedProducts = await Product.deleteMany({ _id: { $in: _idArray } });

    if (deletedProducts.deletedCount === 0) {
      return res.status(404).send("No products found for the provided ID(s).");
    }

    res.status(200).send({
      message: `${deletedProducts.deletedCount} products deleted successfully.`,
      deletedProducts
    });
  } catch (error) {
    console.error("Error deleting products:", error);
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});


// Export products with search filters and pagination
route.get("/export", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, name, id, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;
    const filterQuery = {};

    if (name) {
      filterQuery.material = { $regex: new RegExp(name, 'i') };
    }

    if (id) {
      const idArray = id.includes(',') ? id.split(',').map(i => i.trim()) : [id];
      filterQuery._id = { $in: idArray };
    }

    if (startDate || endDate) {
      filterQuery.createdAt = {};
      if (startDate) {
        filterQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filterQuery.createdAt.$lte = new Date(endDate);
      }
    }

    const products = await Product.find(filterQuery)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalProducts = await Product.countDocuments(filterQuery);

    res.status(200).json({
      message: "Search results fetched successfully!",
      products,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: parseInt(page),
      totalProducts,
    });
  } catch (error) {
    console.error("Error exporting products:", error);
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});


// categories 
route.post("/categories/post", auth, async (req, res) => {
  try {
     
    const newCategory = new Category(req.body);

    const savedProduct = await newCategory.save();
    res.status(200).send({ message: 'Product created successfully', savedProduct });
  } catch (error) {
    console.error('Error adding files to product:', error);
    res.status(500).send({ message: `Internal server error: ${error.message}` });
  }
});


route.get('/categories/get', auth, async (req, res) => {
  try {
    const { page, limit } = req.query;

    if (!page || !limit) {
      const categories = await Category.find({}, "category") 
        .sort({ _id: -1 });

      return res.status(200).json({
         categories,
        totalCategories: categories.length,
        pagination: false,
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const categories = await Category.find()
      .sort({ _id: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCategories = await Category.countDocuments();

    res.status(200).json({
      categories,
      totalCategories,
      totalPages: Math.ceil(totalCategories / limit),
      currentPage: parseInt(page),
      perPage: parseInt(limit),
      pagination: true,
    });
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});




route.post("/categories/update", auth, async (req, res) => {
  try {
    const { _id, category } = req.body;
// console.log(req.body)
     const categoryupdate = await Category.findByIdAndUpdate(
      _id,  
      { category },  
      { new: true }  
    );

    if (!categoryupdate) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    res.status(200).json({ message: "Category updated successfully", categoryupdate });
  } catch (error) {
    console.error("Error updating category:", error.message);
    res.status(500).json({ message: `Internal server error: ${error.message}` });
  }
});


route.post("/categories/delete", auth, async (req, res) => {
  try {
    const { _id } = req.body;

    if (!_id || (Array.isArray(_id) && _id.length === 0)) {
      return res.status(400).send("No _id provided for deletion.");
    }

    const _idArray = Array.isArray(_id) ? _id : [_id];

    const deletedCategory = await Category.deleteMany({ _id: { $in: _idArray } });

    if (deletedCategory.deletedCount === 0) {
      return res.status(404).send("No Category found for the provided ID(s).");
    }

    res.status(200).send({
      message: `${deletedCategory.deletedCount} Category deleted successfully.`,
      deletedCategory
    });
  } catch (error) {
    console.error("Error deleting Category:", error);
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});
module.exports = route;
