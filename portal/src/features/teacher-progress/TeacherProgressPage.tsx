"use client";

import { useEffect, useState } from "react";
import { TeacherCodeDialog } from "./TeacherCodeDialog";
import { TeacherProgressGrid } from "./TeacherProgressView";
import { useTeacherMode } from "./TeacherModeProvider";
import type { TeacherBandScan } from "./types";

interface TeacherProgressPageProps {
  bands: TeacherBandScan[];
}

export function TeacherProgressPage({ bands }: TeacherProgressPageProps) {
  const { ready, unlocked, error } = useTeacherMode();
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    if (ready && !unlocked) setPromptOpen(true);
  }, [ready, unlocked]);

  return (
    <>
      {!ready ? (
        <p className="teacher-grid-status">Opening teacher mode…</p>
      ) : unlocked ? (
        <>
          {error ? (
            <p className="teacher-grid-error" role="alert">
              {error}
            </p>
          ) : null}
          {bands.map((scan) => (
            <TeacherProgressGrid key={scan.band} scan={scan} />
          ))}
        </>
      ) : (
        <p className="teacher-grid-status">
          Teacher mode stays locked until the classroom code is entered.{" "}
          <button
            type="button"
            className="teacher-unlock-btn"
            onClick={() => setPromptOpen(true)}
          >
            Enter code
          </button>
        </p>
      )}
      <TeacherCodeDialog open={promptOpen} onOpenChange={setPromptOpen} />
    </>
  );
}
