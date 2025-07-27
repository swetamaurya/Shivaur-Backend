const express = require("express");
const router = express.Router();
const Attendance = require("../model/attendanceModel");
const { auth } = require("../Middleware/authorization");
const { User } = require("../model/userModel");

const DEFAULT_BREAK_DURATION_MINUTES = 60;
// Punch action endpoint
router.post("/attendance/punch", auth, async (req, res) => {
  const { userId, action } = req.body;
  const currentDate = new Date().toLocaleDateString('en-CA'); // Using local date in YYYY-MM-DD format

  try {
      let attendanceRecord = await Attendance.findOne({ userId, date: currentDate });

      // Create a new attendance record if it doesn't exist
      if (!attendanceRecord) {
          attendanceRecord = new Attendance({
              userId,
              date: currentDate,
              workSessions: [],
              breakSessions: [],
              totalWorkHours: 0,
              totalBreakHours: 0,
              status: "Absent",
          });
      }

      const now = new Date();

      if (action === "workPunchIn") {
          if (attendanceRecord.status === "Absent") {
              attendanceRecord.status = "Present";
          }

          const latestWorkSession = attendanceRecord.workSessions[attendanceRecord.workSessions.length - 1];
          if (latestWorkSession && latestWorkSession.punchIn && !latestWorkSession.punchOut) {
              return res.status(200).json({ message: "Already punched in.", attendanceRecord });
          }

          // Add a new work session
          attendanceRecord.workSessions.push({ punchIn: now });

      } else if (action === "workPunchOut") {
          const latestWorkSession = attendanceRecord.workSessions[attendanceRecord.workSessions.length - 1];
          if (latestWorkSession && !latestWorkSession.punchOut) {
              latestWorkSession.punchOut = now;

              const workDurationMinutes = Math.floor((now - new Date(latestWorkSession.punchIn)) / (1000 * 60));
              attendanceRecord.totalWorkHours += workDurationMinutes;
          } else {
              return res.status(400).json({ message: "Cannot punch out without punching in." });
          }

      } else if (action === "breakPunchIn") {
          const latestBreakSession = attendanceRecord.breakSessions[attendanceRecord.breakSessions.length - 1];
          if (latestBreakSession && !latestBreakSession.punchOut) {
              return res.status(200).json({ message: "Already on break.", attendanceRecord });
          }

          attendanceRecord.breakSessions.push({ punchIn: now });

      } else if (action === "breakPunchOut") {
          const latestBreakSession = attendanceRecord.breakSessions[attendanceRecord.breakSessions.length - 1];
          if (latestBreakSession && !latestBreakSession.punchOut) {
              latestBreakSession.punchOut = now;

              const breakDurationMinutes = Math.floor((now - new Date(latestBreakSession.punchIn)) / (1000 * 60));
              attendanceRecord.totalBreakHours += breakDurationMinutes;
          } else {
              return res.status(400).json({ message: "Cannot end break without starting it." });
          }

      } else {
          return res.status(400).json({ message: "Invalid action type." });
      }

      await attendanceRecord.save();
      res.status(200).json({ message: "Punch action successful", attendanceRecord });
  } catch (error) {
      console.error("Error:", error.message);
      res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});


router.get("/attendance/get", auth, async (req, res) => {
  try {
    const { roles, id: userId } = req.user; // Extract roles and user ID
    const { page, limit } = req.query; // Pagination parameters

    // Roles with full access
    const fullAccessRoles = ['Admin', 'Manager', 'HR'];

    // Query logic based on roles
    const query = fullAccessRoles.includes(roles) ? {} : { userId }; // Full access roles see all, others see their own

    let attendanceRecords;
    let totalRecords;

    if (!page || !limit) {
      // No pagination provided, return all records
      attendanceRecords = await Attendance.find(query).populate("userId", "name email userId");
      totalRecords = attendanceRecords.length;
    } else {
      // Apply pagination
      totalRecords = await Attendance.countDocuments(query);
      attendanceRecords = await Attendance.find(query)
        .populate("userId", "name email userId")
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit));
    }

    res.status(200).json({
      message: "Attendance records fetched successfully",
      totalRecords,
      totalPages: page && limit ? Math.ceil(totalRecords / parseInt(limit)) : 1,
      currentPage: page ? parseInt(page) : 1,
      attendanceRecords: attendanceRecords.map(record => {
        const latestWorkSession = record.workSessions[record.workSessions.length - 1] || {};
        const punchIn = latestWorkSession.punchIn || null;
        const punchOut = latestWorkSession.punchOut || null;

        const totalWorkMinutes = record.totalWorkHours || 0;
        const totalBreakMinutes = record.totalBreakHours || 0;

        const workHours = Math.floor(totalWorkMinutes / 60);
        const workMinutes = totalWorkMinutes % 60;
        const totalWorkHoursDisplay = `${workHours} hrs ${workMinutes} mins`;

        const breakHours = Math.floor(totalBreakMinutes / 60);
        const breakMinutes = totalBreakMinutes % 60;
        const totalBreakHoursDisplay = `${breakHours} hrs ${breakMinutes} mins`;

        return {
          date: record.date,
          punchIn,
          punchOut,
          workSessions: record.workSessions,
          breakSessions: record.breakSessions,
          totalWorkHours: totalWorkHoursDisplay,
          totalBreakHours: totalBreakHoursDisplay,
          status: record.status,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching attendance records:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});





// Route to get attendance for a specific employee by userId (Admins and specific employee) with pagination
router.get("/attendance/user/:userId", auth, async (req, res) => {
  const { userId } = req.params;
  const { roles, _id: requesterId } = req.user;
  const { month, year, page = 1, limit = 10 } = req.query;

  if (roles !== 'Admin' && requesterId !== userId) {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    let filter = { userId };
    if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);
      filter.date = { $gte: startOfMonth.toISOString().split("T")[0], $lte: endOfMonth.toISOString().split("T")[0] };
    }

    const totalRecords = await Attendance.countDocuments(filter);
    const attendanceRecords = await Attendance.find(filter).populate("userId")
      .sort({ date: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      message: "Attendance records fetched successfully",
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: parseInt(page),
      attendanceRecords,
    });
  } catch (error) {
    console.error("Error fetching attendance data for user:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});



router.get('/attendance/today', auth, async (req, res) => {
  const { roles, _id: userId, name } = req.user;
  // const currentDate = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
  const { page, limit } = req.query; // Pagination params

  try {
    const fullAccessRoles = ['Admin', 'Manager', 'HR'];

    if (fullAccessRoles.includes(roles)) {
      const employeeQuery = roles === 'Admin'
        ? { roles: { $in: ["Employee", "Supervisor"] } }
        : { manager: userId, roles: { $in: ["Employee", "Supervisor"] } };

      const allEmployees = await User.find(employeeQuery).select("_id name role");
      const totalEmployees = allEmployees.length;

      let employeesToProcess = allEmployees;
      if (page && limit) {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        employeesToProcess = allEmployees.slice(skip, skip + parseInt(limit));
      }

      const attendanceRecords = await Attendance.aggregate([
        // { $match: { date: currentDate } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        { $unwind: '$userInfo' },
        {
          $project: {
            userId: 1,
            date: 1,
            status: 1,
            punchIn: { $arrayElemAt: ['$workSessions.punchIn', 0] },
            punchOut: { $arrayElemAt: ['$workSessions.punchOut', 0] },
            name: '$userInfo.name',
            role: '$userInfo.role'
          }
        }
      ]);

      const attendanceStatus = employeesToProcess.map(employee => {
        const attendanceRecord = attendanceRecords.find(record => String(record.userId) === String(employee._id));
        return attendanceRecord ? {
          userId: employee._id,
          name: employee.name,
          // date: currentDate,
          punchIn: attendanceRecord.punchIn,
          punchOut: attendanceRecord.punchOut,
          status: "Present"
        } : {
          userId: employee._id,
          name: employee.name,
          // date: currentDate,
          punchIn: null,
          punchOut: null,
          status: "Absent"
        };
      });

      res.status(200).json({
        message: "Today's attendance status fetched successfully",
        attendanceStatus,
        totalRecords: totalEmployees,
        totalPages: page && limit ? Math.ceil(totalEmployees / parseInt(limit)) : 1,
        // currentPage: page ? parseInt(page) : 1,
      });
    } else {
      const attendanceRecord = await Attendance.findOne({ userId });

      const attendanceStatus = attendanceRecord ? {
        userId,
        name: name,
        // date: currentDate,
        punchIn: attendanceRecord.workSessions[0]?.punchIn || null,
        punchOut: attendanceRecord.workSessions[0]?.punchOut || null,
        status: attendanceRecord.status || "Absent"
      } : {
        userId,
        name: name,
        // date: currentDate,
        punchIn: null,
        punchOut: null,
        status: "Absent"
      };

      res.status(200).json({
        message: "Your attendance status fetched successfully",
        attendanceStatus: [attendanceStatus], 
        totalRecords: 1,
        totalPages: 1,
        currentPage: 1,
      });
    }
  } catch (error) {
    console.error("Error fetching today's attendance:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});



router.get('/attendance/all', auth, async (req, res) => {
  const { roles, _id: userId, name } = req.user;
  const { fromDate, toDate, page, limit } = req.query;

  try {
    const fullAccessRoles = ['Admin', 'Manager', 'HR'];

    // Date filter setup
    let dateFilter = {};
    if (fromDate && toDate) {
      dateFilter = {
        date: {
          $gte: fromDate,
          $lte: toDate
        }
      };
    }

    if (fullAccessRoles.includes(roles)) {
      const employeeQuery = roles === 'Admin'
        ? { roles: { $in: ["Employee", "Supervisor"] } }
        : { manager: userId, roles: { $in: ["Employee", "Supervisor"] } };

      const allEmployees = await User.find(employeeQuery).select("_id name role");
      const totalEmployees = allEmployees.length;

      let employeesToProcess = allEmployees;
      if (page && limit) {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        employeesToProcess = allEmployees.slice(skip, skip + parseInt(limit));
      }

      const attendanceRecords = await Attendance.aggregate([
        { $match: dateFilter }, // ✅ Fetch all attendance records
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        { $unwind: '$userInfo' },
        {
          $project: {
            userId: 1,
            date: 1,
            status: 1,
            punchIn: { $arrayElemAt: ['$workSessions.punchIn', 0] },
            punchOut: { $arrayElemAt: ['$workSessions.punchOut', 0] },
            name: '$userInfo.name',
            role: '$userInfo.role'
          }
        }
      ]);

      const attendanceStatus = employeesToProcess.map(employee => {
        const employeeRecords = attendanceRecords.filter(record => String(record.userId) === String(employee._id));
        return employeeRecords.length > 0
          ? employeeRecords.map(record => ({
              userId: employee._id,
              name: employee.name,
              date: record.date,
              punchIn: record.punchIn,
              punchOut: record.punchOut,
              status: record.status || "Absent"
            }))
          : [{
              userId: employee._id,
              name: employee.name,
              date: null,
              punchIn: null,
              punchOut: null,
              status: "Absent"
            }];
      }).flat(); // Flatten to make a single array

      res.status(200).json({
        message: "All attendance records fetched successfully",
        attendanceStatus,
        totalRecords: attendanceStatus.length,
        totalPages: page && limit ? Math.ceil(totalEmployees / parseInt(limit)) : 1,
        currentPage: page ? parseInt(page) : 1,
      });

    } else {
      const attendanceRecords = await Attendance.find({ userId, ...dateFilter });

      const attendanceStatus = attendanceRecords.map(record => ({
        userId,
        name: name,
        date: record.date,
        punchIn: record.workSessions[0]?.punchIn || null,
        punchOut: record.workSessions[0]?.punchOut || null,
        status: record.status || "Absent"
      }));

      res.status(200).json({
        message: "Your attendance history fetched successfully",
        attendanceStatus,
        totalRecords: attendanceStatus.length,
        totalPages: 1,
        currentPage: 1,
      });
    }
  } catch (error) {
    console.error("Error fetching attendance records:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});







router.get('/attendance/monthYear/get', auth, async (req, res) => {
  const { month, year, page = 1, limit = 10, employee } = req.query;
  const { roles, _id: userId } = req.user; // Extract role and user ID from the authenticated user

  try {
    // Validate month and year
    if (!month || !year || isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return res.status(400).json({ message: "Valid month (1-12) and year are required." });
    }

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    let query = {};
    let totalEmployees = 0;

    // Role-based query setup
    switch (roles) {
      case 'Admin':
      case 'HR':
        // Admin and HR: Fetch all employees or search by employee name
        query = employee
          ? { roles: "Employee", name: { $regex: employee, $options: "i" } }
          : { roles: "Employee" };
        break;

      case 'Manager':
        // Manager: Fetch employees assigned to them
        query = employee
          ? { Manager: userId, name: { $regex: employee, $options: "i" } }
          : { Manager: userId };
        break;

      case 'Supervisor':
        // Supervisor: Fetch employees supervised by them
        query = employee
          ? { Supervisor: userId, name: { $regex: employee, $options: "i" } }
          : { Supervisor: userId };
        break;

      default:
        // Employee: Only fetch their own attendance
        query = { _id: userId };
        totalEmployees = 1;
    }

    // Fetch employee data
    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    totalEmployees = roles === 'Employee' ? 1 : await User.countDocuments(query);

    // Aggregate attendance data for the specified month and year
    const attendanceRecords = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: startOfMonth.toISOString().split("T")[0],
            $lte: endOfMonth.toISOString().split("T")[0],
          },
        },
      },
      {
        $group: {
          _id: "$userId",
          attendance: {
            $push: {
              date: "$date",
              status: "$status",
            },
          },
        },
      },
    ]);

    // Format attendance records
    const formattedRecords = users.map((user) => {
      // Initialize all dates in the month as "Absent"
      const attendance = {};
      for (let day = 1; day <= endOfMonth.getDate(); day++) {
        const dayString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        attendance[dayString] = "Absent";
      }

      // Find attendance for the current user
      const userRecord = attendanceRecords.find((record) => record._id.toString() === user._id.toString());
      if (userRecord) {
        userRecord.attendance.forEach((day) => {
          attendance[day.date] = day.status || "Absent";
        });
      }

      return {
        userId: user._id,
        name: user.name,
        attendance,
      };
    });

    // Send response
    res.status(200).json({
      attendanceRecords: formattedRecords,
      totalRecords: totalEmployees,
      totalPages: Math.ceil(totalEmployees / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching attendance records:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});


router.get('/attendance/search', auth, async (req, res) => {
    try {
        const { name, month, year, page = 1, limit = 10 } = req.query;
        const { roles, _id: userId } = req.user;
        const skip = (page - 1) * limit;

        let query = {}; // ✅ Default empty query

        // ✅ Convert Month & Year to Date Range
        if (month && year) {
            let startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
            let endDate = new Date(year, month, 0);
            query.date = { $gte: startDate, $lte: endDate };
        } else if (month) {
            query = {
                $expr: { $eq: [{ $month: { $dateFromString: { dateString: "$date" } } }, parseInt(month)] }
            };
        } else if (year) {
            query = {
                $expr: { $eq: [{ $year: { $dateFromString: { dateString: "$date" } } }, parseInt(year)] }
            };
        }

        // ✅ Filter by Employee Name
        if (name) {
            const users = await User.find({ name: { $regex: name, $options: 'i' } }).select('_id');
            const userIds = users.map(user => user._id);
            query.userId = { $in: userIds };
        }

        // ✅ Apply Role-Based Access
        if (!['Admin', 'HR', 'Manager'].includes(roles)) {
            query.userId = userId;
        }

        // ✅ Fetch Attendance Data
        const attendanceRecords = await Attendance.find(query)
            .sort({ date: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate("userId", "name");

        const totalRecords = await Attendance.countDocuments(query);
        const totalPages = Math.ceil(totalRecords / limit);

        res.status(200).json({
            message: "Filtered attendance records fetched successfully",
            attendanceRecords,
            totalRecords,
            totalPages,
            currentPage: parseInt(page),
            perPage: parseInt(limit),
        });

    } catch (error) {
        console.error("❌ Error fetching attendance:", error.message);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});









router.get("/attendance/status", auth, async (req, res) => {
  const { month, year, page, limit } = req.query;
  const { roles, _id: userId } = req.user; // Extract role and user ID from the authenticated user

  if (!month || !year || isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    return res.status(400).json({ message: "Valid month (1-12) and year are required." });
  }

  try {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    let usersQuery = roles === "Admin" ? {} : { _id: userId };
    let totalUsers = await User.countDocuments(usersQuery);
    let users = [];

    // Fetch all users or paginated users based on `page` and `limit`
    if (!page || !limit) {
      // If no pagination, fetch all users
      users = await User.find(usersQuery).select("_id name");
    } else {
      // If pagination is provided, fetch paginated users
      users = await User.find(usersQuery)
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .select("_id name");
    }

    // Fetch attendance records for the specified month
    const attendanceRecords = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: startOfMonth.toISOString().split("T")[0],
            $lte: endOfMonth.toISOString().split("T")[0],
          },
          ...(roles === "Admin" ? {} : { userId }),
        },
      },
      {
        $group: {
          _id: "$userId",
          attendance: {
            $push: {
              date: "$date",
              status: "$status",
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          userId: "$_id",
          name: "$userInfo.name",
          attendance: 1,
        },
      },
    ]);

    // Format the attendance data
    const formattedRecords = users.map((user) => {
      const attendance = {};
      // Initialize all days as "Absent"
      for (let day = 1; day <= endOfMonth.getDate(); day++) {
        const dayString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        attendance[dayString] = "Absent";
      }

      // Populate attendance records
      const userRecord = attendanceRecords.find((record) => String(record.userId) === String(user._id));
      if (userRecord) {
        userRecord.attendance.forEach((day) => {
          attendance[day.date] = day.status || "Absent";
        });
      }

      return {
        userId: user._id,
        name: user.name,
        attendance,
      };
    });

    // Build the response
    res.status(200).json({
      message: "Attendance status fetched successfully",
      totalRecords: totalUsers,
      totalPages: page && limit ? Math.ceil(totalUsers / parseInt(limit)) : 1,
      currentPage: page ? parseInt(page) : 1,
      attendanceStatus: formattedRecords,
    });
  } catch (error) {
    console.error("Error fetching attendance records:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});



module.exports = router;



