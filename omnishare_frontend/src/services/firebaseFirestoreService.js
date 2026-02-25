import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

const ensureFirestore = () => {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase Firestore is not configured. Check REACT_APP_FIREBASE_* values.');
  }
};

export const addFirestoreDocument = async (collectionName, data) => {
  ensureFirestore();
  return addDoc(collection(db, collectionName), data);
};

export const setFirestoreDocument = async (collectionName, documentId, data, merge = true) => {
  ensureFirestore();
  return setDoc(doc(db, collectionName, documentId), data, { merge });
};

export const getFirestoreDocument = async (collectionName, documentId) => {
  ensureFirestore();
  const snapshot = await getDoc(doc(db, collectionName, documentId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const updateFirestoreDocument = async (collectionName, documentId, data) => {
  ensureFirestore();
  return updateDoc(doc(db, collectionName, documentId), data);
};

export const deleteFirestoreDocument = async (collectionName, documentId) => {
  ensureFirestore();
  return deleteDoc(doc(db, collectionName, documentId));
};

export const queryFirestoreCollection = async ({
  collectionName,
  whereClauses = [],
  orderByField,
  orderDirection = 'desc',
  limitCount,
}) => {
  ensureFirestore();

  const constraints = [];

  whereClauses.forEach(({ field, operator, value }) => {
    constraints.push(where(field, operator, value));
  });

  if (orderByField) {
    constraints.push(orderBy(orderByField, orderDirection));
  }

  if (limitCount) {
    constraints.push(limit(limitCount));
  }

  const snapshot = await getDocs(query(collection(db, collectionName), ...constraints));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
};
