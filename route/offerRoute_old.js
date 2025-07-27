const express = require("express");
const router = express.Router();
const Offer = require("../model/offerModel");
const { auth } = require("../Middleware/authorization");
const Enquiry = require("../model/enquiryModel");
const nodemailer = require("nodemailer");
const multer = require('multer');
const { Lead } = require("../model/leadModel");
const storage = multer.memoryStorage(); // Store in memory for simple processing
const upload = multer({ storage });
 
// create offer API 

// router.post('/post', auth, async (req, res) => {
//     try {
//       const { enquiryId, ...otherFields } = req.body;
//       const createdBy = req.user.id; // Extract the user ID from the auth middleware
  
//       if (enquiryId) {
//         const enquiry = await Enquiry.findById(enquiryId);
//         if (!enquiry) {
//           return res.status(404).json({ message: 'Enquiry not found.' });
//         }
//       }
  
//       const offerData = enquiryId
//         ? { enquiry: enquiryId, createdBy, ...otherFields }
//         : { createdBy, ...otherFields };
  
//       const offer = new Offer(offerData);
//       await offer.save();
  
//       res.status(200).json({
//         message: enquiryId
//           ? 'Linked offer created successfully'
//           : 'Independent offer created successfully',
//         offer,
//       });
//     } catch (error) {
//       console.error('Error creating offer:', error.message);
//       res.status(500).json({ message: `Internal server error: ${error.message}` });
//     }
//   });
 

router.post('/post', auth, async (req, res) => {
    try {
      const { enquiryId, leadId, ...otherFields } = req.body;
      const createdBy = req.user.id; // Extract the user ID from the auth middleware
  
      // Validate enquiry ID if provided
      if (enquiryId) {
        const enquiry = await Enquiry.findById(enquiryId);
        if (!enquiry) {
          return res.status(404).json({ message: 'Enquiry not found.' });
        }
      }
  
      if (leadId) {
        // Validate lead existence
        const lead = await Lead.findById(leadId);
        if (!lead) {
          return res.status(404).json({ message: 'Lead not found.' });
        }
      }
      // Prepare offer data
      const offerData = { createdBy, ...otherFields };
      if (enquiryId) offerData.enquiry = enquiryId; // Link enquiry
      if (leadId) offerData.lead = leadId; // Link lead
  
      // Create the offer
      const offer = new Offer(offerData);
      await offer.save();
  
      if (leadId) {
        await Lead.findByIdAndUpdate(leadId, { $push: { offers: offer._id } });
      }
  
      res.status(200).json({
        message: leadId ? 'Offer linked to lead successfully.' : 'Independent offer created successfully.',
        offer,
      });
    } catch (error) {
      console.error('Error creating offer:', error.message);
      res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
  });
  
// get by id API 
router.get('/get', auth, async (req, res) => {
    try {
        const { id } = req.query;
        // console.log(req.query)
        const offer = await Offer.findById(id).populate('enquiry', 'enquiryTitle PIC detailOfEnquiry email phone department designation company')
        .populate('lead')


        if (!offer) {
            return res.status(500).json({ message: 'Offer not found' })
        }
        return res.status(200).json({ message: 'Offer fetched successfully', offer })
    } catch (error) {
        console.log('Error fetching Offer: ', error)
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
})

// get all API 
router.get('/getAll', async (req, res) => {
    try {
        let { page, limit } = req.query;

        page = parseInt(page, 10) || 1; // Default to page 1
        limit = parseInt(limit, 10) || 10; // Default to 10 records per page
        const skip = (page - 1) * limit;

       // Fetch all offers, populate enquiry details where linked
       const offers = await Offer.find({})
       .populate('lead')
       .populate('enquiry', 'enquiryTitle PIC detailOfEnquiry email phone department designation company')
       .sort({ _id: -1 })
       .skip(skip)
       .limit(limit);

        const totalOffers = await Offer.countDocuments();

        res.status(200).json({
            message: 'Offers fetched successfully.',
            offers,
            pagination: {
                totalRecords: totalOffers,
                currentPage: page,
                perPage: limit,
                totalPages: Math.ceil(totalOffers / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching offers:', error.message);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
});

router.get('/offers/by-enquiry', async (req, res) => {
    try {
        const { enquiryId } = req.query;

        if (!enquiryId) {
            return res.status(400).json({ message: 'Enquiry ID is required.' });
        }

        // Fetch offers linked to the given enquiry ID
        const offers = await Offer.find({ enquiry: enquiryId })
            .populate('enquiry', 'enquiryTitle enquiryDate PIC detailOfEnquiry')
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: 'Offers fetched successfully for the enquiry.',
            offers,
        });
    } catch (error) {
        console.error('Error fetching offers by enquiry:', error.message);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
});

router.post('/update', auth, async (req, res) => {
    try {
        const { id, offerReferenceNumber, offerDate, policy, price, additionalInfo, PIC, email, phone, department,offerTitle,enquiryTitle, company } = req.body;

        // Validate the existence of the offer ID
        if (!id) {
            return res.status(400).json({ message: 'Offer ID is required.' });
        }

        // Find the offer by ID
        const offer = await Offer.findById(id);
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found.' });
        }

        // Update the offer fields with the provided values
        offer.offerReferenceNumber = typeof offerReferenceNumber === 'string' ? offerReferenceNumber : String(offerReferenceNumber || '');
        offer.offerDate = offerDate || offer.offerDate;
        offer.policy = policy && policy !== '<p></p>' ? policy : '';
        offer.price = price || offer.price;
        offer.additionalInfo = additionalInfo || offer.additionalInfo;
        offer.PIC = PIC || offer.PIC;
        offer.email = email || offer.email;
        offer.phone = phone || offer.phone;
        offer.department = department || offer.department;
        offer.company = company || offer.company;  
        offer.offerTitle = offerTitle || offer.offerTitle;  
        offer.enquiryTitle = enquiryTitle || offer.enquiryTitle;

        // Save the updated offer back to the database
        await offer.save();
console.log(offer)
        // Respond with the updated offer
        res.status(200).json({
            message: 'Offer updated successfully.',
            offer,
        });
    } catch (error) {
        console.error('Error updating offer:', error.message);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
});

router.post("/send-email", upload.single("Offer"), async (req, res) => {
    try {
      const { to, cc, subject, message } = req.body;
  
      // Check if file is uploaded
      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }
  
      // Configure the email transporter
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.EMAIL, // Your email from environment variables
          pass: process.env.EMAIL_PASSWORD, // Your email password
        },
      });
  
      // Configure the email options
      const mailOptions = {
        from: process.env.EMAIL,
        to,
        cc,
        subject,
        text: message,
        attachments: [
          {
            filename: req.file.originalname,
            content: req.file.buffer, // The file data from multer
          },
        ],
      };
  
      // Send the email
      await transporter.sendMail(mailOptions);
      res.send("Email sent successfully");
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).send("Error sending email");
    }
  });
  
module.exports = router;