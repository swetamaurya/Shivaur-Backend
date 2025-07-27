const mongoose = require("mongoose")
const dotenv = require("dotenv")
dotenv.config()

const connection =     mongoose.connect(process.env.MONGO_URL)


module.exports = connection

// const mongoose = require("mongoose");
// const dotenv = require("dotenv");
// dotenv.config();

// async function connection() {
//   try {
//   , {
  
//     });
//     console.log("MongoDB connected successfully.");
//   } catch (error) {
//     console.error("Error connecting to MongoDB:", error);
//     // process.exit(1); // Exit the process if the connection fails
//   }
// }

// module.exports = connection;
