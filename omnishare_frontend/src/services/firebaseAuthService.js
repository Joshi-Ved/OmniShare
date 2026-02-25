import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';

const ensureFirebase = () => {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase Auth is not configured. Check REACT_APP_FIREBASE_* values.');
  }
};

export const registerWithEmail = async ({ email, password, displayName }) => {
  ensureFirebase();
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }

  return credential;
};

export const loginWithEmail = async ({ email, password }) => {
  ensureFirebase();
  return signInWithEmailAndPassword(auth, email, password);
};

export const loginWithGoogle = async () => {
  ensureFirebase();
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const logoutFirebaseUser = async () => {
  ensureFirebase();
  return signOut(auth);
};

export const sendFirebasePasswordReset = async (email) => {
  ensureFirebase();
  return sendPasswordResetEmail(auth, email);
};

export const subscribeToFirebaseAuth = (callback) => {
  ensureFirebase();
  return onAuthStateChanged(auth, callback);
};
