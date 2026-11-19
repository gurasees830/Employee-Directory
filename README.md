# Ágaetis Employee Directory

This is my take on the Full Stack Developer assignment: a small employee directory where an admin can add, view, edit and delete people. It started as the basic version from the brief and I kept building on it, so it now has a login, advanced filters, an org chart and a dashboard.

It's built with React and TypeScript (Vite) on the front, Node.js with Express on the back, and MySQL for the data. Requests go through Axios.

## What's in it

The basics from the assignment are all there: a form to add an employee (name, email, role), a list with edit and delete buttons, a REST API for all four operations with CORS turned on, and a MySQL table with id, name, email, role and created_at. For the bonus points I added search by name, pagination and a nicer UI.

On top of that:

- An admin login. The whole app sits behind it, and there's no sign-up page, only admin accounts.
- Three ways to look at people: a sortable list, profile cards, and an org chart built from who reports to whom.
- Advanced filters: department, seniority level, years at the company, role, skills (people who have any of them, or all of them), who someone reports to, managers versus individual contributors, employment type, status and joining date. The filters live in the URL, so you can bookmark or share a filtered view.
- A dashboard with headcount, average time at the company, a department breakdown, the newest joiners and the biggest teams.
- A profile panel for each person, CSV export of whatever you've filtered, and bulk delete.
- Validation on both the form and the server, with errors shown next to the field they belong to.
- A "Report an issue" button that opens an email to me with the details filled in.
- Light and dark themes, and it works on a phone.

A note on "experience": Ágaetis was founded in December 2018, so experience in this app means time at the company, worked out from each person's joining date. Nobody can have joined before the founding, which is why the longest anyone has been here is just under 8 years and the average is about 4. The API and the database both refuse an earlier joining date.

## Running it on your machine

