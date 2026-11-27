
window.PROJECTS = [
  {
    id: "project1",
    title: "Project 01",
    targetIndex: 0,
    targetSelector: "#project1Target",
    modelSelector: "#projectModel1",

    questions: [
      {
        question: "What problem does this project aim to solve?",
        answers: [
          { text: "Reduce material waste", correct: true },
          { text: "Improve user comfort", correct: false },
          { text: "Save storage space", correct: false }
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
