"use client";

interface CampaignWinScreenProps {
  onContinue: () => void;
}

export function CampaignWinScreen({ onContinue }: CampaignWinScreenProps) {
  return (
    <div
      className="obs-rules-modal-backdrop"
      data-testid="campaign-win-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="obs-campaign-win-title"
    >
      <div className="obs-rules-modal-card obs-campaign-win-card">
        <span className="obs-intro-eyebrow">Observatory log · Complete</span>
        <div className="obs-success-star" aria-hidden="true">
          ✦
        </div>
        <h3 id="obs-campaign-win-title" className="obs-rules-modal-title">
          The New Body is in view
        </h3>
        <p className="obs-rules-modal-note">
          Four sectors charted. The unknown world looks Earth-like — clouds, a
          glow at the limb. Sector logs stay open if you want another look.
        </p>
        <button
          type="button"
          className="obs-primary-cta"
          onClick={onContinue}
          data-testid="campaign-win-continue-btn"
        >
          Explore the Atlas
        </button>
      </div>
    </div>
  );
}
