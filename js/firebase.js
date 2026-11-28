
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getCountFromServer,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyCTmBBp92JcUWZl0OvK0EePO_nPrxWrikU",
  authDomain: "inventarium-ar.firebaseapp.com",
  projectId: "inventarium-ar",
  storageBucket: "inventarium-ar.firebasestorage.app",
  messagingSenderId: "149525452636",
  appId: "1:149525452636:web:1f7d57c8e6d27538cc9399"
};

// INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const EVENT_ID = "inventarium-current";

// CONNECT VISITOR
async function connectVisitor() {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  const result = await signInAnonymously(auth);
  return result.user;
}

// SAVE A COMPLETED PROJECT SCORE
async function saveProjectScore(projectId, newScore) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Visitor is not authenticated.");
  }

  if (
    typeof projectId !== "string" ||
    !/^[a-zA-Z0-9_-]+$/.test(projectId) ||
    !Number.isInteger(newScore) ||
    newScore < 0
  ) {
    throw new Error("Invalid project score.");
  }

  const visitorRef = doc(db, "leaderboard", user.uid);
  const snapshot = await getDoc(visitorRef);

  if (!snapshot.exists()) {
    throw new Error("Visitor leaderboard entry not found.");
  }

  const data = snapshot.data();
  const projectScores = data.projectScores || {};

  // Keep the visitor's best score for this project.
  projectScores[projectId] = Math.max(
    projectScores[projectId] || 0,
    newScore
  );

  // Calculate overall score.
  const totalPoints = Object.values(projectScores)
    .reduce((total, score) => total + score, 0);

  const completedProjects = Object.keys(projectScores).length;

  await setDoc(visitorRef, {
    nickname: data.nickname,
    totalPoints: totalPoints,
    completedProjects: completedProjects,
    projectScores: projectScores,
    updatedAt: serverTimestamp(),
    eventId: EVENT_ID
  });

  console.log("Leaderboard updated:", {
    projectId,
    totalPoints,
    completedProjects
  });

  return {
    totalPoints,
    completedProjects
  };
}

// MAKE SCORE FUNCTION AVAILABLE TO AR.JS
window.saveProjectScore = saveProjectScore;

// REAL-TIME OVERALL LEADERBOARD

// REAL-TIME OVERALL LEADERBOARD
window.subscribeLeaderboard = function(callback) {
  const user = auth.currentUser;

  if (!user) {
    callback([], null);
    return function() {};
  }

  let latestEntries = [];
  let latestMyRank = null;
  let leaderboardReady = false;
  let visitorReady = false;

  let visitorPoints = 0;

  function updatePersonalRank() {
    if (!leaderboardReady || !visitorReady) return;

    const higherScoresQuery = query(
      collection(db, "leaderboard"),
      where("totalPoints", ">", visitorPoints)
    );

    getCountFromServer(higherScoresQuery)
      .then(function(countSnapshot) {
        latestMyRank = countSnapshot.data().count + 1;
        callback(latestEntries, latestMyRank);
      })
      .catch(function(error) {
        console.error("Could not calculate visitor rank:", error);
        callback(latestEntries, null);
      });
  }

  // Listen to the top 10 visitors.
  const leaderboardQuery = query(
    collection(db, "leaderboard"),
    orderBy("totalPoints", "desc"),
    limit(10)
  );

  const unsubscribeLeaderboard = onSnapshot(
    leaderboardQuery,
    function(snapshot) {
      latestEntries = snapshot.docs.map(function(document) {
        const data = document.data();

        return {
          uid: document.id,
          nickname: data.nickname || "Anonymous",
          totalPoints: data.totalPoints || 0,
          completedProjects: data.completedProjects || 0
        };
      });

      leaderboardReady = true;
      updatePersonalRank();
    },
    function(error) {
      console.error("Leaderboard loading error:", error);
      callback(null, null);
    }
  );

  // Listen to the current visitor's own score.
  const visitorRef = doc(db, "leaderboard", user.uid);

  const unsubscribeVisitor = onSnapshot(
    visitorRef,
    function(snapshot) {
      if (!snapshot.exists()) {
        visitorReady = true;
        visitorPoints = 0;
      } else {
        visitorReady = true;
        visitorPoints = snapshot.data().totalPoints || 0;
      }

      updatePersonalRank();
    },
    function(error) {
      console.error("Personal score loading error:", error);
    }
  );

  // Unsubscribe from both listeners when finished.
  return function() {
    unsubscribeLeaderboard();
    unsubscribeVisitor();
  };
};



// INITIALIZE VISITOR AND WELCOME SCREEN
window.firebaseReady = (async function () {
  const startButton = document.getElementById("startButton");
  const nicknameInput = document.getElementById("nicknameInput");
  const welcomeError = document.getElementById("welcomeError");
  const welcomeScreen = document.getElementById("welcomeScreen");

  try {
    const user = await connectVisitor();

    console.log("Firebase connected!");
    console.log("Visitor ID:", user.uid);

    const visitorRef = doc(db, "leaderboard", user.uid);
    const visitorSnapshot = await getDoc(visitorRef);

    if (visitorSnapshot.exists()) {
      nicknameInput.value =
        visitorSnapshot.data().nickname || "";
    }

    startButton.disabled = false;
    startButton.textContent = "Comienza a explorar";

    startButton.addEventListener("click", async function () {
      const nickname = nicknameInput.value.trim();

      if (nickname.length < 2 || nickname.length > 20) {
        welcomeError.textContent =
          "Por favor, elige un nombre de usuario entre 2 y 20 caracteres.";
        return;
      }

      startButton.disabled = true;
      startButton.textContent = "Guardando...";
      welcomeError.textContent = "";

      try {
        const existingData = visitorSnapshot.exists()
          ? visitorSnapshot.data()
          : {};

        await setDoc(visitorRef, {
          nickname: nickname,
          totalPoints: existingData.totalPoints || 0,
          completedProjects: existingData.completedProjects || 0,
          projectScores: existingData.projectScores || {},
          updatedAt: serverTimestamp(),
          eventId: EVENT_ID
        }, { merge: true });

        window.currentVisitor = {
          uid: user.uid,
          nickname: nickname
        };

        console.log("Nickname saved:", nickname);

        welcomeScreen.style.display = "none";

      } catch (error) {
        console.error("Nickname save error:", error);
        welcomeError.textContent =
          "No se pudo guardar el nombre de usuario. Por favor, inténtalo de nuevo.";

        startButton.disabled = false;
        startButton.textContent = "Comienza a explorar";
      }
    });

  } catch (error) {
    console.error("Firebase connection error:", error);
    startButton.textContent = "Connection failed";
    welcomeError.textContent =
      "Could not connect. Please refresh and try again.";
  }
})();