You need Node.js 20.19 or newer (Node 22 LTS is a safe pick, Vite won't start on older versions) and MySQL 8 (8.0.16 or newer, for the check constraints) installed and running. You can check your version with `node -v`.

**1. Get the code**

```
git clone https://github.com/gurasees830/Employee-Directory.git
cd Employee-Directory
```

**2. Set up the backend**

```
cd backend
npm install
```

Copy the example settings file to a real one. On Windows that's `copy .env.example .env`, on Mac or Linux `cp .env.example .env`. Then open `.env` and fill in your MySQL password (`DB_PASSWORD`). The admin login is set there too. Out of the box it's `admin@example.com` with the password `Admin@123`, and you can change `ADMIN_EMAIL` and `ADMIN_PASSWORD` to whatever you like before the next step.

**3. Create the database**

Still inside the backend folder:

```
npm run db:seed
```

This creates the `employee_directory` database and its tables, creates the admin account, and loads a made-up company of about 85 people so the app has something to show. All the names are fictional and the emails use example.com. It's safe to run more than once. If you'd rather start with an empty directory, run `npm run db:setup` instead, which does everything except load the sample people.

**4. Start the backend**

```
npm run dev
```

It runs on http://localhost:5000. Leave this terminal open.

**5. Start the frontend**

Open a second terminal:

```
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 and sign in with the admin login from step 2. If your backend isn't on port 5000, copy `frontend/.env.example` to `frontend/.env` and change `VITE_API_URL`.

**6. Run the tests (optional)**

```
cd backend
npm test
```

## Other commands

These all run from the backend folder.

- `npm run db:reset` wipes every employee and reloads the sample company, so use it with care.
- `npm run admin:reset` puts the admin password back to whatever `ADMIN_PASSWORD` is in your `.env`, and signs the admin out everywhere. If you change `ADMIN_EMAIL` instead, run `npm run db:setup` so the new account gets created.

## If something goes wrong

- Seeing "Can't reach the server" on the login page means the backend isn't running, so check the first terminal.
- If `npm run db:seed` says access denied, the `DB_USER` or `DB_PASSWORD` in `backend/.env` doesn't match your MySQL setup.
- After 10 wrong passwords the login locks for 15 minutes, which is there to slow down guessing. Restarting the backend clears it straight away.
- If you get port errors, something else is already using 5000 or 5173. Close it, or change `PORT` in the backend `.env`.
- If you had the first version of this project on your machine, `npm run db:setup` upgrades the old database in place and keeps your existing rows.

## Looking at the data in MySQL

There's a view called `v_employee_directory` that puts everything about a person in one row: their manager, how many people report to them, their years at the company and their skills. On Windows the MySQL client usually isn't on the PATH, so start it like this:

```
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p employee_directory
```

Then try a few queries:

```sql
SHOW TABLES;
SELECT * FROM v_employee_directory LIMIT 20;
SELECT name, role, reports_to, years_at_agaetis FROM v_employee_directory WHERE department = 'Engineering';
SELECT department, COUNT(*) FROM employees GROUP BY department ORDER BY 2 DESC;
```

MySQL Workbench works too: connect to localhost:3306 as root and open the `employee_directory` schema.

## The API

Everything under `/employees` needs an admin session, so sign in first and keep the cookie:

```
curl -c cookies.txt -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"Admin@123"}' http://localhost:5000/auth/login
curl -b cookies.txt http://localhost:5000/employees
```

That's for Git Bash, Mac or Linux. In Windows PowerShell the quoting is different, so use this instead:

```
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Method Post -Uri http://localhost:5000/auth/login -WebSession $s -ContentType "application/json" -Body '{"email":"admin@example.com","password":"Admin@123"}'
Invoke-RestMethod -Uri http://localhost:5000/employees -WebSession $s
```

The endpoints from the assignment:

- `GET /employees` lists employees, with search, filters, sorting and pagination
- `POST /employees` adds one
- `PUT /employees/:id` updates one
- `DELETE /employees/:id` deletes one

POST and PUT only require `name`, `email` and `role`, exactly as the brief says. Everything else is optional and gets a sensible default, though the form in the app asks for more. Emails have to be unique.

The extras:

- `POST /auth/login`, `POST /auth/logout` and `GET /auth/me` handle signing in and out
- `GET /employees/:id` returns one person with their manager and direct reports
- `GET /employees/facets` and `GET /employees/stats` feed the filter panel and the dashboard
- `GET /employees/export` returns a CSV of whatever matches the filters
- `POST /employees/bulk-delete` takes `{ "ids": [1, 2] }`
- `GET /health` checks that the API and the database are up, and doesn't need a login

`GET /employees` accepts `page`, `limit`, `search`, `sortBy`, `sortOrder` and any of the filters, which can be repeated. For example:

```
/employees?department=Engineering&department=Design&minYears=2&maxYears=5&skill=React&skillsMatch=all
```

`minYears` and `maxYears` filter by years at Ágaetis. The other filters are `level`, `role`, `employmentType`, `status`, `joinedFrom`, `joinedTo`, `managerId` and `isManager`.

## How the database is laid out

- `employees` holds the assignment fields plus phone, department, level, employment type, status, joining date and a `manager_id` that points back at another employee. Everyone works from the office, so there's no location field.
- `departments` is a small lookup table that employees refer to.
- `skills` and `employee_skills` handle the many-to-many link between people and skills.
- `admins` and `admin_sessions` hold the admin accounts and who is currently signed in.

The database also protects itself with check constraints on level, status, employment type, email format and joining date, and there are indexes on the columns used for filtering and sorting. Deleting a manager keeps their team and just clears the reporting line, and the API refuses to create a loop where two people report to each other.

## A few notes on how it's built

- All the filtering is turned into parameterised SQL in `backend/src/filters.js`, and sort columns come from a fixed list, so nothing a user types ends up inside the SQL itself. It has unit tests that run without a database.
- The years-at-the-company filter compares the joining date against today minus N months, which lets MySQL use its index instead of calculating every row.
- The validation rules exist twice, in `backend/src/validation.js` and `frontend/src/utils/validation.ts`. The front copy is for instant feedback while typing, and the server always checks again.
- Passwords are stored as salted scrypt hashes. The session cookie can't be read by scripts on the page, and signing out deletes the session on the server too.
- I didn't use a UI library. The components, icons and styles are written by hand.

## Something not working?

Use "Report an issue" inside the app, or contact me directly.

Gurasees Singh Bhogal, +91 91371 94624, bhogalgurasees@gmail.com
Portfolio: https://gurasees-singh-portfolio.vercel.app/
