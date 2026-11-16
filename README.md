# Employee Directory

A small app to add, edit, delete and search employees. I built it for the Full Stack Developer assignment.

Tech used: React + TypeScript (Vite), Axios, Node.js with Express, MySQL

## Running it locally

You'll need Node.js 18+ and MySQL 8.

1. Database

Run the schema file from the project folder:

```
mysql -u root -p < backend/schema.sql
```

This creates the employee_directory database and an employees table with a few sample rows.

2. Backend

```
cd backend
npm install
```

Copy .env.example to .env and add your MySQL password, then:

```
npm run dev
```

It runs on http://localhost:5000.

3. Frontend

In a new terminal:

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. If your backend isn't on port 5000, copy .env.example to .env in the frontend folder and change VITE_API_URL.

## API

GET /employees - get the employees
POST /employees - add an employee
PUT /employees/{id} - update an employee
DELETE /employees/{id} - delete an employee

GET /employees also takes search, page and limit, for example /employees?search=rahul&page=1&limit=5.

POST and PUT expect name, email and role. All three are required and the email must be unique.

## Extras

I also added search by name, pagination (5 per page) and a layout that works on mobile.