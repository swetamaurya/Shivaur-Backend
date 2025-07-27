const express = require('express');
const { Invoice ,Estimate} = require('../model/invoiceModel');
const {auth} = require('../Middleware/authorization');
const route = express.Router()



route.post('/invoice/post', auth, async (req, res) => {
    const invoice = new Invoice(req.body);
    console.log('My Invoice: ',invoice);
    try {
        const savedInvoice = await invoice.save();
        console.log('My Invoice Data Inside Try: ',savedInvoice);
        res.status(200).send(savedInvoice);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).send({ message: error.message });
        }
        res.status(400).send(error);
    }
});


// Read (GET) - Fetch all invoices
route.get('/invoice/get', auth, async (req, res) => {
    try {
      const { page, limit } = req.query; // Extract pagination parameters
  
      if (!page || !limit) {
        // If pagination parameters are not provided, return all invoices
        const invoices = await Invoice.find()
          .populate('client',"name email address userId mobile" ) // Populate client details
          .populate('project',"projectName projectId" ) // Populate project details
          .populate('product' ,"material productId") // Populate project details
        //   .populate('purchase') // Populate project details
        //   .populate('sale') // Populate project details
          .sort({ _id: -1 }); // Sort by creation date descending
  
        return res.status(200).json({
          data: invoices,
          totalInvoices: invoices.length, // Total count of all invoices
          pagination: false, // Indicate that pagination is not applied
        });
      }
  
      // If pagination parameters are provided, return paginated data
      const skip = (parseInt(page) - 1) * parseInt(limit); // Calculate documents to skip
  
      const invoices = await Invoice.find()
      .populate('client',"name email address userId mobile" ) // Populate client details
      .populate('project',"projectName projectId" ) // Populate project details
      .populate('product' ,"material productId") // Populate project details
    //   .populate('purchase') // Populate project details
    //   .populate('sale') // Populate project details

        .sort({ _id: -1 }) // Sort by creation date descending
        .skip(skip)
        .limit(parseInt(limit));
  
      const totalInvoices = await Invoice.countDocuments(); // Total count of invoices
  
      res.status(200).json({
        data: invoices,
        totalInvoices,
        totalPages: Math.ceil(totalInvoices / limit), // Calculate total pages
        currentPage: parseInt(page), // Current page
        perPage: parseInt(limit), // Items per page
        pagination: true, // Indicate that pagination is applied
      });
    } catch (error) {
      console.error('Error fetching invoices:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  });
  

route.get('/invoice/get/:_id', auth, async (req, res) => {
    try {
        const { _id } = req.params; // Access _id from req.query
        if (!_id) {
            return res.status(400).json({ message: 'Invoice ID (_id) is required' });
        }

        const invoice = await Invoice.findById(_id)
        .populate('client',"name email address userId mobile" ) // Populate client details
        .populate('project',"projectName projectId" ) // Populate project details
        .populate('product' ,"material productId") // Populate project details
        // .populate('purchase') // Populate project details
        // .populate('sale') // Populate project details


        ;
        
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.status(200).json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching Invoice', error: error.message });
    }
});

route.post('/invoice/update',auth, async (req, res) => {
    try {
    
const {_id }= req.body      
  const invoice = await Invoice.findByIdAndUpdate(_id, req.body, {
            new: true, // Return the updated document
         });
        if (!invoice) return res.status(404).send('Invoice not found');
        res.status(200).send(invoice);
    } catch (error) {
        res.status(400).send(error);
    }
});


// Delete (DELETE) - Remove an invoice
route.post("/invoice/delete", auth, async (req, res) => {
    try {
      const { _id} = req.body;
  
      if (!_id || (Array.isArray(_id) && _id.length === 0)) {
        return res.status(400).send("No _id provided for deletion.");
      }
  
       const _idArray = Array.isArray(_id) ? _id : [_id];
  
      // Delete multiple items if _id is an array, otherwise delete a single item
      const deletedInvoices = await Invoice.deleteMany({ _id: { $in: _idArray } });
  
      if (deletedInvoices.deletedCount === 0) {
        return res.status(404).send("No Invoices found for the provided ID(s).");
      }
  
      return res.status(200).send({
        message: `${deletedInvoices.deletedCount} Invoice deleted successfully.`,
        deletedInvoices
      });
    } catch (error) {
      console.error("Error deleting Invoices:", error);
      return res.status(500).send(`Internal server error: ${error.message}`);
    }
  });

/////////////////////////////////////////////// estimate ////////////////////////////////////////////////

// Create an estimate
route.post('/estimates/post',auth, async (req, res) => {
    try {
        const estimate = new Estimate(req.body);
        await estimate.save();
        res.status(200).json({
            message: 'Estimate created successfully',
            estimate,
        });
    } catch (error) {
        res.status(400).json({ message: 'Error creating estimate', error: error.message });
    }
});


route.get('/estimates/get', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page); // Page number from query
        const limit = parseInt(req.query.limit); // Limit from query

        // Check if pagination is provided
        if (!page || !limit) {
            // No pagination, send all data
            const estimates = await Estimate.find()
            .populate('client' ) // Populate client details
            .populate('project' ) // Populate project details
                    .sort({ _id: -1 }); // Sort by _id in descending order

            res.status(200).json({
                data: estimates,
                totalEstimates: estimates.length,  
                pagination: false  
            });
        } else {
             const skip = (page - 1) * limit; // Calculate number of documents to skip

            const estimates = await Estimate.find()
            .populate('client') // Populate client details
            .populate('project' ) // Populate project details
                    .sort({ _id: -1 })
                .skip(skip)
                .limit(limit);

            const totalEstimates = await Estimate.countDocuments();

            res.status(200).json({
                data: estimates,
                totalEstimates,
                totalPages: Math.ceil(totalEstimates / limit),
                currentPage: page,
                perPage: limit,
                pagination: true // Indicate that pagination is applied
            });
        }
    } catch (error) {
        console.error("Error fetching estimates:", error.message);
        res.status(500).json({ message: 'Error fetching estimates', error: error.message });
    }
});




route.get('/estimates/get/:_id', auth, async (req, res) => {
    try {
        const { _id } = req.params; // Access _id from req.query
        if (!_id) {
            return res.status(400).json({ message: 'Estimate ID (_id) is required' });
        }

        const estimate = await Estimate.findById(_id)        .populate('client' ) // Populate client details
        .populate('project' ) // Populate project details

        
        if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found' });
        }

        res.status(200).json(estimate);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching estimate', error: error.message });
    }
});



// Update an estimate by ID
route.post('/estimates/update',auth, async (req, res) => {
    try {
        const estimate = await Estimate.findByIdAndUpdate(req.body._id, req.body, { new: true });
        if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found' });
        }
        res.status(200).json({
            message: 'Estimate updated successfully',
            estimate,
        });
    } catch (error) {
        res.status(400).json({ message: 'Error updating estimate', error: error.message });
    }
});


// Delete an estimate by ID
route.post('/estimates/delete',auth, async (req, res) => {
    try {
        const estimate = await Estimate.findByIdAndDelete(req.body._id);
        if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found' });
        }
        res.status(200).json({ message: 'Estimate deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting estimate', error: error.message });
    }
});


module.exports = route
