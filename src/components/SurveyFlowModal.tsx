import { useMemo, useState, useEffect } from 'react';
import type { SurveyQuestion } from '../utils/adminContentStorage';
import { surveyResponseStore } from '../utils/surveyResponses';
import { showConfetti } from '../utils/confetti';
import { useAuth } from '../hooks/useAuth';

interface SurveyFlowModalProps {
  survey: SurveyPayload;
  onClose: () => void;
}

type Step = 'intro' | 'questions' | 'completed';

type AnswerMap = Record<string, string>;

interface SurveyPayload {
  id: string;
  title: string;
  description: string;
  reward: number;
  rewardType: 'points' | 'cash';
  duration: number;
  category: string;
  rating?: number;
  responses?: number;
  featured?: boolean;
  createdAt?: string;
  durationRange?: {
    min: number;
    max: number;
  };
  questions?: SurveyQuestion[];
}

const ensureQuestions = (survey: SurveyPayload): SurveyQuestion[] => {
  if (survey.questions?.length) {
    return survey.questions;
  }
  const basePrompt = survey.description || survey.title;
  return [
    {
      id: `${survey.id}-prompt`,
      prompt: basePrompt ?? 'Судалгаанд оролцоно уу',
      answerPlaceholder: 'Хариултаа энд бичнэ үү',
    },
  ];
};

