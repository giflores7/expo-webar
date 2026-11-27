
const scene = document.querySelector("a-scene");

// QUIZ INTERFACE
const overlay = document.getElementById("quizOverlay");
const questionText = document.getElementById("questionText");
const answerContainer = document.getElementById("answerContainer");
const feedback = document.getElementById("feedback");
const progress = document.getElementById("quizProgress");
const nextButton = document.getElementById("nextButton");

const quizCard = document.getElementById("quizCard");
const completionScreen =
  document.getElementById("completionScreen");

const quizTitle = document.getElementById("quizTitle");
const completionMessage =
  document.getElementById("completionMessage");

// EXHIBITION PROGRESS
const progressText = document.getElementById("progressText");
const scoreText = document.getElementById("scoreText");

// New key so old question-count scores aren't mistaken for point scores.
const STORAGE_KEY = "inventariumProgress_v2";

// LOAD SAVED SESSION PROGRESS
function loadProgress() {
  try {
    return JSON.parse(
      sessionStorage.getItem(STORAGE_KEY)
    ) || {};
  } catch (error) {
    return {};
  }
}

let visitorProgress = loadProgress();

// PROJECT VARIABLES
let currentProject = null;
let currentQuestion = 0;
let currentScore = 0;
let answered = false;

// CONNECT PROJECT DATA TO THE AR SCENE
const projects = window.PROJECTS.map(function(project) {
  return {
    ...project,
    target: document.querySelector(project.targetSelector),
    model: document.querySelector(project.modelSelector)
  };
});

// CALCULATE MAXIMUM POSSIBLE POINTS
function getMaximumScore(project) {
  return project.questions.reduce(function(total, question) {
    return total + (Number(question.points) || 0);
  }, 0);
}

// CALCULATE TOTAL EXHIBITION PROGRESS
function updateProgress() {
  const completedCount =
    Object.keys(visitorProgress).filter(function(id) {
      return projects.some(project => project.id === id);
    }).length;

  const totalScore = projects.reduce(function(total, project) {
    return total +
      (visitorProgress[project.id]?.bestScore || 0);
  }, 0);

  const maximumScore = projects.reduce(function(total, project) {
    return total + getMaximumScore(project);
  }, 0);

  progressText.textContent =
    "Proyectos completados: " +
    completedCount + "/" + projects.length;

  scoreText.textContent =
    "Puntos: " + totalScore + "/" + maximumScore;
}

// SAVE LOCAL PROGRESS
function saveProgress() {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(visitorProgress)
    );
  } catch (error) {
    console.warn("Could not save visitor progress.", error);
  }

  updateProgress();
}

// DISPLAY QUESTION
function showQuestion() {
  answered = false;

  const question = currentProject.questions[currentQuestion];

  progress.textContent =
    "Pregunta" + (currentQuestion + 1) +
    " de " + currentProject.questions.length;

  questionText.textContent = question.question;
  answerContainer.innerHTML = "";
  feedback.textContent = "";
  nextButton.disabled = true;

  question.answers.forEach(function(answer) {
    const button = document.createElement("button");

    button.className = "answer";
    button.textContent = answer.text;

    button.addEventListener("click", function() {
      if (answered) return;

      answered = true;

      const allAnswers =
        answerContainer.querySelectorAll(".answer");

      allAnswers.forEach(function(item) {
        item.disabled = true;
      });

      if (answer.correct) {
        currentScore += Number(question.points) || 0;

        button.classList.add("correct");
        feedback.textContent =
          question.explanation +
          " +" + (Number(question.points) || 0) + " points!";
        feedback.style.color = "green";

      } else {
        button.classList.add("incorrect");

        feedback.textContent =
          "No es correcto. La respuesta correcta es: " +
          question.answers.find(a => a.correct).text;

        feedback.style.color = "red";

        allAnswers.forEach(function(item, index) {
          if (question.answers[index].correct) {
            item.classList.add("correct");
          }
        });
      }

      nextButton.disabled = false;
    });

    answerContainer.appendChild(button);
  });

  nextButton.textContent =
    currentQuestion === currentProject.questions.length - 1
      ? "Terminar"
      : "Continuar";
}

// OPEN PROJECT QUIZ
function openQuiz(project) {
  if (overlay.style.display === "flex") return;

  currentProject = project;
  currentQuestion = 0;
  currentScore = 0;

  quizTitle.textContent = project.title;

  quizCard.style.display = "block";
  completionScreen.style.display = "none";
  overlay.style.display = "flex";

  showQuestion();
}

