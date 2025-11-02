const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sql = require("mssql");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database Config
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

// ---------------- AUTH ROUTES ----------------

// Register (Student or Teacher)
app.post("/api/register", async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("username", sql.VarChar, username)
      .input("password", sql.VarChar, password)
      .input("role", sql.VarChar, role)
      .query(`INSERT INTO Users (username, password, role) VALUES (@username, @password, @role)`);
    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login (Common for Student & Teacher)
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("username", sql.VarChar, username)
      .input("password", sql.VarChar, password)
      .query(`SELECT * FROM Users WHERE username=@username AND password=@password`);
    
    if (result.recordset.length === 0) return res.status(400).json({ message: "Invalid credentials" });

    const user = result.recordset[0];
    res.json({ message: "Login successful", user_id: user.user_id, role: user.role });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// ---------------- TEACHER ROUTES ----------------

// Create Scholarship
app.post("/api/teacher/createScholarship", async (req, res) => {
  const { teacher_id, title, description, deadline } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("teacher_id", sql.Int, teacher_id)
      .input("title", sql.VarChar, title)
      .input("description", sql.VarChar, description)
      .input("deadline", sql.Date, deadline)
      .query(`INSERT INTO Scholarships (teacher_id, title, description, deadline)
              VALUES (@teacher_id, @title, @description, @deadline)`);
    res.json({ message: "Scholarship created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to create scholarship" });
  }
});

// View all scholarships created by a teacher
app.get("/api/teacher/scholarships/:teacher_id", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("teacher_id", sql.Int, req.params.teacher_id)
      .query(`SELECT * FROM Scholarships WHERE teacher_id=@teacher_id`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch scholarships" });
  }
});

// View applications for a specific scholarship
app.get("/api/teacher/applications/:scholarship_id", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("scholarship_id", sql.Int, req.params.scholarship_id)
      .query(`
        SELECT a.*, u.username
        FROM Scholarship_Applications a
        JOIN Users u ON a.student_id = u.user_id
        WHERE a.scholarship_id = @scholarship_id
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// Accept / Reject Application
app.put("/api/teacher/updateApplicationStatus", async (req, res) => {
  const { application_id, status } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("application_id", sql.Int, application_id)
      .input("status", sql.VarChar, status)
      .query(`UPDATE Scholarship_Applications SET status=@status WHERE application_id=@application_id`);
    res.json({ message: "Status updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ---------------- STUDENT ROUTES ----------------

// Get all available scholarships
app.get("/api/student/scholarships", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .query(`SELECT * FROM Scholarships WHERE deadline >= GETDATE()`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch scholarships" });
  }
});

// Apply for a scholarship (Form Data)
app.post("/api/student/apply", async (req, res) => {
  const {
    scholarship_id, student_id, first_name, last_name, cgpa,
    tenth_mark, twelfth_mark, address, phone_no, email, department, current_year
  } = req.body;

  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("scholarship_id", sql.Int, scholarship_id)
      .input("student_id", sql.Int, student_id)
      .input("first_name", sql.VarChar, first_name)
      .input("last_name", sql.VarChar, last_name)
      .input("cgpa", sql.Decimal(3,2), cgpa)
      .input("tenth_mark", sql.Decimal(5,2), tenth_mark)
      .input("twelfth_mark", sql.Decimal(5,2), twelfth_mark)
      .input("address", sql.VarChar, address)
      .input("phone_no", sql.VarChar, phone_no)
      .input("email", sql.VarChar, email)
      .input("department", sql.VarChar, department)
      .input("current_year", sql.Int, current_year)
      .query(`
        INSERT INTO Scholarship_Applications 
        (scholarship_id, student_id, first_name, last_name, cgpa, tenth_mark, twelfth_mark, address, phone_no, email, department, current_year)
        VALUES (@scholarship_id, @student_id, @first_name, @last_name, @cgpa, @tenth_mark, @twelfth_mark, @address, @phone_no, @email, @department, @current_year)
      `);
    res.json({ message: "Applied successfully" });
  } catch (err) {
    if (err.originalError && err.originalError.info && err.originalError.info.number === 2627)
      return res.status(400).json({ message: "Already applied" });
    res.status(500).json({ error: "Failed to apply" });
  }
});

// View student's applications
app.get("/api/student/applications/:student_id", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("student_id", sql.Int, req.params.student_id)
      .query(`
        SELECT a.application_id, s.title, a.status, a.applied_at
        FROM Scholarship_Applications a
        JOIN Scholarships s ON a.scholarship_id = s.scholarship_id
        WHERE a.student_id = @student_id
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
