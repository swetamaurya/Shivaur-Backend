const express = require("express");
const mongoose = require('mongoose');

const router = express.Router();
const Enquiry = require("../model/enquiryModel");
const { auth } = require("../Middleware/authorization");
const { Lead } = require("../model/leadModel");
const Offer = require("../model/offerModel");
const Company = require("../model/companyModel");
  
 

 router.post('/post', auth, async (req, res) => {
    try {
        const { id, company, ...enquiryData } = req.body; // Extract company and lead ID
        const createdBy = req.user.id;

        let companyId = company; // Assume it's already an ObjectId

        // 🔹 If the company is a name instead of an ObjectId, find its corresponding ID
        if (typeof company === "string" && !mongoose.Types.ObjectId.isValid(company)) {
            const foundCompany = await Company.findOne({ companyName: company });
            if (!foundCompany) {
                return res.status(400).json({ message: `Company '${company}' not found in database` });
            }
            companyId = foundCompany._id; // Use the actual ObjectId
        }

        if (id) {
            const lead = await Lead.findById(id);
            if (!lead) {
                return res.status(404).json({ message: 'Lead not found.' });
            }

            const enrichedEnquiryData = {
                ...enquiryData,
                PIC: lead.leadName,
                email: lead.email[0] || '',
                phone: lead.mobile[0] || '',
                department: lead.department,
                designation: lead.designation,
                address: lead.address,
                createdBy,
                lead: id,
                company: companyId // ✅ Save the correct ObjectId
            };

            const enquiry = new Enquiry(enrichedEnquiryData);
            await enquiry.save();

            lead.enquiry.push(enquiry._id);
            await lead.save();

            return res.status(200).json({
                message: 'Enquiry created and linked to the lead successfully.',
                enquiry,
            });
        }

        // If no lead ID, create independent enquiry
        const enquiry = new Enquiry({ ...enquiryData, company: companyId, createdBy });
        await enquiry.save();

        res.status(200).json({
            message: 'Independent enquiry created successfully.',
            enquiry,
        });

    } catch (error) {
        console.error('Error creating enquiry:', error.message);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
});

  
router.get('/getAll', auth, async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10) || 10;
        const skip = (page - 1) * limit;

        // Fetch enquiries and populate the referenced fields
        const enquiry = await Enquiry.find()
            .populate({
                path: 'lead',
                model: 'Lead',
                select: 'leadName leadId email mobile callInfo createdBy',
            })
            .populate({
                path: 'offers',
                select: 'offerReferenceNumber offerDate price policy offerTitle',
            })
            .populate({
                path: 'createdBy',
                select: 'name email userId',
            })
            .populate({
                path: 'company',
                select: 'companyName phoneNumber address', // ✅ Ensure only valid ObjectId is used
            })
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        if (!enquiry || enquiry.length === 0) {
            return res.status(404).json({ message: 'No enquiries found.' });
        }

        const totalCount = await Enquiry.countDocuments();

        res.status(200).json({
            message: 'Enquiries fetched successfully',
            enquiry,
            pagination: {
                totalRecords: totalCount,
                currentPage: page,
                perPage: limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        });

    } catch (error) {
        console.error('Error fetching enquiries:', error);
        res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
});





router.get('/get', auth, async (req, res) => {
    try {
        const { _id } = req.query;
        // console.log("get single",req.query)
        const enquiry = await Enquiry.findById(_id)
        .populate({
            path: 'lead', // Populate lead data only if it exists
            model: 'Lead',
            select: 'leadName leadId email mobile callInfo createdBy',

        })         .populate({
            path: 'createdBy', // Populate offers data
            select: 'name email userId',
        })  .populate({
            path: 'offers', // Populate offers data
            options: { sort: { _id: -1 } },
            select: 'offerReferenceNumber offerDate price policy offerTitle',
        }).populate('company')
          .sort({ _id: -1 }).lean();
        if (!enquiry) {
            return res.status(400).json({ message: 'Enquiry not found.' });
        }
        return res.status(200).json({
            message: 'Enquiry fetched successfully',
            enquiry
        });
    } catch (error) {
        console.error('Error fetching enquiry:', error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
});

router.post('/update', auth, async (req, res) => {
    try {
        const { id, ...updateData } = req.body;
        const updateEnquiry = await Enquiry.findByIdAndUpdate(id, { ...updateData }, { new: true });
        if (!updateEnquiry) {
            return res.status(400).json({ message: 'Enquiry not found' });
        }
        return res.status(200).json({
            message: 'Enquiry updated successfully',
            updateEnquiry
        });
    } catch (error) {
        console.error('Error updating enquiry:', error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
});

module.exports = router;
