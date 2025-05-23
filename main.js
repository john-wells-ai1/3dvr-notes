// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import env from "./env.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MMEESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID
  //measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

var firebaseConnected = true;
// Initialize Firebase
const app = firebaseConnected ? initializeApp(firebaseConfig) : null;
//const analytics = getAnalytics(app);
export const db = firebaseConnected ? getFirestore(app) : null;
// Export Firestore DB
const notesCollection = firebaseConnected ? collection(db, "notes") : null;  //TODO init local storage structure here

/*
async function getAllNotes() {
  const querySnapshot = await getDocs(notesCollection);
  const tempDoc = []  
  querySnapshot.forEach((doc) => {
    tempDoc.push({ id: doc.id, ...doc.data() })
  });
  console.log(tempDoc);
}

console.log("calling getAllNotes");
getAllNotes();
*/

/***** Gamification System *****/
// Structure to track experience (xp) and level.
let gamification = { xp: 0, level: 1 };

// Load gamification data from localStorage (if available)
function loadGamification() {
  const data = localStorage.getItem("gamification");
  if (data) {
    gamification = JSON.parse(data);
  } else {
    saveGamification();
  }
  updateGamificationUI();
}

// Save gamification data to localStorage
function saveGamification() {
  localStorage.setItem("gamification", JSON.stringify(gamification));
}

// Update the gamification UI elements: level, xp, progress bar
function updateGamificationUI() {
  const xpThreshold = gamification.level * 100;
  document.getElementById("userLevel").innerText = gamification.level;
  document.getElementById("userXP").innerText = gamification.xp;
  document.getElementById("xpThreshold").innerText = xpThreshold;
  const progressPercent = Math.min((gamification.xp / xpThreshold) * 100, 100);
  document.getElementById("xpProgress").style.width = progressPercent + "%";
}

// Update XP by a given number of points and check for level-ups.
function updateXP(points) {
  gamification.xp += points;
  const xpThreshold = gamification.level * 100;
  // Allow for multiple level-ups if enough XP is earned
  while (gamification.xp >= xpThreshold) {
    gamification.xp -= xpThreshold;
    gamification.level++;
    alert("Congratulations! You've leveled up to Level " + gamification.level + "!");
  }
  saveGamification();
  updateGamificationUI();
}

// Initialize gamification
loadGamification();

/***** Note App Functions *****/
let editingNoteId = null;

document.addEventListener("DOMContentLoaded", function() {
  loadFolders();
  loadNotes();
});

function createFolder() {
  const folderName = prompt("Enter folder name:");
  if (!folderName) return;
  let folders = JSON.parse(localStorage.getItem("folders")) || [];
  if (!folders.includes(folderName)) {
    folders.push(folderName);
    localStorage.setItem("folders", JSON.stringify(folders));
    loadFolders();
  }
}

function loadFolders() {
  const folders = JSON.parse(localStorage.getItem("folders")) || [];
  const select = document.getElementById("folderSelect");
  select.innerHTML = '<option value="default">Default</option>';
  folders.forEach(folder => {
    let option = document.createElement("option");
    option.value = folder;
    option.textContent = folder;
    select.appendChild(option);
  });
}

document.getElementById("save-note").addEventListener('click', async function saveNote() {
  console.log('Save Note element was clicked, woot woot!');
  const title = document.getElementById("noteTitle").value.trim();
  const content = document.getElementById("noteArea").value.trim();
  if (!title || !content) {
    alert("Please provide both a title and content to save.");
    return;
  }
  const folder = document.getElementById("folderSelect")?.value || "NONE";

  if (firebaseConnected) {
    try {
      const docRef = await addDoc(notesCollection, 
                                {name: title,
                                 folder: folder,
                                 body: body
                                });
        console.log("Created new doc with ID: " + docRef.getId); 
      } catch (e) {
      console.error("error adding doc: ") + e.toString(); 
    }
  }  else {
    let notes = JSON.parse(localStorage.getItem(folder)) || [];
    if (editingNoteId) {
      const noteIndex = notes.findIndex(note => note.id === editingNoteId);
      if (noteIndex > -1) {
        notes[noteIndex].title = title;
        notes[noteIndex].content = content;
        notes[noteIndex].date = new Date().toLocaleString();
      }
      editingNoteId = null;
    } else {
      notes.push({ id: Date.now(), title, content, date: new Date().toLocaleString() });
    }
    localStorage.setItem(folder, JSON.stringify(notes));
  }

  alert("Note saved successfully!");
  // Award XP: base points (10) + bonus points equal to the note's word count.
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const xpGained = 10 + wordCount;
  updateXP(xpGained);
  clearFields();
  loadNotes();
});

function loadNotes() {
  const query = document.getElementById("search").value.toLowerCase();
  const folder = document.getElementById("folderSelect").value;
  let notes = JSON.parse(localStorage.getItem(folder)) || [];
  const noteList = document.getElementById("noteList");
  noteList.innerHTML = "";
  notes.forEach(note => {
    if (
      query === "" ||
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    ) {
      const card = document.createElement("div");
      card.classList.add("note-card");
      card.innerHTML = `
        <h3>${note.title}</h3>
        <div class="note-date">${note.date}</div>
        <p>${note.content.substring(0, 100)}${note.content.length > 100 ? "..." : ""}</p>
        <div class="actions">
          <button onclick="editNote(${note.id})">Edit</button>
          <button onclick="deleteNote(${note.id})">Delete</button>
        </div>
      `;
      noteList.appendChild(card);
    }
  });
}

function editNote(noteId) {
  const folder = document.getElementById("folderSelect").value;
  let notes = JSON.parse(localStorage.getItem(folder)) || [];
  let note = notes.find(note => note.id === noteId);
  if (note) {
    document.getElementById("noteTitle").value = note.title;
    document.getElementById("noteArea").value = note.content;
    editingNoteId = noteId;
  }
}

function deleteNote(noteId) {
  const folder = document.getElementById("folderSelect").value;
  let notes = JSON.parse(localStorage.getItem(folder)) || [];
  let note = notes.find(note => note.id === noteId);
  if (note && confirm(`Are you sure you want to delete "${note.title}"?`)) {
    notes = notes.filter(note => note.id !== noteId);
    localStorage.setItem(folder, JSON.stringify(notes));
    loadNotes();
  }
}

function exportNote() {
  const title = document.getElementById("noteTitle").value.trim();
  const content = document.getElementById("noteArea").value.trim();
  if (!title || !content) {
    alert("Please provide both a title and content to export.");
    return;
  }
  const blob = new Blob([`Title: ${title}\n\n${content}`], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${title}.txt`;
  a.click();
}

function exportAllNotes() {
  const folder = document.getElementById("folderSelect").value;
  let notes = JSON.parse(localStorage.getItem(folder)) || [];
  if (notes.length === 0) {
    alert("No notes available to export.");
    return;
  }
  const content = notes.map(note => `Title: ${note.title}\nDate: ${note.date}\n\n${note.content}\n\n---------------------\n`).join("");
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${folder}-notes.txt`;
  a.click();
}

function clearFields() {
  document.getElementById("noteTitle").value = "";
  document.getElementById("noteArea").value = "";
  editingNoteId = null;
}

function deleteAllNotes() {
  const folder = document.getElementById("folderSelect").value;
  if (confirm("Are you sure you want to delete all notes in this folder?")) {
    localStorage.removeItem(folder);
    loadNotes();
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}
