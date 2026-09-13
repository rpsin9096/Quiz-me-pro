import { useState, ChangeEvent } from "react";
import {
  Plus,
  Trash2,
  Sparkles,
  Save,
  FileDown,
  FileUp,
  Check,
  AlertCircle,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { QuestionType } from "@/types";
import { triggerHaptic, soundManager } from "@/lib/sound";
import { storageService } from "@/lib/storage";

interface QuestionDraft {
  questionText: string;
  questionType: QuestionType;
  options: string[];
  correctAnswers: string[];
  explanation: string;
  hint: string;
}

interface QuizBuilderProps {
  onQuizCreated: () => void;
  onCancel: () => void;
}

export function QuizBuilder({ onQuizCreated, onCancel }: QuizBuilderProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Computer Science");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      questionText: "",
      questionType: "multiple_choice",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswers: ["Option A"],
      explanation: "",
      hint: "",
    },
  ]);

  // Topic Generator Modal
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genCount, setGenCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleAddQuestion = () => {
    triggerHaptic("light");
    setQuestions((prev) => [
      ...prev,
      {
        questionText: "",
        questionType: "multiple_choice",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswers: ["Option A"],
        explanation: "",
        hint: "",
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    triggerHaptic("medium");
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const handleOptionTextChange = (qIdx: number, optIdx: number, val: string) => {
    const q = questions[qIdx];
    const prevOptionVal = q.options[optIdx];
    const newOptions = [...q.options];
    newOptions[optIdx] = val;
    // Update correctAnswers if it matches the edited option
    const newCorrect = q.correctAnswers.map((ca) => (ca === prevOptionVal ? val : ca));
    updateQuestion(qIdx, { options: newOptions, correctAnswers: newCorrect });
  };

  const handleAddOption = (qIdx: number) => {
    triggerHaptic("light");
    const q = questions[qIdx];
    if (q.options.length >= 6) return;
    const newOptions = [...q.options, `Option ${String.fromCharCode(65 + q.options.length)}`];
    updateQuestion(qIdx, { options: newOptions });
  };

  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    triggerHaptic("light");
    const q = questions[qIdx];
    if (q.options.length <= 2) return;
    const removedVal = q.options[optIdx];
    const newOptions = q.options.filter((_, i) => i !== optIdx);
    const newCorrect = q.correctAnswers.filter((ca) => ca !== removedVal);
    updateQuestion(qIdx, {
      options: newOptions,
      correctAnswers: newCorrect.length > 0 ? newCorrect : [newOptions[0]],
    });
  };

  const handleToggleCorrectAnswer = (qIdx: number, optionVal: string) => {
    triggerHaptic("light");
    const q = questions[qIdx];
    if (q.questionType === "multi_select") {
      const exists = q.correctAnswers.includes(optionVal);
      const updated = exists
        ? q.correctAnswers.filter((a) => a !== optionVal)
        : [...q.correctAnswers, optionVal];
      updateQuestion(qIdx, { correctAnswers: updated });
    } else {
      updateQuestion(qIdx, { correctAnswers: [optionVal] });
    }
  };

  // Smart Topic Generator
  const handleGenerateTopicQuestions = () => {
    if (!genTopic.trim()) return;
    setIsGenerating(true);
    triggerHaptic("medium");

    setTimeout(() => {
      const generated = storageService.generateTopicQuestions(genTopic.trim(), genCount);
      if (!title) {
        setTitle(`${genTopic} Mastery Quiz`);
      }
      if (!description) {
        setDescription(`Comprehensive practice and test for ${genTopic}.`);
      }
      setQuestions(
        generated.map((g) => ({
          questionText: g.questionText,
          questionType: g.questionType,
          options: g.options,
          correctAnswers: g.correctAnswers,
          explanation: g.explanation,
          hint: g.hint || "",
        }))
      );
      soundManager.playCorrect();
      setIsGenerating(false);
      setIsGeneratorOpen(false);
    }, 400);
  };

  // JSON Export / Import
  const handleExportJSON = () => {
    triggerHaptic("light");
    const payload = {
      title,
      description,
      category,
      difficulty,
      timeLimitMinutes,
      passingScore,
      questions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "custom-quiz"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.difficulty) setDifficulty(parsed.difficulty);
        if (parsed.timeLimitMinutes) setTimeLimitMinutes(Number(parsed.timeLimitMinutes));
        if (parsed.passingScore) setPassingScore(Number(parsed.passingScore));
        if (Array.isArray(parsed.questions)) setQuestions(parsed.questions);
        soundManager.playCorrect();
      } catch {
        setErrorMessage("Invalid JSON file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setErrorMessage("Please enter a quiz title.");
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setErrorMessage(`Question #${i + 1} is missing the question prompt.`);
        return;
      }
      if (q.questionType !== "fill_blank" && q.correctAnswers.length === 0) {
        setErrorMessage(`Question #${i + 1} must have at least one correct answer selected.`);
        return;
      }
    }

    setErrorMessage("");
    setIsSubmitting(true);
    triggerHaptic("medium");

    try {
      storageService.createQuiz({
        title: title.trim(),
        description: description.trim(),
        category,
        difficulty,
        timeLimitMinutes: Number(timeLimitMinutes),
        passingScore: Number(passingScore),
        questionsList: questions,
      });
      soundManager.playCorrect();
      onQuizCreated();
    } catch {
      setErrorMessage("Error occurred while saving the quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="quiz-builder-container" className="max-w-4xl mx-auto px-4 py-6 sm:py-10 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Custom Quiz Creator</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Build custom quizzes with multiple question types, explanations, and instant generator.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="builder-open-generator-btn"
              onClick={() => {
                triggerHaptic("light");
                setIsGeneratorOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold min-h-[44px] touch-manipulation shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Smart Topic Generator</span>
            </button>
            <button
              id="builder-export-json-btn"
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold min-h-[44px] touch-manipulation cursor-pointer"
              title="Export as JSON"
            >
              <FileDown className="w-4 h-4" />
              <span>Export</span>
            </button>
            <label
              id="builder-import-json-label"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold min-h-[44px] touch-manipulation cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              <span>Import</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>

        {/* Quiz General Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Quiz Title *
            </label>
            <input
              id="builder-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Modern Fullstack TypeScript & React"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[48px] touch-manipulation"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Subject / Category
            </label>
            <select
              id="builder-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[48px] touch-manipulation bg-white"
            >
              <option value="Computer Science">Computer Science</option>
              <option value="Medicine & Biology">Medicine & Biology</option>
              <option value="Cybersecurity">Cybersecurity</option>
              <option value="Science & Physics">Science & Physics</option>
              <option value="World History">World History</option>
              <option value="General Knowledge">General Knowledge</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Description (Optional)
            </label>
            <input
              id="builder-description-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what this quiz tests..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[48px] touch-manipulation"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["beginner", "intermediate", "advanced"].map((d) => (
                <button
                  key={d}
                  id={`diff-btn-${d}`}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold capitalize min-h-[44px] touch-manipulation border cursor-pointer ${
                    difficulty === d
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Time Limit (mins)
              </label>
              <input
                id="builder-timelimit-input"
                type="number"
                min="1"
                max="120"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[48px] touch-manipulation"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pass Score (%)
              </label>
              <input
                id="builder-passscore-input"
                type="number"
                min="1"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[48px] touch-manipulation"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6 mb-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Questions ({questions.length})</span>
          </h3>
          <button
            id="builder-add-question-top-btn"
            onClick={handleAddQuestion}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs min-h-[44px] touch-manipulation cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>

        {questions.map((q, qIdx) => (
          <div
            key={qIdx}
            id={`builder-question-card-${qIdx}`}
            className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-sm relative group"
          >
            {/* Header: Number & Type & Remove */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                Question #{qIdx + 1}
              </span>
              <div className="flex items-center gap-2">
                <select
                  id={`qtype-select-${qIdx}`}
                  value={q.questionType}
                  onChange={(e) =>
                    updateQuestion(qIdx, {
                      questionType: e.target.value as QuestionType,
                      options:
                        e.target.value === "true_false"
                          ? ["True", "False"]
                          : e.target.value === "fill_blank"
                          ? []
                          : q.options.length > 0
                          ? q.options
                          : ["Option A", "Option B"],
                      correctAnswers:
                        e.target.value === "true_false"
                          ? ["True"]
                          : q.correctAnswers.length > 0
                          ? [q.correctAnswers[0]]
                          : [],
                    })
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 min-h-[38px] touch-manipulation cursor-pointer"
                >
                  <option value="multiple_choice">Multiple Choice (Single)</option>
                  <option value="multi_select">Multi-Select (Multiple)</option>
                  <option value="true_false">True / False</option>
                  <option value="fill_blank">Fill in the Blank</option>
                </select>
                {questions.length > 1 && (
                  <button
                    id={`remove-question-btn-${qIdx}`}
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl min-h-[38px] min-w-[38px] flex items-center justify-center touch-manipulation cursor-pointer"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Prompt input */}
            <div className="mb-4">
              <textarea
                id={`qprompt-input-${qIdx}`}
                rows={2}
                value={q.questionText}
                onChange={(e) => updateQuestion(qIdx, { questionText: e.target.value })}
                placeholder="Enter your question prompt..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium touch-manipulation"
              />
            </div>

            {/* Options selection */}
            {q.questionType !== "fill_blank" ? (
              <div className="space-y-2 mb-4">
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  Options (Click radio / checkbox icon to mark correct answers):
                </div>
                {q.options.map((opt, optIdx) => {
                  const isCorrect = q.correctAnswers.includes(opt);
                  return (
                    <div key={optIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        id={`mark-correct-${qIdx}-${optIdx}`}
                        onClick={() => handleToggleCorrectAnswer(qIdx, opt)}
                        className={`w-7 h-7 rounded-${
                          q.questionType === "multi_select" ? "md" : "full"
                        } border flex items-center justify-center shrink-0 min-h-[32px] min-w-[32px] touch-manipulation transition-colors cursor-pointer ${
                          isCorrect
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-white border-slate-300 text-transparent"
                        }`}
                        title="Mark as correct answer"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                        placeholder={`Option ${optIdx + 1}`}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm min-h-[40px] touch-manipulation"
                      />
                      {q.questionType !== "true_false" && q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(qIdx, optIdx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center touch-manipulation cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {q.questionType !== "true_false" && q.options.length < 6 && (
                  <button
                    type="button"
                    onClick={() => handleAddOption(qIdx)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 py-1 px-2 touch-manipulation cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Option
                  </button>
                )}
              </div>
            ) : (
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Accepted Answer (case-insensitive fuzzy match):
                </label>
                <input
                  type="text"
                  value={q.correctAnswers[0] || ""}
                  onChange={(e) => updateQuestion(qIdx, { correctAnswers: [e.target.value] })}
                  placeholder="e.g. Mitochondria"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm min-h-[44px] touch-manipulation"
                />
              </div>
            )}

            {/* Explanation & Hint inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> Explanation / Rationale
                </label>
                <input
                  type="text"
                  value={q.explanation}
                  onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                  placeholder="Why this is the correct answer..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs min-h-[40px] touch-manipulation"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Study Hint (Optional)
                </label>
                <input
                  type="text"
                  value={q.hint}
                  onChange={(e) => updateQuestion(qIdx, { hint: e.target.value })}
                  placeholder="Helpful clue without giving away answer..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs min-h-[40px] touch-manipulation"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          id="builder-add-question-bottom-btn"
          onClick={handleAddQuestion}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center justify-center gap-2 min-h-[50px] touch-manipulation transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Another Question</span>
        </button>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div
          id="builder-error-message"
          className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs font-semibold mb-6 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Submit Controls */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          id="builder-cancel-btn"
          onClick={onCancel}
          className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm min-h-[48px] touch-manipulation cursor-pointer"
        >
          Cancel
        </button>
        <button
          id="builder-submit-btn"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm min-h-[48px] touch-manipulation shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? "Publishing Quiz..." : "Publish Custom Quiz"}</span>
        </button>
      </div>

      {/* ----------------- SMART TOPIC GENERATOR MODAL ----------------- */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>Smart Topic Quiz Generator</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Enter any subject or specialty topic (e.g., &quot;React Hooks&quot;, &quot;Python&quot;,
              &quot;SQL&quot;, &quot;Cell Biology&quot;) and we will synthesize an interactive question deck!
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Topic or Subject
                </label>
                <input
                  id="generator-topic-input"
                  type="text"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g. React Hooks, Machine Learning, World War II..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[44px] touch-manipulation"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Number of Questions
                </label>
                <div className="flex gap-2">
                  {[3, 4, 5, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGenCount(num)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border min-h-[40px] touch-manipulation cursor-pointer ${
                        genCount === num
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                id="generator-cancel-btn"
                onClick={() => setIsGeneratorOpen(false)}
                className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold min-h-[48px] touch-manipulation cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="generator-confirm-btn"
                onClick={handleGenerateTopicQuestions}
                disabled={isGenerating || !genTopic.trim()}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-bold min-h-[48px] touch-manipulation shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isGenerating ? "Generating..." : "Generate Deck"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
