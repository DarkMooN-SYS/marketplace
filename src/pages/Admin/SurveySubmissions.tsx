import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Sparkles, PlusCircle, Trash2, PenLine } from 'lucide-react';
import { api, type Survey } from '../../api/adminApi';

type SurveyQuestion = {
  id: string;
  prompt: string;
  answerPlaceholder: string;
};

const SURVEY_CATEGORIES = ['Shopping', 'Technology', 'Health', 'Lifestyle', 'Business', 'Education'];

interface SurveyFormState {
  title: string;
  description: string;
  reward: number;
  rewardType: 'points' | 'cash';
  category: string;
  featured: boolean;
  questions: SurveyQuestion[];
}

const generateQuestionId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `question-${Date.now()}-${Math.round(Math.random() * 10_000)}`;
};

const createEmptyQuestion = (): SurveyQuestion => ({
  id: generateQuestionId(),
  prompt: '',
  answerPlaceholder: '',
});

const getInitialFormState = (): SurveyFormState => ({
  title: '',
  description: '',
  reward: 100,
  rewardType: 'points',
  category: SURVEY_CATEGORIES[0],
  featured: false,
  questions: [createEmptyQuestion()],
});

const getDurationRange = (questionCount: number) => {
  const safeCount = Math.max(1, questionCount);
  const min = safeCount;
  const max = safeCount + 1;
  const average = Math.round((min + max) / 2);
  return { min, max, average };
};

