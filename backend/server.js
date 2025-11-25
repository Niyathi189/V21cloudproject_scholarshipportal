const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sql = require("mssql");
const { GoogleGenerativeAI } = require("@google/generative-ai");
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

// Chatbot for Student Scholarship Form Helper
app.post("/api/chatbot-student", async (req, res) => {
  const { student_id, question } = req.body;

  if (!student_id || !question) {
    return res.status(400).json({ error: "student_id and question are required" });
  }

  try {
    const pool = await sql.connect(dbConfig);

    // Fetch student user info
    const userResult = await pool.request()
      .input("student_id", sql.Int, student_id)
      .query(`SELECT user_id, username, role FROM Users WHERE user_id = @student_id`);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const user = userResult.recordset[0];

    // Fetch all student applications with full details
    const applicationsResult = await pool.request()
      .input("student_id", sql.Int, student_id)
      .query(`
        SELECT 
          a.application_id,
          a.first_name,
          a.last_name,
          a.cgpa,
          a.tenth_mark,
          a.twelfth_mark,
          a.address,
          a.phone_no,
          a.email,
          a.department,
          a.current_year,
          a.status,
          a.applied_at,
          s.scholarship_id,
          s.title AS scholarship_title,
          s.description AS scholarship_description,
          s.deadline AS scholarship_deadline
        FROM Scholarship_Applications a
        JOIN Scholarships s ON a.scholarship_id = s.scholarship_id
        WHERE a.student_id = @student_id
      `);

    // Fetch all available scholarships
    const scholarshipsResult = await pool.request()
      .query(`SELECT scholarship_id, title, description, deadline FROM Scholarships WHERE deadline >= GETDATE()`);

    // Format student data for the chatbot
    const studentData = {
      user_info: {
        user_id: user.user_id,
        username: user.username,
        role: user.role
      },
      applications: applicationsResult.recordset.map(app => ({
        application_id: app.application_id,
        scholarship_title: app.scholarship_title,
        scholarship_description: app.scholarship_description,
        scholarship_deadline: app.scholarship_deadline,
        personal_info: {
          first_name: app.first_name,
          last_name: app.last_name,
          email: app.email,
          phone_no: app.phone_no,
          address: app.address,
          department: app.department,
          current_year: app.current_year
        },
        academic_info: {
          cgpa: app.cgpa,
          tenth_mark: app.tenth_mark,
          twelfth_mark: app.twelfth_mark
        },
        application_status: app.status,
        applied_at: app.applied_at
      })),
      available_scholarships: scholarshipsResult.recordset.map(sch => ({
        scholarship_id: sch.scholarship_id,
        title: sch.title,
        description: sch.description,
        deadline: sch.deadline
      }))
    };

    // Initialize Gemini AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured. Please set GEMINI_API_KEY in your .env file." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Create context prompt for the chatbot
    const contextPrompt = `You are a helpful Student Scholarship Form Assistant. Your role is to help students with questions about their scholarship applications and the scholarship form process.

STUDENT INFORMATION:
${JSON.stringify(studentData, null, 2)}

INSTRUCTIONS:
- Answer questions based on the student's data provided above
- Help with questions about filling out scholarship forms
- Explain what information is needed for applications
- Provide guidance on application status
- Help interpret scholarship requirements
- Be friendly, helpful, and concise
- If the student asks about information not in their data, politely let them know you don't have that information
- Focus on scholarship-related queries only

Student's Question: ${question}

Please provide a helpful response:`;

    // Generate response using Gemini
    const result = await model.generateContent(contextPrompt);
    const response = await result.response;
    const answer = response.text();

    res.json({
      answer: answer,
      student_id: student_id
    });

  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ 
      error: "Failed to process chatbot request",
      message: err.message 
    });
  }
});

app.get("/api/test-db", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT 1 AS test");
    res.status(200).json({ 
      message: "✅ Database connected successfully!",
      result: result.recordset 
    });
  } catch (err) {
    res.status(500).json({ 
      message: "❌ Database connection failed",
      error: err.message 
    });
  }
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
