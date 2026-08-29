"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { krovoroFetch } from "../../lib/krovoro-fetch";

export default function LeadAssignmentSelect({
  leadId,
  assignedToUserId = null,
}) {
  const router = useRouter();

  const [members, setMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(
    assignedToUserId || ""
  );
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      setLoadingMembers(true);
      setError("");

      try {
        const response = await krovoroFetch("/api/team/members", {
  method: "GET",
  cache: "no-store",
});

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to load team members."
          );
        }

        if (!cancelled) {
          setMembers(
            Array.isArray(data.members) ? data.members : []
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError.message ||
              "Unable to load team members."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMembers(false);
        }
      }
    }

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelectedUserId(assignedToUserId || "");
  }, [assignedToUserId]);

  async function handleAssignmentChange(event) {
    const previousUserId = selectedUserId;
    const nextUserId = event.target.value;

    setSelectedUserId(nextUserId);
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await krovoroFetch(
  "/api/leads/assignment",
  {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      leadId,
      assignedToUserId: nextUserId,
    }),
  }
);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to update lead assignment."
        );
      }

      setSelectedUserId(
        data.lead?.assignedToUserId || ""
      );

      setMessage(data.message || "Assignment updated.");

      router.refresh();
    } catch (saveError) {
      setSelectedUserId(previousUserId);

      setError(
        saveError.message ||
          "Unable to update lead assignment."
      );
    } finally {
      setSaving(false);
    }
  }

  function getMemberLabel(member) {
    const name =
      member.fullName?.trim() || "Team Member";

    const role = member.role
      ? member.role.charAt(0).toUpperCase() +
        member.role.slice(1)
      : "";

    const currentUserLabel = member.isCurrentUser
      ? " — You"
      : "";

    const roleLabel = role ? ` (${role})` : "";

    return `${name}${roleLabel}${currentUserLabel}`;
  }

  return (
    <div>
      <label
        htmlFor={`lead-assignment-${leadId}`}
        style={{
          display: "block",
          marginBottom: "6px",
          fontWeight: 600,
        }}
      >
        Assigned To
      </label>

      <select
        id={`lead-assignment-${leadId}`}
        value={selectedUserId}
        onChange={handleAssignmentChange}
        disabled={loadingMembers || saving}
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "10px",
        }}
      >
        <option value="">
          {loadingMembers
            ? "Loading team members..."
            : "Unassigned"}
        </option>

        {members.map((member) => (
          <option
            key={member.userId}
            value={member.userId}
          >
            {getMemberLabel(member)}
          </option>
        ))}
      </select>

      {saving && (
        <p
          style={{
            marginTop: "6px",
            marginBottom: 0,
          }}
        >
          Saving assignment...
        </p>
      )}

      {!saving && message && (
        <p
          style={{
            marginTop: "6px",
            marginBottom: 0,
          }}
        >
          {message}
        </p>
      )}

      {error && (
        <p
          style={{
            marginTop: "6px",
            marginBottom: 0,
          }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
