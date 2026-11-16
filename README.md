<<<<<<< HEAD
# Employee Directory

This is my submission for the Full Stack Developer assignment. It's a small app where you can add employees, edit or delete them, and search through the list by name.

I used React with TypeScript (Vite) for the frontend, Node.js with Express for the API, and MySQL to store the data.

## How it's organised


backend/
  schema.sql              creates the database and table, plus some sample rows
  src/index.js            express setup
  src/db.js               mysql connection pool
  src/routes/employees.js all the employee routes
frontend/
  src/App.tsx
  src/api/employees.ts    axios calls to the backend
  src/components/         form, table and pagination


## Running it locally

You'll need Node.js 18 or newer and MySQL 8.


run  : mysql -u root -p < backend/schema.sql. This creates the employee_directory database and the employees table, and inserts the 7 sample rows.


This creates the `employee_directory` database with an `employees` table and a few sample employees, so the page isn't empty the first time you open it.

## What the GET, POST, PUT, METHOD DO And Why I am Using Them:

I have Also Used GET, POST , PUT And DELETE in the Application As asked in the Task Requirements For Backend.

GET method To Show The Employee on The Table
POST to Add An Employee To the Table
PUT to Update An Existing Employee on/From the Table
DELETE method to Delete An existing Employee from the Table 



## A few notes

- I did search and pagination on the backend rather than in the browser, so it still works fine if the list gets big.
- `email` has a unique constraint in the database, so duplicates are blocked even if someone skips the frontend checks.
- There's an index on `name` because that's the column search filters on.
- The layout switches to a card view on smaller screens so the table stays readable on a phone.
=======
# Employee-Directory
Employee directory app with React + TypeScript, Node.js/Express and MySQL. Supports add, edit, delete, search and pagination.
>>>>>>> 20a3baf96861a372821be10a84342def5fa7f060
