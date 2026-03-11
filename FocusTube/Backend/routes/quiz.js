const express = require('express');
const router = express.Router();

// Quiz bank organized by topic keywords
const QUIZ_BANK = {
  'binary search': [
    {
      question: 'What is the time complexity of Binary Search?',
      options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
      correct: 1,
      explanation: 'Binary Search divides the search space in half each time, giving O(log n) complexity.'
    },
    {
      question: 'What prerequisite must the array satisfy for Binary Search to work?',
      options: ['Array must be unsorted', 'Array must be sorted', 'Array must have even length', 'Array must contain only integers'],
      correct: 1,
      explanation: 'Binary Search requires the array to be sorted to correctly eliminate half the elements.'
    },
    {
      question: 'In Binary Search, how do you calculate the middle index?',
      options: ['mid = left + right', 'mid = (left + right) / 2', 'mid = right - left', 'mid = left * right'],
      correct: 1,
      explanation: 'The middle index is calculated as (left + right) / 2, often written as left + (right - left) / 2 to avoid overflow.'
    },
    {
      question: 'What happens when the target element is not found in Binary Search?',
      options: ['Returns the first element', 'Returns -1 or null', 'Returns the last element', 'Throws an exception always'],
      correct: 1,
      explanation: 'When the element is not found, Binary Search typically returns -1 or null to indicate absence.'
    },
    {
      question: 'Binary Search is an example of which algorithmic paradigm?',
      options: ['Dynamic Programming', 'Greedy Algorithm', 'Divide and Conquer', 'Backtracking'],
      correct: 2,
      explanation: 'Binary Search uses the Divide and Conquer approach by splitting the problem into smaller subproblems.'
    }
  ],
  'binary tree': [
    {
      question: 'What is the maximum number of children a node can have in a Binary Tree?',
      options: ['1', '2', '3', 'Unlimited'],
      correct: 1,
      explanation: 'In a Binary Tree, each node can have at most 2 children: left and right.'
    },
    {
      question: 'What is the height of a Binary Tree with only one node (root)?',
      options: ['0', '1', '2', '-1'],
      correct: 0,
      explanation: 'A single root node has height 0 by the standard definition (some definitions say 1).'
    },
    {
      question: 'Which traversal visits nodes in Left → Root → Right order?',
      options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'],
      correct: 1,
      explanation: 'In-order traversal follows Left → Root → Right, which gives sorted output for a BST.'
    },
    {
      question: 'What is a complete binary tree?',
      options: ['All nodes have exactly 2 children', 'All levels are fully filled except possibly the last', 'A tree with no children', 'A tree where all leaves are at the same level'],
      correct: 1,
      explanation: 'A complete binary tree has all levels filled except possibly the last, which is filled from left to right.'
    },
    {
      question: 'In a Binary Search Tree, where is the smallest element located?',
      options: ['Root', 'Rightmost node', 'Leftmost node', 'At a random position'],
      correct: 2,
      explanation: 'In a BST, the leftmost node contains the smallest element since all left children are smaller.'
    }
  ],
  'linked list': [
    {
      question: 'What does each node in a singly linked list contain?',
      options: ['Only data', 'Data and a pointer to next node', 'Data and pointers to both next and previous', 'Only a pointer'],
      correct: 1,
      explanation: 'Each node in a singly linked list contains data and a pointer/reference to the next node.'
    },
    {
      question: 'What is the time complexity of accessing an element by index in a linked list?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
      correct: 2,
      explanation: 'Unlike arrays, linked lists require traversal from the head, making access O(n).'
    },
    {
      question: 'What is a circular linked list?',
      options: ['A list with no nodes', 'A list where the last node points back to the head', 'A list shaped like a circle', 'A doubly linked list'],
      correct: 1,
      explanation: 'In a circular linked list, the last node\'s next pointer points back to the head node.'
    },
    {
      question: 'What is the advantage of linked lists over arrays?',
      options: ['Faster random access', 'Dynamic size and efficient insertion/deletion', 'Less memory usage', 'Better cache performance'],
      correct: 1,
      explanation: 'Linked lists can grow/shrink dynamically and insertion/deletion at known positions is O(1).'
    },
    {
      question: 'What is the head of a linked list?',
      options: ['The last node', 'The middle node', 'The first node', 'A special sentinel node'],
      correct: 2,
      explanation: 'The head is the first node of the linked list, and the entry point for traversal.'
    }
  ],
  'sorting': [
    {
      question: 'What is the average time complexity of QuickSort?',
      options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
      correct: 1,
      explanation: 'QuickSort has O(n log n) average complexity, though O(n²) worst case with poor pivot selection.'
    },
    {
      question: 'Which sorting algorithm is considered stable?',
      options: ['QuickSort', 'HeapSort', 'Merge Sort', 'Selection Sort'],
      correct: 2,
      explanation: 'Merge Sort is a stable sorting algorithm, preserving the relative order of equal elements.'
    },
    {
      question: 'What is the best case time complexity of Bubble Sort?',
      options: ['O(n²)', 'O(n log n)', 'O(n)', 'O(1)'],
      correct: 2,
      explanation: 'With an already sorted array and early termination, Bubble Sort achieves O(n) best case.'
    },
    {
      question: 'Which sorting algorithm uses the "divide and conquer" strategy?',
      options: ['Insertion Sort', 'Bubble Sort', 'Selection Sort', 'Merge Sort'],
      correct: 3,
      explanation: 'Merge Sort divides the array in half, recursively sorts each half, then merges them.'
    },
    {
      question: 'What is the space complexity of Merge Sort?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
      correct: 2,
      explanation: 'Merge Sort requires O(n) extra space for the temporary arrays used during merging.'
    }
  ],
  'react': [
    {
      question: 'What is a React Hook?',
      options: ['A lifecycle method', 'A function that lets you use state in functional components', 'A class component feature', 'A CSS styling method'],
      correct: 1,
      explanation: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components.'
    },
    {
      question: 'What does useState return?',
      options: ['Just the current state', 'Just a setter function', 'An array with current state and a setter function', 'An object with state properties'],
      correct: 2,
      explanation: 'useState returns an array: [currentState, setStateFunction] which you can destructure.'
    },
    {
      question: 'When does useEffect run by default?',
      options: ['Only on mount', 'Only on unmount', 'After every render', 'Only when state changes'],
      correct: 2,
      explanation: 'Without a dependency array, useEffect runs after every render of the component.'
    },
    {
      question: 'What is the Virtual DOM in React?',
      options: ['The actual browser DOM', 'A lightweight copy of the DOM kept in memory', 'A CSS framework', 'A database for React'],
      correct: 1,
      explanation: 'React keeps a virtual DOM in memory and syncs it with the real DOM (reconciliation) for efficiency.'
    },
    {
      question: 'What is JSX in React?',
      options: ['A new programming language', 'JavaScript with XML-like syntax for describing UI', 'A CSS preprocessor', 'A testing framework'],
      correct: 1,
      explanation: 'JSX is a syntax extension for JavaScript that looks like HTML and describes what the UI should look like.'
    }
  ],
  'javascript': [
    {
      question: 'What is closure in JavaScript?',
      options: ['A way to close a browser tab', 'A function that has access to its outer scope even after the outer function returns', 'A method to end a loop', 'An error handling mechanism'],
      correct: 1,
      explanation: 'A closure is a function that retains access to variables from its outer lexical scope even after that scope has closed.'
    },
    {
      question: 'What does "=== " (strict equality) check in JavaScript?',
      options: ['Only value equality', 'Only type equality', 'Both value and type equality', 'Reference equality only'],
      correct: 2,
      explanation: 'Strict equality (===) checks both value AND type, unlike loose equality (==) which performs type coercion.'
    },
    {
      question: 'What is the output of typeof null in JavaScript?',
      options: ['"null"', '"undefined"', '"object"', '"boolean"'],
      correct: 2,
      explanation: 'typeof null returns "object" — this is a well-known bug in JavaScript that exists for backward compatibility.'
    },
    {
      question: 'What is the purpose of the "async/await" syntax?',
      options: ['To make code run faster', 'To write asynchronous code that looks synchronous', 'To create new threads', 'To handle CSS animations'],
      correct: 1,
      explanation: 'async/await is syntactic sugar over Promises, making asynchronous code easier to write and read.'
    },
    {
      question: 'What is hoisting in JavaScript?',
      options: ['Moving code to the top of the file', "JavaScript's behavior of moving declarations to the top of their scope", 'Uploading files to a server', 'A CSS layout technique'],
      correct: 1,
      explanation: 'Hoisting moves variable and function declarations to the top of their containing scope during compilation.'
    }
  ],
  'default': [
    {
      question: 'What is the primary purpose of algorithms in computer science?',
      options: ['To write complex code', 'To solve problems efficiently with a defined set of steps', 'To create databases', 'To design user interfaces'],
      correct: 1,
      explanation: 'Algorithms are step-by-step procedures designed to solve specific problems efficiently.'
    },
    {
      question: 'What does "time complexity" measure in an algorithm?',
      options: ['The actual clock time to run', 'How memory is used', 'How the runtime scales with input size', 'The number of lines of code'],
      correct: 2,
      explanation: 'Time complexity describes how the execution time grows relative to the input size, using Big O notation.'
    },
    {
      question: 'What is Big O notation used for?',
      options: ['Describing object-oriented patterns', 'Expressing upper bounds of algorithm complexity', 'Writing documentation', 'Naming variables'],
      correct: 1,
      explanation: 'Big O notation describes the upper bound of an algorithm\'s time or space complexity as input grows.'
    },
    {
      question: 'Which data structure follows LIFO (Last In, First Out) order?',
      options: ['Queue', 'Stack', 'Array', 'Linked List'],
      correct: 1,
      explanation: 'A Stack follows LIFO — the last element pushed is the first one popped.'
    },
    {
      question: 'What is recursion in programming?',
      options: ['A loop that runs forever', 'A function that calls itself with a smaller problem', 'A data structure', 'An error handling technique'],
      correct: 1,
      explanation: 'Recursion is when a function calls itself with a smaller version of the problem until a base case is reached.'
    }
  ]
};

