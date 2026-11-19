const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "employee_directory",
  waitForConnections: true,
  connectionLimit: 10,
  // Return DATE columns as "YYYY-MM-DD" strings instead of JS Dates, so a joining
  // date can never shift by a day because of the server's timezone.
  dateStrings: ["DATE"],
  // DECIMAL columns come back as numbers rather than strings.
  decimalNumbers: true,
});

module.exports = pool;
