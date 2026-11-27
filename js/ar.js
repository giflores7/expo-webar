
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
    "Projects completed: " +
    completedCount + "/" + projects.length;

  scoreText.textContent =
    "Points: " + totalScore + "/" + maximumScore;
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
    "QUESTION " + (currentQuestion + 1) +
    " OF " + currentProject.questions.length;

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
          "Not quite! The correct answer is: " +
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
      ? "Finish"
      : "Continue";
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
