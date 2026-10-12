// Database Domain Types, Schema Contracts, and Unified IDatabase Interface

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  targetRole: string;
  experienceLevel: 'Entry-Level' | 'Student / Intern' | 'Mid-Level' | 'Career Switcher';
  skills: string[];
  education: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeAnalysis {
  id: string;
  userId: string;
  fileName: string;
  targetJobRole: string;
  targetJobDescription: string;
  matchScore: number;
  atsScore: number;
  identifiedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  suggestedImprovements: string[];
  keywordRecommendations: string[];
  summary: string;
  createdAt: string;
}

export type JobStatus = 'Saved' | 'Applied' | 'Assessment' | 'Interview' | 'Offer' | 'Rejected';

export interface JobApplication {
  id: string;
  userId: string;
  company: string;
  role: string;
  postingUrl?: string;
  location: string;
  status: JobStatus;
  applicationDate: string;
  salary?: string;
  notes?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type InterviewCategory = 'HR' | 'Technical' | 'SQL' | 'Python' | 'DSA Fundamentals' | 'System Design';
export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface InterviewQuestionItem {
  id: string;
  question: string;
  category: string;
  expectedKeyPoints?: string[];
  userAnswer?: string;
  voiceRecorded?: boolean;
  score?: number;
  feedback?: {
    relevance: number;
    clarity: number;
    structure: number;
    technicalCorrectness: number;
    strengths: string[];
    improvements: string[];
    summary: string;
  };
}

export interface InterviewSession {
  id: string;
  userId: string;
  targetRole: string;
  experienceLevel: string;
  category: InterviewCategory;
  difficulty: InterviewDifficulty;
  questionsCount: number;
  status: 'in_progress' | 'completed';
  questions: InterviewQuestionItem[];
  overallScore?: number;
  overallSummary?: string;
  createdAt: string;
  completedAt?: string;
}

export type DsaCategory = 
  | 'Arrays & Hashing' 
  | 'Two Pointers' 
  | 'Sliding Window' 
  | 'Stack & Queue' 
  | 'Binary Search' 
  | 'Linked List' 
  | 'Trees & BST' 
  | 'Graphs' 
  | 'Dynamic Programming';

export type DsaDifficulty = 'Easy' | 'Medium' | 'Hard';
export type DsaStatus = 'Not Started' | 'In Progress' | 'Solved';

export interface DsaProblem {
  id: string;
  title: string;
  category: DsaCategory;
  difficulty: DsaDifficulty;
  leetcodeNumber?: number;
  practiceUrl: string;
  pattern: string;
}

export interface UserDsaProgress {
  id: string;
  userId: string;
  problemId: string;
  status: DsaStatus;
  notes?: string;
  isBookmarked: boolean;
  solvedAt?: string;
  lastRevisedAt?: string;
  updatedAt: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  action:
    | 'resume_uploaded'
    | 'application_status_changed'
    | 'application_created'
    | 'interview_completed'
    | 'interview_started'
    | 'dsa_solved';
  title: string;
  description: string;
  type: 'resume' | 'job' | 'interview' | 'dsa';
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface DatabaseSchema {
  users: User[];
  resumes: ResumeAnalysis[];
  jobs: JobApplication[];
  interviews: InterviewSession[];
  dsaProblems: DsaProblem[];
  dsaProgress: UserDsaProgress[];
  activities: UserActivity[];
}

export const DEFAULT_DSA_PROBLEMS: DsaProblem[] = [
  { id: 'dsa-1', title: 'Two Sum', category: 'Arrays & Hashing', difficulty: 'Easy', leetcodeNumber: 1, practiceUrl: 'https://leetcode.com/problems/two-sum/', pattern: 'Hash Map Lookup' },
  { id: 'dsa-2', title: 'Valid Anagram', category: 'Arrays & Hashing', difficulty: 'Easy', leetcodeNumber: 242, practiceUrl: 'https://leetcode.com/problems/valid-anagram/', pattern: 'Frequency Counter' },
  { id: 'dsa-3', title: 'Group Anagrams', category: 'Arrays & Hashing', difficulty: 'Medium', leetcodeNumber: 49, practiceUrl: 'https://leetcode.com/problems/group-anagrams/', pattern: 'Categorization with Hash Table' },
  { id: 'dsa-4', title: 'Top K Frequent Elements', category: 'Arrays & Hashing', difficulty: 'Medium', leetcodeNumber: 347, practiceUrl: 'https://leetcode.com/problems/top-k-frequent-elements/', pattern: 'Bucket Sort / Min-Heap' },
  { id: 'dsa-5', title: 'Valid Palindrome', category: 'Two Pointers', difficulty: 'Easy', leetcodeNumber: 125, practiceUrl: 'https://leetcode.com/problems/valid-palindrome/', pattern: 'Converging Two Pointers' },
  { id: 'dsa-6', title: '3Sum', category: 'Two Pointers', difficulty: 'Medium', leetcodeNumber: 15, practiceUrl: 'https://leetcode.com/problems/3sum/', pattern: 'Sorting + Two Pointers' },
  { id: 'dsa-7', title: 'Container With Most Water', category: 'Two Pointers', difficulty: 'Medium', leetcodeNumber: 11, practiceUrl: 'https://leetcode.com/problems/container-with-most-water/', pattern: 'Greedy Two Pointers' },
  { id: 'dsa-8', title: 'Best Time to Buy and Sell Stock', category: 'Sliding Window', difficulty: 'Easy', leetcodeNumber: 121, practiceUrl: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', pattern: 'Track Running Minimum' },
  { id: 'dsa-9', title: 'Longest Substring Without Repeating Characters', category: 'Sliding Window', difficulty: 'Medium', leetcodeNumber: 3, practiceUrl: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', pattern: 'Dynamic Sliding Window' },
  { id: 'dsa-10', title: 'Valid Parentheses', category: 'Stack & Queue', difficulty: 'Easy', leetcodeNumber: 20, practiceUrl: 'https://leetcode.com/problems/valid-parentheses/', pattern: 'LIFO Stack Matching' },
  { id: 'dsa-11', title: 'Min Stack', category: 'Stack & Queue', difficulty: 'Medium', leetcodeNumber: 155, practiceUrl: 'https://leetcode.com/problems/min-stack/', pattern: 'Auxiliary Stack' },
  { id: 'dsa-12', title: 'Binary Search', category: 'Binary Search', difficulty: 'Easy', leetcodeNumber: 704, practiceUrl: 'https://leetcode.com/problems/binary-search/', pattern: 'Search Space Halving' },
  { id: 'dsa-13', title: 'Search in Rotated Sorted Array', category: 'Binary Search', difficulty: 'Medium', leetcodeNumber: 33, practiceUrl: 'https://leetcode.com/problems/search-in-rotated-sorted-array/', pattern: 'Modified Binary Search' },
  { id: 'dsa-14', title: 'Reverse Linked List', category: 'Linked List', difficulty: 'Easy', leetcodeNumber: 206, practiceUrl: 'https://leetcode.com/problems/reverse-linked-list/', pattern: 'Three Pointers (Prev, Curr, Next)' },
  { id: 'dsa-15', title: 'Merge Two Sorted Lists', category: 'Linked List', difficulty: 'Easy', leetcodeNumber: 21, practiceUrl: 'https://leetcode.com/problems/merge-two-sorted-lists/', pattern: 'Dummy Head Pointer' },
  { id: 'dsa-16', title: 'Linked List Cycle', category: 'Linked List', difficulty: 'Easy', leetcodeNumber: 141, practiceUrl: 'https://leetcode.com/problems/linked-list-cycle/', pattern: "Floyd's Fast & Slow Pointers" },
  { id: 'dsa-17', title: 'Maximum Depth of Binary Tree', category: 'Trees & BST', difficulty: 'Easy', leetcodeNumber: 104, practiceUrl: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/', pattern: 'Recursive DFS' },
  { id: 'dsa-18', title: 'Invert Binary Tree', category: 'Trees & BST', difficulty: 'Easy', leetcodeNumber: 226, practiceUrl: 'https://leetcode.com/problems/invert-binary-tree/', pattern: 'Tree Traversal & Swap' },
  { id: 'dsa-19', title: 'Validate Binary Search Tree', category: 'Trees & BST', difficulty: 'Medium', leetcodeNumber: 98, practiceUrl: 'https://leetcode.com/problems/validate-binary-search-tree/', pattern: 'Bounded Inorder DFS' },
  { id: 'dsa-20', title: 'Lowest Common Ancestor of a BST', category: 'Trees & BST', difficulty: 'Medium', leetcodeNumber: 235, practiceUrl: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/', pattern: 'BST Value Traversal' },
  { id: 'dsa-21', title: 'Number of Islands', category: 'Graphs', difficulty: 'Medium', leetcodeNumber: 200, practiceUrl: 'https://leetcode.com/problems/number-of-islands/', pattern: '2D Grid BFS / DFS' },
  { id: 'dsa-22', title: 'Clone Graph', category: 'Graphs', difficulty: 'Medium', leetcodeNumber: 133, practiceUrl: 'https://leetcode.com/problems/clone-graph/', pattern: 'DFS with Visited Hash Map' },
  { id: 'dsa-23', title: 'Climbing Stairs', category: 'Dynamic Programming', difficulty: 'Easy', leetcodeNumber: 70, practiceUrl: 'https://leetcode.com/problems/climbing-stairs/', pattern: 'Fibonacci Recurrence' },
  { id: 'dsa-24', title: 'Coin Change', category: 'Dynamic Programming', difficulty: 'Medium', leetcodeNumber: 322, practiceUrl: 'https://leetcode.com/problems/coin-change/', pattern: 'Bottom-up Unbounded Knapsack' },
  { id: 'dsa-25', title: 'Longest Increasing Subsequence', category: 'Dynamic Programming', difficulty: 'Medium', leetcodeNumber: 300, practiceUrl: 'https://leetcode.com/problems/longest-increasing-subsequence/', pattern: '1D DP or Patience Sorting' },
];

/**
 * Universal Database Interface implemented by both PostgreSQL (Cloud SQL) and JSON fallback adapters.
 */
export interface IDatabase {
  // Lifecycle & Diagnostics
  init(): Promise<void>;
  checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; type: 'postgres' | 'json'; isReady?: boolean; error?: string }>;
  close?(): Promise<void>;

  // User Management
  getUsers(): Promise<User[]>;
  findUserById(id: string): Promise<User | undefined>;
  findUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: User): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;

  // Resume Analyses
  getResumesByUser(userId: string): Promise<ResumeAnalysis[]>;
  findResumeById(id: string, userId: string): Promise<ResumeAnalysis | undefined>;
  createResume(resume: ResumeAnalysis): Promise<ResumeAnalysis>;
  deleteResume(id: string, userId: string): Promise<boolean>;

  // Job Applications
  getJobsByUser(userId: string): Promise<JobApplication[]>;
  findJobById(id: string, userId: string): Promise<JobApplication | undefined>;
  createJob(job: JobApplication): Promise<JobApplication>;
  updateJob(id: string, userId: string, updates: Partial<JobApplication>): Promise<JobApplication | null>;
  deleteJob(id: string, userId: string): Promise<boolean>;

  // Mock Interviews
  getInterviewsByUser(userId: string): Promise<InterviewSession[]>;
  findInterviewById(id: string, userId: string): Promise<InterviewSession | undefined>;
  createInterview(interview: InterviewSession): Promise<InterviewSession>;
  updateInterview(id: string, userId: string, updates: Partial<InterviewSession>): Promise<InterviewSession | null>;

  // DSA Practice Tracker
  getDsaProblems(): Promise<DsaProblem[]>;
  getUserDsaProgress(userId: string): Promise<UserDsaProgress[]>;
  upsertUserDsaProgress(
    userId: string,
    problemId: string,
    updates: Partial<Omit<UserDsaProgress, 'id' | 'userId' | 'problemId'>>
  ): Promise<UserDsaProgress>;

  // User Activity Audit Log
  logActivity(activity: {
    userId: string;
    action: UserActivity['action'];
    title: string;
    description: string;
    type: UserActivity['type'];
    metadata?: Record<string, any>;
    timestamp?: string;
  }): Promise<UserActivity>;
  getActivitiesByUser(userId: string, limit?: number): Promise<UserActivity[]>;
}
