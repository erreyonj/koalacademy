"use client";

import { COHORTS, type Cohort } from "@/features/behavior/types";
import { useEffect, useState } from "react";
import { fetchPlacement, logScore } from "../api";
import {
  cohortLabel,
  formatClock,
  isStaffBackdoor,
  normalizeAliasInput,
  placementCopy,
  resolveLogIdentity,
  type Placement,
  type ScoreCohort,
} from "../leaderboard";
import type { Difficulty } from "../pitches";

type Step = "ask" | "loading" | "form" | "saving" | "done" | "skipped";

type Props = {
  difficulty: Difficulty;
  elapsedSec: number;
  onSettled: () => void;
};

export function LogScoreFlow({ difficulty, elapsedSec, onSettled }: Props) {
  const [step, setStep] = useState<Step>("ask");
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [alias, setAlias] = useState("");
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [loggedAs, setLoggedAs] = useState<{
    alias: string;
    cohort: ScoreCohort;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "loading") return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchPlacement(difficulty, elapsedSec);
        if (cancelled) return;
        setPlacement(result);
        setError(null);
        setStep("form");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Leaderboard isn't available.");
        setStep("ask");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, difficulty, elapsedSec]);

  async function submit() {
    const identity = resolveLogIdentity(alias, cohort);
    if (!identity) {
      setError(
        !cohort && !isStaffBackdoor(alias)
          ? "Enter 3 initials and pick your cohort."
          : !cohort
            ? "Pick your cohort."
            : "Use exactly 3 letters (A–Z).",
      );
      return;
    }
    setStep("saving");
    setError(null);
    try {
      await logScore({
        alias: identity.alias,
        cohort: identity.cohort,
        difficulty,
        elapsedSec,
      });
      setLoggedAs(identity);
      setStep("done");
      onSettled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Leaderboard isn't available.");
      setStep("form");
    }
  }

  if (step === "skipped") {
    return null;
  }

  if (step === "done") {
    return (
      <div className="sd-log-flow" data-testid="log-score-done">
        {loggedAs && (
          <p className="sd-log-confirm">
            Logged as {loggedAs.alias} · {cohortLabel(loggedAs.cohort)} ·{" "}
            {formatClock(elapsedSec)}
          </p>
        )}
      </div>
    );
  }

  if (step === "ask" || step === "loading") {
    return (
      <div className="sd-log-flow" data-testid="log-score-ask">
        <span className="sd-eyebrow">Leaderboard</span>
        <p className="sd-log-prompt">Log your score?</p>
        {error && <p className="sd-log-error">{error}</p>}
        <div className="sd-end-actions">
          <button
            type="button"
            className="sd-primary-btn"
            data-testid="log-score-yes"
            disabled={step === "loading"}
            onClick={() => {
              setError(null);
              setStep("loading");
            }}
          >
            {step === "loading" ? "Checking…" : "Yes, log it"}
          </button>
          <button
            type="button"
            className="sd-ghost-btn"
            data-testid="log-score-no"
            disabled={step === "loading"}
            onClick={() => {
              setStep("skipped");
              onSettled();
            }}
          >
            No thanks
          </button>
        </div>
      </div>
    );
  }

  const backdoor = isStaffBackdoor(alias);

  return (
    <div className="sd-log-flow" data-testid="log-score-form">
      <span className="sd-eyebrow">Leaderboard</span>
      {placement && (
        <p className="sd-log-placement" data-testid="log-score-placement">
          {placementCopy(placement, difficulty)}
        </p>
      )}
      <label className="sd-log-field">
        <span className="sd-log-label">Alias · 3 initials</span>
        <input
          className="sd-alias-input"
          data-testid="log-score-alias"
          maxLength={3}
          autoComplete="off"
          spellCheck={false}
          value={alias}
          onChange={(event) => setAlias(normalizeAliasInput(event.target.value))}
          placeholder="ABC"
          aria-label="Three-letter alias"
        />
      </label>
      {!backdoor && (
        <fieldset className="sd-cohort-fieldset">
          <legend className="sd-log-label">Cohort</legend>
          <div className="sd-cohort-grid" role="radiogroup" aria-label="Cohort">
            {COHORTS.map((code) => {
              const selected = cohort === code;
              return (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`log-score-cohort-${code}`}
                  className={`sd-cohort-chip${selected ? " is-selected" : ""}`}
                  onClick={() => setCohort(code)}
                >
                  {cohortLabel(code)}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {error && <p className="sd-log-error">{error}</p>}
      <div className="sd-end-actions">
        <button
          type="button"
          className="sd-primary-btn"
          data-testid="log-score-submit"
          disabled={step === "saving"}
          onClick={() => void submit()}
        >
          {step === "saving" ? "Saving…" : "Submit score"}
        </button>
        <button
          type="button"
          className="sd-ghost-btn"
          data-testid="log-score-cancel"
          disabled={step === "saving"}
          onClick={() => {
            setStep("skipped");
            onSettled();
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
