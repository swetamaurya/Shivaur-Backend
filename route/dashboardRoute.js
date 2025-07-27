const express = require("express");
const route = express.Router();
const Attendance = require("../model/attendanceModel");
const { auth } = require("../Middleware/authorization");
const { User  } = require("../model/userModel");
const { Project } = require("../model/projectModel");
const { Product, Category } = require("../model/materialModel");
const {Task} = require("../model/taskModel");
const Policy = require("../model/policyModel");
const { Invoice, Estimate } = require("../model/invoiceModel");
const { Department, Designation } = require("../model/departmentModel");
 const { Leaves, Holiday ,LeaveType} = require("../model/holidayModel");
 const  Expenses   = require('../model/expensesModel');
 const { Termination, Resignation } = require("../model/performationsModel");
 const ExcelJS = require("exceljs")
 const { getModelByName, getPopulationRules } = require('../model/globalModel');
 const moment = require('moment');
const Contractor = require("../model/contractorModel");
const Vendor = require('../model/vendorModel');
const {OfficeTask} = require("../model/officeTaskModel");
const Offer = require("../model/offerModel");
const { Lead } = require("../model/leadModel");
const Enquiry = require("../model/enquiryModel");
const { Sale, SaleInvoice} = require("../model/saleModel");
const { Purchase ,PurchaseInvoice} = require("../model/purchaseModel");
const Company = require("../model/companyModel");


