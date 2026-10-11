export interface User {
  id: string;
  name: string;
  email: string;
  targetRole: string;
  experienceLevel: 'Entry-Level' | 'Student / Intern' | 'Mid-Level' | 'Career Switcher';
  skills: string[];
  education: string;
  createdAt: string;
  updatedAt: string;
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

export type InterviewCategory = 'HR' | 'Technical' | 'SQL' | 'Python' | 'DSA Fundamentals' | 'System Design';
export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface InterviewFeedback {
  relevance: number;
  clarity: number;
  structure: number;
  technicalCorrectness: number;
  score: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface InterviewQuestionItem {
  id: string;
  question: string;
  category: string;
  expectedKeyPoints?: string[];
  userAnswer?: string;
  voiceRecorded?: boolean;
  score?: number;
  feedback?: InterviewFeedback;
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
  status: DsaStatus;
  notes?: string;
  isBookmarked: boolean;
  solvedAt?: string;
  lastRevisedAt?: string;
}

export interface UserActivity {
  id: string;
  userId?: string;
  action?: string;
  type: 'job' | 'resume' | 'interview' | 'dsa';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface DashboardSummary {
  hasData: boolean;
  totalApplications: number;
  applicationsByStatus: Record<JobStatus, number>;
  upcomingInterviewsCount: number;
  upcomingInterviews: JobApplication[];
  resumeCount: number;
  latestResume: ResumeAnalysis | null;
  dsaStats: {
    solved: number;
    inProgress: number;
    total: number;
    percentage: number;
  };
  dailyGoals: Array<{
    title: string;
    target: number;
    current: number;
    completed: boolean;
  }>;
  activities: UserActivity[];
  reminders: Array<{
    id: string;
    company: string;
    role: string;
    date: string;
    isOverdue: boolean;
    status: JobStatus;
  }>;
}
