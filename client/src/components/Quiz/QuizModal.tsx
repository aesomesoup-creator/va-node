import { useMemo, useState, useCallback } from "react";
import { useGraphStore } from "../../stores/graphStore";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import type { AnimeDetailRaw } from "../../api/anilist";
import "./QuizModal.css";

interface QuizChar {
  id: number;
  name: string;
  image?: string;
  seiyuuName: string;
  correctAnimeIds: number[]; // canvas anime that share this VA
}

type Feedback = "idle" | "correct" | "wrong";

export default function QuizModal() {
  const { quizAnime, closeQuiz } = useUiStore();
  const { characters: canvasChars, anime: canvasAnime, addAnime } = useGraphStore();
  const { user } = useAuthStore();

  const quizChars: QuizChar[] = useMemo(() => {
    if (!quizAnime) return [];
    // Build map seiyuuId → canvas animeIds
    const vaMap = new Map<number, Set<number>>();
    for (const c of canvasChars) {
      if (!c.seiyuuId) continue;
      if (!vaMap.has(c.seiyuuId)) vaMap.set(c.seiyuuId, new Set());
      vaMap.get(c.seiyuuId)!.add(c.anilistAnimeId);
    }
    return quizAnime.characters
      .filter((c) => c.seiyuuId && vaMap.has(c.seiyuuId!))
      .map((c) => ({
        id: c.id,
        name: c.name,
        image: c.image,
        seiyuuName: c.seiyuuName ?? "Unknown VA",
        correctAnimeIds: Array.from(vaMap.get(c.seiyuuId!) ?? []),
      }));
  }, [quizAnime, canvasChars]);

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [done, setDone] = useState(false);
  const [adding, setAdding] = useState(false);

  const currentChar = quizChars[current];

  const handleConfirm = useCallback(() => {
    if (selected == null || feedback !== "idle") return;
    if (currentChar.correctAnimeIds.includes(selected)) {
      setFeedback("correct");
      setTimeout(() => {
        if (current + 1 >= quizChars.length) {
          setDone(true);
        } else {
          setCurrent((c) => c + 1);
          setSelected(null);
          setFeedback("idle");
        }
      }, 900);
    } else {
      setFeedback("wrong");
      setTimeout(() => {
        setSelected(null);
        setFeedback("idle");
      }, 1000);
    }
  }, [selected, feedback, current, quizChars.length, currentChar]);

  const handleAddToCanvas = async () => {
    if (!quizAnime) return;
    setAdding(true);
    try {
      const isGuest = user?.isGuest ?? true;
      await addAnime(quizAnime.id, isGuest);
    } catch {}
    setAdding(false);
    closeQuiz();
  };

  if (!quizAnime) return null;

  // No connections found
  if (quizChars.length === 0) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-box quiz-no-connections">
          <button className="modal-close quiz-close" onClick={closeQuiz}>✕</button>
          <div className="quiz-no-icon">🔍</div>
          <h2>No connections found</h2>
          <p>
            <strong>{quizAnime.title}</strong> has no characters whose voice actor
            also appears in your current graph.
          </p>
          <p>Add more anime to your canvas first, or choose a different anime for the quiz.</p>
          <button className="btn-primary" onClick={closeQuiz}>Go back</button>
        </div>
      </div>
    );
  }

  // Completion screen
  if (done) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-box quiz-complete">
          <div className="quiz-complete-icon">🎉</div>
          <h2>Quiz Complete!</h2>
          <p>You identified all <strong>{quizChars.length}</strong> shared voice actor connections.</p>
          <p className="quiz-anime-name">{quizAnime.title} is ready to join your graph.</p>
          <button className="btn-add-final" onClick={handleAddToCanvas} disabled={adding}>
            {adding ? <span className="mini-spinner" /> : "➕ Add to canvas"}
          </button>
          <button className="btn-skip" onClick={closeQuiz}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-overlay">
      <div className="quiz-box">
        <button className="modal-close quiz-close" onClick={closeQuiz}>✕</button>

        {/* Progress */}
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${(current / quizChars.length) * 100}%` }} />
        </div>
        <div className="quiz-progress-label">{current + 1} / {quizChars.length}</div>

        {/* Character card */}
        <div className={`quiz-char-card${feedback === "wrong" ? " shake" : ""}`}>
          {currentChar.image && (
            <img src={currentChar.image} alt={currentChar.name} className="quiz-char-img" />
          )}
          <div className="quiz-char-name">{currentChar.name}</div>
          <div className="quiz-question">
            Which of your anime has a character voiced by the same voice actor?
          </div>
        </div>

        {/* Feedback */}
        {feedback === "correct" && (
          <div className="quiz-feedback quiz-feedback-correct">
            ✓ Correct! — CV: {currentChar.seiyuuName}
          </div>
        )}
        {feedback === "wrong" && (
          <div className="quiz-feedback quiz-feedback-wrong">
            ✗ Wrong — try again!
          </div>
        )}

        {/* Canvas anime options */}
        <div className="quiz-options">
          {canvasAnime.map((a) => {
            const isSelected = selected === a.anilistId;
            const isCorrect = feedback === "correct" && currentChar.correctAnimeIds.includes(a.anilistId);
            const isWrong   = feedback === "wrong" && isSelected;
            return (
              <button
                key={a.anilistId}
                className={`quiz-option${isSelected ? " selected" : ""}${isCorrect ? " correct" : ""}${isWrong ? " wrong" : ""}`}
                onClick={() => feedback === "idle" && setSelected(a.anilistId)}
                disabled={feedback !== "idle"}
              >
                {a.coverImage
                  ? <img src={a.coverImage} alt={a.title ?? ""} className="quiz-option-img" />
                  : <div className="quiz-option-placeholder">{(a.title ?? "?")[0]}</div>}
                <span className="quiz-option-title">{a.title ?? "Unknown"}</span>
              </button>
            );
          })}
        </div>

        <button
          className="btn-confirm-quiz"
          disabled={selected == null || feedback !== "idle"}
          onClick={handleConfirm}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
