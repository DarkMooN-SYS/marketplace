import React, { useState } from 'react';

interface SurveyFormData {
  title: string;
  description: string;
  image: File | null;
  questions: string[];
}

interface SurveyFormProps {
  onSubmit: (data: SurveyFormData) => void;
}

export default function SurveyForm({ onSubmit }: SurveyFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [questions, setQuestions] = useState<string[]>(['']);

  const handleAddQuestion = () => setQuestions([...questions, '']);
  const handleQuestionChange = (idx: number, value: string) => {
    setQuestions(questions.map((q, i) => (i === idx ? value : q)));
  };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setImage(e.target.files[0]);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, description, image, questions });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-bg-main border border-border-main rounded-lg p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-main mb-1">Судалгааны гарчиг</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Гарчиг оруулна уу"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-main mb-1">Тайлбар</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Тайлбар оруулна уу"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-main mb-1">Зураг</label>
        <input type="file" accept="image/*" onChange={handleImageChange} className="block" />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-main mb-1">Асуултууд</label>
        {questions.map((q, idx) => (
          <input
            key={idx}
            type="text"
            value={q}
            onChange={e => handleQuestionChange(idx, e.target.value)}
            className="w-full px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Асуулт ${idx + 1}`}
            required
          />
        ))}
        <button type="button" onClick={handleAddQuestion} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Асуулт нэмэх
        </button>
      </div>
      <button type="submit" className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md transition-colors">
        Илгээх
      </button>
    </form>
  );
}