// FINISH PROJECT QUIZ
async function finishQuiz() {
  const previousBest =
    visitorProgress[currentProject.id]?.bestScore || 0;

  const bestScore = Math.max(previousBest, currentScore);

  visitorProgress[currentProject.id] = {
    bestScore: bestScore
  };

  saveProgress();

  const maximumScore = getMaximumScore(currentProject);

  completionMessage.textContent =
    "You earned " + currentScore + " out of " +
    maximumScore + " possible points. Your best score for this project is " +
    bestScore + " points.";

  quizCard.style.display = "none";
  completionScreen.style.display = "block";

  // SAVE SCORE TO SHARED FIREBASE LEADERBOARD
  if (typeof window.saveProjectScore === "function") {
    try {
      await window.saveProjectScore(
        currentProject.id,
        bestScore
      );

      console.log("Shared leaderboard score saved!");

    } catch (error) {
      console.error("Could not update shared leaderboard:", error);

      completionMessage.textContent +=
        " Your score is saved on this device, but the shared leaderboard " +
        "could not be updated. Please check your internet connection.";
    }
  } else {
    console.error("Firebase score function is not available.");

    completionMessage.textContent +=
      " The shared leaderboard is currently unavailable.";
  }
}

// CONTINUE OR FINISH
nextButton.addEventListener("click", function() {
  if (!answered) return;

  if (currentQuestion < currentProject.questions.length - 1) {
    currentQuestion++;
    showQuestion();
  } else {
    finishQuiz();
  }
});

// CLOSE QUIZ
function closeQuiz() {
  overlay.style.display = "none";
}

document.getElementById("closeQuiz")
  .addEventListener("click", closeQuiz);

document.getElementById("finishButton")
  .addEventListener("click", closeQuiz);

// REPLAY QUIZ
document.getElementById("replayButton")
  .addEventListener("click", function() {
    currentQuestion = 0;
    currentScore = 0;

    completionScreen.style.display = "none";
    quizCard.style.display = "block";

    showQuestion();
  });

// TAP DETECTION
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

scene.addEventListener("renderstart", function() {
  const canvas = scene.renderer.domElement;

  canvas.addEventListener("pointerdown", function(event) {
    if (overlay.style.display === "flex") return;

    const rect = canvas.getBoundingClientRect();

    pointer.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;

    pointer.y =
      -(((event.clientY - rect.top) / rect.height) * 2 - 1);

    raycaster.setFromCamera(pointer, scene.camera);

    for (const project of projects) {
      if (!project.target || !project.model) continue;

      if (!project.target.object3D.visible) continue;

      const intersections = raycaster.intersectObject(
        project.model.object3D,
        true
      );

      if (intersections.length > 0) {
        openQuiz(project);
        break;
      }
    }
  });
});

// INITIALIZE PROGRESS DISPLAY
updateProgress();

// LEADERBOARD INTERFACE
const leaderboardButton =
  document.getElementById("leaderboardButton");

const leaderboardOverlay =
  document.getElementById("leaderboardOverlay");

const closeLeaderboard =
  document.getElementById("closeLeaderboard");

const leaderboardList =
  document.getElementById("leaderboardList");

const leaderboardStatus =
  document.getElementById("leaderboardStatus");

let stopLeaderboardListener = null;

// OPEN LEADERBOARD
leaderboardButton.addEventListener("click", function() {
  leaderboardOverlay.style.display = "flex";

  if (stopLeaderboardListener) return;

  if (typeof window.subscribeLeaderboard !== "function") {
    leaderboardStatus.textContent =
      "Conexión a la tabla de clasificación no disponible.";
    return;
  }

  leaderboardStatus.textContent = "Cargando clasificaciones...";

  stopLeaderboardListener = window.subscribeLeaderboard(
    function(entries) {
      if (entries === null) {
        leaderboardStatus.textContent =
          "No se pudo cargar la tabla de clasificación. Por favor, inténtalo de nuevo más tarde.";
        leaderboardList.innerHTML = "";
        return;
      }

      leaderboardList.innerHTML = "";

      if (entries.length === 0) {
        leaderboardStatus.textContent =
          "No hay puntuaciones aún. ¡Sé el primero en jugar!";
        return;
      }

      leaderboardStatus.textContent =
        "Top " + entries.length + " visitantes";

      entries.forEach(function(entry, index) {
        const row = document.createElement("div");
        row.className = "leaderboardEntry";

        const rank = document.createElement("span");
        rank.className = "leaderboardRank";
        rank.textContent = "#" + (index + 1);

        const name = document.createElement("span");
        name.className = "leaderboardName";
        name.textContent = entry.nickname;

        const points = document.createElement("span");
        points.className = "leaderboardPoints";
        points.textContent = entry.totalPoints + " pts";

        row.appendChild(rank);
        row.appendChild(name);
        row.appendChild(points);

        leaderboardList.appendChild(row);
      });
    }
  );
});

// CLOSE LEADERBOARD
closeLeaderboard.addEventListener("click", function() {
  leaderboardOverlay.style.display = "none";
});

// CLOSE WHEN TAPPING OUTSIDE THE CARD
leaderboardOverlay.addEventListener("click", function(event) {
  if (event.target === leaderboardOverlay) {
    leaderboardOverlay.style.display = "none";
  }
});