route.post("/delete/all", auth, async (req, res) => {
  try {
    const { _id } = req.body;

    // Validate _id input
    if (!_id || (Array.isArray(_id) && _id.length === 0)) {
      return res.status(400).send("No _id provided for deletion.");
    }

    const _idArray = Array.isArray(_id) ? _id : [_id];

    // Array of models to check for deletion
    const models = [
      { name: 'User', model: User },
      { name: 'Termination', model: Termination },
      { name: 'Resignation', model: Resignation },
      { name: 'Leaves', model: Leaves },
      { name: 'LeaveType', model: LeaveType },
      { name: 'Task', model: Task },
      { name: 'Project', model: Project },
      { name: 'Product', model: Product },
      { name: 'Category', model: Category },
      { name: 'Attendance', model: Attendance },
      { name: 'Policy', model: Policy },
      { name: 'Invoice', model: Invoice },
      { name: 'Department', model: Department },
      { name: 'Designation', model: Designation },
      { name: 'Contractor', model: Contractor },
      { name: 'Vendor', model: Vendor },
      { name: 'Lead', model:Lead },
      { name: 'Holiday', model: Holiday },
      { name: 'Estimate', model: Estimate },
      { name: 'OfficeTask', model: OfficeTask },
      { name: 'Enquiry', model: Enquiry },
      { name: 'Offer', model: Offer },
      { name: 'Expenses', model: Expenses },
      { name: 'Sale', model: Sale },
      { name: 'SaleInvoice', model: SaleInvoice },
      { name: 'Purchase', model: Purchase },
      { name: 'PurchaseInvoice', model: PurchaseInvoice },
      { name: 'Company', model: Company }

      
    ];

    let totalDeletedCount = 0;
    const deletionResults = [];

    // Loop through each model and attempt deletion
    for (const { name, model } of models) {
      const deletionResult = await model.deleteMany({ _id: { $in: _idArray } });
      if (deletionResult.deletedCount > 0) {
        totalDeletedCount += deletionResult.deletedCount;
        deletionResults.push({ model: name, deletedCount: deletionResult.deletedCount });
      }
    }

    // Check if any records were deleted
    if (totalDeletedCount === 0) {
      return res.status(404).send("No records found for the provided ID(s) in any model.");
    }

    // Return summary of deletion results
    return res.status(200).send({
      message: `${totalDeletedCount} records deleted successfully across models.`,
      deletionResults
    });

  } catch (error) {
    console.error("Error deleting records:", error);
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

 
// Route to export data
route.post("/export", auth, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const { roles } = req.user;
  const { _id } = req.body;

  try {
    if (!_id || (Array.isArray(_id) && _id.length === 0)) {
      return res.status(400).json({ error: "No _id provided for export." });
    }

    const _idArray = Array.isArray(_id) ? _id : [_id];

    const models = [
      { name: "User", model: User },
      { name: "Termination", model: Termination },
      { name: "Resignation", model: Resignation },
      { name: "Leaves", model: Leaves },
      { name: "LeaveType", model: LeaveType },
      { name: "Task", model: Task },
      { name: "Project", model: Project },
      { name: "Product", model: Product },
      { name: "Category", model: Category },
      { name: "Attendance", model: Attendance },
      { name: "Policy", model: Policy },
      { name: "Invoice", model: Invoice },
      { name: "Department", model: Department },
      { name: "Designation", model: Designation },
      { name: "Holiday", model: Holiday },
      { name: "Estimate", model: Estimate },
      { name: "Expenses", model: Expenses },
      { name: 'Contractor', model: Contractor },
      { name: 'Vendor', model: Vendor },
      { name: 'OfficeTask', model: OfficeTask },
      {name:'Lead', model:Lead },     
       { name: 'Enquiry', model: Enquiry },
      { name: 'Offer', model: Offer },
      { name: 'Sale', model: Sale },
      { name: 'SaleInvoice', model: SaleInvoice },
      { name: 'Purchase', model: Purchase },
      { name: 'PurchaseInvoice', model: PurchaseInvoice },
            { name: 'Company', model: Company }




    ];

    const skip = (page - 1) * limit;
    const totalData = {};

    for (const { name, model } of models) {
      let query = model.find({ _id: { $in: _idArray } }).sort({_id:-1}).skip(skip).limit(parseInt(limit));

      // Dynamically apply populate based on the model
      if (name === "Project") {
        query = query
        .populate("assignedTo", "name email userId")
        .populate({ path: 'clientName', select: 'name userId email' }) // Populate clientName with required fields
    
        .populate({
          path: "tasks",
          options: { sort: { _id: -1 } },
          populate: [
            { path: "assignedTo", select: "ContractorName email contractorId" },
            { path: "assignedBy", select: "name email userId" }
          ]
        }) 

      } else if (name === "Estimate") {
        query = query
          .populate("client", "name email userId address") // Include all relevant client fields
          .populate("project", "projectName projectId") // Include all relevant project fields
          .select("estimatesId client estimateDate project email taxType expiryDate status clientAddress billingAddress total tax discount GrandTotal otherInfo details"); // Explicitly select all required fields
      
       }else if (name === "Invoice") {
        query = query
          .populate("client" ) // Adjust the fields you want to include
          .populate("project" )
      }else if (name === "Expenses") {
        query = query
          .populate("purchaseBy", "name email userId") // Populate user-related fields
          .select(
            "expensesId item expanseName purchaseDate purchaseBy amount paidBy status files createdAt updatedAt"
          ); // Explicitly select all required fields
      }else if (name === "User") {
        query = query
        // .populate("assigned", "name email userId")
        .populate("designations", "designations")
        .populate("departments", "departments"); // Populate only the department name
        ; // Populate only the department name

      } else if (name === "Task") {
        query = query
          .populate("assignedTo")
          .populate("project")
          .populate("assignedBy", "name email userId");

        } else if (name === "OfficeTask") {
          query = query
             .populate("assignedTo", "name email userId")
            .populate("project", )
            .populate("assignedBy", "name email userId");
  
         
      } else if (name === "Product") {
        query = query.populate("category", "category");
      } else if (name === "Category") {
        query = query.select("category");
      }else if (name === "Designation") {
        query = query.populate("departments", "departments"); // Populate only the department name
      }else if (name === "Termination") {
        query = query.populate("employee", "name"); // Populate only the department name
      }else if (name === "Resignation") {
        query = query.populate("employee", "name email"); // Populate only the department name
      }else if (name === "Contractor") {
        query = query.populate("tasks").populate("projectName"); 
      }else if (name === "Vendor") {
        query = query.populate("projectName"); 
      }else if (name === "Lead") {
        query = query
        .populate("offers")
         .populate("enquiry")
        .populate("invoice")
        .populate("assignedTo")

      }else if (name === "Enquiry") {
        query = query
        .populate({
          path: 'lead', // Populate lead data only if it exists
          model: 'Lead',
          select: 'leadName leadId email mobile createdBy',

      })  .populate({
        path: 'company', // Populate offers data
        options: { sort: { _id: -1 } },
     } )      .populate({
          path: 'createdBy', // Populate offers data
          select: 'name email userId',
      })  .populate({
          path: 'offers', // Populate offers data
          options: { sort: { _id: -1 } },
          select: 'offerReferenceNumber offerDate price policy offerTitle',
      })      
      }else if (name === "Offer") {
        query = query.populate("enquiry")   .populate({
          path: 'company', // Populate offers data
          options: { sort: { _id: -1 } },
       } )  
      }else if (name === "SaleInvoice") {
        query = query.populate("sale") 
      }else if (name === "Sale") {
        query = query.populate("invoice").populate("material") 
      }

      const data = await query;

      if (data.length > 0) {
        totalData[name] = data;
      }
    }

    if (Object.keys(totalData).length === 0) {
      return res.status(404).json({ message: "No records found for the provided ID(s) across models." });
    }

    return generateExcelFile(res, totalData);
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});

const generateExcelFile = async (res, data) => {
  const workbook = new ExcelJS.Workbook();
 


const flattenData = (entry) => {
  const flatObject = {};
  const excludeKeys = ["_id", "__v", "project", "id"]; // Globally exclude these keys
  
  
  const processArray = (key, value, prefix) => {
    value.forEach((item, index) => {
      Object.entries(item).forEach(([nestedKey, nestedValue]) => {
        if (!excludeKeys.includes(nestedKey)) {
          if (nestedKey === "assignedTo" || nestedKey === "assignedBy") {
            // Process nested assigned fields
            if (typeof nestedValue === "object" && nestedValue !== null) {
              flatObject[
                `${prefix}${key}_${index + 1}_${nestedKey}_Name`
              ] = nestedValue?.name || "-";
              flatObject[
                `${prefix}${key}_${index + 1}_${nestedKey}_Email`
              ] = nestedValue?.email || "-";
              flatObject[
                `${prefix}${key}_${index + 1}_${nestedKey}_UserId`
              ] = nestedValue?.userId || "-";
            } else {
              flatObject[`${prefix}${key}_${index + 1}_${nestedKey}`] =
                nestedValue || "-";
            }
          } else {
            // Process all other fields
            flatObject[`${prefix}${key}_${index + 1}_${nestedKey}`] =
              Array.isArray(nestedValue)
                ? nestedValue.join(", ")
                : nestedValue || "-";
          }
        }
      });
    });
  };

  for (const [key, value] of Object.entries(entry)) {
    if (excludeKeys.includes(key)) continue; // Skip excluded fields

    if (key === "client" || key === "clientName") {
      if (value?.name || value?.email || value?.userId) {
        flatObject["ClientName_name"] = value?.name || "-";
        flatObject["ClientName_email"] = Array.isArray(value.email) ? value.email.join(", ") : value.email || "-";
        flatObject["ClientName_userId"] = value?.userId || "-";
      }
    }else if (key === "tasks") {
      if (Array.isArray(value) && value.length > 0) {
        // Only include tasks without project ID as it's redundant
        processArray(key, value, "Task_");
      } else {
        flatObject[key] = "-"; // If tasks is empty or not an array
      }
    } else if (key === "projectName") {
      // Include project name-related fields
      if (Array.isArray(value) && value.length > 0) {
        processArray(key, value, "Project_");
      } else {
        flatObject[key] = "-";
      }
    }
      else if (key === "callInfo" || key === "enquiry" || key === "offers" || key === "paymentDetails") {
      if (Array.isArray(value)) processArray(key, value, `${key}_`);
      else flatObject[key] = "-"; // Mark as "-" if empty or not an array
    } else if (key === "email" || key === "mobile") {
      if (Array.isArray(value)) {
        flatObject[key] = value.filter((v) => typeof v === "string" && v.trim()).join(", ") || "-";
      } else if (typeof value === "string" && value.trim()) {
        flatObject[key] = value;
      } else {
        flatObject[key] = "-";
      }
    } else if (key === "files") {
      flatObject[key] = Array.isArray(value) && value.length > 0 ? value.join(", ") : "-";
    } else if (Buffer.isBuffer(value)) {
      flatObject[key] = value.toString("utf-8"); // Convert Buffer to string
    } else if (key === "category") {
      flatObject[key] = value?.category || value || "-";
    } else if (key === "project") {
      flatObject["Project_Name"] = value?.projectName || "-";
      flatObject["Project_ID"] = value?.projectId || "-";
    } else if (typeof value === "object" && value !== null) {
      // Process nested objects
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        if (!excludeKeys.includes(nestedKey)) {
          flatObject[`${key}_${nestedKey}`] = Array.isArray(nestedValue)
            ? nestedValue.join(", ")
            : nestedValue || "-";
        }
      });
    } else {
      flatObject[key] = value || "-"; // Include primitive values
    }
  }

  return flatObject;
};

  for (const [modelName, modelData] of Object.entries(data)) {
    const worksheet = workbook.addWorksheet(modelName);
  
    const flatData = modelData.map((item) => flattenData(item.toObject()));
  
    // Capitalize only the first letter of the headers
    const formatHeader = (header) =>
      header.replace(/_/g, " ").replace(/\b\w/g, (char, index) =>
        index === 0 ? char.toUpperCase() : char.toLowerCase()
      );
  
    // Define worksheet columns
    worksheet.columns = Object.keys(flatData[0] || {}).map((key) => ({
      header: formatHeader(key),
      key: key,
      width: 20, // Adjust the width of the columns
    }));
  
    // Apply header styles (bold, background color, text color)
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" } }; // Bold and white text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "fd7852" }, // Blue background
      };
      cell.alignment = { horizontal: "center", vertical: "middle" }; // Center-align text
    });
  
    // Add data rows
    flatData.forEach((item) => worksheet.addRow(item));
  
    // Add space and total records row
    worksheet.addRow({});
    const totalRow = worksheet.addRow({ Total_Records: flatData.length });
  
    // Style the total records row
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    totalRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D9E1F2" }, // Light blue background
    };
  
    // Adjust row height for headers
    worksheet.getRow(1).height = 20;
  }
  
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", 'attachment; filename="exported-data.xlsx"');
  
  await workbook.xlsx.write(res);
  res.end();
  
};
 
 



 

