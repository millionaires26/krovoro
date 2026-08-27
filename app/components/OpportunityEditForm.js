"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OpportunityEditForm({
  leadId,
  estimatedValue,
  probability,
  expectedCloseDate,
}) {
  const router = useRouter();

  const [value, setValue] = useState(
    estimatedValue ?? ""
  );

  const [chance, setChance] = useState(
    probability ?? ""
  );

  const [closeDate, setCloseDate] = useState(
    expectedCloseDate ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/leads/opportunity",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leadId,
            estimatedValue: value,
            probability: chance,
            expectedCloseDate: closeDate,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Unable to update opportunity."
        );
        return;
      }

      setMessage("Opportunity updated.");

      router.refresh();
    } catch {
      setError("Unable to update opportunity.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>
        <label>
          Estimated value
          <br />
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(event) =>
              setValue(event.target.value)
            }
            disabled={saving}
          />
        </label>
      </p>

      <p>
        <label>
          Probability (%)
          <br />
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={chance}
            onChange={(event) =>
              setChance(event.target.value)
            }
            disabled={saving}
          />
        </label>
      </p>

      <p>
        <label>
          Expected close date
          <br />
          <input
            type="date"
            value={closeDate}
            onChange={(event) =>
              setCloseDate(event.target.value)
            }
            disabled={saving}
          />
        </label>
      </p>

      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Opportunity"}
      </button>

      {message && (
        <p role="status">{message}</p>
      )}

      {error && (
        <p role="alert">{error}</p>
      )}
    </form>
  );
}
