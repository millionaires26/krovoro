"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      window.location.href = "/login";
    } catch {
      setLoading(false);
      alert("Unable to log out. Please try again.");
    }
  }

  return (
    <button type="button" onClick={handleLogout} disabled={loading}>
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
