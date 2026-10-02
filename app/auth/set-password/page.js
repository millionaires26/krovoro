"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/auth/set-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data?.message ||
            "Unable to set your password."
        );
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setMessage(
        "Unable to set your password. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <h1>Set your password</h1>

        <p>
          Create a password for your Krovoro account.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              disabled={saving}
              required
              minLength={8}
              style={{
                width: "100%",
                marginTop: "6px",
                padding: "10px",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="confirmPassword">
              Confirm password
            </label>

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              disabled={saving}
              required
              minLength={8}
              style={{
                width: "100%",
                marginTop: "6px",
                padding: "10px",
              }}
            />
          </div>

          {message ? (
            <p role="alert">{message}</p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Set password"}
          </button>
        </form>
      </div>
    </main>
  );
}
