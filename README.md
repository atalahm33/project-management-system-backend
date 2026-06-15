# Project Management System

##  Overview

The Project Management System is a full-stack application designed to manage projects, tasks, teams, and budgets in a structured and efficient way. It provides a centralized dashboard for tracking project progress, analyzing performance through charts, and generating downloadable PDF reports for business insights.

---

##  Features

* Project and task management
* Team and user management
* Role-based access control (Admin / Manager / User)
* Budget and financial tracking
* Interactive analytics dashboard
* Data visualization using React Charts
* PDF report generation for exports and summaries
* File and document management
* Authentication and secure API integration
* Scalable RESTful backend architecture

---

## 🛠️ Tech Stack

### Backend

* Node.js
* Express.js
* MongoDB / PostgreSQL
* JWT Authentication
* Multer (file uploads)
* PDF generation library (PDFKit / Puppeteer)

### Frontend

* React.js
* React Charts (Recharts / Chart.js)
* Axios
* React Router

---

## Dashboard Features

* Real-time statistics overview
* Project progress visualization
* Budget vs expenses charts
* Performance analysis by project/team
* Dynamic filters and reports
* Export data as PDF reports

---

##  Project Structure

```bash id="str1"
project-management-system/
│
├── backend/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── charts/
│   │   ├── services/
│   │   └── App.js
│
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash id="str2"
git clone https://github.com/atalahm33/project-management-system
```

---

### 2. Backend setup

```bash id="str3"
cd backend
npm install
```

Create `.env` file:

```env id="str4"
PORT=5000
MONGO_URI=your_database_url
JWT_SECRET=your_secret_key
```

Run server:

```bash id="str5"
npm start
```

---

### 3. Frontend setup

```bash id="str6"
cd frontend
npm install
npm start
```

---

## Reports System

The system generates downloadable PDF reports that include project summaries, financial analysis, charts, and performance insights.

---

## Frontend

The frontend of this project is available at the following link:

* https://github.com/atalahm33/project-management-system

---

## 🧠 Future Improvements

* Real-time notifications
* Gantt chart integration
* AI-based analytics suggestions
* Mobile application (React Native)

---

## 📄 License

This project is intended for portfolio and commercial use depending on agreement.
