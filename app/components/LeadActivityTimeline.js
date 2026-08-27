"use client";

import { useCallback, useEffect, useState } from "react";

export default function LeadActivityTimeline({ leadId }) {
  const [activities, setActivities] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadActivities = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(
        `/api/leads/activities?leadId=${encodeURIComponent(
          leadId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Unable to load activity timeline."
        );
        return;
      }

      setActivities(
        Array.isArray(data.activities)
          ? data.activities
          : []
      );
    } catch {
      setError("Unable to load activity timeline.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedNote = note.trim();

    if (!trimmedNote) {
      setError("Note cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/leads/activities",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leadId,
            body: trimmedNote,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Unable to save note."
        );
        return;
      }

      setNote("");
      setMessage("Note added.");

      await loadActivities();
    } catch {
      setError("Unable to save note.");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(value) {
    if (!value) {
      return "Unknown time";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  function formatActivityType(value) {
    if (!value) {
      return "Activity";
    }

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  return (
    <section>
      <h2>Activity</h2>

      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Add note
            <br />
            <textarea
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              rows={4}
              maxLength={10000}
              placeholder="Add an internal note about this lead..."
              disabled={saving}
            />
          </label>
        </p>

        <button
          type="submit"
          disabled={saving || !note.trim()}
        >
          {saving ? "Adding..." : "Add Note"}
        </button>

        {message && (
          <p role="status">{message}</p>
        )}

        {error && (
          <p role="alert">{error}</p>
        )}
      </form>

      <h3>Timeline</h3>

      {loading ? (
        <p>Loading activity...</p>
      ) : activities.length === 0 ? (
        <p>No activity yet.</p>
      ) : (
        <div>
          {activities.map((activity) => (
            <article key={activity.id}>
              <p>
                <strong>
                  {formatActivityType(
                    activity.activity_type
                  )}
                </strong>
                {" — "}
                {formatDate(
                  activity.occurred_at ||
                    activity.created_at
                )}
              </p>

              {activity.subject && (
                <p>
                  <strong>{activity.subject}</strong>
                </p>
              )}

              {activity.body && (
                <p>{activity.body}</p>
              )}

              <p>
                Channel:{" "}
                {activity.channel || "—"}
                {" | "}
                Direction:{" "}
                {activity.direction || "—"}
              </p>

              <hr />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
