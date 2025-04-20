import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc } from "firebase/firestore";

import pkg from 'express';
const express = pkg;

import path from 'path';

const app = express();
const port = 3000; // You can use any port number

// Serve static files from the same directory as server.js
app.use(express.static('.'));

// Route to serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join('index.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
