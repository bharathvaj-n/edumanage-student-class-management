# EduManage

**EduManage** is a modern teacher management platform built to simplify **batch management, student management, class sessions, and attendance tracking** in one centralized system.

The application is designed around a **batch-first workflow**, where teachers create batches, add students to those batches, conduct class sessions, and manage attendance for the entire batch.

**Live Demo:** [EduManage Web App](edumanage-58538.web.app)

---

## 🚀 Features

### 🔐 Authentication

* Teacher registration and login
* Firebase Email/Password Authentication
* Email verification
* Forgot password / password reset
* Secure logout
* Protected application routes
* Authentication state persistence
* Individual teacher accounts

### 📦 Batch Management

* Create and manage batches
* Batch-based student organization
* Course, department, year, section and start-date details
* View students belonging to a specific batch
* Search and manage batches
* Teacher-specific batch ownership

### 👨‍🎓 Student Management

* Add students individually
* Bulk student import using Excel
* Download student import template
* Automatic batch assignment
* Student profile management
* Register number, email, phone, gender and date of birth
* Search and filter students
* Student data isolated by teacher and batch

### 📚 Class Management

* Create class sessions for a selected batch
* Class number
* Class date and time
* Class type
* Classwork
* Homework
* Automatically load students belonging to the selected batch
* Session history
* Batch-based class tracking

### ✅ Attendance Management

* Batch-level attendance
* Mark all students present
* Mark individual students Present / Absent / Late
* Save attendance for each class session
* Attendance history
* Attendance linked to student, batch and class session

### 📊 Dashboard

* Real-time statistics
* Total batches
* Total students
* Total classes
* Attendance information
* Teacher-specific data

### 🔒 Data Security

* Firebase Authentication
* Firestore Security Rules
* Teacher-level data isolation
* Users can only access their own records
* New teachers start with an empty workspace
* No shared demo/sample data
* Ownership enforced at the database level

---

## 🏗️ Application Architecture

EduManage follows a **batch-centered architecture**:

```text
Teacher
   │
   ▼
Authentication
   │
   ▼
Batch
   │
   ├── Students
   │
   └── Class Sessions
            │
            ▼
        Attendance
```

### Data Relationship

```text
Firebase Auth UID
        │
        ▼
users/{uid}
        │
        ▼
batches/{batchId}
        │
        ├── student_data/{studentId}
        │
        └── class_sessions/{sessionId}
                         │
                         ▼
                attendance_data/{attendanceId}
```

---

## 🗄️ Firestore Collections

| Collection        | Purpose                 |
| ----------------- | ----------------------- |
| `users`           | Teacher profiles        |
| `batches`         | Teacher-created batches |
| `student_data`    | Student profiles        |
| `class_sessions`  | Class session records   |
| `attendance_data` | Student attendance      |
| `todolist`        | Teacher tasks           |
| `class_data`      | Legacy class records    |

Teacher ownership is maintained using:

```text
teacher_id
```

Each authenticated teacher can only access records belonging to their own UID.

---

## 🛠️ Tech Stack

### Frontend

* React.js
* JavaScript
* HTML5
* CSS3
* React Router

### Backend / Cloud

* Firebase Authentication
* Cloud Firestore
* Firebase Hosting

### Development Tools

* Node.js
* npm
* Git
* GitHub
* Firebase CLI

### Data Import

* Excel `.xlsx`
* Bulk student import

---

## 📁 Project Structure

```text
EduManage/
│
├── public/
│
├── src/
│   ├── App.js
│   ├── AuthContext.js
│   ├── firebase-config.js
│   │
│   ├── Login.js
│   ├── Header.js
│   ├── Sidebar.js
│   ├── Home.js
│   ├── Settings.js
│   │
│   ├── BatchManagement.js
│   ├── BulkImportModal.js
│   ├── Classdetails.js
│   ├── migration.js
│   │
│   └── ...
│
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── package.json
├── package-lock.json
└── README.md
```

---

## 📥 Student Bulk Import

Students can be imported into an existing batch using an Excel file.

### Excel Template

```text
Student Name
Register Number
Email
Phone Number
Gender
Date of Birth
```

The selected batch automatically provides the required batch information, so teachers do not need to manually enter a Batch ID for every student.

---

## 🔐 Security Model

EduManage uses Firebase Authentication together with Firestore Security Rules.

Every teacher receives a unique Firebase Authentication UID.

```text
Teacher A
   │
   └── UID: user_A
         │
         ├── Batch A
         ├── Students A
         ├── Classes A
         └── Attendance A
```

Another teacher:

```text
Teacher B
   │
   └── UID: user_B
         │
         ├── Batch B
         ├── Students B
         ├── Classes B
         └── Attendance B
```

Teacher B cannot access Teacher A's records.

Ownership is enforced both through:

1. Frontend Firestore queries
2. Firestore Security Rules

---

## ⚙️ Local Development

### 1. Clone the repository

```bash
git clone https://github.com/bharathvaj-n/edumanage-student-management.git
cd edumanage-student-management
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

Create/configure your Firebase project and connect the application to Firebase Authentication and Cloud Firestore.

### 4. Start the development server

```bash
npm start
```

The application will run locally at:

```text
http://localhost:3000
```

---

## 🏗️ Production Build

Create the production build:

```bash
npm run build
```

---

## 🚀 Firebase Deployment

Deploy both the frontend and Firestore configuration:

```bash
firebase deploy --only hosting,firestore
```

The application is hosted using Firebase Hosting.

### Production

```text
https://edumanage-58538.web.app
```

---

## 🔄 Application Workflow

```text
Register / Login
       │
       ▼
   Dashboard
       │
       ▼
 Create Batch
       │
       ▼
 Add Students
       │
       ├── Individual Student
       │
       └── Bulk Excel Import
       │
       ▼
 Select Batch
       │
       ▼
 Create Class Session
       │
       ▼
 Students Automatically Loaded
       │
       ▼
 Mark Attendance
       │
       ▼
 Save Attendance
       │
       ▼
 View Session History
```

---

## 🎯 Project Goals

EduManage was developed to provide teachers with a simple digital system for managing:

* Student records
* Academic batches
* Classes
* Attendance
* Teacher tasks
* Student information

The goal is to replace scattered spreadsheets and manual attendance processes with a centralized and secure web application.

---

## 🌐 Deployment

**Platform:** Firebase Hosting

**Database:** Cloud Firestore

**Authentication:** Firebase Authentication

**Live Application:** [EduManage](https://edumanage-58538.web.app?utm_source=chatgpt.com)

---

## 🔮 Future Improvements

* Attendance analytics and charts
* Student performance tracking
* Export attendance reports to Excel/PDF
* Automated attendance reports
* Parent/student portals
* Notifications and reminders
* Advanced dashboard analytics
* Role-based administration
* Mobile responsive improvements
* Automated CI/CD deployment

---

## 👨‍💻 Developer

**Bharathvaj**

Built with **React + Firebase** for efficient teacher and student management.

---

## 📄 License

This project is currently developed as a personal/academic project.
