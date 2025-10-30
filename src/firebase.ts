// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDezDfFOozeT8HR_Nslg1xihLFwT8SwCSs",
  authDomain: "maderna-app.firebaseapp.com",
  projectId: "maderna-app",
  storageBucket: "maderna-app.firebasestorage.app",
  messagingSenderId: "816020564615",
  appId: "1:816020564615:web:d5c0d3a84f2b8b55866622",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

