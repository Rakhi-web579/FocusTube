import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { searchVideos } from '../services/api';

// Entertainment keywords for rabbit-hole detection
const ENTERTAINMENT_KEYWORDS = [
  'prank', 'meme', 'funny', 'song', 'music', 'vlog', 'reaction',
  'challenge', 'compilation', 'fail', 'viral', 'gaming', 'unboxing',
  'haul', 'storytime', 'drama', 'roast', 'minecraft', 'fortnite',
  'tiktok', 'shorts', 'asmr', 'beef', 'exposed', 'clickbait'
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have',
  'will', 'what', 'how', 'why', 'when', 'where', 'who', 'are',
  'was', 'were', 'been', 'being', 'into', 'than', 'then', 'they',
  'them', 'their', 'there', 'about', 'which', 'while', 'your',
  'learn', 'study', 'tutorial', 'course', 'video', 'watch',
  'questions', 'question', 'complete', 'full', 'using', 'use'
]);

const SUBJECT_MAP = {

  // ── Computer Science Core ──────────────────────────────────────────
  dsa: [
    'array', 'arrays', 'linked', 'list', 'stack', 'queue', 'tree',
    'trees', 'graph', 'graphs', 'heap', 'hash', 'binary', 'sort',
    'sorting', 'search', 'searching', 'recursion', 'dynamic',
    'programming', 'algorithm', 'algorithms', 'complexity', 'pointer',
    'node', 'traversal', 'bfs', 'dfs', 'greedy', 'backtrack',
    'divide', 'conquer', 'trie', 'segment', 'matrix', 'string',
    'two pointer', 'sliding window', 'bit manipulation', 'dp',
    'memoization', 'tabulation', 'kadane', 'dijkstra', 'kruskal',
    'prim', 'bellman', 'floyd', 'topological', 'union find'
  ],

  'data structures': [
    'array', 'linked', 'list', 'stack', 'queue', 'tree', 'graph',
    'heap', 'hash', 'binary', 'node', 'pointer', 'traversal', 'trie',
    'deque', 'priority queue', 'set', 'map', 'dictionary'
  ],

  algorithms: [
    'sort', 'search', 'binary', 'recursion', 'dynamic', 'greedy',
    'backtrack', 'divide', 'conquer', 'complexity', 'bfs', 'dfs',
    'graph', 'tree', 'hash', 'two pointer', 'sliding window',
    'bubble sort', 'merge sort', 'quick sort', 'heap sort',
    'insertion sort', 'selection sort', 'counting sort', 'radix sort',
    'linear search', 'binary search', 'depth first', 'breadth first'
  ],

  'operating systems': [
    'os', 'kernel', 'process', 'thread', 'memory', 'scheduling',
    'deadlock', 'semaphore', 'mutex', 'virtual memory', 'paging',
    'segmentation', 'file system', 'inode', 'unix', 'linux',
    'windows', 'shell', 'bash', 'system call', 'interrupt',
    'cpu', 'cache', 'pipeline', 'concurrency', 'parallelism',
    'context switch', 'race condition', 'critical section',
    'producer consumer', 'page fault', 'thrashing', 'swapping'
  ],

  'computer architecture': [
    'cpu', 'processor', 'memory', 'cache', 'register', 'alu',
    'instruction', 'assembly', 'binary', 'logic', 'gate', 'circuit',
    'boolean', 'flip flop', 'pipeline', 'risc', 'cisc', 'arm',
    'x86', 'clock', 'bus', 'ram', 'rom', 'storage', 'bits', 'bytes',
    'fetch', 'decode', 'execute', 'interrupt', 'addressing', 'mips'
  ],

  'software engineering': [
    'design pattern', 'solid', 'agile', 'scrum', 'git', 'testing',
    'unit test', 'integration', 'deployment', 'docker', 'kubernetes',
    'microservices', 'api', 'rest', 'architecture', 'refactoring',
    'code review', 'debugging', 'logging', 'cicd', 'devops',
    'singleton', 'factory', 'observer', 'mvc', 'mvvm', 'dry',
    'coupling', 'cohesion', 'inheritance', 'polymorphism', 'abstraction'
  ],

  cybersecurity: [
    'security', 'hacking', 'ethical', 'penetration', 'pentest',
    'vulnerability', 'exploit', 'malware', 'firewall', 'encryption',
    'cryptography', 'cipher', 'hash', 'ssl', 'tls', 'https',
    'authentication', 'authorization', 'injection', 'xss', 'csrf',
    'sql injection', 'buffer overflow', 'reverse engineering',
    'forensics', 'kali', 'linux', 'nmap', 'metasploit', 'wireshark',
    'packet', 'phishing', 'ransomware', 'trojan', 'worm',
    'zero day', 'ctf', 'capture the flag', 'oscp', 'owasp',
    'steganography', 'brute force', 'dictionary attack', 'social engineering'
  ],

  networking: [
    'network', 'tcp', 'ip', 'udp', 'http', 'https', 'dns', 'dhcp',
    'router', 'switch', 'firewall', 'subnet', 'subnetting', 'cidr',
    'osi', 'model', 'layer', 'protocol', 'packet', 'socket',
    'bandwidth', 'latency', 'topology', 'ethernet', 'wifi',
    'wireless', 'vpn', 'proxy', 'nat', 'port', 'mac', 'address',
    'gateway', 'routing', 'bgp', 'ospf', 'vlan', 'load balancer',
    'cdn', 'http2', 'websocket', 'ssh', 'ftp', 'smtp', 'imap',
    'ssl', 'tls', 'handshake', 'three way', 'ping', 'traceroute',
    'arp', 'icmp', 'ipv4', 'ipv6', 'lan', 'wan', 'man'
  ],

  // ── Web & App Development ──────────────────────────────────────────
  react: [
    'component', 'hook', 'hooks', 'usestate', 'useeffect', 'props',
    'redux', 'jsx', 'frontend', 'javascript', 'typescript', 'state',
    'context', 'router', 'next', 'vite', 'webpack', 'rendering',
    'virtual', 'dom', 'lifecycle', 'ref', 'memo', 'callback',
    'usereducer', 'usecontext', 'useref', 'custom hook', 'suspense',
    'lazy loading', 'code splitting', 'react query', 'zustand'
  ],

  javascript: [
    'closure', 'promise', 'async', 'await', 'callback', 'prototype',
    'scope', 'hoisting', 'event', 'dom', 'fetch', 'arrow', 'function',
    'class', 'module', 'import', 'export', 'array', 'object', 'map',
    'filter', 'reduce', 'spread', 'destructure', 'typescript', 'node',
    'event loop', 'call stack', 'heap', 'closure', 'currying',
    'higher order', 'generator', 'iterator', 'symbol', 'proxy',
    'regex', 'error handling', 'try catch', 'this keyword'
  ],

  typescript: [
    'type', 'interface', 'generic', 'enum', 'tuple', 'union',
    'intersection', 'type guard', 'decorator', 'namespace',
    'module', 'strict', 'any', 'unknown', 'never', 'void',
    'optional', 'readonly', 'utility types', 'mapped types',
    'conditional types', 'infer', 'keyof', 'typeof'
  ],

  'web development': [
    'html', 'css', 'javascript', 'frontend', 'backend', 'fullstack',
    'api', 'rest', 'database', 'server', 'client', 'http', 'browser',
    'responsive', 'bootstrap', 'tailwind', 'node', 'express', 'react',
    'dom', 'flexbox', 'grid', 'animation', 'accessibility', 'seo',
    'performance', 'progressive', 'web app', 'pwa', 'service worker'
  ],

  nodejs: [
    'node', 'express', 'npm', 'package', 'middleware', 'route',
    'server', 'api', 'rest', 'http', 'request', 'response',
    'async', 'callback', 'stream', 'buffer', 'event', 'emitter',
    'module', 'require', 'fs', 'path', 'process', 'environment',
    'mongoose', 'sequelize', 'jwt', 'authentication', 'cors'
  ],

  // ── Programming Languages ──────────────────────────────────────────
  python: [
    'django', 'flask', 'pandas', 'numpy', 'matplotlib', 'scikit',
    'tensorflow', 'pytorch', 'list', 'dict', 'tuple', 'class',
    'function', 'lambda', 'generator', 'decorator', 'module',
    'package', 'pip', 'virtual', 'environment', 'script',
    'comprehension', 'iterator', 'context manager', 'threading',
    'multiprocessing', 'regex', 'json', 'csv', 'file handling',
    'exception', 'inheritance', 'polymorphism', 'fastapi'
  ],

  java: [
    'class', 'object', 'inheritance', 'polymorphism', 'abstraction',
    'encapsulation', 'interface', 'abstract', 'static', 'final',
    'exception', 'thread', 'collection', 'arraylist', 'hashmap',
    'spring', 'maven', 'gradle', 'jvm', 'bytecode', 'garbage',
    'collection', 'stream', 'lambda', 'optional', 'generics',
    'annotation', 'reflection', 'serialization', 'jdbc', 'hibernate'
  ],

  cpp: [
    'pointer', 'reference', 'memory', 'allocation', 'vector',
    'string', 'class', 'object', 'template', 'stl', 'iterator',
    'inheritance', 'virtual', 'polymorphism', 'destructor',
    'constructor', 'overloading', 'operator', 'namespace', 'header',
    'compile', 'linker', 'makefile', 'cmake', 'stack', 'heap',
    'smart pointer', 'unique ptr', 'shared ptr', 'move semantics'
  ],

  'c programming': [
    'pointer', 'array', 'string', 'struct', 'union', 'enum',
    'malloc', 'free', 'calloc', 'realloc', 'memory', 'allocation',
    'function', 'recursion', 'file', 'stdio', 'header', 'macro',
    'preprocessor', 'bitwise', 'operator', 'typedef', 'cast',
    'stack', 'heap', 'buffer', 'overflow', 'segfault'
  ],

  // ── Data & AI ──────────────────────────────────────────────────────
  'machine learning': [
    'neural', 'network', 'deep', 'learning', 'model', 'training',
    'classification', 'regression', 'clustering', 'cnn', 'rnn',
    'lstm', 'transformer', 'gradient', 'backprop', 'dataset',
    'feature', 'supervised', 'unsupervised', 'reinforcement', 'nlp',
    'overfitting', 'underfitting', 'regularization', 'dropout',
    'activation', 'loss function', 'optimizer', 'epoch', 'batch',
    'cross validation', 'confusion matrix', 'precision', 'recall'
  ],

  'data science': [
    'pandas', 'numpy', 'matplotlib', 'seaborn', 'scikit', 'scipy',
    'statistics', 'probability', 'hypothesis', 'regression',
    'classification', 'clustering', 'visualization', 'eda',
    'exploratory', 'analysis', 'cleaning', 'preprocessing',
    'feature engineering', 'correlation', 'distribution',
    'jupyter', 'notebook', 'kaggle', 'dataset', 'model'
  ],

  'artificial intelligence': [
    'ai', 'machine learning', 'deep learning', 'neural network',
    'nlp', 'computer vision', 'reinforcement', 'expert system',
    'search algorithm', 'heuristic', 'minimax', 'alpha beta',
    'knowledge base', 'inference', 'fuzzy logic', 'genetic',
    'algorithm', 'swarm', 'intelligence', 'planning', 'reasoning'
  ],

  // ── Database ───────────────────────────────────────────────────────
  database: [
    'sql', 'mysql', 'postgresql', 'mongodb', 'nosql', 'query',
    'table', 'schema', 'index', 'join', 'transaction', 'crud',
    'normalization', 'redis', 'firebase', 'aggregate', 'collection',
    'primary key', 'foreign key', 'constraint', 'trigger', 'view',
    'stored procedure', 'acid', 'cap theorem', 'sharding',
    'replication', 'partitioning', 'orm', 'er diagram'
  ],

  // ── Cloud & DevOps ─────────────────────────────────────────────────
  'cloud computing': [
    'aws', 'azure', 'gcp', 'cloud', 'serverless', 'lambda',
    'docker', 'kubernetes', 'container', 'virtual machine',
    'storage', 'bucket', 's3', 'ec2', 'deployment', 'scaling',
    'load balancer', 'cdn', 'iaas', 'paas', 'saas', 'devops',
    'terraform', 'ansible', 'jenkins', 'cicd', 'pipeline',
    'monitoring', 'logging', 'cloudfront', 'rds', 'dynamodb'
  ],

  devops: [
    'docker', 'kubernetes', 'jenkins', 'git', 'cicd', 'pipeline',
    'ansible', 'terraform', 'monitoring', 'logging', 'deployment',
    'container', 'orchestration', 'helm', 'prometheus', 'grafana',
    'nginx', 'apache', 'linux', 'shell', 'bash', 'scripting',
    'automation', 'infrastructure', 'code', 'version control'
  ],

  // ── Mathematics ────────────────────────────────────────────────────
  math: [
    'calculus', 'algebra', 'geometry', 'trigonometry', 'derivative',
    'integral', 'matrix', 'vector', 'statistics', 'probability',
    'theorem', 'proof', 'equation', 'function', 'limit', 'series',
    'polynomial', 'linear', 'differential', 'discrete', 'number theory',
    'combinatorics', 'permutation', 'combination', 'set theory',
    'graph theory', 'topology', 'real analysis', 'complex numbers'
  ],

  'linear algebra': [
    'matrix', 'vector', 'eigenvalue', 'eigenvector', 'determinant',
    'transpose', 'inverse', 'rank', 'null space', 'span',
    'basis', 'linear transformation', 'dot product', 'cross product',
    'orthogonal', 'projection', 'singular value', 'decomposition'
  ],

  calculus: [
    'derivative', 'integral', 'limit', 'continuity', 'differential',
    'partial', 'gradient', 'divergence', 'curl', 'series',
    'taylor', 'maclaurin', 'fourier', 'laplace', 'chain rule',
    'product rule', 'quotient rule', 'fundamental theorem',
    'riemann', 'improper integral', 'multivariable'
  ],

  statistics: [
    'mean', 'median', 'mode', 'variance', 'standard deviation',
    'probability', 'distribution', 'normal', 'binomial', 'poisson',
    'hypothesis', 'testing', 'confidence', 'interval', 'regression',
    'correlation', 'sampling', 'bayes', 'theorem', 'random variable',
    'expected value', 'central limit', 'chi square', 'anova'
  ],

  // ── Sciences ───────────────────────────────────────────────────────
  physics: [
    'mechanics', 'thermodynamics', 'quantum', 'relativity', 'wave',
    'optics', 'electromagnetism', 'force', 'energy', 'motion',
    'gravity', 'nuclear', 'particle', 'circuit', 'field', 'magnetic',
    'velocity', 'acceleration', 'momentum', 'torque', 'friction',
    'newton', 'einstein', 'schrodinger', 'heisenberg', 'entropy',
    'pressure', 'temperature', 'ideal gas', 'fluid', 'dynamics'
  ],

  chemistry: [
    'atom', 'molecule', 'element', 'compound', 'reaction', 'bond',
    'ionic', 'covalent', 'periodic', 'table', 'electron', 'proton',
    'neutron', 'orbital', 'valence', 'acid', 'base', 'ph',
    'oxidation', 'reduction', 'equilibrium', 'kinetics', 'entropy',
    'enthalpy', 'organic', 'inorganic', 'polymer', 'catalyst',
    'stoichiometry', 'mole', 'concentration', 'titration'
  ],

  biology: [
    'cell', 'dna', 'rna', 'protein', 'gene', 'genetics', 'evolution',
    'natural selection', 'mutation', 'chromosome', 'mitosis', 'meiosis',
    'photosynthesis', 'respiration', 'ecosystem', 'organism',
    'taxonomy', 'anatomy', 'physiology', 'neuron', 'synapse',
    'hormone', 'enzyme', 'metabolism', 'membrane', 'organelle',
    'bacteria', 'virus', 'immune', 'antibody', 'vaccine'
  ],

  // ── Engineering ────────────────────────────────────────────────────
  'electrical engineering': [
    'circuit', 'voltage', 'current', 'resistance', 'capacitor',
    'inductor', 'transistor', 'diode', 'amplifier', 'filter',
    'signal', 'frequency', 'oscillator', 'op amp', 'logic gate',
    'digital', 'analog', 'microcontroller', 'arduino', 'raspberry',
    'pcb', 'semiconductor', 'fourier', 'laplace', 'bode plot'
  ],

  'mechanical engineering': [
    'statics', 'dynamics', 'mechanics', 'thermodynamics', 'fluid',
    'heat transfer', 'material', 'stress', 'strain', 'beam',
    'truss', 'vibration', 'cad', 'solidworks', 'ansys', 'finite element',
    'manufacturing', 'tolerance', 'fatigue', 'fracture', 'gear',
    'bearing', 'shaft', 'engine', 'turbine', 'compressor'
  ],

  // ── Humanities & Social Sciences ───────────────────────────────────
  history: [
    'war', 'revolution', 'empire', 'civilization', 'ancient',
    'medieval', 'colonialism', 'renaissance', 'industrial',
    'world war', 'cold war', 'independence', 'democracy', 'monarchy',
    'republic', 'constitution', 'treaty', 'battle', 'dynasty',
    'pharaoh', 'roman', 'greek', 'ottoman', 'mughal', 'british'
  ],

  economics: [
    'supply', 'demand', 'market', 'price', 'inflation', 'gdp',
    'micro', 'macro', 'elasticity', 'equilibrium', 'monopoly',
    'competition', 'trade', 'tariff', 'fiscal', 'monetary',
    'policy', 'interest rate', 'investment', 'consumption',
    'production', 'cost', 'revenue', 'profit', 'utility',
    'keynesian', 'neoclassical', 'game theory', 'behavioral'
  ],

  psychology: [
    'behavior', 'cognition', 'emotion', 'memory', 'perception',
    'consciousness', 'unconscious', 'personality', 'development',
    'social', 'clinical', 'therapy', 'disorder', 'anxiety',
    'depression', 'motivation', 'learning', 'conditioning',
    'pavlov', 'freud', 'piaget', 'maslow', 'cognitive bias',
    'experiment', 'research', 'neuroscience', 'brain'
  ],

  philosophy: [
    'ethics', 'logic', 'metaphysics', 'epistemology', 'aesthetics',
    'consciousness', 'existence', 'reality', 'truth', 'knowledge',
    'morality', 'justice', 'freedom', 'determinism', 'empiricism',
    'rationalism', 'plato', 'aristotle', 'kant', 'nietzsche',
    'socrates', 'argument', 'fallacy', 'reasoning', 'paradox'
  ],

  // ── Language & Communication ───────────────────────────────────────
  english: [
    'grammar', 'vocabulary', 'writing', 'essay', 'reading',
    'comprehension', 'literature', 'poetry', 'prose', 'tense',
    'verb', 'noun', 'adjective', 'adverb', 'preposition',
    'punctuation', 'paragraph', 'thesis', 'argument', 'rhetoric',
    'ielts', 'toefl', 'gre', 'communication', 'speaking'
  ],

  // ── Finance & Business ─────────────────────────────────────────────
  finance: [
    'stock', 'bond', 'market', 'investment', 'portfolio', 'risk',
    'return', 'dividend', 'equity', 'debt', 'valuation', 'dcf',
    'balance sheet', 'income statement', 'cash flow', 'ratio',
    'liquidity', 'solvency', 'leverage', 'hedge', 'derivative',
    'option', 'future', 'forex', 'cryptocurrency', 'blockchain',
    'compound interest', 'time value', 'npv', 'irr', 'wacc'
  ],

  // ── Competitive Programming ────────────────────────────────────────
  'competitive programming': [
    'codeforces', 'leetcode', 'hackerrank', 'codechef', 'atcoder',
    'contest', 'competitive', 'problem solving', 'time limit',
    'space complexity', 'optimization', 'greedy', 'dp', 'graph',
    'tree', 'binary search', 'two pointer', 'segment tree',
    'fenwick', 'bit', 'number theory', 'combinatorics', 'geometry'
  ],

};

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function buildTermFrequency(tokens) {
  const tf = {};
  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1;
  });
  const total = tokens.length || 1;
  Object.keys(tf).forEach(k => tf[k] = tf[k] / total);
  return tf;
}

