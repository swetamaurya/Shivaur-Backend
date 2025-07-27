
const Attendance = require("../model/attendanceModel");
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
const Vendor = require("./vendorModel");
const {OfficeTask} = require("./officeTaskModel");
const {Lead} = require("./leadModel");
const Enquiry = require("./enquiryModel");
const Offer = require("./offerModel");
const Contractor = require("./contractorModel");
const {Sale , SaleInvoice} = require("./saleModel");
const { Purchase ,PurchaseInvoice} = require("../model/purchaseModel");
const Company = require("./companyModel");

 
const models = {
    attendance: Attendance,
    user: User,
    project: Project,
    product: Product,
    category: Category,
    task: Task,
    policy: Policy,
    invoice: Invoice,
    estimate: Estimate,
    department: Department,
    designation: Designation,
    leaves: Leaves,
    holiday: Holiday,
    leaveType: LeaveType,
    expense: Expenses,
    termination: Termination,
    resignation: Resignation,
    contractor:Contractor,
    vendor:Vendor,
    officetask:OfficeTask,
    lead:Lead,
    enquiry:Enquiry,
    offer:Offer,
    sale:Sale,
    saleInvoice:SaleInvoice,
    purchase: Purchase,
    purchaseInvoice :PurchaseInvoice,
    company:Company

  };
  
   
  // Population configuration for all models
const populationConfig = {
  task: [
    { path: 'assignedTo' },
    { path: 'project' },
    { path: 'assignedBy' },
  ],
  officetask : [
    { path: 'assignedTo' },
    { path: 'project' },
    { path: 'assignedBy' },
  ],
  lead:[
    { path: 'assignedTo' },
    { path: 'createdBy' },
  ],
  project: [
    { path: 'clientName', select: 'name userId' },
    { path: 'assignedTo' , select: 'name userId'},
    { path: 'tasks' },
  ],
  user: [
    { path: 'assigned' },
    { path: 'clientName' },
    { path: 'leave' },
    { path: 'attendance' },
    { path: 'Manager' },
    { path: 'Supervisor' },
    { path: 'departments' },
    { path: 'designations' },
  ],
  expense: [
    { path: 'purchaseBy' },
  ],
  leaves: [
    { path: 'leaveType' },
    { path: 'employee' },
    { path: 'approvedBy' },
  ],
  invoice: [
    { path: 'client' },
    { path: 'project' },
  ],
  estimates: [
    { path: 'client'},
    { path: 'project' },
  ], 
  resignation: [
    { path: 'employee' },
  ],
  termination: [
    { path: 'employee' },
  ],
  policy: [
    { path: 'department' },
  ],
  product: [
    { path: 'category' },
    { path: 'vendor' }, 

  ],
  attendance: [
    { path: 'employee', select: 'name email' },
    { path: 'approvedBy', select: 'name email' },
  ],
  contractor :[
    { path: 'tasks'},
    { path: 'projectName'},

  ],
  vendor :[
 
      { path: 'material'}

 
  ],
  enquiry :[
  {
      path: 'lead', // Populate lead data only if it exists
      model: 'Lead',
      select: 'leadName leadId email mobile createdBy',

  },{
      path: 'createdBy', // Populate offers data
      select: 'name email userId',
  },{
      path: 'offers', // Populate offers data
      options: { sort: { _id: -1 } },
      select: 'offerReferenceNumber offerDate price policy offerTitle',
  } 
   ],
   designation:[
    {path: 'departments'}
  ],
  offer :[
 
      { path: 'enquiry'},
      {path: 'lead', // Populate lead data only if it exists
      model: 'Lead',
      select: 'leadName leadId email mobile createdBy',
}

  ],
sale :[{ path: 'invoice'}],
saleInvoice :[{ path: 'sale'},{ path: 'material'}],
purchase :[{ path: 'invoice'}],
purchaseInvoice :[{ path: 'purchase'},{ path: 'material'}],
attendance:[{path:"userId"}]
};

// Function to get population rules dynamically
const getModelByName = (modelName) => {
  if (!modelName || typeof modelName !== "string") {
      console.error("Invalid model name provided:", modelName);
      return null;
  }

  const lowerCaseModelName = modelName.toLowerCase();
  const model = models[lowerCaseModelName] || null;
  if (!model) {
      console.error("Model not found for type:", modelName);
  }
  return model;
};
const getPopulationRules = (modelName) => populationConfig[modelName.toLowerCase()] || [];

  // Export both models and the function
  module.exports = {
    getPopulationRules,
    getModelByName
  };
  