// Find the best matching quiz for a topic
function findQuizForTopic(topic, videoTitle) {
  const searchText = `${topic} ${videoTitle}`.toLowerCase();

  for (const [key, questions] of Object.entries(QUIZ_BANK)) {
    if (key === 'default') continue;
    if (searchText.includes(key)) {
      return questions;
    }
  }

  // Check partial matches
  const topicWords = searchText.split(/\s+/);
  for (const [key, questions] of Object.entries(QUIZ_BANK)) {
    if (key === 'default') continue;
    const keyWords = key.split(/\s+/);
    if (keyWords.some(w => topicWords.includes(w))) {
      return questions;
    }
  }

  return QUIZ_BANK['default'];
}

// GET /api/quiz/generate?topic=binary+search&video_title=...
router.get('/generate', (req, res) => {
  const { topic, video_title } = req.query;

  if (!topic) {
    return res.status(400).json({ error: 'topic is required' });
  }

  const allQuestions = findQuizForTopic(topic, video_title || '');

  // Randomly select 5 questions
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(5, shuffled.length));

  // Shuffle the answer options for each question
  const quiz = selected.map((q, index) => {
    const correctAnswer = q.options[q.correct];
    const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
    const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);

    return {
      id: index + 1,
      question: q.question,
      options: shuffledOptions,
      correct: newCorrectIndex,
      explanation: q.explanation
    };
  });

  res.json({ quiz, topic, total: quiz.length });
});

// POST /api/quiz/submit
router.post('/submit', (req, res) => {
  const { answers, quiz } = req.body;

  if (!answers || !quiz) {
    return res.status(400).json({ error: 'answers and quiz are required' });
  }

  let score = 0;
  const results = quiz.map((question, index) => {
    const userAnswer = answers[index];
    const isCorrect = userAnswer === question.correct;
    if (isCorrect) score++;

    return {
      question: question.question,
      user_answer: userAnswer,
      correct_answer: question.correct,
      correct_option: question.options[question.correct],
      is_correct: isCorrect,
      explanation: question.explanation
    };
  });

  res.json({
    score,
    total: quiz.length,
    percentage: Math.round((score / quiz.length) * 100),
    results
  });
});

module.exports = router;
