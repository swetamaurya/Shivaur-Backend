const express = require('express');
const router = express.Router();
const  Expenses   = require('../model/expensesModel');
const { auth } = require('../Middleware/authorization');
const multer = require("multer");
const { uploadFileToFirebase } = require('../utils/fireBase');
const upload = multer({ storage: multer.memoryStorage() });

 
// Route to create a new expense
router.post("/post", auth, upload.array('file'), async (req, res) => {
  try {
    let fileUrls = [];
    if (req.files && req.files.length > 0) {
      const newFileUrls = await uploadFileToFirebase(req.files);
      fileUrls = [...fileUrls, ...newFileUrls];
    }

    const newExpenses = new Expenses({
      ...req.body,
      files: fileUrls,
      userId: req.user._id, // Associate expense with the logged-in user
    });

    const savedExpenses = await newExpenses.save();
    res.status(200).send({ message: 'Expenses created successfully', Expenses: savedExpenses });
  } catch (error) {
    console.error('Error adding files to Expenses:', error);
    return res.status(500).send({ message: `Internal server error: ${error.message}` });
  }
});

// Route to get all expenses - Admins get all expenses, non-admins only get their own
router.get('/get', auth, async (req, res) => {
  try {
    const { roles, _id: userId } = req.user;
    const { page, limit } = req.query; // Extract pagination parameters

    const query = roles === 'Admin' ? {} : { userId }; // Admin sees all, non-admin sees own expenses

    if (!page || !limit) {
      // If pagination parameters are not provided, return all data
      const expenses = await Expenses.find(query).populate('purchaseBy','name userId').sort({ _id: -1 }); // Sort by creation date descending
      return res.status(200).json({
        data: expenses,
        totalExpenses: expenses.length, // Total count of all expenses
        pagination: false, // Indicate that pagination is not applied
      });
    }

    // If pagination parameters are provided, return paginated data
    const skip = (parseInt(page) - 1) * parseInt(limit); // Calculate documents to skip

    const expenses = await Expenses.find(query).populate('purchaseBy','name userId')
      .sort({ _id: -1 }) // Sort by creation date descending
      .skip(skip)
      .limit(parseInt(limit));

    const totalExpenses = await Expenses.countDocuments(query); // Total count of expenses for the query

    res.status(200).json({
      data: expenses,
      totalExpenses,
      totalPages: Math.ceil(totalExpenses / limit), // Calculate total pages
      currentPage: parseInt(page), // Current page
      perPage: parseInt(limit), // Items per page
      pagination: true, // Indicate that pagination is applied
    });
  } catch (error) {
    console.error("Error fetching expenses:", error.message);
    res.status(500).json({ error: 'Error fetching expenses' });
  }
});


router.get('/get/:_id', auth, async (req, res) => {
  try {
      const { _id } = req.params; // Access _id from req.query
      if (!_id) {
          return res.status(400).json({ message: 'Expenses ID (_id) is required' });
      }

      const expenses = await Expenses.findById(_id).populate('purchaseBy','name userId');
      
      if (!expenses) {
          return res.status(404).json({ message: 'Expenses not found' });
      }

      res.status(200).json(expenses);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching Expenses', error: error.message });
  }
});


// Route to update an expense - Admins can update any, others only their own
router.post('/update', auth, upload.array('file'), async (req, res) => {
  try {
    const { roles, _id: userId } = req.user;
    const { _id, ...updateData } = req.body;

    let fileUrls = [];
    if (req.files && req.files.length > 0) {
      const newFileUrls = await uploadFileToFirebase(req.files);
      fileUrls = [...fileUrls, ...newFileUrls];
    }

    const expense = await Expenses.findById(_id);
    if (!expense) {
      return res.status(404).send("Expense not found.");
    }

    if (roles !== 'Admin' && expense.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied: Unauthorized to update this expense.' });
    }

    const updateFields = {
      ...updateData,
      files: fileUrls.length > 0 ? [...expense.files, ...fileUrls] : expense.files
    };

    const updatedExpense = await Expenses.findByIdAndUpdate(_id, updateFields, { new: true });
    res.status(200).json(updatedExpense);
  } catch (error) {
    console.error(`Error updating expense: ${error.message}`);
    return res.status(500).send("Internal server error");
  }
});

// // Route to delete an expense - Admins can delete any, others only their own
// router.post('/delete', auth, async (req, res) => {
//   try {
//     const { roles, _id: userId } = req.user;
//     const { _id } = req.body;

//     const expense = await Expenses.findById(_id);
//     if (!expense) {
//       return res.status(404).json({ error: 'Expense not found' });
//     }

//     if (roles !== 'Admin' && expense.userId.toString() !== userId.toString()) {
//       return res.status(403).json({ message: 'Access denied: Unauthorized to delete this expense.' });
//     }

//     await expense.deleteOne();
//     res.json({ message: 'Expense deleted successfully' });
//   } catch (error) {
//     console.error("Error deleting expense:", error);
//     res.status(500).json({ error: 'Error deleting expense' });
//   }
// });

module.exports = router;

 