export function SurveySubmissionsPage() {
  const [form, setForm] = useState<SurveyFormState>(() => getInitialFormState());
  const [entries, setEntries] = useState<Survey[]>([]);
  const [status, setStatus] = useState<'idle' | 'creating' | 'loading'>('loading');

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const response = await api.surveys.getAll();
        setEntries(response.surveys || []);
      } catch (err) {
        console.error('Failed to load surveys:', err);
      } finally {
        setStatus('idle');
      }
    };
    fetchSurveys();
  }, []);

  const totalReward = useMemo(
    () => entries.reduce((acc, item) => acc + (item.reward || 0), 0),
    [entries],
  );

  const nonEmptyQuestionCount = useMemo(
    () => form.questions.filter((question) => question.prompt.trim().length > 0).length,
    [form.questions],
  );

  const effectiveQuestionCount = Math.max(
    nonEmptyQuestionCount > 0 ? nonEmptyQuestionCount : form.questions.length,
    1,
  );

  const durationEstimate = getDurationRange(effectiveQuestionCount);

  const handleAddQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, createEmptyQuestion()],
    }));
  };

  const handleQuestionChange = (
    id: string,
    field: 'prompt' | 'answerPlaceholder',
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question) =>
        question.id === id ? { ...question, [field]: value } : question,
      ),
    }));
  };

  const handleQuestionRemove = (id: string) => {
    setForm((prev) => {
      if (prev.questions.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        questions: prev.questions.filter((question) => question.id !== id),
      };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = form.title.trim();
    const trimmedDescription = form.description.trim();

    const sanitizedQuestions = form.questions
      .map((question) => ({
        ...question,
        prompt: question.prompt.trim(),
        answerPlaceholder: question.answerPlaceholder?.trim() ?? '',
      }))
      .filter((question) => question.prompt.length > 0);

    if (!trimmedTitle || !trimmedDescription || sanitizedQuestions.length === 0) {
      return;
    }

    const { average } = getDurationRange(sanitizedQuestions.length);

    setStatus('creating');
    try {
      await api.surveys.submit({
        title: trimmedTitle,
        description: trimmedDescription,
        reward: form.reward,
        rewardType: form.rewardType,
        duration: average,
        category: form.category,
        featured: form.featured,
        questions: sanitizedQuestions,
      });
      // Refresh the list
      const updated = await api.surveys.getAll();
      setEntries(updated.surveys || []);
      setForm(getInitialFormState());
    } catch (err) {
      console.error('Failed to create survey:', err);
    } finally {
      setStatus('idle');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.admin.updateSurveyStatus(id, 'rejected');
      setEntries((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to remove survey:', err);
    }
  };

  return (
    <div className="flex flex-col gap-[var(--section-gap)]">
      <form
        onSubmit={handleSubmit}
        className="space-y-[var(--card-gap)] rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-white/80 p-[var(--card-padding)] shadow-sm transition-all dark:border-white/12 dark:bg-white/5"
      >
        <header className="flex flex-col gap-3 mobile:flex-row mobile:items-center mobile:justify-between">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Шинэ судалгаа нэмэх</h3>
            <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60">
              Админ талаас нэмсэн судалгаа нийт хэрэглэгчдэд даруй харагдана.
            </p>
          </div>
        </header>

        <div className="space-y-[var(--card-gap)]">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
              Гарчиг
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              placeholder="Жишээ: Customer Satisfaction 2025"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
              Тайлбар
            </label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              placeholder="Судалгааны зорилго, оролцогчдод өгөөж"
              required
            />
          </div>

          <div className="space-y-[var(--card-gap)]">
            <div className="flex flex-col gap-2 mobile:flex-row mobile:items-center mobile:justify-between">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-600 dark:bg-blue-500/15 dark:text-blue-200">
                  <PenLine className="h-3.5 w-3.5" />
                  Асуулт нэмэх · засах
                </span>
                <p className="text-[11px] text-[var(--color-text-main)]/60 dark:text-white/60">
                  "Add new row" товчийг дарж шинэ асуулт нэмээд, доорх мөр бүрт асуулт болон хариултын талбарыг шууд засварлана.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-500 mobile:w-auto"
              >
                <PlusCircle className="h-4 w-4" />
                Асуулт нэмэх
              </button>
            </div>

            <div className="space-y-3 sm:hidden">
              {form.questions.map((question, index) => (
                <div
                  key={question.id}
                  className="rounded-2xl border border-[var(--color-border-soft)] bg-white/85 p-4 shadow-sm dark:border-white/12 dark:bg-slate-900/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-500/15 text-xs font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-200">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                          Асуулт #{index + 1}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-main)]/60 dark:text-white/60">
                          Доорх талбаруудыг бөглөж асуултаа тохируулна уу.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuestionRemove(question.id)}
                      disabled={form.questions.length === 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-500/40 text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-300/40 dark:text-red-200"
                      aria-label="Асуултыг устгах"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/50">
                        Асуулт
                      </label>
                      <input
                        type="text"
                        value={question.prompt}
                        onChange={(event) => handleQuestionChange(question.id, 'prompt', event.target.value)}
                        className="mt-1 w-full rounded-xl border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/40 dark:border-white/12 dark:bg-slate-900/80 dark:text-white"
                        placeholder="Жишээ: Та хамгийн их хэрэглэдэг апп аль вэ?"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/50">
                        Хариултын талбар
                      </label>
                      <input
                        type="text"
                        value={question.answerPlaceholder ?? ''}
                        onChange={(event) => handleQuestionChange(question.id, 'answerPlaceholder', event.target.value)}
                        className="mt-1 w-full rounded-xl border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/40 dark:border-white/12 dark:bg-slate-900/80 dark:text-white"
                        placeholder="Жишээ: Хариултаа энд бичнэ үү"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border border-[var(--color-border-soft)] bg-white/80 shadow-sm dark:border-white/12 dark:bg-slate-900/50 sm:block">
              <table className="min-w-[640px] divide-y divide-[var(--color-border-soft)] text-sm">
                <thead className="bg-white/60 text-[11px] uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:bg-slate-900/40 dark:text-white/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Асуулт</th>
                    <th className="px-4 py-3 text-left font-semibold">Хариулт бичих хэсэг</th>
                    <th className="px-4 py-3 text-right font-semibold">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)] bg-white/70 dark:bg-slate-900/40">
                  {form.questions.map((question, index) => (
                    <tr key={question.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3 text-xs font-semibold text-[var(--color-text-main)]/60 dark:text-white/60">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={question.prompt}
                          onChange={(event) => handleQuestionChange(question.id, 'prompt', event.target.value)}
                          className="w-full rounded-xl border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/40 dark:border-white/12 dark:bg-slate-900/80 dark:text-white"
                          placeholder="Жишээ: Та хамгийн их хэрэглэдэг апп аль вэ?"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={question.answerPlaceholder ?? ''}
                          onChange={(event) => handleQuestionChange(question.id, 'answerPlaceholder', event.target.value)}
                          className="w-full rounded-xl border border-[var(--color-border-soft)] bg-white px-3 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/40 dark:border-white/12 dark:bg-slate-900/80 dark:text-white"
                          placeholder="Жишээ: Хариултаа энд бичнэ үү"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleQuestionRemove(question.id)}
                          disabled={form.questions.length === 1}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-500/40 text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-300/40 dark:text-red-200"
                          aria-label="Асуултыг устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-3 mobile:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                Шагнал
              </label>
              <input
                type="number"
                min={1}
                value={form.reward}
                onChange={(event) => setForm((prev) => ({ ...prev, reward: Number(event.target.value) }))}
                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                placeholder="150"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                Шагналын төрөл
              </label>
              <select
                value={form.rewardType}
                onChange={(event) => setForm((prev) => ({ ...prev, rewardType: event.target.value as 'points' | 'cash' }))}
                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              >
                <option value="points">Оноо</option>
                <option value="cash">Бэлэн мөнгө</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 mobile:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white/85 p-4 shadow-sm dark:border-white/12 dark:bg-slate-900/60">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/50">
                <span>Жишиг хугацаа</span>
                <span>{durationEstimate.min}-{durationEstimate.max} мин</span>
              </div>
              <div className="mt-3 space-y-2 text-xs text-[var(--color-text-main)]/70 dark:text-white/70">
                <div className="flex items-center justify-between rounded-xl border border-dashed border-[var(--color-border-soft)]/70 px-3 py-2 dark:border-white/15">
                  <span className="font-semibold">Асуултын тоо</span>
                  <span>{nonEmptyQuestionCount || form.questions.length} асуулт</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-dashed border-[var(--color-border-soft)]/70 px-3 py-2 dark:border-white/15">
                  <span className="font-semibold">Дундаж хугацаа</span>
                  <span>~{durationEstimate.average} мин</span>
                </div>
                <p className="leading-relaxed">
                  1 асуулт ~1-2 минут зарцуулна. Асуулт бүр нэмэгдэх тусам бөглөх хугацаа автоматаар минут-аар нэмэгдэнэ.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                Ангилал
              </label>
              <select
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              >
                {SURVEY_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 mobile:flex-row mobile:items-center mobile:justify-between">
            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))}
                className="h-4 w-4 rounded border-[var(--color-border-soft)] text-[var(--color-border-main)] focus:ring-[var(--color-border-main)]"
              />
              Онцлох судалгаа болгох
            </label>
            <button
              type="submit"
              disabled={status === 'creating'}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              <PlusCircle className="h-4 w-4" />
              Судалгаа нэмэх
            </button>
          </div>
        </div>
      </form>

      <section className="space-y-[var(--card-gap)] rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-white/80 p-[var(--card-padding)] shadow-sm transition-all dark:border-white/12 dark:bg-white/5">
        <header className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Нэмсэн судалгаанууд</h3>
          <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60">
            Нийт {entries.length} судалгаа · Нийлбэр шагнал {totalReward.toLocaleString('en-US')} ({entries.some((entry) => entry.rewardType === 'cash') ? '₮' : 'оноо'})
          </p>
        </header>

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-soft)] bg-white/70 p-6 text-center text-sm text-[var(--color-text-main)]/60 dark:border-white/12 dark:bg-white/5 dark:text-white/60">
            Одоогоор админаас нэмсэн судалгаа алга. Дээрх формыг ашиглан нэмэх боломжтой.
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-white/85 px-4 py-3 text-sm text-[var(--color-text-main)] shadow-sm dark:border-white/12 dark:bg-slate-900/65 dark:text-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60">
                      {new Date(item.createdAt).toLocaleString('mn-MN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' · '}
                      {item.rewardType === 'cash' ? `${(item.reward || 0).toLocaleString()} ₮` : `${(item.reward || 0).toLocaleString()} оноо`}
                      {' · '}
                      {item.duration ? `~${item.duration} мин` : 'Duration N/A'}
                      {item.questions?.length ? ` · ${item.questions.length} асуулт` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-500/40 text-red-500 transition hover:bg-red-500/10 dark:border-red-400/40 dark:text-red-200"
                    aria-label="Устгах"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-[var(--color-text-main)]/70 dark:text-white/70 line-clamp-2">{item.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
