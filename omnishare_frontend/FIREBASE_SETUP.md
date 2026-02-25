# Firebase Integration Setup

This project is linked to Firebase project `omnishare-5fb53` via the root `.firebaserc`.

## 1) Configure frontend environment

1. Copy `.env.example` to `.env` inside `omnishare_frontend`.
2. Fill in these values from Firebase Console → Project settings → General → Your apps (Web app):
   - `REACT_APP_FIREBASE_API_KEY`
   - `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
   - `REACT_APP_FIREBASE_APP_ID`
   - `REACT_APP_FIREBASE_MEASUREMENT_ID` (optional; Analytics)

Pre-filled values:
- `REACT_APP_FIREBASE_AUTH_DOMAIN=omnishare-5fb53.firebaseapp.com`
- `REACT_APP_FIREBASE_PROJECT_ID=omnishare-5fb53`
- `REACT_APP_FIREBASE_STORAGE_BUCKET=omnishare-5fb53.firebasestorage.app`

## 2) What is connected

- Firebase App bootstrap: `src/services/firebase.js`
- Authentication service: `src/services/firebaseAuthService.js`
- Firestore service: `src/services/firebaseFirestoreService.js`
- Storage service: `src/services/firebaseStorageService.js`

Firebase is initialized on app startup from `src/index.js`.

## 3) Firebase resources and rules

Root-level Firebase files:
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`

To deploy rules and hosting:

```bash
firebase use omnishare-5fb53
firebase deploy --only firestore:rules,firestore:indexes,storage,hosting
```

## 4) Firebase Console checks

Enable these products in Firebase Console:
- Authentication (Email/Password and Google if needed)
- Firestore Database
- Storage
- Analytics (optional)
