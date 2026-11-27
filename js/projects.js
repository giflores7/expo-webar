
window.PROJECTS = [
  {
    id: "project1",
    title: "Projecto 01",
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
        explanation: "¡Correcto! Buen trabajo."
      }
    ]
  },

  {
    id: "project2",
    title: "Projecto 02",
    targetIndex: 1,
    targetSelector: "#project2Target",
    modelSelector: "#projectModel2",

    questions: [
      {
        question: "¿Quién es el usuario principal de este proyecto?",
        points: 15,
        answers: [
          { text: "Niños", correct: false },
          { text: "Cocineros profesionales", correct: true },
          { text: "Jardineros", correct: false }
        ],
        explanation: "¡Correcto! Buen trabajo."
      }
    ]
  }
];
