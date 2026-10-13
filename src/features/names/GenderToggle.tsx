/*
 * File:        src/features/names/GenderToggle.tsx
 * Role:        Pair of toggle buttons (male and female symbols) choosing the
 *              kind of name drawn by the random name button of a fighter.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { useTranslation } from "react-i18next";
import type { NameGender } from "./houseNames.ts";

const GENDERS: readonly NameGender[] = ["male", "female"];

function GenderIcon({ gender }: { gender: NameGender }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {gender === "male" ? (
        <>
          <circle cx="10" cy="14" r="6" />
          <path d="M14.5 9.5 20 4M15 4h5v5" />
        </>
      ) : (
        <>
          <circle cx="12" cy="9" r="6" />
          <path d="M12 15v7M8.5 18.5h7" />
        </>
      )}
    </svg>
  );
}

export function GenderToggle({
  value,
  onChange,
  fighterLabel,
}: {
  value: NameGender;
  onChange: (gender: NameGender) => void;
  fighterLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={t("names.genderFor", { name: fighterLabel })} className="flex shrink-0">
      {GENDERS.map((gender) => (
        <button
          key={gender}
          type="button"
          className="btn btn-sm px-2 aria-pressed:bg-on-panel aria-pressed:text-panel"
          aria-pressed={value === gender}
          aria-label={t(`names.gender.${gender}`)}
          title={t(`names.gender.${gender}`)}
          onClick={() => {
            onChange(gender);
          }}
        >
          <GenderIcon gender={gender} />
        </button>
      ))}
    </div>
  );
}
