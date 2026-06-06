import { useState, useMemo, useCallback } from "react";
import { useGraphStore } from "../../stores/graphStore";
import { useUiStore } from "../../stores/uiStore";
import type { Character } from "../../types";
import "./VaQuizModal.css";

type Difficulty = "easy" | "medium" | "hard";
type Phase = "pick" | "playing" | "done";
type Feedback = "idle" | "correct" | "wrong";

const CHOICES: Record<Difficulty, number> = { easy: 4, medium: 3, hard: 2 };
const TOTAL_Q = 10;

interface VaQuestion {
  presented: Character;
  choices: Character[];
  correctCharId: number;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function generateQuestions(
  characters: Character[],
  seiyuuGroups: ReturnType<typeof useGraphStore.getState>["seiyuuGroups"],
  numChoices: number
): VaQuestion[] {
  const validGroups = seiyuuGroups.filter(
    (g) => new Set(g.characters.map((c) => c.anilistAnimeId)).size > 1
  );
  if (validGroups.length === 0) return [];

  const usedPairs = new Set<string>();
  const questions: VaQuestion[] = [];

  for (let attempt = 0; attempt < TOTAL_Q * 30 && questions.length < TOTAL_Q; attempt++) {
    const group = validGroups[Math.floor(Math.random() * validGroups.length)];
    const animeIds = [...new Set(group.characters.map((c) => c.anilistAnimeId))];
    if (animeIds.length < 2) continue;

    const [animeA, animeB] = shuffle(animeIds);
    const charsA = group.characters.filter((c) => c.anilistAnimeId === animeA);
    const charsB = group.characters.filter((c) => c.anilistAnimeId === animeB);

    const presented = charsA[Math.floor(Math.random() * charsA.length)];
    const correct = charsB[Math.floor(Math.random() * charsB.length)];

    const pairKey = `${presented.anilistCharacterId}-${correct.anilistCharacterId}`;
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    const wrongPool = shuffle(
      characters.filter(
        (c) =>
          c.seiyuuId !== group.seiyuuId &&
          c.anilistCharacterId !== presented.anilistCharacterId
      )
    );
    if (wrongPool.length < numChoices - 1) continue;

    const choices = shuffle([correct, ...wrongPool.slice(0, numChoices - 1)]);
    questions.push({ presented, choices, correctCharId: correct.anilistCharacterId });
  }

  return questions;
}

export default function VaQuizModal() {
  const { closeVaQuiz } = useUiStore();
  const { characters, seiyuuGroups } = useGraphStore();

  const [phase, setPhase] = useState<Phase>("pick");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<VaQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [score, setScore] = useState(0);

  const noConnections = useMemo(
    () => seiyuuGroups.filter((g) => new Set(g.characters.map((c) => c.anilistAnimeId)).size > 1).length === 0,
    [seiyuuGroups]
  );

  const startQuiz = useCallback((diff: Difficulty) => {
    const qs = generateQuestions(characters, seiyuuGroups, CHOICES[diff]);
    if (qs.length === 0) return;
    setDifficulty(diff);
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setFeedback("idle");
    setScore(0);
    setPhase("playing");
  }, [characters, seiyuuGroups]);

  const handleSelect = useCallback((charId: number) => {
    if (feedback !== "idle" || selected !== null) return;
    setSelected(charId);

    const q = questions[current];
    if (charId === q.correctCharId) {
      setFeedback("correct");
      setScore((s) => s + 1);
      setTimeout(() => {
        if (current + 1 >= questions.length) {
          setPhase("done");
        } else {
          setCurrent((c) => c + 1);
          setSelected(null);
          setFeedback("idle");
        }
      }, 900);
    } else {
      setFeedback("wrong");
      setTimeout(() => {
        if (current + 1 >= questions.length) {
          setPhase("done");
        } else {
          setCurrent((c) => c + 1);
          setSelected(null);
          setFeedback("idle");
        }
      }, 900);
    }
  }, [feedback, selected, questions, current]);

  const restart = useCallback(() => {
    if (difficulty) startQuiz(difficulty);
  }, [difficulty, startQuiz]);

  const currentQ = questions[current];

  return (
    <div className="quiz-overlay" onClick={closeVaQuiz}>
      <div className="vaquiz-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close vaquiz-close" onClick={closeVaQuiz}>✕</button>

        {/* ── Difficulty picker ── */}
        {phase === "pick" && (
          <div className="vaquiz-pick">
            <h2 className="vaquiz-title">VA Quiz</h2>
            <p className="vaquiz-subtitle">
              {noConnections
                ? "Add at least 2 anime that share voice actors to play."
                : "Which character shares the same voice actor? Choose your difficulty."}
            </p>
            {!noConnections && (
              <div className="vaquiz-difficulties">
                <button className="vaquiz-diff-btn easy" onClick={() => startQuiz("easy")}>
                  <span className="diff-label">Easy</span>
                  <span className="diff-hint">4 choices</span>
                </button>
                <button className="vaquiz-diff-btn medium" onClick={() => startQuiz("medium")}>
                  <span className="diff-label">Medium</span>
                  <span className="diff-hint">3 choices</span>
                </button>
                <button className="vaquiz-diff-btn hard" onClick={() => startQuiz("hard")}>
                  <span className="diff-label">Hard</span>
                  <span className="diff-hint">2 choices</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Playing ── */}
        {phase === "playing" && currentQ && (
          <>
            <div className="vaquiz-header">
              <span className="vaquiz-diff-badge">{difficulty}</span>
              <span className="vaquiz-counter">{current + 1} / {questions.length}</span>
            </div>

            <div className="vaquiz-progress">
              <div className="vaquiz-progress-fill" style={{ width: `${(current / questions.length) * 100}%` }} />
            </div>

            {/* Presented character */}
            <div className={`vaquiz-card${feedback === "wrong" ? " shake" : ""}`}>
              {currentQ.presented.characterImage ? (
                <img src={currentQ.presented.characterImage} alt={currentQ.presented.characterName} className="vaquiz-char-img" />
              ) : (
                <div className="vaquiz-char-initial">{currentQ.presented.characterName[0]}</div>
              )}
              <div className="vaquiz-char-name">{currentQ.presented.characterName}</div>
              <div className="vaquiz-question">Which character shares their voice actor?</div>
            </div>

            {/* Feedback */}
            {feedback === "correct" && (
              <div className="vaquiz-feedback correct">
                Correct! CV: {currentQ.presented.seiyuuName ?? "Unknown VA"}
              </div>
            )}
            {feedback === "wrong" && (
              <div className="vaquiz-feedback wrong">Wrong answer</div>
            )}

            {/* Choices */}
            <div className="vaquiz-choices">
              {currentQ.choices.map((char) => {
                const isSelected = selected === char.anilistCharacterId;
                const isCorrect = feedback !== "idle" && char.anilistCharacterId === currentQ.correctCharId;
                const isWrong = feedback === "wrong" && isSelected;
                return (
                  <button
                    key={char.anilistCharacterId}
                    className={[
                      "vaquiz-choice",
                      isSelected ? "selected" : "",
                      isCorrect ? "correct" : "",
                      isWrong ? "wrong" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => handleSelect(char.anilistCharacterId)}
                    disabled={feedback !== "idle"}
                  >
                    <div className="vaquiz-choice-bubble">
                      {char.characterImage ? (
                        <img src={char.characterImage} alt={char.characterName} />
                      ) : (
                        <span>{char.characterName[0]}</span>
                      )}
                    </div>
                    <span className="vaquiz-choice-name">{char.characterName}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Results ── */}
        {phase === "done" && (
          <div className="vaquiz-done">
            <div className="vaquiz-score-ring">
              <span className="vaquiz-score-num">{score}</span>
              <span className="vaquiz-score-total">/{questions.length}</span>
            </div>
            <div className="vaquiz-score-label">
              {score === questions.length ? "Perfect score!" : score >= questions.length * 0.7 ? "Great job!" : score >= questions.length * 0.4 ? "Not bad!" : "Keep practicing!"}
            </div>
            <div className="vaquiz-done-actions">
              <button className="nav-btn nav-btn-quiz" onClick={restart}>Play again</button>
              <button className="nav-btn nav-btn-ghost" onClick={() => setPhase("pick")}>Change difficulty</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
