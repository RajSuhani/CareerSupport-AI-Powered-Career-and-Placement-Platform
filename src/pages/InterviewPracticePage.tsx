import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { InterviewSession, InterviewCategory, InterviewDifficulty, InterviewQuestionItem } from '../types';
import { LiveVoiceModal } from '../components/ai/LiveVoiceModal';
import {
  Mic,
  MicOff,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Award,
  ChevronRight,
  HelpCircle,
  Volume2,
  Radio,
  FileAudio,
} from 'lucide-react';

export const InterviewPracticePage: React.FC = () => {
  const { user, token } = useAuth();

  // Configuration states
  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Software Engineer');
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel || 'Entry-Level');
  const [category, setCategory] = useState<InterviewCategory>('Technical');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('Medium');
  const [questionsCount, setQuestionsCount] = useState<number>(3);

  // Session states
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveModalOpen, setLiveModalOpen] = useState(false);

  // Timer states
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Voice recording & transcription states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // History states
  const [pastSessions, setPastSessions] = useState<InterviewSession[]>([]);

  // Start MediaRecorder audio capture for Gemini 3.5 Transcribe
  const startAudioRecording = async () => {
    setError(null);
    setVoiceNotice(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setVoiceNotice('Recording audio via microphone. Speak your answer clearly; when done, click "Stop & Transcribe with Gemini 3.5".');
    } catch (err: any) {
      console.error('Audio recording failed:', err);
      setVoiceNotice('Microphone access denied or unavailable. You can type your answer directly.');
    }
  };

  const stopAudioRecordingAndTranscribe = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      setIsRecording(false);
      return;
    }

    mediaRecorderRef.current.onstop = async () => {
      try {
        setIsTranscribing(true);
        setVoiceNotice('Sending audio to Gemini 3.5 Transcribe model...');

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;

          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({
              audioData: base64Audio,
              mimeType: 'audio/webm',
            }),
          });

          const data = await res.json();
          if (res.ok && data.transcription) {
            setAnswerText((prev) => (prev ? `${prev} ${data.transcription}` : data.transcription));
            setVoiceNotice('Successfully transcribed with gemini-3.5-transcribe! You can edit or submit your answer below.');
          } else {
            setVoiceNotice(`Transcription notice: ${data.error || 'No speech detected. You can type your response.'}`);
          }
          setIsTranscribing(false);
        };
      } catch (err: any) {
        console.error('Transcription error:', err);
        setVoiceNotice('Transcription service error. You can continue typing manually.');
        setIsTranscribing(false);
      } finally {
        setIsRecording(false);
      }
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopAudioRecordingAndTranscribe();
    } else {
      startAudioRecording();
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Please sign in or use demo account to start mock interviews');
      return;
    }

    setError(null);
    setIsInitializing(true);

    try {
      const res = await fetch('/api/interviews/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetRole,
          experienceLevel,
          category,
          difficulty,
          questionsCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start interview');
      }

      setSession(data.session);
      setCurrentQuestionIndex(0);
      setAnswerText('');
      setSecondsElapsed(0);
      setIsTimerRunning(true);
    } catch (err: any) {
      setError(err.message || 'Error initializing interview session');
    } finally {
      setIsInitializing(false);
    }
  };

  const currentQuestion: InterviewQuestionItem | undefined = session?.questions[currentQuestionIndex];

  const handleSubmitAnswer = async () => {
    if (!token || !session || !currentQuestion) return;
    if (!answerText.trim() || answerText.trim().length < 5) {
      setError('Please provide a substantive answer (at least 5 characters) before submitting.');
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/interviews/${session.id}/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answer: answerText.trim(),
          voiceRecorded: isRecording,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to evaluate answer');
      }

      // Update question in state
      const updatedQuestions = [...session.questions];
      updatedQuestions[currentQuestionIndex] = data.question;

      setSession({
        ...session,
        questions: updatedQuestions,
      });
    } catch (err: any) {
      setError(err.message || 'Error evaluating answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextOrFinish = async () => {
    if (!session || !token) return;

    if (currentQuestionIndex < session.questions.length - 1) {
      // Go to next question
      setCurrentQuestionIndex(prev => prev + 1);
      setAnswerText('');
      setError(null);
    } else {
      // Complete interview session
      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/interviews/${session.id}/complete`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setSession(data.session);
          setIsTimerRunning(false);
          setPastSessions(prev => [data.session, ...prev]);
        }
      } catch (err) {
        console.error('Failed to complete session:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Interactive AI Mock Interviewer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Role-Specific Mock Practice & Feedback
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Simulate real tech interview scenarios. Answer via voice or typing, benchmark structure and technical correctness with immediate grading.
          </p>
        </div>

        <button
          onClick={() => setLiveModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Radio className="w-4 h-4 text-cyan-300 animate-pulse" />
          <span>Launch Gemini 3.8 Live Voice Mode</span>
        </button>
      </div>

      {/* Main Flow: Configure or Active Interview */}
      {!session ? (
        /* Configuration Screen & Past History */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-white">Setup Interview Round</h2>
              <span className="text-xs font-medium text-purple-400">Customized Prompts</span>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleStartSession} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Job Role</label>
                <input
                  type="text"
                  required
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  placeholder="e.g. Full-Stack Engineer, Frontend React Developer"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as InterviewCategory)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Technical">Technical (Full-Stack / Core)</option>
                    <option value="DSA Fundamentals">DSA Fundamentals</option>
                    <option value="System Design">System Design Basics</option>
                    <option value="SQL">SQL & Database Modeling</option>
                    <option value="Python">Python & Scripting</option>
                    <option value="HR">HR / Behavioral (STAR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as InterviewDifficulty)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Easy">Easy (Entry / Junior)</option>
                    <option value="Medium">Medium (Standard Placement)</option>
                    <option value="Hard">Hard (FAANG / High Bar)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={e => setExperienceLevel(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Student / Intern">Student / Intern</option>
                    <option value="Entry-Level">Entry-Level (New Grad)</option>
                    <option value="Mid-Level">Mid-Level</option>
                    <option value="Career Switcher">Career Switcher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Number of Questions</label>
                  <select
                    value={questionsCount}
                    onChange={e => setQuestionsCount(parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value={1}>1 Question (Quick check)</option>
                    <option value={3}>3 Questions (Standard session)</option>
                    <option value={5}>5 Questions (Comprehensive round)</option>
                  </select>
                </div>
              </div>

              {/* Voice Notice Disclosure */}
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-300 leading-relaxed">
                Microphone audio will use browser speech synthesis for hands-free answering. We evaluate the content, structure, and technical depth of answers rather than audio tone.
              </div>

              <button
                type="submit"
                disabled={isInitializing}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isInitializing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Generating Tailored Interview Questions...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Start Mock Interview Session</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Past Sessions List */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center justify-between border-b border-slate-800 pb-4">
              <span>Completed Practice Sessions</span>
              <span className="text-xs text-slate-400 font-normal">{pastSessions.length} sessions</span>
            </h2>

            {pastSessions.length > 0 ? (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {pastSessions.map(sess => (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setSession(sess);
                      setCurrentQuestionIndex(0);
                    }}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                        {sess.category} Interview ({sess.difficulty})
                      </span>
                      {sess.overallScore !== undefined ? (
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {sess.overallScore}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          In Progress
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Role: {sess.targetRole} • {sess.questions.length} questions
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(sess.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 text-xs">
                No mock interviews completed yet. Select a category on the left to start your first session.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Active Interview Stage */
        <div className="space-y-6">
          {/* Top Bar with Timer & Status */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {session.category} • {session.difficulty}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Question {currentQuestionIndex + 1} of {session.questions.length}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Elapsed: {formatTime(secondsElapsed)}</span>
              </div>

              <button
                onClick={() => setSession(null)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Exit Session
              </button>
            </div>
          </div>

          {/* Question Display Card */}
          {currentQuestion && (
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
                  Question Prompt
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                  {currentQuestion.question}
                </h3>
              </div>

              {/* If already answered and feedback is present */}
              {currentQuestion.feedback ? (
                /* Feedback View */
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Candidate Answer Box */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-xs font-semibold text-slate-400">Your Submitted Answer:</span>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {currentQuestion.userAnswer}
                    </p>
                  </div>

                  {/* Score Breakdown Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Relevance</span>
                      <span className="text-xl font-black text-white">{currentQuestion.feedback.relevance}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Clarity</span>
                      <span className="text-xl font-black text-white">{currentQuestion.feedback.clarity}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Structure</span>
                      <span className="text-xl font-black text-white">{currentQuestion.feedback.structure}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Tech Depth</span>
                      <span className="text-xl font-black text-purple-400">{currentQuestion.feedback.technicalCorrectness}%</span>
                    </div>
                  </div>

                  {/* Summary & Strengths */}
                  <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-slate-200 space-y-1.5">
                    <span className="font-semibold text-purple-300 block">Interviewer Assessment:</span>
                    <p className="leading-relaxed">{currentQuestion.feedback.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Strengths Demonstrated</span>
                      </span>
                      <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                        {currentQuestion.feedback.strengths.map((str, idx) => (
                          <li key={idx}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Key Points for Improvement</span>
                      </span>
                      <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                        {currentQuestion.feedback.improvements.map((imp, idx) => (
                          <li key={idx}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Navigation Button */}
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleNextOrFinish}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <span>
                        {currentQuestionIndex < session.questions.length - 1
                          ? 'Next Question'
                          : 'Complete & Save Session'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Answering Box */
                <div className="space-y-4">
                  {/* Voice Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleRecording}
                        disabled={isTranscribing}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
                          isRecording
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                            : isTranscribing
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isTranscribing ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            <span>Transcribing (Gemini 3.5 Transcribe)...</span>
                          </>
                        ) : isRecording ? (
                          <>
                            <MicOff className="w-3.5 h-3.5 text-rose-400" />
                            <span>Stop & Transcribe (Gemini 3.5)</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5 text-purple-400" />
                            <span>Record & Transcribe Answer</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setLiveModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1.5"
                      >
                        <Radio className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Live Voice (Gemini 3.8)</span>
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-500">
                      Powered by gemini-3.5-transcribe
                    </span>
                  </div>

                  {voiceNotice && (
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                      {voiceNotice}
                    </div>
                  )}

                  {/* Answer Text Area */}
                  <div>
                    <textarea
                      rows={7}
                      value={answerText}
                      onChange={e => setAnswerText(e.target.value)}
                      placeholder="Articulate your solution or response clearly. Mention trade-offs, edge cases, and reasoning..."
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      {answerText.length} characters typed
                    </span>

                    <button
                      type="button"
                      onClick={handleSubmitAnswer}
                      disabled={isSubmitting || !answerText.trim()}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Grading Answer...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit & Get AI Evaluation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Session Overview if completed */}
          {session.status === 'completed' && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/30 space-y-4 text-center">
              <Award className="w-10 h-10 text-purple-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Interview Round Completed!</h3>
              <p className="text-2xl font-black text-purple-300">
                Overall Score: {session.overallScore}%
              </p>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                {session.overallSummary}
              </p>
              <button
                onClick={() => setSession(null)}
                className="mt-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-xl transition-all"
              >
                Back to Interview Dashboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
