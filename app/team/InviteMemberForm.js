"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteMemberForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (sending) {
      return;
    }

    setMessage("");

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      setMessage(
        "Enter the email address of the person you want to invite."
      );
      return;
    }

    setSending(true);

    try {
      const response = await fetch(
        "/api/team/invite",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            email: normalizedEmail,
            role,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data?.message ||
            "Unable to send the invitation."
        );
        return;
      }

      setEmail("");
      setRole("member");

      setMessage(
        data?.message ||
          "Team invitation sent successfully."
      );

      router.refresh();
    } catch {
      setMessage(
        "Unable to send the invitation. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      style={{
        marginTop: "32px",
        marginBottom: "32px",
        padding: "24px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
      }}
    >
      <h2
        style={{
          marginTop: 0,
        }}
      >
        Invite Team Member
      </h2>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gap: "16px",
            maxWidth: "520px",
          }}
        >
          <label>
            <div
              style={{
                marginBottom: "6px",
                fontWeight: 600,
              }}
            >
              Email
            </div>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="name@example.com"
              autoComplete="email"
              required
              disabled={sending}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
              }}
            />
          </label>

          <label>
            <div
              style={{
                marginBottom: "6px",
                fontWeight: 600,
              }}
            >
              Role
            </div>

            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value)
              }
              disabled={sending}
              style={{
                width: "100%",
                padding: "10px 12px",
              }}
            >
              <option value="member">
                Member
              </option>

              <option value="manager">
                Manager
              </option>

              <option value="admin">
                Administrator
              </option>
            </select>
          </label>

          <button
            type="submit"
            disabled={sending}
            style={{
              width: "fit-content",
              padding: "10px 16px",
              cursor: sending
                ? "not-allowed"
                : "pointer",
            }}
          >
            {sending
              ? "Sending invitation..."
              : "Send Invitation"}
          </button>

          {message && (
            <p
              role="status"
              aria-live="polite"
              style={{
                margin: 0,
              }}
            >
              {message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
