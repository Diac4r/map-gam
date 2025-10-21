// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // 👈 pour activer la Realtime Database

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyByjBCH8MB8FRXgNSWsJZ7NnnPfpBxZm0I",
  authDomain: "gamji-56879.firebaseapp.com",
  databaseURL: "https://gamji-56879-default-rtdb.europe-west1.firebasedatabase.app", // 👈 pas de slash à la fin
  projectId: "gamji-56879",
  storageBucket: "gamji-56879.appspot.com",
  messagingSenderId: "508708263189",
  appId: "1:508708263189:web:1d386015eb06ced112451c"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);

// Export de la base de données pour pouvoir l’utiliser ailleurs
export const db = getDatabase(app);
