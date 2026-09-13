import { QuizItem, QuestionData, AttemptRecord, RetentionRating, SpacedRepetitionItem } from "@/types";
import { calculateNextReview } from "./spaced-repetition";

const QUIZZES_STORAGE_KEY = "quizme_quizzes_v1";
const QUESTIONS_STORAGE_KEY = "quizme_questions_v1";
const ATTEMPTS_STORAGE_KEY = "quizme_attempts_v1";
const PROGRESS_STORAGE_KEY = "quizme_progress_v1";
const STREAK_STORAGE_KEY = "quizme_streak";

// Initial Seed Data
const INITIAL_QUIZZES: QuizItem[] = [
  {
    id: 1,
    title: "JavaScript & Modern Web Engineering",
    slug: "javascript-web-engineering",
    description: "Deep dive into JS internals, asynchronous concurrency, React patterns, TypeScript types, and web security.",
    category: "Computer Science",
    difficulty: "intermediate",
    timeLimitMinutes: 12,
    passingScore: 70,
    icon: "code",
    isCustom: false,
    questionCount: 8,
  },
  {
    id: 2,
    title: "Human Anatomy & Physiology",
    slug: "human-anatomy-physiology",
    description: "Cardiovascular dynamics, neural conduction, renal clearance, endocrine cascades, and cellular metabolism.",
    category: "Medicine & Biology",
    difficulty: "intermediate",
    timeLimitMinutes: 15,
    passingScore: 75,
    icon: "activity",
    isCustom: false,
    questionCount: 6,
  },
  {
    id: 3,
    title: "Cybersecurity & Network Defense",
    slug: "cybersecurity-network-defense",
    description: "Cryptography, identity protocols, OWASP Top 10, Zero Trust architecture, and defensive hardening.",
    category: "Cybersecurity",
    difficulty: "advanced",
    timeLimitMinutes: 10,
    passingScore: 80,
    icon: "shield",
    isCustom: false,
    questionCount: 5,
  },
  {
    id: 4,
    title: "Astrophysics & Modern Physics",
    slug: "astrophysics-modern-physics",
    description: "General relativity, cosmic microwave background, black hole horizons, stellar evolution, and quantum phenomena.",
    category: "Science & Physics",
    difficulty: "advanced",
    timeLimitMinutes: 12,
    passingScore: 70,
    icon: "atom",
    isCustom: false,
    questionCount: 4,
  },
  {
    id: 5,
    title: "World History & Global Civilizations",
    slug: "world-history-civilizations",
    description: "Ancient empires, maritime exploration, the Enlightenment, industrial revolutions, and global geopolitical shifts.",
    category: "World History",
    difficulty: "beginner",
    timeLimitMinutes: 10,
    passingScore: 65,
    icon: "globe",
    isCustom: false,
    questionCount: 4,
  },
];

