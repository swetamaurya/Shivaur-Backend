const express = require("express");
const app = express()
const dotenv = require("dotenv");
const UserRoute = require("./route/userRoute");
 const cors = require("cors");
const connection = require("./config/database");
 const ProjectRoute = require("./route/projectRoute");
  const TaskRoute = require("./route/taskRoute");
  const OfficeTaskRoute = require("./route/officeTaskRoute");
const InvoiceRoute = require("./route/invoiceRoute");
const HolidayRoute = require("./route/holidayRoute");
const DepartmentRouter = require("./route/departmentRoute");
 const MaterialRoute = require("./route/materialRoute");
 const attendanceRouter = require("./route/attendanceRoute");
 const PolicyRouter = require("./route/policyRoute");
const ResignationRouter = require("./route/performationsRoute");
const dashboardRoute = require("./route/dashboardRoute");
const contractorRouter = require("./route/contractorRoute");
const vendorRouter = require("./route/vendorRoute")
const leadRouter = require("./route/leadRoute")
const enquiryRouter = require('./route/enquiryRoute');
const offerRouter = require('./route/offerRoute');
const ExpensesRouter = require("./route/expensesRoute");
const saleRoutes = require("./route/saleRoute");
const purchaseRoutes = require("./route/purchaseRoute");
const CompanyRuter = require("./route/companyRoute");

dotenv.config()
PORT = process.env.PORT || 2000

 
app.use(express.json());
app.use(cors())


 
app.use("/user" , UserRoute)
app.use("/project", ProjectRoute)
 app.use('/task',TaskRoute)
 app.use('/officeTask',OfficeTaskRoute)
app.use("/",InvoiceRoute)
app.use("/",HolidayRoute)
app.use('/',DepartmentRouter)
app.use("/sales", saleRoutes);
app.use("/product",MaterialRoute)
app.use("/",attendanceRouter)
 app.use("/policy",PolicyRouter)
app.use("/",ResignationRouter)
app.use('/purchase', purchaseRoutes);
app.use("/",dashboardRoute)
app.use('/contractor',contractorRouter)
app.use('/vendor',vendorRouter)
app.use('/lead',leadRouter)
app.use('/enquiry',enquiryRouter)
app.use('/offer',offerRouter)
app.use('/expenses',ExpensesRouter)
app.use('/company',CompanyRuter)
app.get("/test",async (req,res)=>{
    return res.status(200).send("Welcome Shivour👍")
})

 
app.listen(PORT , async (req,res)=>{
    try {
        await connection
        console.log("MongoDB is connected.")
    } catch (error) {
        console.log(error)
    }
    console.log(`Server is running on PORT : ${PORT}`)
})


