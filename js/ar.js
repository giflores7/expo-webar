
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

// PROJECT VARIABLES
let currentProject = null;
let currentQuestion = 0;
let answered = false;

// CONNECT PROJECT DATA TO THE AR SCENE
const projects = window.PROJECTS.map(function(project) {
  return {
    ...project,
    target: document.querySelector(project.targetSelector),
    model: document.querySelector(project.modelSelector)
  };
});

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
        button.classList.add("correct");
        feedback.textContent = question.explanation;
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

// OPEN A PROJECT QUIZ
function openQuiz(project) {
  if (overlay.style.display === "flex") return;

  currentProject = project;
  currentQuestion = 0;

  quizTitle.textContent = project.title;

  quizCard.style.display = "block";
  completionScreen.style.display = "none";
  overlay.style.display = "flex";

  showQuestion();
}

// CONTINUE OR FINISH
nextButton.addEventListener("click", function() {
  if (!answered) return;

  if (currentQuestion < currentProject.questions.length - 1) {
    currentQuestion++;
    showQuestion();
  } else {
    quizCard.style.display = "none";
    completionScreen.style.display = "block";
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