function buildDynamicQuery(searchParams) {
  const query = {};
  for (let key in searchParams) {
    if (searchParams[key]) {
      query[key] = new RegExp(searchParams[key], 'i'); // Example: case-insensitive search
    }
  }
  return query;
}



const applyRoleBasedRestrictions = async (query, roles, currentUserId) => {
  switch (roles) {
    case 'Admin':
    case 'Manager':
      // Admin and Manager have full access
      return query;

    case 'Employee':
      // Employees can only access items assigned to them
      query.assignedTo = currentUserId;
      break;
    case 'Client':
        // Employees can only access items assigned to them
        query.assignedTo = currentUserId;
        break;
    case 'Supervisor':
      // Supervisors can access items they supervise
      query.supervisedBy = currentUserId;
      break;

    case 'HR':
      // HR can only see roles in specific categories
      query.roles = { $in: ['Employee', 'Supervisor', 'Manager','Client'] };
      break;

    default:
      throw new Error('Access denied: invalid role');
  }

  return query;
};


// Apply dynamic query and role-based restrictions in the global search route
route.get('/global-search', auth, async (req, res) => {
  const { type, page, limit, sort = '_id', order = 'asc', ...searchParams } = req.query;
  const skip = (page - 1) * limit;
  const { id: currentUserId, roles } = req.user;

  const model = getModelByName(type); // Dynamically fetch the model based on the type
// console.log(model)
  if (!model) {
    return res.status(400).json({ error: 'Invalid type parameter' });
  }

  try {
    // 1. Build the dynamic query
    let query = await buildDynamicQuery(searchParams);

     
  

     // Exclude `Admin` and `Client` roles
     query.roles = { $nin: ['Admin'] };

    // 2. Apply role-based restrictions
    query = await applyRoleBasedRestrictions(query, roles, currentUserId);

 
    // 3. Get the population rules for the model
    const populationRules = getPopulationRules(type);

    // 4. Fetch results with dynamic population
    let resultsQuery = model.find(query);
    for (const populate of populationRules) {
      resultsQuery = resultsQuery.populate(populate);
    }

    let results = await resultsQuery
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 5. Fetch total count
    const totalCount = await model.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // 6. Send response
    res.status(200).json({
      data: results,
      message: 'Search results fetched successfully!',
      totalCount,
      totalPages,
      currentPage: parseInt(page),
      perPage: parseInt(limit),
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});






//Admin Dashboard


route.get('/dashboard', async (req, res) => {
  try {
    // Define roles that should be included in the employee count
    const employeeRoles = ["Employee", "HR", "Manager", "Supervisor"];

    // Fetch counts for projects, clients, tasks, and employees
    const projectCountPromise = Project.countDocuments();
    const clientCountPromise = User.countDocuments({ roles: "Client" });
    const taskCountPromise = Task.countDocuments();
    const employeeCountPromise = User.countDocuments({ roles: { $in: employeeRoles } });

    // Fetch recent items with population for clients in invoices and projects
    const recentInvoicesPromise = Invoice.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("client", "name email userId")
      .populate("project", "projectName"); // Fetch client details

    const recentEnquiryPromise = Enquiry.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("lead") // Fetch client details
      .populate("offers") // Fetch client details
      .populate("createdBy", "name")

    const recentProjectsPromise = Project.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("clientName assignedTo", "name email userId"); // Fetch client details

    const recentOfferPromise = Offer.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("enquiry"); // Fetch category details

    // Await all promises simultaneously
    const [
      projectCount,
      clientCount,
      taskCount,
      employeeCount,
      recentInvoices,
      recentEnquiry,
      recentProjects,
      recentOffer
    ] = await Promise.all([
      projectCountPromise,
      clientCountPromise,
      taskCountPromise,
      employeeCountPromise,
      recentInvoicesPromise,
      recentEnquiryPromise,
      recentProjectsPromise,
      recentOfferPromise
    ]);

    // Send a single JSON response containing all the fetched data
    res.status(200).json({
      counts: {
        projectCount,
        clientCount,
        taskCount,
        employeeCount, // Includes HR, Manager, Supervisor, and Employee roles
      },
      recentInvoices,
      recentEnquiry,
      recentProjects,
      recentOffer
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});


 
route.get('/dashboard/task-status', auth, async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Debugging incoming query parameters
    // console.log('Query Parameters:', req.query);

    const query = {};

    // Validate and parse dates
    if (fromDate && toDate) {
      const fromDateParsed = new Date(fromDate);
      const toDateParsed = new Date(toDate);

      if (isNaN(fromDateParsed) || isNaN(toDateParsed)) {
        return res.status(400).json({ message: 'Invalid date format for fromDate or toDate' });
      }

      query.createdAt = {
        $gte: fromDateParsed,
        $lte: toDateParsed,
      };
    }

    // Debugging final query
    // console.log('Final Query:', query);

    const tasks = await Task.find(query);

    const totalTasks = tasks.length;
    // console.log('Total Tasks:', totalTasks);

    const taskCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    const overdueTasks = tasks.filter(task => 
      task.deadlineDate && 
      new Date(task.deadlineDate) < new Date() && 
      task.status !== 'Completed'
    );

    res.json({
      totalTasks,
      taskCounts,
      overdueTasks: overdueTasks.length,
    });
  } catch (error) {
    console.error('Error fetching task statistics:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});





module.exports = route;
