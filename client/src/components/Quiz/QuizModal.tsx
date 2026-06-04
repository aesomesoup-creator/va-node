import { useMemo, useState, useCallback } from "react";
import { useGraphStore } from "../../stores/graphStore";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import "./QuizModal.css";

interface QuizChar {
  id: number;
  name: string;
  image?: string;
  seiyuuName: string;
  correctCharIds: number[]; // canvas character IDs that share this VA
}

type Feedback = "idle" | "correct" | "wrong";

export default function QuizModal() {
  const { quizAnime, closeQuiz } = useUiStore();
  const { characters: canvasChars, anime: canvasAnime, addAnime } = useGraphStore();
  const { user } = useAuthStore();

  // Build quiz questions
  const quizChars: QuizChar[] = useMemo(() => {
    if (!quizAnime) return [];
    // Map seiyuuId → canvas character IDs
    const vaToCharIds = new Map<number, number[]>();
    for (const c of canvasChars) {
      if (!c.seiyuuId) continue;
      const ids = vaToCharIds.get(c.seiyuuId) ?? [];
      ids.push(c.anilistCharacterId);
      vaToCharIds.set(c.seiyuuId, ids);
    }
    return quizAnime.characters
      .filter((c) => c.seiyuuId && vaToCharIds.has(c.seiyuuId!))
      .map((c) => ({
        id: c.id,
        name: c.name,
        image: c.image,
        seiyuuName: c.seiyuuName ?? "Unknown VA",
        correctCharIds: vaToCharIds.get(c.seiyuuId!) ?? [],
      }));
  }, [quizAnime, canvasChars]);

  // Canvas characters grouped by anime
  const charsByAnime = useMemo(() =>
    canvasAnime
      .map((a) => ({
        anime: a,
        chars: canvasChars.filter((c) => c.anilistAnimeId === a.anilistId),
      }))
      .filter((g) => g.chars.length > 0),
    [canvasAnime, canvasChars]
  );

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null); // charId
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [done, setDone] = useState(false);
  const [adding, setAdding] = useState(false);

  const currentChar = quizChars[current];

  const handleConfirm = useCallback(() => {
    if (selected == null || feedback !== "idle" || !currentChar) return;
    if (currentChar.correctCharIds.includes(selected)) {
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
  }, [selected, feedback, current, quizChars, currentChar]);

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

  if (quizChars.length === 0) {
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

        {/* Quiz character */}
        <div className={`quiz-char-card${feedback === "wrong" ? " shake" : ""}`}>
          {currentChar.image && (
            <img src={currentChar.image} alt={currentChar.name} className="quiz-char-img" />
          )}
          <div className="quiz-char-name">{currentChar.name}</div>
          <div className="quiz-question">
            Which character on your canvas shares the same voice actor?
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

        {/* Canvas characters grouped by anime */}
        <div className="quiz-anime-groups">
          {charsByAnime.map(({ anime, chars }) => (
            <div key={anime.anilistId} className="quiz-anime-section">
              <div className="quiz-anime-header">
                {anime.coverImage && (
                  <img src={anime.coverImage} alt={anime.title ?? ""} className="quiz-anime-mini-cover" />
                )}
                <span className="quiz-anime-title">{anime.title ?? "Unknown"}</span>
              </div>
              <div className="quiz-char-grid">
                {chars.map((char) => {
                  const isSelected = selected === char.anilistCharacterId;
                  const isCorrect  = feedback === "correct" && currentChar.correctCharIds.includes(char.anilistCharacterId);
                  const isWrong    = feedback === "wrong" && isSelected;
                  return (
                    <button
                      key={char.anilistCharacterId}
                      className={`quiz-char-btn${isSelected ? " selected" : ""}${isCorrect ? " correct" : ""}${isWrong ? " wrong" : ""}`}
                      onClick={() => feedback === "idle" && setSelected(char.anilistCharacterId)}
                      disabled={feedback !== "idle"}
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
          ))}
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
