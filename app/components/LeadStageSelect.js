"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeadStageSelect({
  leadId,
  currentStageId,
  stages,
}) {
  const router = useRouter();

  const [stageId, setStageId] = useState(
    currentStageId || ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(event) {
    const nextStageId = event.target.value;
    const previousStageId = stageId;

    if (!nextStageId || nextStageId === previousStageId) {
      return;
    }

    setStageId(nextStageId);
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/leads/stage", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId,
          stageId: nextStageId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStageId(previousStageId);

        setError(
          data.message || "Unable to update stage."
        );

        return;
      }

      router.refresh();
    } catch {
      setStageId(previousStageId);
      setError("Unable to update stage.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <select
        value={stageId}
        onChange={handleChange}
        disabled={saving}
        aria-label="Lead pipeline stage"
      >
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.name}
          </option>
        ))}
      </select>

      {saving && <span> Saving...</span>}

      {error && (
        <div role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
