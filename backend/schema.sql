CREATE DATABASE IF NOT EXISTS employee_directory;
USE employee_directory;

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  role VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employees_name (name)
);


-- These Are sample Data I have Kept for better understanding and For Testing Purpose. You can remove them if you want to start with an empty database.

INSERT IGNORE INTO employees (name, email, role) VALUES
  ('Rahul Sharma', 'rahul.sharma@example.com', 'Frontend Developer'),
  ('Priya Nair', 'priya.nair@example.com', 'Backend Developer'),
  ('Amit Verma', 'amit.verma@example.com', 'QA Engineer'),
  ('Sneha Kulkarni', 'sneha.k@example.com', 'UI/UX Designer'),
  ('Karan Mehta', 'karan.mehta@example.com', 'DevOps Engineer'),
  ('Neha Joshi', 'neha.joshi@example.com', 'Project Manager'),
  ('Arjun Patil', 'arjun.patil@example.com', 'Full Stack Developer');
