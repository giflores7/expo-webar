
window.PROJECTS = [
  {
    id: "project1",
    title: "Project 01",
    targetIndex: 0,
    targetSelector: "#project1Target",
    modelSelector: "#projectModel1",

    questions: [
      {
        question: "¿Cuál es el propósito de este proyecto?",
        points: 10,
        answers: [
          { text: "Ser modular y adaptarse al usuario", correct: true },
          { text: "Ser una familia de luminarias", correct: false },
          { text: "Crear una experiencia usando realidad extendida", correct: false }
        ],
        explanation: "Great job! You completed this project's challenge."
      }
    ]
  },

  {
    id: "project2",
    title: "Project 02",
    targetIndex: 1,
    targetSelector: "#project2Target",
    modelSelector: "#projectModel2",

    questions: [
      {
        question: "Who is the main user of this project?",
        points: 15,
        answers: [
          { text: "Children", correct: true },
          { text: "Professional chefs", correct: false },
          { text: "Gardeners", correct: false }
        ],
        explanation: "Great job! You completed this project's challenge."
      }
    ]
  }
];