const INITIAL_QUESTIONS: QuestionData[] = [
  // Quiz 1: JavaScript & Web Engineering
  {
    id: 101,
    quizId: 1,
    questionText: "Which statement accurately describes how the JavaScript Event Loop prioritizes microtasks versus macrotasks?",
    questionType: "multiple_choice",
    options: [
      "Macrotasks (e.g., setTimeout) always execute before the current microtask queue is drained.",
      "Microtasks (e.g., Promise.then, queueMicrotask) are all executed to completion before the next macrotask is processed.",
      "Microtasks and macrotasks are interleaved one-by-one in strict FIFO sequence.",
      "Microtasks only execute when the requestAnimationFrame callback returns.",
    ],
    correctAnswers: [
      "Microtasks (e.g., Promise.then, queueMicrotask) are all executed to completion before the next macrotask is processed.",
    ],
    explanation:
      "After each macrotask completes and whenever the call stack empties, the JavaScript engine drains the entire microtask queue (including any newly queued microtasks) before picking the next macrotask.",
    hint: "Think about when Promise callbacks run relative to setTimeout callbacks.",
    orderNum: 1,
  },
  {
    id: 102,
    quizId: 1,
    questionText: "Select ALL mechanisms that effectively mitigate Cross-Site Scripting (XSS) in modern web applications:",
    questionType: "multi_select",
    options: [
      "Setting a strict Content-Security-Policy (CSP) HTTP header",
      "Context-aware output encoding/sanitization (e.g., DOMPurify)",
      "Using HttpOnly flag on authentication cookies",
      "Using the CORS 'Access-Control-Allow-Origin: *' header",
    ],
    correctAnswers: [
      "Setting a strict Content-Security-Policy (CSP) HTTP header",
      "Context-aware output encoding/sanitization (e.g., DOMPurify)",
      "Using HttpOnly flag on authentication cookies",
    ],
    explanation:
      "Strict CSP restricts executable script sources, output sanitization prevents injected scripts from being interpreted as HTML, and HttpOnly cookies prevent JavaScript from stealing session tokens even if XSS occurs. CORS wildcard does NOT protect against XSS (in fact, it relaxes origin checks).",
    hint: "Remember that CORS controls cross-origin reading, not script injection or cookie access.",
    orderNum: 2,
  },
  {
    id: 103,
    quizId: 1,
    questionText: "In React 19, what happens when you pass a Server Action directly to a form's `action` attribute?",
    questionType: "multiple_choice",
    options: [
      "The form requires manual e.preventDefault() to submit without a full page reload.",
      "React automatically progressively enhances the form, allowing optimistic updates and running without client-side JS when needed.",
      "Server actions cannot be attached to native form elements.",
      "The form submission bypasses all CSRF protections completely.",
    ],
    correctAnswers: [
      "React automatically progressively enhances the form, allowing optimistic updates and running without client-side JS when needed.",
    ],
    explanation:
      "React Server Actions integrated into form action attributes provide progressive enhancement: if JavaScript hasn't loaded yet or is disabled, the standard browser POST occurs; otherwise, React interceptively invokes the action over RPC with transition support.",
    hint: "Consider progressive enhancement and server actions.",
    orderNum: 3,
  },
  {
    id: 104,
    quizId: 1,
    questionText: "True or False: In TypeScript, the `unknown` type is safer than `any` because `unknown` forces you to perform type checking or assertions before invoking methods or accessing properties.",
    questionType: "true_false",
    options: ["True", "False"],
    correctAnswers: ["True"],
    explanation:
      "True! `unknown` is the type-safe counterpart of `any`. Anything can be assigned to `unknown`, but `unknown` cannot be assigned to anything else without type narrowing (typeof, instanceof, type guards) or explicit casting.",
    hint: "Consider what TypeScript allows you to call on an `unknown` variable without `if (typeof x === ...)`.",
    orderNum: 4,
  },
  {
    id: 105,
    quizId: 1,
    questionText: "What is the standard JavaScript method name used to schedule a callback right before the browser repaints the screen?",
    questionType: "fill_blank",
    options: ["requestAnimationFrame"],
    correctAnswers: ["requestAnimationFrame", "window.requestAnimationFrame", "requestAnimationFrame()"],
    explanation:
      "window.requestAnimationFrame() instructs the browser that you wish to perform an animation and requests that the browser call a specified function to update an animation before the next repaint.",
    hint: "Commonly abbreviated as rAF.",
    orderNum: 5,
  },
  {
    id: 106,
    quizId: 1,
    questionText: "What distinguishes `Promise.allSettled()` from `Promise.all()`?",
    questionType: "multiple_choice",
    options: [
      "Promise.allSettled() rejects immediately as soon as any promise rejects.",
      "Promise.allSettled() always resolves with an array of result objects ({status, value/reason}) regardless of individual promise rejections.",
      "Promise.allSettled() cancels pending promises when one fails.",
      "Promise.allSettled() runs promises sequentially instead of in parallel.",
    ],
    correctAnswers: [
      "Promise.allSettled() always resolves with an array of result objects ({status, value/reason}) regardless of individual promise rejections.",
    ],
    explanation:
      "Unlike Promise.all() which short-circuits and rejects immediately on the first rejection, Promise.allSettled() waits for all input promises to settle and returns an array describing the outcome of each.",
    hint: "Settled means resolved OR rejected without failing the whole batch.",
    orderNum: 6,
  },
  {
    id: 107,
    quizId: 1,
    questionText: "What HTTP status code should a server return when a request fails authentication because valid credentials were NOT provided?",
    questionType: "fill_blank",
    options: ["401", "401 Unauthorized"],
    correctAnswers: ["401", "401 Unauthorized"],
    explanation:
      "HTTP 401 Unauthorized indicates that the request has not been applied because it lacks valid authentication credentials for the target resource. (403 Forbidden is used when the server understands who you are, but you lack permission).",
    hint: "It is a 3-digit 4xx status code.",
    orderNum: 7,
  },
  {
    id: 108,
    quizId: 1,
    questionText: "Which of the following creates a closure in JavaScript?",
    questionType: "multiple_choice",
    options: [
      "An inner function that accesses variables from its outer lexical scope, even after the outer function has finished executing.",
      "Using the `class` syntax with private fields (#variable).",
      "A JSON object with deep nesting.",
      "A try...catch block inside an async function.",
    ],
    correctAnswers: [
      "An inner function that accesses variables from its outer lexical scope, even after the outer function has finished executing.",
    ],
    explanation:
      "A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment).",
    hint: "Lexical scoping preserved beyond outer function invocation.",
    orderNum: 8,
  },

  // Quiz 2: Human Anatomy & Physiology
  {
    id: 201,
    quizId: 2,
    questionText: "Which heart chamber pumps oxygen-rich blood into the systemic circulation via the aorta?",
    questionType: "multiple_choice",
    options: ["Right Atrium", "Right Ventricle", "Left Atrium", "Left Ventricle"],
    correctAnswers: ["Left Ventricle"],
    explanation:
      "The left ventricle possesses the thickest muscular myocardium and generates high systolic pressure to pump oxygenated blood through the aortic valve into the systemic arterial tree.",
    hint: "It has the thickest muscular wall of all four chambers.",
    orderNum: 1,
  },
  {
    id: 202,
    quizId: 2,
    questionText: "Which cranial nerve (CN X) provides extensive parasympathetic innervation to the thoracic and abdominal organs?",
    questionType: "fill_blank",
    options: ["Vagus nerve", "Vagus", "CN X"],
    correctAnswers: ["Vagus nerve", "Vagus", "The Vagus Nerve", "Nervus Vagus"],
    explanation:
      "Cranial Nerve X, the Vagus nerve (from Latin 'wandering'), carries roughly 75% of all parasympathetic nervous system fibers to the heart, lungs, and digestive tract.",
    hint: "Name translates to 'wandering' in Latin.",
    orderNum: 2,
  },
  {
    id: 203,
    quizId: 2,
    questionText: "Select ALL hormones produced and secreted directly by the anterior pituitary gland:",
    questionType: "multi_select",
    options: [
      "Growth Hormone (GH)",
      "Thyroid-Stimulating Hormone (TSH)",
      "Adrenocorticotropic Hormone (ACTH)",
      "Oxytocin",
    ],
    correctAnswers: [
      "Growth Hormone (GH)",
      "Thyroid-Stimulating Hormone (TSH)",
      "Adrenocorticotropic Hormone (ACTH)",
    ],
    explanation:
      "GH, TSH, ACTH, Prolactin, LH, and FSH are produced and secreted by the anterior pituitary (adenohypophysis). Oxytocin and Vasopressin (ADH) are synthesized in the hypothalamus and stored/released by the posterior pituitary.",
    hint: "Oxytocin is stored in the posterior pituitary, not synthesized in the anterior.",
    orderNum: 3,
  },
  {
    id: 204,
    quizId: 2,
    questionText: "True or False: The Loop of Henle creates a hyperosmolar medullary interstitium that allows the collecting ducts to concentrate urine under the influence of antidiuretic hormone (ADH).",
    questionType: "true_false",
    options: ["True", "False"],
    correctAnswers: ["True"],
    explanation:
      "True! The countercurrent multiplier mechanism of the Loop of Henle generates an osmotic gradient in the renal medulla, which enables water reabsorption when ADH opens aquaporin channels.",
    hint: "Countercurrent multiplication in the renal medulla.",
    orderNum: 4,
  },
  {
    id: 205,
    quizId: 2,
    questionText: "What is the primary site of gas exchange (O2 and CO2) in the human respiratory system?",
    questionType: "multiple_choice",
    options: ["Alveoli", "Trachea", "Bronchioles", "Larynx"],
    correctAnswers: ["Alveoli"],
    explanation:
      "Alveoli are microscopic air sacs lined by type I and type II pneumocytes surrounded by pulmonary capillaries, providing an enormous surface area (~70-100 m²) for passive gas diffusion.",
    hint: "Microscopic spherical air sacs at the terminal ends of the respiratory tree.",
    orderNum: 5,
  },
  {
    id: 206,
    quizId: 2,
    questionText: "Which ion influx triggers the rapid depolarization phase of a typical cardiac ventricular action potential?",
    questionType: "multiple_choice",
    options: ["Sodium (Na+)", "Potassium (K+)", "Chloride (Cl-)", "Magnesium (Mg2+)"],
    correctAnswers: ["Sodium (Na+)"],
    explanation:
      "Phase 0 depolarization of ventricular myocytes is mediated by the rapid opening of voltage-gated fast Na+ channels (Nav1.5), producing a steep upstroke.",
    hint: "Fast voltage-gated channels for this abundant extracellular cation.",
    orderNum: 6,
  },

  // Quiz 3: Cybersecurity
  {
    id: 301,
    quizId: 3,
    questionText: "What cryptographic primitive does the Diffie-Hellman algorithm primarily provide?",
    questionType: "multiple_choice",
    options: [
      "Secure key exchange over an insecure communication channel",
      "Bulk symmetrical file encryption",
      "Digital signature non-repudiation",
      "Lossless data compression",
    ],
    correctAnswers: ["Secure key exchange over an insecure communication channel"],
    explanation:
      "Diffie-Hellman key exchange is a method allowing two parties with no prior shared secret to jointly establish a shared secret key over an insecure channel using modular exponentiation or elliptic curves.",
    hint: "It allows two parties to agree on a shared secret without sending the secret itself.",
    orderNum: 1,
  },
  {
    id: 302,
    quizId: 3,
    questionText: "Select ALL core tenets of the 'Zero Trust' security architecture model:",
    questionType: "multi_select",
    options: [
      "Never trust, always verify every request regardless of origin",
      "Assume breach and minimize blast radius with micro-segmentation",
      "Trust all internal corporate LAN traffic automatically behind the perimeter firewall",
      "Enforce least-privilege access using context-based identity and device health",
    ],
    correctAnswers: [
      "Never trust, always verify every request regardless of origin",
      "Assume breach and minimize blast radius with micro-segmentation",
      "Enforce least-privilege access using context-based identity and device health",
    ],
    explanation:
      "Zero Trust abandons implicit trust based on network location (inside vs outside firewall) and enforces continuous authentication, least privilege, and explicit verification for every access attempt.",
    hint: "The old 'castle-and-moat' perimeter trust model is the opposite of Zero Trust.",
    orderNum: 2,
  },
  {
    id: 303,
    quizId: 3,
    questionText: "What security mechanism prevents SQL Injection in database query execution by separating SQL logic from user input data?",
    questionType: "fill_blank",
    options: ["Parameterized queries", "Prepared statements", "Parameterization"],
    correctAnswers: ["Parameterized queries", "Prepared statements", "Prepared statement", "Parameterized query"],
    explanation:
      "Parameterized queries (prepared statements) ensure the database engine compiles the SQL command structure before parameter values are bound, treating inputs strictly as literal values rather than executable code.",
    hint: "Also known as prepared statements.",
    orderNum: 3,
  },
  {
    id: 304,
    quizId: 3,
    questionText: "True or False: In TLS 1.3, the cryptographic handshake requires only 1 round-trip time (1-RTT) compared to TLS 1.2's 2-RTT, and supports 0-RTT resumption for returning clients.",
    questionType: "true_false",
    options: ["True", "False"],
    correctAnswers: ["True"],
    explanation:
      "True! TLS 1.3 drastically streamlined the handshake by removing legacy cipher negotiations, reducing the standard handshake to 1-RTT and allowing early data (0-RTT) resumption.",
    hint: "Think about latency improvements in TLS 1.3.",
    orderNum: 4,
  },
  {
    id: 305,
    quizId: 3,
    questionText: "Why is Proof Key for Code Exchange (PKCE) recommended for all OAuth 2.0 authorization code flows, including single-page applications and mobile apps?",
    questionType: "multiple_choice",
    options: [
      "It prevents authorization code interception attacks without requiring a static client secret.",
      "It replaces the need for HTTPS encryption during token transmission.",
      "It automatically rotates user passwords every 30 days.",
      "It forces users to enter biometric verification on every login.",
    ],
    correctAnswers: ["It prevents authorization code interception attacks without requiring a static client secret."],
    explanation:
      "PKCE uses a dynamic cryptographic code verifier and code challenge generated on the client, preventing intercepted authorization codes from being exchanged for tokens by an unauthorized client.",
    hint: "Public clients cannot securely store a static client secret.",
    orderNum: 5,
  },

  // Quiz 4: Astrophysics & Modern Physics
  {
    id: 401,
    quizId: 4,
    questionText: "What is the boundary around a black hole beyond which nothing, not even light, can escape the gravitational pull?",
    questionType: "fill_blank",
    options: ["Event Horizon", "The event horizon"],
    correctAnswers: ["Event Horizon", "The event horizon", "Event horizon", "Schwarzschild radius"],
    explanation:
      "The event horizon is the theoretical boundary around a black hole beyond which the escape velocity exceeds the speed of light.",
    hint: "Often calculated via the Schwarzschild radius.",
    orderNum: 1,
  },
  {
    id: 402,
    quizId: 4,
    questionText: "Which phenomenon provided the earliest decisive observational evidence for the Big Bang and cosmic expansion?",
    questionType: "multiple_choice",
    options: [
      "Cosmic Microwave Background (CMB) radiation",
      "Detection of gravitational waves from colliding neutron stars",
      "The discovery of exoplanets in the habitable zone",
      "The observation of antimatter in solar flares",
    ],
    correctAnswers: ["Cosmic Microwave Background (CMB) radiation"],
    explanation:
      "Discovered by Penzias and Wilson in 1965, the CMB is the thermal remnant radiation left over from recombination (~380,000 years after the Big Bang), matching blackbody radiation at 2.725 K.",
    hint: "Uniform microwave glow discovered accidentally by Penzias and Wilson.",
    orderNum: 2,
  },
  {
    id: 403,
    quizId: 4,
    questionText: "True or False: According to Einstein's Equivalence Principle, the effects of a uniform gravitational field are indistinguishable from those of a uniformly accelerating reference frame.",
    questionType: "true_false",
    options: ["True", "False"],
    correctAnswers: ["True"],
    explanation:
      "True! Einstein's Equivalence Principle states that an observer trapped inside a closed elevator cannot determine whether the force pressing their feet to the floor is due to gravity or linear acceleration.",
    hint: "Think about the elevator thought experiment.",
    orderNum: 3,
  },
  {
    id: 404,
    quizId: 4,
    questionText: "Select ALL particles classified as fundamental leptons in the Standard Model:",
    questionType: "multi_select",
    options: ["Electron", "Muon", "Tau", "Proton"],
    correctAnswers: ["Electron", "Muon", "Tau"],
    explanation:
      "The six leptons are the electron, muon, tau, and their three corresponding neutrinos. Protons are composite hadrons (baryons) composed of two up quarks and one down quark.",
    hint: "A proton is made of quarks, not a lepton.",
    orderNum: 4,
  },

  // Quiz 5: World History & Global Civilizations
  {
    id: 501,
    quizId: 5,
    questionText: "Which major international treaty signed in 1648 ended the Thirty Years' War and established the modern concept of sovereign nation-states?",
    questionType: "multiple_choice",
    options: [
      "Peace of Westphalia",
      "Treaty of Versailles",
      "Treaty of Utrecht",
      "Congress of Vienna",
    ],
    correctAnswers: ["Peace of Westphalia"],
    explanation:
      "The Peace of Westphalia (1648) ended the Thirty Years' War in the Holy Roman Empire and Eighty Years' War, creating the foundation for sovereign territorial state autonomy.",
    hint: "Named after a region in north-western Germany.",
    orderNum: 1,
  },
  {
    id: 502,
    quizId: 5,
    questionText: "What ancient overland trade network connected Han Dynasty China with the Mediterranean basin?",
    questionType: "fill_blank",
    options: ["Silk Road", "The Silk Road"],
    correctAnswers: ["Silk Road", "The Silk Road", "Silk route", "The Silk Route"],
    explanation:
      "The Silk Road was an expansive network of trade routes active from the Han dynasty (130 BCE) through the Ottoman embargo (1450s CE), exchanging goods, religions, and technologies.",
    hint: "Named after the prized Chinese textile commodity.",
    orderNum: 2,
  },
  {
    id: 503,
    quizId: 5,
    questionText: "True or False: The Library of Alexandria was entirely destroyed in a single catastrophic fire set by Julius Caesar in 48 BCE.",
    questionType: "true_false",
    options: ["True", "False"],
    correctAnswers: ["False"],
    explanation:
      "False! While Caesar accidentally burned part of the fleet and dockside warehouses in 48 BCE, the library declined over several centuries through neglect, municipal funding cuts, and multiple conflicts.",
    hint: "Its decline happened gradually over multiple centuries and episodes.",
    orderNum: 3,
  },
  {
    id: 504,
    quizId: 5,
    questionText: "In what year did the Magna Carta first grant English barons legal protections against arbitrary royal rule under King John?",
    questionType: "fill_blank",
    options: ["1215"],
    correctAnswers: ["1215", "1215 CE", "1215 AD"],
    explanation:
      "Agreed to by King John at Runnymede on June 15, 1215, the Magna Carta promised the protection of church rights, protection against illegal imprisonment, and access to swift justice.",
    hint: "Early 13th century (twelve-fifteen).",
    orderNum: 4,
  },
];

