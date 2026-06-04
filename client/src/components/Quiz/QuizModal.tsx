import { useMemo, useState, useCallback } from "react";
import { useGraphStore } from "../../stores/graphStore";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import type { Character } from "../../types";
import "./QuizModal.css";

interface QuizQuestion {
  quizChar: {
    id: number;
    name: string;
    image: string;
    seiyuuName: string;
  };
  animeTitle: string;
  animeCover?: string;
  options: Character[];
  correctCharId: number;
}

type Feedback = "idle" | "correct" | "wrong";

export default function QuizModal() {
  const { quizAnime, closeQuiz } = useUiStore();
  const { characters: canvasChars, anime: canvasAnime, addAnime } = useGraphStore();
  const { user } = useAuthStore();

  // One question per (quiz_char × canvas_anime) pair sharing a VA
  const questions: QuizQuestion[] = useMemo(() => {
    if (!quizAnime) return [];

    const vaToCanvasChars = new Map<number, Character[]>();
    for (const c of canvasChars) {
      if (!c.seiyuuId) continue;
      const arr = vaToCanvasChars.get(c.seiyuuId) ?? [];
      arr.push(c);
      vaToCanvasChars.set(c.seiyuuId, arr);
    }

    const animeMap = new Map(canvasAnime.map((a) => [a.anilistId, a]));
    const charsByAnime = new Map<number, Character[]>();
    for (const c of canvasChars) {
      const arr = charsByAnime.get(c.anilistAnimeId) ?? [];
      arr.push(c);
      charsByAnime.set(c.anilistAnimeId, arr);
    }

    const result: QuizQuestion[] = [];

    for (const qChar of quizAnime.characters) {
      if (!qChar.seiyuuId) continue;
      const canvasMatches = vaToCanvasChars.get(qChar.seiyuuId);
      if (!canvasMatches) continue;

      // One question per canvas anime that has a matching VA character
      const seenAnime = new Set<number>();
      for (const cc of canvasMatches) {
        if (seenAnime.has(cc.anilistAnimeId)) continue;
        seenAnime.add(cc.anilistAnimeId);

        const anime = animeMap.get(cc.anilistAnimeId);
        const options = charsByAnime.get(cc.anilistAnimeId);
        if (!anime || !options || options.length === 0) continue;

        result.push({
          quizChar: {
            id: qChar.id,
            name: qChar.name,
            image: qChar.image,
            seiyuuName: qChar.seiyuuName ?? "Unknown VA",
          },
          animeTitle: anime.title ?? "Unknown",
          animeCover: anime.coverImage,
          options,
          correctCharId: cc.anilistCharacterId,
        });
      }
    }

    return result;
  }, [quizAnime, canvasChars, canvasAnime]);

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [disabledIds, setDisabledIds] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const [adding, setAdding] = useState(false);

  const currentQ = questions[current];

  const handleConfirm = useCallback(() => {
    if (selected == null || feedback !== "idle" || !currentQ) return;

    if (selected === currentQ.correctCharId) {
      setFeedback("correct");
      setTimeout(() => {
        if (current + 1 >= questions.length) {
          setDone(true);
        } else {
          setCurrent((c) => c + 1);
          setSelected(null);
          setFeedback("idle");
          setDisabledIds(new Set());
        }
      }, 900);
    } else {
      // Eliminate 2 random wrong options (not correct, not already disabled, not just selected)
      const candidates = currentQ.options.filter(
        (c) =>
          c.anilistCharacterId !== currentQ.correctCharId &&
          !disabledIds.has(c.anilistCharacterId) &&
          c.anilistCharacterId !== selected
      );
      const toDisable = candidates
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map((c) => c.anilistCharacterId);

      setFeedback("wrong");
      setDisabledIds((prev) => new Set([...prev, ...toDisable]));
      setTimeout(() => {
        setSelected(null);
        setFeedback("idle");
      }, 800);
    }
  }, [selected, feedback, current, questions, currentQ, disabledIds]);

  const handleAddToCanvas = async () => {
    if (!quizAnime) return;
    setAdding(true);
    try {
      await addAnime(quizAnime.id, user?.isGuest ?? true);
    } catch {}
    setAdding(false);
    closeQuiz();
  };

  if (!quizAnime) return null;

  if (questions.length === 0) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-box quiz-no-connections">
          <button className="modal-close quiz-close" onClick={closeQuiz}>✕</button>
          <div className="quiz-no-icon">🔍</div>
          <h2>No connections found</h2>
          <p><strong>{quizAnime.title}</strong> shares no voice actors with your current canvas.</p>
          <p>Add more anime first, or choose a different anime for the quiz.</p>
          <button className="btn-primary" onClick={closeQuiz}>Go back</button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-box quiz-complete">
          <div className="quiz-complete-icon">🎉</div>
          <h2>Quiz Complete!</h2>
          <p>You identified all <strong>{questions.length}</strong> shared voice actor connections.</p>
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
          <div
            className="quiz-progress-fill"
            style={{ width: `${(current / questions.length) * 100}%` }}
          />
        </div>
        <div className="quiz-progress-label">{current + 1} / {questions.length}</div>

        {/* Quiz character card */}
        <div className={`quiz-char-card${feedback === "wrong" ? " shake" : ""}`}>
          {currentQ.quizChar.image && (
            <img src={currentQ.quizChar.image} alt={currentQ.quizChar.name} className="quiz-char-img" />
          )}
          <div className="quiz-char-name">{currentQ.quizChar.name}</div>
          <div className="quiz-question">
            In <strong>{currentQ.animeTitle}</strong>, which character shares the same voice actor?
          </div>
        </div>

        {/* Feedback */}
        {feedback === "correct" && (
          <div className="quiz-feedback quiz-feedback-correct">
            ✓ Correct! — CV: {currentQ.quizChar.seiyuuName}
          </div>
        )}
        {feedback === "wrong" && (
          <div className="quiz-feedback quiz-feedback-wrong">
            ✗ Wrong — 2 options eliminated!
          </div>
        )}

        {/* Answer grid — all characters from the target anime */}
        <div className="quiz-anime-section">
          <div className="quiz-anime-header">
            {currentQ.animeCover && (
              <img src={currentQ.animeCover} alt={currentQ.animeTitle} className="quiz-anime-mini-cover" />
            )}
            <span className="quiz-anime-title">{currentQ.animeTitle}</span>
          </div>
          <div className="quiz-char-grid">
            {currentQ.options.map((char) => {
              const isSelected = selected === char.anilistCharacterId;
              const isEliminated = disabledIds.has(char.anilistCharacterId);
              const isCorrect =
                feedback === "correct" && char.anilistCharacterId === currentQ.correctCharId;
              const isWrong = feedback === "wrong" && isSelected;
              return (
                <button
                  key={char.anilistCharacterId}
                  className={[
                    "quiz-char-btn",
                    isSelected ? "selected" : "",
                    isCorrect ? "correct" : "",
                    isWrong ? "wrong" : "",
                    isEliminated ? "eliminated" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    !isEliminated && feedback === "idle" &&
                    setSelected(char.anilistCharacterId)
                  }
                  disabled={isEliminated || feedback !== "idle"}
                  title={char.characterName}
                >
                  <div className="quiz-char-bubble">
                    {char.characterImage ? (
                      <img src={char.characterImage} alt={char.characterName} />
                    ) : (
                      <div className="quiz-char-initial">{char.characterName[0]}</div>
                    )}
                  </div>
                  <span className="quiz-char-label">{char.characterName}</span>
                </button>
              );
            })}
          </div>
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