function cosineSimilarity(tf1, tf2) {
  const allTerms = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  allTerms.forEach(term => {
    const v1 = tf1[term] || 0;
    const v2 = tf2[term] || 0;
    dotProduct += v1 * v2;
    magnitude1 += v1 * v1;
    magnitude2 += v2 * v2;
  });

  const denominator = Math.sqrt(magnitude1) * Math.sqrt(magnitude2);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

function subjectMapScore(query, goal) {
  const queryLower = query.toLowerCase();
  const goalLower = goal.toLowerCase();

  for (const [subject, relatedTerms] of Object.entries(SUBJECT_MAP)) {
    const goalMentionsSubject =
      goalLower.includes(subject) ||
      relatedTerms.some(term => goalLower.includes(term));

    const queryMentionsTerm =
      queryLower.includes(subject) ||
      relatedTerms.some(term => queryLower.includes(term));

    if (goalMentionsSubject && queryMentionsTerm) return true;
  }
  return false;
}

function isRelatedToGoal(query, goal) {
  if (!goal) return true;

  const queryTokens = tokenize(query);
  const goalTokens = tokenize(goal);

  const queryTF = buildTermFrequency(queryTokens);
  const goalTF = buildTermFrequency(goalTokens);

  const similarity = cosineSimilarity(queryTF, goalTF);
  const isSubjectRelated = subjectMapScore(query, goal);
  const hasEntertainment = ENTERTAINMENT_KEYWORDS.some(kw =>
    query.toLowerCase().includes(kw)
  );

  if (hasEntertainment) return false;
  if (isSubjectRelated) return true;
  return similarity >= 0.08;
}

function VideoCard({ video, onWatch }) {
  return (
    <div
      className="bg-dark-800 border border-dark-500 rounded-xl overflow-hidden hover:border-dark-400 transition-all group animate-slide-up cursor-pointer"
      onClick={() => onWatch(video)}
    >
      <div className="relative">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full aspect-video object-cover group-hover:opacity-90 transition-opacity"
          onError={(e) => { e.target.src = `https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`; }}
        />
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded font-mono">
          {video.duration}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-white text-sm font-medium line-clamp-2 mb-2 leading-snug group-hover:text-green-400 transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-dark-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/>
              </svg>
            </div>
            <span className="text-gray-500 text-xs truncate max-w-32">{video.channel_name}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onWatch(video); }}
            className="bg-green-500 hover:bg-green-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:shadow-md hover:shadow-green-500/20 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Watch
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const { session, updateSession } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRabbitHoleWarning, setShowRabbitHoleWarning] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [apiNote, setApiNote] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (session.goal) {
      setQuery(session.goal);
      performSearch(session.goal, true);
    }
    inputRef.current?.focus();
  }, []);

  const performSearch = async (searchQuery, isInitial = false) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const data = await searchVideos(searchQuery, session.goal);
      setResults(data.results || []);
      if (data.note) setApiNote(data.note);
    } catch (err) {
      setError('Failed to search. Make sure the backend is running and your YouTube API key is configured.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!query.trim()) return;

    if (session.goal && !isRelatedToGoal(query, session.goal)) {
      setPendingSearch(query);
      setShowRabbitHoleWarning(true);
      return;
    }

    performSearch(query);
  };

  const handleWatch = (video) => {
    updateSession({
      videoId: video.video_id,
      videoTitle: video.title,
      channelName: video.channel_name,
    });
    navigate(`/player/${video.video_id}`);
  };

  return (
    <div className="min-h-screen bg-dark-900">

      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur border-b border-dark-600">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">FocusTube</span>
          </div>

          {/* Search bar */}
          <div className="flex-1 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search educational videos..."
              className="flex-1 bg-dark-700 border border-dark-400 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black px-4 py-2 rounded-xl text-sm font-bold transition-all"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Goal banner */}
        {session.goal && (
          <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3 mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
            <span className="text-sm text-gray-300">
              Study goal: <span className="text-green-400 font-medium">{session.goal}</span>
            </span>
            <span className="ml-auto text-xs text-gray-600 timer-display font-bold">
              {session.focusDuration} min
            </span>
          </div>
        )}

        {/* API note banner */}
        {apiNote && (
          <div className="flex items-center gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 mb-6">
            <span className="text-yellow-400 text-sm">⚠ {apiNote}</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-dark-600" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-dark-600 rounded w-full" />
                  <div className="h-4 bg-dark-600 rounded w-2/3" />
                  <div className="h-3 bg-dark-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-400">
                {results.length} educational results
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Filtered for learning
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((video, i) => (
                <VideoCard key={video.video_id || i} video={video} onWatch={handleWatch} />
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-400 text-sm">No educational results found.</p>
            <p className="text-gray-600 text-xs mt-1">Try a more specific programming or academic topic.</p>
          </div>
        )}

        {/* Default state */}
        {!loading && !hasSearched && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-400">Search for a topic to find educational videos</p>
            <p className="text-gray-600 text-xs mt-2">Results are filtered to show lectures and tutorials only</p>
          </div>
        )}

      </main>

      {/* Rabbit hole warning modal */}
      {showRabbitHoleWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-yellow-500/40 rounded-2xl p-6 max-w-sm w-full animate-slide-up">
            <div className="text-3xl mb-3">🐰</div>
            <h3 className="text-white font-bold text-lg mb-2">Rabbit Hole Detected!</h3>
            <p className="text-gray-400 text-sm mb-2">
              Your search <span className="text-yellow-400 font-medium">"{pendingSearch}"</span> is
              unrelated to your study goal:
            </p>
            <p className="text-green-400 text-sm font-medium mb-3">"{session.goal}"</p>
            <p className="text-gray-500 text-xs mb-5">
              Stay on track. Only searches related to your goal are allowed during a focus session.
            </p>
            <button
              onClick={() => {
                setShowRabbitHoleWarning(false);
                setQuery(session.goal);
              }}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              Stay Focused ✓
            </button>
          </div>
        </div>
      )}

    </div>
  );
}