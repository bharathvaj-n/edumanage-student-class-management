# 🎓 EdTech Teacher Dashboard

A **React + Firebase** web app designed to streamline class and student management for teachers.  
It enables teachers to track classes, manage homework, and maintain student progress all in one place.

---

## 🚀 Live Demo
🔗 [https://edtech-prototype-1058c.web.app/](https://edtech-prototype-1058c.web.app/)

---
🧑‍🏫 **Demo Login**

Username: admin
Password: 1234

--- 

## 🧩 Features
- 👩‍🏫 Manage students, classes, and attendance  
- 🧠 Add classwork and homework details  
- 📊 Auto-updates Firestore records  
- ✅ Integrated to-do list for daily task tracking  
- 🔐 Simple login authentication  
- 📱 Responsive, teacher-friendly UI

---

## 🛠️ Tech Stack
| Layer | Technology |
|--------|-------------|
| Frontend | React, React Router |
| Backend | Firebase Firestore |
| Authentication | Firebase Auth |
| Styling | Bootstrap + CSS |
| Deployment | Firebase Hosting |

---

## 🧪 How to Run Locally
```bash
git clone https://github.com/javeriafirdous-phoenix/edtech-teacher-dashboard.git
cd edtech-teacher-dashboard
npm install
npm start
```
---

## 🔐 Security Note & Firebase Setup

### ⚠️ Important
This project originally used a Firebase configuration for deployment and testing.  
To protect sensitive information, **the original Firebase API key and credentials have been removed** from the repository history.

**If you clone this project, please create your own Firebase project** and configure your credentials locally.

---

### 🛠️ How to Set Up Your Own Firebase Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **“Add project”** → give it a name (e.g. *edtech-demo*)
3. Once created, go to:
   - **Project settings → General → Your apps → Web app**
   - Register your app and copy your Firebase SDK config (contains `apiKey`, `authDomain`, etc.)
4. In your local project folder, create a file named `.env` and paste:
```

REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

````
5. Update your Firebase config import in `src/firebase-config.js`:
```js
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};
````

6. Make sure `.env` is **added to your `.gitignore`** file so your credentials are never committed.

---

### 🧩 Why This Matters

Even though Firebase keys aren’t traditional secrets, leaving them in public repos can allow:

* Unauthorized access to your database or quotas
* Abuse of your Firebase usage limits
* Accidental exposure of linked services

By following the above steps, you’ll have a **secure and isolated Firebase environment** for your own testing or deployment.

---

**✅ Summary:**

* This repository is now free of sensitive credentials
* To run it yourself, connect your own Firebase project using `.env`
* Never push `.env` or raw Firebase keys to GitHub

```


