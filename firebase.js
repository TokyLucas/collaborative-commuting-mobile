// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCoHHuxprthJvjp9bDRSddDB-qw7BV--N4",
    authDomain: "collaborative-commuting-fb.firebaseapp.com",
    projectId: "collaborative-commuting-fb",
    storageBucket: "collaborative-commuting-fb.firebasestorage.app",
    messagingSenderId: "861432598379",
    appId: "1:861432598379:web:7d03b20575df32e244862e",
    measurementId: "G-NNZVPG6GGH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export const db = getFirestore(app);