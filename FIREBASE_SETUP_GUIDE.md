# Firebase Setup Guide for EatSmart India

## Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click "Add project" button
   - Enter project name: `eatsmartindia-16e75` (or your preferred name)
   - Click "Continue"
   - Choose whether to enable Google Analytics (recommended: Yes)
   - Click "Create project"
   - Wait for project to be created, then click "Continue"

## Step 2: Register Your Web App

1. **Add Web App**
   - On the project overview page, click the web icon (</>) 
   - Enter app nickname: `EatSmart India Web App`
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"

2. **Copy Configuration**
   - Copy the firebaseConfig object (you already have this)
   - Click "Continue to console"

## Step 3: Enable Authentication

1. **Navigate to Authentication**
   - In the left sidebar, click "Build" → "Authentication"
   - Click "Get started"

2. **Set Up Sign-in Methods**
   - Go to "Sign-in method" tab
   - Enable "Email/Password":
     - Click "Email/Password"
     - Toggle "Enable"
     - Click "Save"
   
   - Enable "Phone":
     - Click "Phone"
     - Toggle "Enable"
     - Add your support email
     - Click "Save"
   
   - Enable "Google" (optional):
     - Click "Google"
     - Toggle "Enable"
     - Add your support email
     - Click "Save"

3. **Set Up User Management** (optional)
   - Go to "Users" tab to see registered users
   - You can manually add users here for testing

## Step 4: Set Up Firestore Database

1. **Create Database**
   - In the left sidebar, click "Build" → "Firestore Database"
   - Click "Create database"

2. **Choose Security Rules**
   - Select "Start in test mode" (for development)
   - Click "Next"

3. **Choose Location**
   - Select a location close to your users (e.g., `asia-south1` for India)
   - Click "Done"

4. **Database Structure** (optional)
   - Go to "Data" tab
   - You can manually create collections and documents for testing

## Step 5: Set Up Cloud Storage

1. **Create Storage**
   - In the left sidebar, click "Build" → "Storage"
   - Click "Get started"

2. **Choose Security Rules**
   - Select "Start in test mode" (for development)
   - Click "Next"

3. **Choose Location**
   - Select the same location as your Firestore database
   - Click "Done"

## Step 6: Configure Security Rules

### Firestore Rules
1. Go to "Firestore Database" → "Rules" tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules
1. Go to "Storage" → "Rules" tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow read/write access to authenticated users
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Step 7: Test Your Setup

### Test Authentication
```javascript
// In your app, try creating a user
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from './firebaseConfig';

createUserWithEmailAndPassword(auth, "test@example.com", "password123")
  .then((userCredential) => {
    console.log("User created:", userCredential.user);
  })
  .catch((error) => {
    console.error("Error:", error);
  });
```

### Test Firestore
```javascript
// In your app, try adding data
import { addDoc, collection } from "firebase/firestore";
import { db } from './firebaseConfig';

addDoc(collection(db, "test"), {
  message: "Hello Firebase!",
  timestamp: new Date()
})
.then((docRef) => {
  console.log("Document written with ID: ", docRef.id);
})
.catch((error) => {
  console.error("Error adding document: ", error);
});
```

## Step 8: Production Considerations

1. **Update Security Rules**
   - Before going to production, update rules to be more restrictive
   - Consider user-specific data access

2. **Enable Additional Services** (optional)
   - Cloud Functions
   - Cloud Messaging
   - Performance Monitoring

3. **Set Up Custom Domain** (optional)
   - For Authentication redirects
   - For hosting

## Troubleshooting

### Common Issues:
1. **"Permission denied" errors**: Check security rules
2. **"App not initialized"**: Ensure firebaseConfig.ts is imported correctly
3. **"Network error"**: Check internet connection and Firebase project status

### Useful Links:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security Rules](https://firebase.google.com/docs/storage/security)

## Next Steps

After completing this setup:
1. Test all services in your app
2. Implement user authentication flows
3. Create data models for your app
4. Set up real-time listeners for data updates
5. Implement file upload functionality

Your Firebase project is now ready to use with your EatSmart India app! 