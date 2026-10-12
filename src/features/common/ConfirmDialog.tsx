/*
 * File:        src/features/common/ConfirmDialog.tsx
 * Role:        Accessible confirmation dialog based on the native <dialog>
 *              element (focus trap, Escape to cancel), used before deletions.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="panel-parchment m-auto max-w-md p-6 backdrop:bg-ink/80"
    >
      <h2 id={titleId} className="font-gothic text-2xl">
        {title}
      </h2>
      <p className="mt-2">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button type="button" className="btn btn-solid" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