export function SurveyFlowModal({ survey, onClose }: SurveyFlowModalProps) {
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<Step>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Check if user already submitted this survey
  useEffect(() => {
    surveyResponseStore.hasResponded(survey.id).then(setAlreadySubmitted).catch(() => {});
  }, [survey.id]);

  const questions = useMemo(() => ensureQuestions(survey), [survey]);
  const currentQuestion = questions[currentIndex];
  const estimatedDuration = useMemo(() => {
    if (typeof survey.duration === 'number' && survey.duration > 0) {
      return survey.duration;
    }
    if (survey.durationRange) {
      return Math.round((survey.durationRange.min + survey.durationRange.max) / 2);
    }
    return Math.max(questions.length, 5);
  }, [survey.duration, survey.durationRange, questions.length]);

  const handleBegin = () => {
    setStep('questions');
    setCurrentIndex(0);
    setAnswers({});
  };

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = async () => {
    if (!currentQuestion) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      // Submit to API
      try {
        const answersForApi: Record<string, string> = {};
        questions.forEach((question) => {
          answersForApi[question.id] = answers[question.id] ?? '';
        });
        
        const response = await surveyResponseStore.submit(survey.id, answersForApi);
        
        showConfetti();
        setAlreadySubmitted(true);
        setStep('completed');
        
        // Refresh user data to update points/balance
        await refreshUser();
        
        // Show reward notification if available
        if (response.reward && response.rewardType) {
          console.log(`You received ${response.reward} ${response.rewardType === 'cash' ? '₮' : 'points'}!`);
        }
      } catch (error) {
        console.error('Failed to submit survey response:', error);
        alert('Судалгаа илгээхэд алдаа гарлаа. Дахин оролдоно уу.');
      }
      return;
    }
    setCurrentIndex(nextIndex);
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      setStep('intro');
      return;
    }
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/70 backdrop-blur">
      <div className="relative h-full w-full max-h-[min(90vh,720px)] max-w-2xl overflow-hidden rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] shadow-xl dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border-soft)] text-[var(--color-text-main)]/70 transition hover:-translate-y-0.5 hover:bg-white/60 hover:text-[var(--color-text-main)] dark:border-slate-700 dark:hover:bg-slate-800"
          aria-label="Хаах"
        >
          ×
        </button>

        {step === 'intro' && (
          <div className="flex h-full flex-col gap-[var(--card-gap)] p-[var(--card-padding)]">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
                Судалгаа эхлэхэд бэлэн
              </span>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-[var(--color-text-main)] dark:text-white">
                  {survey.title}
                </h2>
                <p className="text-sm leading-relaxed text-[var(--color-text-main)]/80 dark:text-white/70">
                  {survey.description}
                </p>
              </div>
            </div>

            <div className="grid gap-3 mobile:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-white">
                Шагнал: {survey.reward.toLocaleString('en-US')} {survey.rewardType === 'cash' ? '₮' : 'оноо'}
              </div>
              <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-white">
                Хугацаа: {estimatedDuration} мин
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3 mobile:flex-row mobile:items-center mobile:justify-between">
              <div className="text-xs text-[var(--color-text-main)]/60 dark:text-white/50 space-y-1">
                <p>
                  {questions.length} асуулт · {survey.responses?.toLocaleString('en-US') ?? 0} хүн оролцсон
                </p>
                {alreadySubmitted && <p>Та аль хэдийн энэ судалгаанд оролцсон байна.</p>}
              </div>
              <div className="flex flex-col gap-2 mobile:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-border-soft)] px-5 py-2 text-sm font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-blue-500 hover:text-blue-600 dark:border-slate-700/60 dark:text-white"
                >
                  Буцах
                </button>
                <button
                  type="button"
                  onClick={handleBegin}
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-65"
                  disabled={alreadySubmitted}
                >
                  Судалгааг эхлүүлэх
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'questions' && currentQuestion && (
          <div className="flex h-full flex-col gap-[var(--card-gap)] p-[var(--card-padding)]">
            <header className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/50">
                {currentIndex + 1} / {questions.length} асуулт
              </p>
              <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">
                {currentQuestion.prompt}
              </h3>
            </header>

            <div className="space-y-4">
              <textarea
                value={answers[currentQuestion.id] ?? ''}
                onChange={(event) => handleAnswerChange(event.target.value)}
                className="min-h-[140px] w-full rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-white/80 px-4 py-3 text-sm text-[var(--color-text-main)] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/40 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-white"
                placeholder={currentQuestion.answerPlaceholder ?? 'Хариултаа энд бичнэ үү'}
                required
              />
            </div>

            <div className="mt-auto space-y-4">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex flex-col gap-3 mobile:flex-row mobile:items-center mobile:justify-between">
                <span className="text-xs text-[var(--color-text-main)]/60 dark:text-white/50">
                  {answeredCount} асуултад хариулсан
                </span>
                <div className="flex flex-col gap-2 mobile:flex-row">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--color-border-soft)] px-5 py-2 text-sm font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-blue-500 hover:text-blue-600 dark:border-slate-700/60 dark:text-white"
                  >
                    Буцах
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-500"
                  >
                    {currentIndex === questions.length - 1 ? 'Илгээх' : 'Дараах асуулт'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'completed' && (
          <div className="flex h-full flex-col gap-[var(--card-gap)] p-[var(--card-padding)] text-center">
            <div className="space-y-5">
              <span className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500/15 px-4 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                🎉 Судалгаа амжилттай
              </span>
              <h3 className="text-2xl font-semibold text-[var(--color-text-main)] dark:text-white">
                Баярлалаа!
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-text-main)]/80 dark:text-white/70">
                Судалгааг бүрэн бөглөсөнд талархаж байна. Шагнал {survey.reward.toLocaleString('en-US')} {survey.rewardType === 'cash' ? '₮' : 'оноо'} таны дансанд удахгүй тусна.
              </p>
            </div>

            <div className="mt-auto flex flex-col gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-500"
              >
                Судалгааны хуудас руу буцах
              </button>
              <button
                type="button"
                onClick={handleBegin}
                className="inline-flex items-center justify-center rounded-full border border-[var(--color-border-soft)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/70 transition hover:-translate-y-0.5 hover:border-blue-500 hover:text-blue-600 dark:border-slate-700/60 dark:text-white/70"
                disabled={alreadySubmitted}
              >
                Дахин бөглөх
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SurveyFlowModal;