// Sample past attempts for immediate analytics display
const INITIAL_ATTEMPTS: AttemptRecord[] = [
  {
    id: 1001,
    quizId: 1,
    quizTitle: "JavaScript & Modern Web Engineering",
    quizCategory: "Computer Science",
    passingScore: 70,
    mode: "exam",
    score: 88,
    totalQuestions: 8,
    correctCount: 7,
    incorrectCount: 1,
    unansweredCount: 0,
    timeSpentSeconds: 420,
    passed: true,
    userAnswers: {},
    flaggedQuestions: [102],
    tabSwitchCount: 0,
    completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 1002,
    quizId: 2,
    quizTitle: "Human Anatomy & Physiology",
    quizCategory: "Medicine & Biology",
    passingScore: 75,
    mode: "practice",
    score: 83,
    totalQuestions: 6,
    correctCount: 5,
    incorrectCount: 1,
    unansweredCount: 0,
    timeSpentSeconds: 310,
    passed: true,
    userAnswers: {},
    flaggedQuestions: [],
    tabSwitchCount: 0,
    completedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Topic Presets for Generator
export const TOPIC_PRESETS: Record<string, QuestionData[]> = {
  react: [
    {
      id: 901,
      quizId: 0,
      questionText: "What is the primary purpose of the `useCallback` hook in React?",
      questionType: "multiple_choice",
      options: [
        "To memoize a callback function instance between renders to prevent unnecessary child re-renders",
        "To run asynchronous side effects after every DOM paint",
        "To cache expensive calculation results similar to a database query",
        "To mutate component state directly without triggering a re-render",
      ],
      correctAnswers: [
        "To memoize a callback function instance between renders to prevent unnecessary child re-renders",
      ],
      explanation:
        "useCallback caches a function definition between renders so child components wrapped in React.memo that receive it as a prop don't re-render unnecessarily.",
      hint: "Think about function reference equality across renders.",
    },
    {
      id: 902,
      quizId: 0,
      questionText: "Select ALL valid React 19 / Modern React primitives:",
      questionType: "multi_select",
      options: ["useActionState", "useOptimistic", "use(Promise)", "componentWillMount"],
      correctAnswers: ["useActionState", "useOptimistic", "use(Promise)"],
      explanation:
        "React 19 introduced useActionState, useOptimistic, and the `use` API for reading promises and context. componentWillMount is a deprecated legacy lifecycle method.",
      hint: "Look for modern action and async hooks, not deprecated class lifecycles.",
    },
    {
      id: 903,
      quizId: 0,
      questionText: "True or False: React keys in lists must be globally unique across your entire application.",
      questionType: "true_false",
      options: ["True", "False"],
      correctAnswers: ["False"],
      explanation:
        "False! Keys only need to be unique among sibling elements within the same array, not globally across the entire application.",
      hint: "Keys are used by the reconciler to identify siblings.",
    },
    {
      id: 904,
      quizId: 0,
      questionText: "Which hook replaces `useEffect` when you need to synchronously read layout from the DOM and synchronously re-render before browser paint?",
      questionType: "fill_blank",
      options: ["useLayoutEffect"],
      correctAnswers: ["useLayoutEffect", "useLayoutEffect()"],
      explanation:
        "useLayoutEffect fires synchronously after all DOM mutations but before the browser paints screen changes, preventing visual flickers when measuring DOM dimensions.",
      hint: "Similar name to useEffect with 'Layout' in between.",
    },
  ],
  python: [
    {
      id: 905,
      quizId: 0,
      questionText: "What is the key difference between a Python list and a Python tuple?",
      questionType: "multiple_choice",
      options: [
        "Tuples are immutable whereas lists can be modified in place",
        "Lists can hold mixed data types while tuples cannot",
        "Tuples are indexed by strings like dictionaries",
        "Lists cannot be sliced using [start:stop:step]",
      ],
      correctAnswers: ["Tuples are immutable whereas lists can be modified in place"],
      explanation:
        "Lists are mutable sequences created with square brackets [], while tuples are immutable sequences created with parentheses (), making tuples hashable as dictionary keys.",
      hint: "Consider whether items can be reassigned after creation.",
    },
    {
      id: 906,
      quizId: 0,
      questionText: "What built-in function returns an iterator of tuples containing the index and value of an iterable?",
      questionType: "fill_blank",
      options: ["enumerate"],
      correctAnswers: ["enumerate", "enumerate()"],
      explanation:
        "The enumerate() function adds a counter to an iterable and returns it as an enumerate object yielding (index, item) pairs.",
      hint: "Starts with 'enum'.",
    },
    {
      id: 907,
      quizId: 0,
      questionText: "True or False: In Python, default parameter values in function definitions are evaluated only once when the function is defined, not each time it is called.",
      questionType: "true_false",
      options: ["True", "False"],
      correctAnswers: ["True"],
      explanation:
        "True! This is why mutable default arguments (like `def append_to(item, target=[])`) can lead to unexpected shared state bugs.",
      hint: "Remember the classic mutable default argument trap with empty lists.",
    },
  ],
  sql: [
    {
      id: 908,
      quizId: 0,
      questionText: "What is the primary difference between `WHERE` and `HAVING` clauses in SQL?",
      questionType: "multiple_choice",
      options: [
        "WHERE filters rows before aggregation, while HAVING filters aggregated group rows after GROUP BY",
        "WHERE can only be used with numeric comparisons",
        "HAVING is executed before the FROM clause",
        "WHERE requires an index while HAVING does not",
      ],
      correctAnswers: [
        "WHERE filters rows before aggregation, while HAVING filters aggregated group rows after GROUP BY",
      ],
      explanation:
        "The WHERE clause filters individual rows before grouping occurs, whereas HAVING filters summary rows or groups created by the GROUP BY clause (e.g., HAVING COUNT(*) > 5).",
      hint: "Consider the SQL logical query processing order.",
    },
    {
      id: 909,
      quizId: 0,
      questionText: "Which SQL constraint ensures all values in a column are distinct and not null, acting as the primary identifier?",
      questionType: "fill_blank",
      options: ["PRIMARY KEY"],
      correctAnswers: ["PRIMARY KEY", "PRIMARY KEY constraint"],
      explanation:
        "A PRIMARY KEY constraint uniquely identifies each record in a table, implicitly enforcing both UNIQUE and NOT NULL constraints.",
      hint: "Two words: P... K...",
    },
    {
      id: 910,
      quizId: 0,
      questionText: "Select ALL ACID properties guaranteed by relational database transactions:",
      questionType: "multi_select",
      options: ["Atomicity", "Consistency", "Isolation", "Durability"],
      correctAnswers: ["Atomicity", "Consistency", "Isolation", "Durability"],
      explanation:
        "ACID stands for Atomicity (all or nothing), Consistency (valid state transitions), Isolation (concurrent transactions don't interfere), and Durability (committed changes persist).",
      hint: "All four letters form the classic acronym.",
    },
  ],
  machine_learning: [
    {
      id: 911,
      quizId: 0,
      questionText: "What problem occurs when a machine learning model performs exceptionally well on training data but poorly on unseen test data?",
      questionType: "multiple_choice",
      options: [
        "Overfitting (high variance)",
        "Underfitting (high bias)",
        "Data normalization failure",
        "Vanishing gradient",
      ],
      correctAnswers: ["Overfitting (high variance)"],
      explanation:
        "Overfitting occurs when a model learns the training noise and specifics rather than the underlying general trend, yielding high training accuracy but low generalization.",
      hint: "High variance and memorizing the training dataset.",
    },
    {
      id: 912,
      quizId: 0,
      questionText: "What loss function is standard for training multi-class classification neural networks?",
      questionType: "fill_blank",
      options: ["Categorical Cross-Entropy"],
      correctAnswers: ["Categorical Cross-Entropy", "Cross-entropy", "Cross entropy loss", "Cross-entropy loss"],
      explanation:
        "Categorical Cross-Entropy measures the dissimilarity between predicted probability distributions (via Softmax) and true one-hot encoded label distributions.",
      hint: "Also known as log loss or multinomial cross-entropy.",
    },
    {
      id: 913,
      quizId: 0,
      questionText: "True or False: Dropout is a regularization technique that randomly deactivates a subset of neurons during training to prevent co-adaptation of features.",
      questionType: "true_false",
      options: ["True", "False"],
      correctAnswers: ["True"],
      explanation:
        "True! Introduced by Srivastava et al., dropout randomly zeros out neuron outputs with probability p during forward passes in training, forcing the network to learn robust redundant representations.",
      hint: "Prevents complex co-adaptations between neural units.",
    },
  ],
};

// Storage Engine
export const storageService = {
  getQuizzes(): QuizItem[] {
    if (typeof window === "undefined") return INITIAL_QUIZZES;
    try {
      const raw = localStorage.getItem(QUIZZES_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(QUIZZES_STORAGE_KEY, JSON.stringify(INITIAL_QUIZZES));
        return INITIAL_QUIZZES;
      }
      return JSON.parse(raw);
    } catch {
      return INITIAL_QUIZZES;
    }
  },

  getQuestions(quizId: number): QuestionData[] {
    if (typeof window === "undefined") return INITIAL_QUESTIONS.filter((q) => q.quizId === quizId);
    try {
      const raw = localStorage.getItem(QUESTIONS_STORAGE_KEY);
      let allQuestions: QuestionData[] = raw ? JSON.parse(raw) : [];
      if (allQuestions.length === 0) {
        allQuestions = INITIAL_QUESTIONS;
        localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(INITIAL_QUESTIONS));
      }
      return allQuestions.filter((q) => q.quizId === quizId);
    } catch {
      return INITIAL_QUESTIONS.filter((q) => q.quizId === quizId);
    }
  },

  createQuiz(
    quizData: Omit<QuizItem, "id" | "slug" | "isCustom" | "questionCount"> & {
      questionsList: Omit<QuestionData, "id" | "quizId">[];
    }
  ): QuizItem {
    const quizzes = this.getQuizzes();
    const newId = Date.now();
    const slug = `${quizData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${newId.toString().slice(-4)}`;

    const newQuiz: QuizItem = {
      id: newId,
      title: quizData.title,
      slug,
      description: quizData.description,
      category: quizData.category,
      difficulty: quizData.difficulty,
      timeLimitMinutes: quizData.timeLimitMinutes,
      passingScore: quizData.passingScore,
      icon: quizData.icon || "book-open",
      isCustom: true,
      questionCount: quizData.questionsList.length,
    };

    const updatedQuizzes = [newQuiz, ...quizzes];
    localStorage.setItem(QUIZZES_STORAGE_KEY, JSON.stringify(updatedQuizzes));

    // Save questions
    const rawQuestions = localStorage.getItem(QUESTIONS_STORAGE_KEY);
    const allQuestions: QuestionData[] = rawQuestions ? JSON.parse(rawQuestions) : [...INITIAL_QUESTIONS];

    const formattedQuestions: QuestionData[] = quizData.questionsList.map((q, idx) => ({
      id: newId * 100 + idx + 1,
      quizId: newId,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options || [],
      correctAnswers: q.correctAnswers || [],
      explanation: q.explanation || "No explanation provided.",
      hint: q.hint || "",
      orderNum: idx + 1,
    }));

    allQuestions.push(...formattedQuestions);
    localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(allQuestions));

    return newQuiz;
  },

  deleteQuiz(quizId: number): boolean {
    const quizzes = this.getQuizzes().filter((q) => q.id !== quizId);
    localStorage.setItem(QUIZZES_STORAGE_KEY, JSON.stringify(quizzes));

    const rawQuestions = localStorage.getItem(QUESTIONS_STORAGE_KEY);
    if (rawQuestions) {
      const allQuestions: QuestionData[] = JSON.parse(rawQuestions);
      const filtered = allQuestions.filter((q) => q.quizId !== quizId);
      localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(filtered));
    }
    return true;
  },

  getAttempts(): AttemptRecord[] {
    if (typeof window === "undefined") return INITIAL_ATTEMPTS;
    try {
      const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(INITIAL_ATTEMPTS));
        return INITIAL_ATTEMPTS;
      }
      return JSON.parse(raw);
    } catch {
      return INITIAL_ATTEMPTS;
    }
  },

  saveAttempt(attempt: Omit<AttemptRecord, "id" | "completedAt">): AttemptRecord {
    const attempts = this.getAttempts();
    const newRecord: AttemptRecord = {
      ...attempt,
      id: Date.now(),
      completedAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...attempts];
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(updated));

    // Update study streak
    this.updateStreak();

    return newRecord;
  },

  updateStreak(): number {
    try {
      const today = new Date().toDateString();
      const lastStudy = localStorage.getItem("quizme_last_study_date");
      let streak = parseInt(localStorage.getItem(STREAK_STORAGE_KEY) || "1", 10);

      if (lastStudy !== today) {
        if (lastStudy) {
          const lastDate = new Date(lastStudy);
          const diffDays = Math.round((new Date(today).getTime() - lastDate.getTime()) / (86400000));
          if (diffDays === 1) {
            streak += 1;
          } else if (diffDays > 1) {
            streak = 1;
          }
        } else {
          streak = 1;
        }
        localStorage.setItem(STREAK_STORAGE_KEY, streak.toString());
        localStorage.setItem("quizme_last_study_date", today);
      }
      return streak;
    } catch {
      return 1;
    }
  },

  getStreak(): number {
    if (typeof window === "undefined") return 3;
    try {
      return parseInt(localStorage.getItem(STREAK_STORAGE_KEY) || "3", 10);
    } catch {
      return 3;
    }
  },

  recordSpacedReview(questionId: number, rating: RetentionRating): SpacedRepetitionItem {
    let progressMap: Record<number, SpacedRepetitionItem> = {};
    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (raw) progressMap = JSON.parse(raw);
    } catch {
      // Ignored
    }

    const existing = progressMap[questionId] || {
      questionId,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      masteryLevel: "new",
      lastReviewed: new Date().toISOString(),
      nextReview: new Date().toISOString(),
    };

    const calculated = calculateNextReview(
      {
        easeFactor: existing.easeFactor,
        intervalDays: existing.intervalDays,
        repetitions: existing.repetitions,
        masteryLevel: existing.masteryLevel,
      },
      rating
    );

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + calculated.intervalDays);

    const updatedItem: SpacedRepetitionItem = {
      questionId,
      easeFactor: calculated.easeFactor,
      intervalDays: calculated.intervalDays,
      repetitions: calculated.repetitions,
      masteryLevel: calculated.masteryLevel,
      lastReviewed: new Date().toISOString(),
      nextReview: nextDate.toISOString(),
    };

    progressMap[questionId] = updatedItem;
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressMap));

    return updatedItem;
  },

  generateTopicQuestions(topic: string, count: number = 5): QuestionData[] {
    const lowerTopic = topic.toLowerCase();
    let questionsPool: QuestionData[] = [];

    for (const [key, questions] of Object.entries(TOPIC_PRESETS)) {
      if (lowerTopic.includes(key) || key.includes(lowerTopic)) {
        questionsPool = [...questions];
        break;
      }
    }

    if (questionsPool.length === 0) {
      questionsPool = [
        {
          id: 920,
          quizId: 0,
          questionText: `In the field of ${topic}, what is considered the fundamental core principle or foundation?`,
          questionType: "multiple_choice",
          options: [
            `Systematic empirical observation and baseline validation within ${topic}`,
            `Heuristic intuition without verifiable reproducible evidence`,
            `Arbitrary convention determined purely by historical precedent`,
            `Exclusively qualitative speculation without structured frameworks`,
          ],
          correctAnswers: [`Systematic empirical observation and baseline validation within ${topic}`],
          explanation: `In ${topic}, foundational concepts rely on empirical evidence, clear definitions, and systematic frameworks for problem solving.`,
          hint: `Think about structured scientific methodology applied to ${topic}.`,
        },
        {
          id: 921,
          quizId: 0,
          questionText: `True or False: Best practices in ${topic} recommend proactive validation, modular architecture, and continuous evaluation to ensure long-term reliability.`,
          questionType: "true_false",
          options: ["True", "False"],
          correctAnswers: ["True"],
          explanation: `True! Modern standards across ${topic} emphasize modularity, rigorous testing, and iterative improvement over monolithic or untested workflows.`,
          hint: "Modularity and testing are almost universally beneficial.",
        },
        {
          id: 922,
          quizId: 0,
          questionText: `Select ALL critical factors required when implementing a robust strategy in ${topic}:`,
          questionType: "multi_select",
          options: [
            "Clear objective metrics and key performance indicators",
            "Continuous monitoring and error feedback loops",
            "Strict adherence to documentation and peer review",
            "Elimination of all logging and audit trails",
          ],
          correctAnswers: [
            "Clear objective metrics and key performance indicators",
            "Continuous monitoring and error feedback loops",
            "Strict adherence to documentation and peer review",
          ],
          explanation: `Objective metrics, monitoring feedback, and documentation are crucial for success in ${topic}. Disabling audit trails weakens security and traceability.`,
          hint: "Which choices promote visibility, accountability, and error recovery?",
        },
        {
          id: 923,
          quizId: 0,
          questionText: `What term describes the benchmark or standard against which all other results in ${topic} are compared?`,
          questionType: "fill_blank",
          options: ["Baseline", "Control"],
          correctAnswers: ["Baseline", "Control", "Benchmark", "Gold standard"],
          explanation: `A baseline or control serves as the standard comparison metric to evaluate changes, improvements, or experimental deviations in ${topic}.`,
          hint: "A starting point or reference measurement.",
        },
        {
          id: 924,
          quizId: 0,
          questionText: `Which approach is most effective for diagnosing anomalies or failures in complex ${topic} systems?`,
          questionType: "multiple_choice",
          options: [
            "Root Cause Analysis (RCA) through systematic isolation and telemetry logs",
            "Randomly resetting system parameters until the symptom disappears",
            "Ignoring telemetry warnings unless total system downtime occurs",
            "Assuming initial assumptions were correct without re-evaluating evidence",
          ],
          correctAnswers: ["Root Cause Analysis (RCA) through systematic isolation and telemetry logs"],
          explanation:
            "Systematic isolation, logging analysis, and RCA identify the underlying failure mechanism rather than merely masking superficial symptoms.",
          hint: "Think about scientific diagnostics and root causes.",
        },
      ];
    }

    const requestedCount = Math.min(Math.max(count || 5, 3), 10);
    return questionsPool.slice(0, requestedCount);
  },
};
