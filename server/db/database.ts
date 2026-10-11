import fs from 'fs';
import path from 'path';

// Define DB Models
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

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'careersupport_db.json');

// Initial curated DSA problems suitable for college graduates & entry-level engineers
const DEFAULT_DSA_PROBLEMS: DsaProblem[] = [
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

class Database {
  private data: DatabaseSchema = {
    users: [],
    resumes: [],
    jobs: [],
    interviews: [],
    dsaProblems: [],
    dsaProgress: [],
    activities: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.activities) {
          this.data.activities = [];
        }
        if (!this.data.dsaProblems || this.data.dsaProblems.length === 0) {
          this.data.dsaProblems = DEFAULT_DSA_PROBLEMS;
          this.persist();
        }
      } catch (err) {
        console.error('Failed to read db file, initializing fresh:', err);
        this.data.dsaProblems = DEFAULT_DSA_PROBLEMS;
        this.data.activities = [];
        this.persist();
      }
    } else {
      this.data.dsaProblems = DEFAULT_DSA_PROBLEMS;
      this.data.activities = [];
      this.persist();
    }
  }

  private persist() {
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  // User queries
  public getUsers(): User[] {
    return this.data.users;
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.persist();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.data.users[idx];
  }

  // Resume queries
  public getResumesByUser(userId: string): ResumeAnalysis[] {
    return this.data.resumes.filter(r => r.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public findResumeById(id: string, userId: string): ResumeAnalysis | undefined {
    return this.data.resumes.find(r => r.id === id && r.userId === userId);
  }

  public createResume(resume: ResumeAnalysis): ResumeAnalysis {
    this.data.resumes.push(resume);
    this.persist();
    return resume;
  }

  public deleteResume(id: string, userId: string): boolean {
    const initialLen = this.data.resumes.length;
    this.data.resumes = this.data.resumes.filter(r => !(r.id === id && r.userId === userId));
    if (this.data.resumes.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // Job Application queries
  public getJobsByUser(userId: string): JobApplication[] {
    return this.data.jobs
      .filter(j => j.userId === userId)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }

  public findJobById(id: string, userId: string): JobApplication | undefined {
    return this.data.jobs.find(j => j.id === id && j.userId === userId);
  }

  public createJob(job: JobApplication): JobApplication {
    this.data.jobs.push(job);
    this.persist();
    return job;
  }

  public updateJob(id: string, userId: string, updates: Partial<JobApplication>): JobApplication | null {
    const idx = this.data.jobs.findIndex(j => j.id === id && j.userId === userId);
    if (idx === -1) return null;
    this.data.jobs[idx] = {
      ...this.data.jobs[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.jobs[idx];
  }

  public deleteJob(id: string, userId: string): boolean {
    const initialLen = this.data.jobs.length;
    this.data.jobs = this.data.jobs.filter(j => !(j.id === id && j.userId === userId));
    if (this.data.jobs.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // Interview queries
  public getInterviewsByUser(userId: string): InterviewSession[] {
    return this.data.interviews
      .filter(i => i.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public findInterviewById(id: string, userId: string): InterviewSession | undefined {
    return this.data.interviews.find(i => i.id === id && i.userId === userId);
  }

  public createInterview(interview: InterviewSession): InterviewSession {
    this.data.interviews.push(interview);
    this.persist();
    return interview;
  }

  public updateInterview(id: string, userId: string, updates: Partial<InterviewSession>): InterviewSession | null {
    const idx = this.data.interviews.findIndex(i => i.id === id && i.userId === userId);
    if (idx === -1) return null;
    this.data.interviews[idx] = { ...this.data.interviews[idx], ...updates };
    this.persist();
    return this.data.interviews[idx];
  }

  // DSA queries
  public getDsaProblems(): DsaProblem[] {
    return this.data.dsaProblems;
  }

  public getUserDsaProgress(userId: string): UserDsaProgress[] {
    return this.data.dsaProgress.filter(p => p.userId === userId);
  }

  public upsertUserDsaProgress(
    userId: string,
    problemId: string,
    updates: Partial<Omit<UserDsaProgress, 'id' | 'userId' | 'problemId'>>
  ): UserDsaProgress {
    const idx = this.data.dsaProgress.findIndex(p => p.userId === userId && p.problemId === problemId);
    const now = new Date().toISOString();

    if (idx >= 0) {
      this.data.dsaProgress[idx] = {
        ...this.data.dsaProgress[idx],
        ...updates,
        updatedAt: now,
      };
      this.persist();
      return this.data.dsaProgress[idx];
    } else {
      const newProgress: UserDsaProgress = {
        id: `prog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        problemId,
        status: updates.status || 'Not Started',
        notes: updates.notes || '',
        isBookmarked: updates.isBookmarked ?? false,
        solvedAt: updates.status === 'Solved' ? now : undefined,
        lastRevisedAt: updates.lastRevisedAt,
        updatedAt: now,
      };
      this.data.dsaProgress.push(newProgress);
      this.persist();
      return newProgress;
    }
  }

  // Activity Log queries
  public logActivity(activity: {
    userId: string;
    action: UserActivity['action'];
    title: string;
    description: string;
    type: UserActivity['type'];
    metadata?: Record<string, any>;
    timestamp?: string;
  }): UserActivity {
    if (!this.data.activities) {
      this.data.activities = [];
    }
    const newAct: UserActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: activity.userId,
      action: activity.action,
      title: activity.title,
      description: activity.description,
      type: activity.type,
      metadata: activity.metadata,
      timestamp: activity.timestamp || new Date().toISOString(),
    };
    this.data.activities.unshift(newAct);
    if (this.data.activities.length > 250) {
      this.data.activities = this.data.activities.slice(0, 250);
    }
    this.persist();
    return newAct;
  }

  public getActivitiesByUser(userId: string, limit: number = 30): UserActivity[] {
    if (!this.data.activities) {
      this.data.activities = [];
    }
    return this.data.activities
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

export const db = new Database();
