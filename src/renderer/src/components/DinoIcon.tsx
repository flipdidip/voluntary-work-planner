import { CSSProperties } from "react";
import { DINO_ICON_OPTIONS, DinoIconId, DinoIconOption } from "@shared/types";

const dinoIconById = new Map<DinoIconId, DinoIconOption>(
  DINO_ICON_OPTIONS.map((option) => [option.id, option]),
);

export function getDinoIconOption(
  iconId: DinoIconId | undefined,
): DinoIconOption | undefined {
  if (!iconId) {
    return undefined;
  }

  return dinoIconById.get(iconId);
}

interface DinoIconBadgeProps {
  iconId?: DinoIconId;
  size?: "sm" | "md";
  title?: string;
}

function DinoAccent({
  accent,
}: {
  accent: DinoIconOption["accent"];
}): JSX.Element | null {
  if (accent === "spots") {
    return (
      <>
        <circle cx="9" cy="13" r="1" fill="rgba(255,255,255,0.35)" />
        <circle cx="12" cy="15" r="0.9" fill="rgba(255,255,255,0.35)" />
      </>
    );
  }

  if (accent === "stripes") {
    return (
      <>
        <rect
          x="8"
          y="11.4"
          width="1.1"
          height="5"
          rx="0.55"
          fill="rgba(255,255,255,0.35)"
        />
        <rect
          x="10.4"
          y="11.1"
          width="1.1"
          height="5.3"
          rx="0.55"
          fill="rgba(255,255,255,0.35)"
        />
        <rect
          x="12.8"
          y="11.3"
          width="1.1"
          height="5.1"
          rx="0.55"
          fill="rgba(255,255,255,0.35)"
        />
      </>
    );
  }

  if (accent === "cheeks") {
    return (
      <>
        <circle cx="16.6" cy="8.2" r="0.7" fill="rgba(255,255,255,0.4)" />
        <circle cx="18.2" cy="8.2" r="0.7" fill="rgba(255,255,255,0.4)" />
      </>
    );
  }

  if (accent === "heart") {
    return (
      <path
        d="M11.6 11.3c.5-.8 1.6-.8 2.1 0 .4-.7 1.5-.7 2 0 .8 1 .1 2.1-.8 2.8l-1.6 1.2-1.6-1.2c-.9-.7-1.6-1.8-.1-2.8z"
        fill="rgba(255,255,255,0.5)"
      />
    );
  }

  if (accent === "star") {
    return (
      <path
        d="M13.3 11.2l.7 1.3 1.4.2-1 1 .2 1.4-1.3-.7-1.3.7.2-1.4-1-1 1.4-.2z"
        fill="rgba(255,255,255,0.55)"
      />
    );
  }

  if (accent === "crown") {
    return (
      <path
        d="M15.2 3.3l.9 1.2.9-1.2 1.2 2v1h-4.2v-1z"
        fill="rgba(255,255,255,0.65)"
      />
    );
  }

  return null;
}

