// Sample data: a fictional ~80-person software company with a full reporting
// hierarchy, from the Managing Director down to interns. All names are made up and every email
// uses the reserved example.com domain.
//
// Columns: key (email local part), name, role, department, level, joining date,
// manager key, skills, optional overrides. Ágaetis was founded in December 2018, so
// nobody joined before that; the founders joined on day one.

const rows = [
  // Leadership
  ["ravindra.kulshrestha", "Ravindra Kulshrestha", "Founder & Managing Director", "Leadership", "Executive", "2018-12-03", null, ["Corporate Strategy", "Board Governance", "Investor Relations"]],
  ["vikram.malhotra", "Vikram Malhotra", "Chief Executive Officer", "Leadership", "Executive", "2018-12-03", "ravindra.kulshrestha", ["Strategy", "Leadership", "Fundraising"]],
  ["ananya.iyer", "Ananya Iyer", "Chief Technology Officer", "Leadership", "Executive", "2018-12-03", "vikram.malhotra", ["System Design", "Cloud Architecture", "Leadership"]],
  ["rajesh.gupta", "Rajesh Gupta", "Chief Financial Officer", "Leadership", "Executive", "2019-04-05", "vikram.malhotra", ["Financial Planning", "Fundraising", "Compliance"]],
  ["meera.reddy", "Meera Reddy", "Chief Operating Officer", "Leadership", "Executive", "2019-06-28", "vikram.malhotra", ["Operations", "Process Improvement", "Leadership"]],
  ["siddharth.rao", "Siddharth Rao", "Chief Product Officer", "Leadership", "Executive", "2019-11-22", "vikram.malhotra", ["Product Strategy", "Roadmapping", "Leadership"]],

  // Engineering
  ["rohan.deshpande", "Rohan Deshpande", "Director of Engineering", "Engineering", "Director", "2020-02-26", "ananya.iyer", ["Java", "System Design", "Team Building"]],
  ["kavya.menon", "Kavya Menon", "Engineering Manager - Platform", "Engineering", "Manager", "2020-09-15", "rohan.deshpande", ["Node.js", "Microservices", "Agile"]],
  ["aditya.kulkarni", "Aditya Kulkarni", "Backend Tech Lead", "Engineering", "Lead", "2021-02-12", "kavya.menon", ["Node.js", "MySQL", "Redis", "System Design"]],
  ["priya.nair", "Priya Nair", "Backend Developer", "Engineering", "Mid-Level", "2023-04-05", "aditya.kulkarni", ["Node.js", "Express", "MySQL", "REST APIs"]],
  ["manish.tiwari", "Manish Tiwari", "Senior Backend Engineer", "Engineering", "Senior", "2022-03-06", "aditya.kulkarni", ["Java", "Spring Boot", "Kafka", "PostgreSQL"]],
  ["tanvi.shah", "Tanvi Shah", "Backend Developer", "Engineering", "Junior", "2025-09-08", "aditya.kulkarni", ["Python", "Django", "PostgreSQL"]],
  ["ishaan.bhatt", "Ishaan Bhatt", "Software Engineer Intern", "Engineering", "Intern", "2026-09-01", "aditya.kulkarni", ["Python", "Git"], { employmentType: "Internship" }],
  ["arjun.patil", "Arjun Patil", "Full Stack Developer", "Engineering", "Mid-Level", "2023-10-07", "kavya.menon", ["React", "Node.js", "TypeScript", "MySQL"]],
  ["deepak.yadav", "Deepak Yadav", "Engineering Manager - Product Engineering", "Engineering", "Manager", "2020-12-10", "rohan.deshpande", ["React", "Team Leadership", "Agile"]],
  ["nikhil.joshi", "Nikhil Joshi", "Frontend Tech Lead", "Engineering", "Lead", "2021-07-13", "deepak.yadav", ["React", "TypeScript", "Next.js", "Web Performance"]],
  ["rahul.sharma", "Rahul Sharma", "Frontend Developer", "Engineering", "Mid-Level", "2023-11-12", "nikhil.joshi", ["React", "TypeScript", "CSS", "Redux"]],
  ["shruti.agarwal", "Shruti Agarwal", "Senior Frontend Engineer", "Engineering", "Senior", "2022-08-11", "nikhil.joshi", ["React", "Vue.js", "Accessibility", "Jest"]],
  ["varun.saxena", "Varun Saxena", "Frontend Developer", "Engineering", "Junior", "2025-10-27", "nikhil.joshi", ["JavaScript", "React", "HTML", "CSS"]],
  ["aisha.khan", "Aisha Khan", "Mobile Tech Lead", "Engineering", "Lead", "2021-09-22", "deepak.yadav", ["React Native", "Swift", "Kotlin"]],
  ["harsh.vardhan", "Harsh Vardhan", "Android Developer", "Engineering", "Mid-Level", "2023-05-26", "aisha.khan", ["Kotlin", "Android", "Jetpack Compose"]],
  ["lakshmi.pillai", "Lakshmi Pillai", "iOS Developer", "Engineering", "Senior", "2022-10-10", "aisha.khan", ["Swift", "SwiftUI", "iOS"]],
  ["farhan.ali", "Farhan Ali", "Full Stack Developer", "Engineering", "Senior", "2022-06-17", "deepak.yadav", ["Angular", ".NET", "Azure", "SQL Server"], { employmentType: "Contract" }],

  // Quality Assurance
  ["sunita.bose", "Sunita Bose", "QA Manager", "Quality Assurance", "Manager", "2020-07-23", "ananya.iyer", ["Test Strategy", "Selenium", "Agile"]],
  ["amit.verma", "Amit Verma", "QA Engineer", "Quality Assurance", "Mid-Level", "2023-03-10", "sunita.bose", ["Manual Testing", "Selenium", "JIRA", "Postman"]],
  ["gaurav.mishra", "Gaurav Mishra", "Senior SDET", "Quality Assurance", "Senior", "2022-01-06", "sunita.bose", ["Cypress", "Playwright", "Java", "CI/CD"]],
  ["ritika.jain", "Ritika Jain", "Automation Test Engineer", "Quality Assurance", "Junior", "2024-12-23", "sunita.bose", ["Playwright", "TypeScript", "API Testing"]],
  ["mohit.chauhan", "Mohit Chauhan", "Performance Test Engineer", "Quality Assurance", "Mid-Level", "2024-01-03", "sunita.bose", ["JMeter", "k6", "Grafana"], { employmentType: "Contract" }],

  // DevOps & Infrastructure
  ["sameer.naik", "Sameer Naik", "DevOps Manager", "DevOps & Infrastructure", "Manager", "2020-11-04", "ananya.iyer", ["AWS", "Kubernetes", "Terraform"]],
  ["karan.mehta", "Karan Mehta", "DevOps Engineer", "DevOps & Infrastructure", "Mid-Level", "2023-06-05", "sameer.naik", ["Docker", "Kubernetes", "AWS", "Jenkins"]],
  ["divya.krishnan", "Divya Krishnan", "Site Reliability Engineer", "DevOps & Infrastructure", "Senior", "2022-04-14", "sameer.naik", ["Prometheus", "Kubernetes", "Go", "Incident Management"]],
  ["yash.thakur", "Yash Thakur", "Cloud Engineer", "DevOps & Infrastructure", "Junior", "2024-09-07", "sameer.naik", ["Azure", "Terraform", "Linux"]],

  // Data & Analytics
  ["neelam.das", "Neelam Das", "Head of Data", "Data & Analytics", "Director", "2021-04-05", "ananya.iyer", ["Machine Learning", "Python", "Data Strategy"]],
  ["rohit.banerjee", "Rohit Banerjee", "Senior Data Scientist", "Data & Analytics", "Senior", "2022-06-07", "neelam.das", ["Python", "TensorFlow", "NLP", "Statistics"]],
  ["kriti.sen", "Kriti Sen", "Machine Learning Engineer", "Data & Analytics", "Mid-Level", "2024-01-14", "neelam.das", ["PyTorch", "MLOps", "Python", "AWS"]],
  ["abhinav.goyal", "Abhinav Goyal", "Data Engineer", "Data & Analytics", "Mid-Level", "2023-08-01", "neelam.das", ["Spark", "Airflow", "SQL", "Snowflake"]],
  ["nandini.ghosh", "Nandini Ghosh", "Data Analyst", "Data & Analytics", "Junior", "2025-07-05", "neelam.das", ["SQL", "Power BI", "Excel", "Python"], { status: "On Leave" }],

  // IT & Security
  ["vivek.prasad", "Vivek Prasad", "IT & Security Manager", "IT & Security", "Manager", "2020-06-14", "ananya.iyer", ["Network Security", "ISO 27001", "IT Operations"]],
  ["ayesha.siddiqui", "Ayesha Siddiqui", "Security Engineer", "IT & Security", "Senior", "2022-11-24", "vivek.prasad", ["Penetration Testing", "OWASP", "SIEM"]],
  ["ramesh.kumar", "Ramesh Kumar", "IT Support Specialist", "IT & Security", "Junior", "2024-11-21", "vivek.prasad", ["Windows", "Networking", "Hardware Support"]],
  ["suresh.babu", "Suresh Babu", "System Administrator", "IT & Security", "Mid-Level", "2023-01-24", "vivek.prasad", ["Linux", "Active Directory", "Networking"]],

  // Product
  ["pallavi.chopra", "Pallavi Chopra", "Director of Product", "Product", "Director", "2020-11-17", "siddharth.rao", ["Product Strategy", "Product Analytics", "Stakeholder Management"]],
  ["neha.joshi", "Neha Joshi", "Project Manager", "Product", "Senior", "2021-10-25", "pallavi.chopra", ["Scrum", "JIRA", "Risk Management", "Stakeholder Management"]],
  ["akash.singh", "Akash Singh", "Senior Product Manager", "Product", "Senior", "2022-02-14", "pallavi.chopra", ["Product Discovery", "A/B Testing", "SQL"]],
  ["riya.bansal", "Riya Bansal", "Product Manager", "Product", "Mid-Level", "2024-03-06", "pallavi.chopra", ["Roadmapping", "User Research", "JIRA"]],
  ["omkar.jadhav", "Omkar Jadhav", "Associate Product Manager", "Product", "Junior", "2025-10-10", "pallavi.chopra", ["Product Analytics", "Figma", "SQL"]],
  ["tarun.malik", "Tarun Malik", "Scrum Master", "Product", "Mid-Level", "2023-02-23", "pallavi.chopra", ["Scrum", "Kanban", "Agile Coaching"], { employmentType: "Contract" }],

  // Design
  ["zoya.mirza", "Zoya Mirza", "Design Lead", "Design", "Lead", "2021-05-21", "siddharth.rao", ["Design Systems", "Figma", "UX Strategy"]],
  ["sneha.k", "Sneha Kulkarni", "UI/UX Designer", "Design", "Mid-Level", "2023-04-25", "zoya.mirza", ["Figma", "Prototyping", "User Research"]],
  ["aarav.kapoor", "Aarav Kapoor", "Product Designer", "Design", "Senior", "2022-09-05", "zoya.mirza", ["Figma", "Interaction Design", "Design Systems"]],
  ["isha.trivedi", "Isha Trivedi", "UX Researcher", "Design", "Mid-Level", "2024-05-08", "zoya.mirza", ["Usability Testing", "User Interviews", "Survey Design"], { employmentType: "Part-time" }],
  ["dev.arora", "Dev Arora", "Graphic Designer", "Design", "Junior", "2025-06-07", "zoya.mirza", ["Illustrator", "Photoshop", "Branding"]],

  // Sales
  ["kabir.sethi", "Kabir Sethi", "VP of Sales", "Sales", "Director", "2020-05-31", "vikram.malhotra", ["Enterprise Sales", "Negotiation", "Salesforce"]],
  ["anjali.mehra", "Anjali Mehra", "Sales Manager", "Sales", "Manager", "2021-06-28", "kabir.sethi", ["B2B Sales", "Salesforce", "Team Leadership"]],
  ["rajat.sinha", "Rajat Sinha", "Account Executive", "Sales", "Mid-Level", "2023-09-01", "anjali.mehra", ["SaaS Sales", "Negotiation", "HubSpot"]],
  ["simran.kaur", "Simran Kaur", "Senior Account Executive", "Sales", "Senior", "2022-07-17", "anjali.mehra", ["Enterprise Sales", "Salesforce", "Presentations"]],
  ["vishal.pandey", "Vishal Pandey", "Business Development Representative", "Sales", "Junior", "2025-11-28", "anjali.mehra", ["Lead Generation", "Cold Outreach", "LinkedIn Sales Navigator"]],
  ["naveen.reddy", "Naveen Reddy", "Solutions Engineer", "Sales", "Senior", "2022-05-08", "kabir.sethi", ["Solution Architecture", "Product Demos", "REST APIs"]],

  // Marketing
  ["maya.fernandes", "Maya Fernandes", "Head of Marketing", "Marketing", "Director", "2021-01-25", "vikram.malhotra", ["Brand Strategy", "Growth Marketing", "Marketing Analytics"]],
  ["karthik.subramanian", "Karthik Subramanian", "Product Marketing Manager", "Marketing", "Manager", "2022-09-15", "maya.fernandes", ["Positioning", "Go-to-Market", "Competitive Analysis"]],
  ["sana.qureshi", "Sana Qureshi", "Digital Marketing Specialist", "Marketing", "Mid-Level", "2023-12-08", "maya.fernandes", ["SEO", "Google Ads", "Google Analytics"]],
  ["pranav.desai", "Pranav Desai", "Content Writer", "Marketing", "Junior", "2024-10-20", "maya.fernandes", ["Technical Writing", "Copywriting", "SEO"], { employmentType: "Part-time" }],
  ["tanya.bhalla", "Tanya Bhalla", "Demand Generation Manager", "Marketing", "Manager", "2022-01-30", "maya.fernandes", ["Demand Generation", "Marketing Automation", "HubSpot", "Campaign Management"]],
  ["kunal.ahuja", "Kunal Ahuja", "SEO Specialist", "Marketing", "Mid-Level", "2023-10-17", "tanya.bhalla", ["SEO", "Content Strategy", "Google Search Console", "Ahrefs"]],
  ["ritu.malviya", "Ritu Malviya", "Marketing Analyst", "Marketing", "Junior", "2025-08-06", "tanya.bhalla", ["Marketing Analytics", "Google Analytics", "SQL", "Excel"]],
  ["aditi.nayak", "Aditi Nayak", "Brand & Events Executive", "Marketing", "Junior", "2025-02-14", "maya.fernandes", ["Event Management", "Branding", "Vendor Management"]],
  ["megha.rawat", "Megha Rawat", "Social Media Intern", "Marketing", "Intern", "2026-08-26", "maya.fernandes", ["Social Media", "Canva", "Content Planning"], { employmentType: "Internship" }],

  // Customer Success
  ["anil.nambiar", "Anil Nambiar", "Customer Success Manager", "Customer Success", "Manager", "2021-08-05", "meera.reddy", ["Account Management", "Customer Onboarding", "Zendesk"]],
  ["preeti.sharma", "Preeti Sharma", "Customer Success Executive", "Customer Success", "Mid-Level", "2024-02-14", "anil.nambiar", ["Customer Onboarding", "CRM", "Communication"]],
  ["imran.sheikh", "Imran Sheikh", "Technical Support Engineer", "Customer Success", "Mid-Level", "2023-08-21", "anil.nambiar", ["Troubleshooting", "SQL", "Zendesk", "Linux"]],
  ["jyoti.das", "Jyoti Das", "Support Engineer", "Customer Success", "Junior", "2025-12-15", "anil.nambiar", ["Customer Support", "Freshdesk", "Communication"]],
  ["rakesh.iyer", "Rakesh Iyer", "Implementation Specialist", "Customer Success", "Senior", "2022-11-04", "anil.nambiar", ["Implementation", "Data Migration", "SQL"], { status: "Inactive" }],

  // Human Resources
  ["kavita.bhatia", "Kavita Bhatia", "Head of People", "Human Resources", "Director", "2020-04-27", "meera.reddy", ["Talent Management", "HR Policy", "Employee Relations"]],
  ["swati.mukherjee", "Swati Mukherjee", "HR Business Partner", "Human Resources", "Manager", "2021-10-21", "kavita.bhatia", ["Employee Relations", "Performance Management", "HRIS"]],
  ["nikita.rane", "Nikita Rane", "Talent Acquisition Specialist", "Human Resources", "Mid-Level", "2023-07-01", "kavita.bhatia", ["Technical Recruiting", "LinkedIn Recruiter", "Interviewing"]],
  ["aman.gill", "Aman Gill", "Technical Recruiter", "Human Resources", "Junior", "2024-09-23", "kavita.bhatia", ["Sourcing", "Screening", "Naukri"], { status: "On Leave" }],
  ["pooja.venkatesh", "Pooja Venkatesh", "HR Executive", "Human Resources", "Junior", "2025-05-28", "swati.mukherjee", ["Onboarding", "Payroll Coordination", "HR Operations"]],

  // Finance
  ["alok.agrawal", "Alok Agrawal", "Finance Manager", "Finance", "Manager", "2020-09-01", "rajesh.gupta", ["Financial Reporting", "Budgeting", "Tally"]],
  ["shweta.kamath", "Shweta Kamath", "Senior Accountant", "Finance", "Senior", "2022-03-30", "alok.agrawal", ["Accounting", "GST", "Tally", "Audit"]],
  ["hemant.soni", "Hemant Soni", "Financial Analyst", "Finance", "Mid-Level", "2024-03-22", "alok.agrawal", ["Financial Modeling", "Excel", "Forecasting"]],
  ["rekha.murthy", "Rekha Murthy", "Payroll Specialist", "Finance", "Mid-Level", "2023-02-18", "alok.agrawal", ["Payroll", "Compliance", "Excel"], { employmentType: "Part-time" }],

  // Legal & Admin
  ["arvind.chandra", "Arvind Chandra", "Legal Counsel", "Legal & Admin", "Senior", "2021-11-19", "rajesh.gupta", ["Contract Law", "Intellectual Property", "Compliance"]],
  ["farah.naqvi", "Farah Naqvi", "Company Secretary", "Legal & Admin", "Senior", "2022-12-24", "rajesh.gupta", ["Corporate Governance", "ROC Filings", "Compliance"], { employmentType: "Part-time" }],
  ["geeta.kumari", "Geeta Kumari", "Office Administrator", "Legal & Admin", "Mid-Level", "2021-08-24", "meera.reddy", ["Facilities Management", "Vendor Management", "Procurement"]],
  ["manoj.gowda", "Manoj Gowda", "Facilities Executive", "Legal & Admin", "Junior", "2024-12-12", "geeta.kumari", ["Facilities", "Asset Management", "Vendor Coordination"]],
];

const employees = rows.map(
  ([key, name, role, department, level, joiningDate, managerKey, skills, extra = {}], i) => ({
    email: `${key}@example.com`,
    managerEmail: managerKey ? `${managerKey}@example.com` : null,
    name,
    role,
    department,
    level,
    joiningDate,
    skills,
    // deterministic, clearly fake numbers in the 98000 xxxxx range
    phone: `+91 98000 ${String(10001 + i * 37).padStart(5, "0")}`,
    employmentType: extra.employmentType || "Full-time",
    status: extra.status || "Active",
  })
);

module.exports = employees;
