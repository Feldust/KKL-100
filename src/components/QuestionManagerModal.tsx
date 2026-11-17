import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Play, RotateCcw, Upload, Download, X } from 'lucide-react';
import { SurveyQuestion, AnswerSlot } from '../types/game';

interface QuestionManagerModalProps {
  isOpen: boolean;
  questions: SurveyQuestion[];
  currentQuestionIndex: number;
  onClose: () => void;
  onSelectRound: (index: number) => void;
  onSaveQuestions: (updated: SurveyQuestion[]) => void;
  onResetDefaults: () => void;
}

export const QuestionManagerModal: React.FC<QuestionManagerModalProps> = ({
  isOpen,
  questions,
  currentQuestionIndex,
  onClose,
  onSelectRound,
  onSaveQuestions,
  onResetDefaults,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Custom Round');
  const [answers, setAnswers] = useState<{ text: string; points: string; aliases: string }[]>([
    { text: '', points: '35', aliases: '' },
    { text: '', points: '25', aliases: '' },
    { text: '', points: '20', aliases: '' },
    { text: '', points: '12', aliases: '' },
    { text: '', points: '8', aliases: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  if (!isOpen) return null;

  const startNewQuestion = () => {
    setEditingId('NEW');
    setPrompt('');
    setCategory('Event Round');
    setAnswers([
      { text: '', points: '35', aliases: '' },
      { text: '', points: '25', aliases: '' },
      { text: '', points: '20', aliases: '' },
      { text: '', points: '12', aliases: '' },
      { text: '', points: '8', aliases: '' },
    ]);
    setFormError(null);
  };

  const startEditQuestion = (q: SurveyQuestion) => {
    setEditingId(q.id);
    setPrompt(q.prompt);
    setCategory(q.category);
    setAnswers(
      q.answers.map((a) => ({
        text: a.text,
        points: String(a.points),
        aliases: (a.aliases || []).join(', '),
      }))
    );
    setFormError(null);
  };

  const handleAddAnswerRow = () => {
    if (answers.length >= 8) return;
    setAnswers([...answers, { text: '', points: '5', aliases: '' }]);
  };

  const handleRemoveAnswerRow = (idx: number) => {
    if (answers.length <= 2) return;
    setAnswers(answers.filter((_, i) => i !== idx));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setFormError('Please enter a survey question prompt.');
      return;
    }

    const validAnswers: AnswerSlot[] = answers
      .map((row, idx) => {
        const text = row.text.trim();
        const pts = Math.max(1, parseInt(row.points, 10) || 0);
        const aliases = row.aliases
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        return {
          id: `ans-${Date.now()}-${idx}`,
          text,
          points: pts,
          aliases,
        };
      })
      .filter((a) => a.text.length > 0)
      .sort((a, b) => b.points - a.points);

    if (validAnswers.length < 2) {
      setFormError('Please add at least 2 valid answers with point values.');
      return;
    }

    if (editingId === 'NEW') {
      const newQuestion: SurveyQuestion = {
        id: `q-${Date.now()}`,
        category: category.trim() || 'Custom Round',
        prompt: cleanPrompt,
        answers: validAnswers,
      };
      onSaveQuestions([...questions, newQuestion]);
    } else if (editingId) {
      const updated = questions.map((q) =>
        q.id === editingId
          ? {
              ...q,
              category: category.trim() || 'Custom Round',
              prompt: cleanPrompt,
              answers: validAnswers,
            }
          : q
      );
      onSaveQuestions(updated);
    }

    setEditingId(null);
    setFormError(null);
  };

  const handleDeleteQuestion = (id: string) => {
    if (questions.length <= 1) return;
    onSaveQuestions(questions.filter((q) => q.id !== id));
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(questions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'survey-showdown-questions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setFormError('JSON must be a non-empty array of questions.');
        return;
      }
      const sanitized: SurveyQuestion[] = parsed.map((item, qIdx) => ({
        id: item.id || `imported-${Date.now()}-${qIdx}`,
        category: String(item.category || 'Imported'),
        prompt: String(item.prompt || 'Untitled Question'),
        answers: Array.isArray(item.answers)
          ? item.answers.slice(0, 8).map((ans: Partial<AnswerSlot>, aIdx: number) => ({
              id: ans.id || `imp-a-${qIdx}-${aIdx}`,
              text: String(ans.text || 'Answer'),
              points: Number(ans.points) || 10,
              aliases: Array.isArray(ans.aliases) ? ans.aliases.map(String) : [],
            }))
          : [],
      }));
      if (sanitized.some((q) => q.answers.length < 2)) {
        setFormError('Each imported question must have at least 2 answers.');
        return;
      }
      onSaveQuestions(sanitized);
      setShowJsonImport(false);
      setJsonInput('');
      setFormError(null);
    } catch {
      setFormError('Invalid JSON format. Please check your syntax.');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-[#0D1B38] border border-[#28457E] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#203869]">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-wide text-white uppercase">
              Event Question Deck
            </h2>
            <p className="text-xs text-slate-400">
              {questions.length} rounds loaded · Click a round to jump straight to it
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close question deck"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#172C59] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {editingId ? (
            <form onSubmit={handleSaveForm} className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-amber-300">
                  {editingId === 'NEW' ? 'Add New Survey Question' : 'Edit Survey Question'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-sm text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-sm text-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Survey Question
                  </label>
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Name something people bring to a picnic."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#081226] border border-[#2C4D8C] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Food & Fun"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#081226] border border-[#2C4D8C] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    Survey Answers (up to 8, auto-sorted by points)
                  </span>
                  {answers.length < 8 && (
                    <button
                      type="button"
                      onClick={handleAddAnswerRow}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Answer Slot
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {answers.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5 sm:col-span-5">
                        <input
                          type="text"
                          value={row.text}
                          onChange={(e) => {
                            const copy = [...answers];
                            copy[idx].text = e.target.value;
                            setAnswers(copy);
                          }}
                          placeholder={`Answer ${idx + 1}`}
                          className="w-full px-3 py-2 rounded-lg bg-[#081226] border border-[#2C4D8C] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={row.points}
                          onChange={(e) => {
                            const copy = [...answers];
                            copy[idx].points = e.target.value;
                            setAnswers(copy);
                          }}
                          placeholder="Pts"
                          className="w-full px-3 py-2 rounded-lg bg-[#081226] border border-[#2C4D8C] text-sm font-mono-num text-amber-300 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-4">
                        <input
                          type="text"
                          value={row.aliases}
                          onChange={(e) => {
                            const copy = [...answers];
                            copy[idx].aliases = e.target.value;
                            setAnswers(copy);
                          }}
                          placeholder="Synonyms (comma separated)"
                          className="w-full px-3 py-2 rounded-lg bg-[#081226] border border-[#2C4D8C] text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveAnswerRow(idx)}
                          disabled={answers.length <= 2}
                          aria-label="Remove answer row"
                          className="p-2 text-slate-400 hover:text-red-400 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-[#172C59] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer"
                >
                  Save Question
                </button>
              </div>
            </form>
          ) : showJsonImport ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Import Question Pack (JSON)</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowJsonImport(false);
                    setFormError(null);
                  }}
                  className="text-sm text-slate-400 hover:text-white cursor-pointer"
                >
                  Back to Deck
                </button>
              </div>
              {formError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-sm text-red-200">
                  {formError}
                </div>
              )}
              <textarea
                rows={8}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='[{"category":"Party","prompt":"Name something loud.","answers":[{"text":"Music","points":40},{"text":"Fireworks","points":30}]}]'
                className="w-full p-3 rounded-lg bg-[#081226] border border-[#2C4D8C] text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleImportJson}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer"
                >
                  Load Questions
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={startNewQuestion}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-400 text-slate-950 text-sm font-semibold hover:bg-amber-300 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Question
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowJsonImport(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#152B56] hover:bg-[#1C3870] text-xs font-medium text-slate-200 border border-[#2C4D8C] cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#152B56] hover:bg-[#1C3870] text-xs font-medium text-slate-200 border border-[#2C4D8C] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={onResetDefaults}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#152B56] hover:bg-[#1C3870] text-xs font-medium text-slate-300 border border-[#2C4D8C] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Defaults
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[#1E3563] border border-[#243F75] rounded-xl overflow-hidden bg-[#0A1630]">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <div
                      key={q.id}
                      className={`flex items-center justify-between gap-4 p-4 transition-colors ${
                        isCurrent ? 'bg-[#152C59]' : 'hover:bg-[#112349]'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-mono-num font-semibold text-amber-300">
                            Round {idx + 1}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{q.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{q.answers.length} answers</span>
                          {isCurrent && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-400 font-semibold">Active</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm sm:text-base font-medium text-white truncate">
                          {q.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectRound(idx);
                            onClose();
                          }}
                          title="Play this round"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E3B75] hover:bg-amber-400 hover:text-slate-950 text-xs font-semibold text-white transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditQuestion(q)}
                          aria-label={`Edit round ${idx + 1}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E3B75] transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          disabled={questions.length <= 1}
                          aria-label={`Delete round ${idx + 1}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-[#1E3B75] disabled:opacity-30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