function DinoGlyph({ option }: { option: DinoIconOption }): JSX.Element {
  const eye = (
    <>
      <circle cx="18" cy="7.2" r="0.45" fill="#ffffff" />
      <circle cx="18" cy="7.2" r="0.2" fill="#203040" />
    </>
  );

  if (option.shape === "trex") {
    return (
      <svg viewBox="0 0 24 24" className="dino-icon-shape" aria-hidden="true">
        <ellipse cx="10.8" cy="13.8" rx="6.6" ry="4.7" fill="currentColor" />
        <circle cx="17.5" cy="10.9" r="2.8" fill="currentColor" />
        <rect
          x="16.4"
          y="12"
          width="4.5"
          height="1.8"
          rx="0.8"
          fill="currentColor"
        />
        <polygon points="4.4,13.2 1.1,11.7 4.3,10.1" fill="currentColor" />
        <rect
          x="8.2"
          y="17.3"
          width="2.1"
          height="3.8"
          rx="1"
          fill="currentColor"
        />
        <rect
          x="12.2"
          y="17.3"
          width="2.1"
          height="3.8"
          rx="1"
          fill="currentColor"
        />
        <rect
          x="11.3"
          y="12.2"
          width="1.9"
          height="1"
          rx="0.5"
          fill="currentColor"
        />
        {eye}
        <DinoAccent accent={option.accent} />
      </svg>
    );
  }

  if (option.shape === "trike") {
    return (
      <svg viewBox="0 0 24 24" className="dino-icon-shape" aria-hidden="true">
        <ellipse cx="10.4" cy="14" rx="6.5" ry="4.6" fill="currentColor" />
        <ellipse cx="16.8" cy="10.3" rx="3.1" ry="2.7" fill="currentColor" />
        <polygon points="19.3,9.8 22,10.5 19.3,11.2" fill="currentColor" />
        <polygon points="15.7,7 17.2,5.4 18.3,7" fill="currentColor" />
        <polygon points="13.9,7.5 15.1,6 16.3,7.5" fill="currentColor" />
        <polygon points="4.1,13.1 1.2,11.8 4.1,10.5" fill="currentColor" />
        <rect
          x="7.5"
          y="17.3"
          width="2"
          height="3.7"
          rx="1"
          fill="currentColor"
        />
        <rect
          x="11.4"
          y="17.3"
          width="2"
          height="3.7"
          rx="1"
          fill="currentColor"
        />
        {eye}
        <DinoAccent accent={option.accent} />
      </svg>
    );
  }

  if (option.shape === "steggo") {
    return (
      <svg viewBox="0 0 24 24" className="dino-icon-shape" aria-hidden="true">
        <ellipse cx="11.1" cy="14" rx="6.8" ry="4.8" fill="currentColor" />
        <circle cx="17.3" cy="10.5" r="2.4" fill="currentColor" />
        <polygon points="6.3,9.3 7.6,7.4 8.9,9.3" fill="currentColor" />
        <polygon points="8.6,8.7 10.1,6.5 11.5,8.7" fill="currentColor" />
        <polygon points="11.2,8.6 12.8,6.3 14.4,8.6" fill="currentColor" />
        <polygon points="13.8,9 15,7.3 16.3,9" fill="currentColor" />
        <polygon points="4.2,14.3 1.1,13.5 4.1,11.8" fill="currentColor" />
        <rect
          x="8"
          y="17.4"
          width="2"
          height="3.6"
          rx="1"
          fill="currentColor"
        />
        <rect
          x="12"
          y="17.4"
          width="2"
          height="3.6"
          rx="1"
          fill="currentColor"
        />
        {eye}
        <DinoAccent accent={option.accent} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="dino-icon-shape" aria-hidden="true">
      <ellipse cx="11.4" cy="14" rx="6.4" ry="4.5" fill="currentColor" />
      <rect
        x="14.6"
        y="6.2"
        width="2.4"
        height="6.7"
        rx="1.2"
        fill="currentColor"
      />
      <circle cx="17.1" cy="5.6" r="2.6" fill="currentColor" />
      <polygon points="5,13.5 1.8,11.9 5,10.6" fill="currentColor" />
      <rect
        x="8.3"
        y="17.3"
        width="1.9"
        height="3.7"
        rx="0.95"
        fill="currentColor"
      />
      <rect
        x="12"
        y="17.3"
        width="1.9"
        height="3.7"
        rx="0.95"
        fill="currentColor"
      />
      {eye}
      <DinoAccent accent={option.accent} />
    </svg>
  );
}

export default function DinoIconBadge({
  iconId,
  size = "md",
  title,
}: DinoIconBadgeProps): JSX.Element | null {
  const option = getDinoIconOption(iconId);
  if (!option) {
    return null;
  }

  return (
    <span
      className={`dino-icon-badge dino-icon-badge--${size}`}
      style={{ "--dino-color": option.color } as CSSProperties}
      title={title || option.label}
      aria-label={title || option.label}
    >
      <DinoGlyph option={option} />
    </span>
  );
}
