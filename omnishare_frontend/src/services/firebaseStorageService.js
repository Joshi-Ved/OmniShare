import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { isFirebaseConfigured, storage } from './firebase';

const ensureStorage = () => {
  if (!isFirebaseConfigured || !storage) {
    throw new Error('Firebase Storage is not configured. Check REACT_APP_FIREBASE_* values.');
  }
};

export const uploadFileToFirebaseStorage = (storagePath, file, metadata = {}) => {
  ensureStorage();

  return new Promise((resolve, reject) => {
    const targetRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(targetRef, file, metadata);

    uploadTask.on(
      'state_changed',
      null,
      (error) => reject(error),
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          downloadUrl,
          fullPath: uploadTask.snapshot.ref.fullPath,
          name: uploadTask.snapshot.ref.name,
        });
      }
    );
  });
};

export const getFirebaseStorageDownloadUrl = async (storagePath) => {
  ensureStorage();
  const targetRef = ref(storage, storagePath);
  return getDownloadURL(targetRef);
};

export const deleteFirebaseStorageFile = async (storagePath) => {
  ensureStorage();
  const targetRef = ref(storage, storagePath);
  return deleteObject(targetRef);
};
