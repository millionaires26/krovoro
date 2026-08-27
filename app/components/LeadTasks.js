"use client";

import { useCallback, useEffect, useState } from "react";

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function LeadTasks({ leadId }) {
  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueAt, setDueAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] =
    useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadTasks = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(
        `/api/leads/tasks?leadId=${encodeURIComponent(
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
          data.message || "Unable to load tasks."
        );
        return;
      }

      setTasks(
        Array.isArray(data.tasks)
          ? data.tasks
          : []
      );
    } catch {
      setError("Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function handleCreateTask(event) {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Task title is required.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/leads/tasks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leadId,
            title: trimmedTitle,
            description,
            priority,
            dueAt: dueAt || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Unable to create task."
        );
        return;
      }

      setTitle("");
      setDescription("");
      setPriority("normal");
      setDueAt("");

      setMessage("Task created.");

      await loadTasks();
    } catch {
      setError("Unable to create task.");
    } finally {
      setSaving(false);
    }
  }

  async function updateTask(taskId, changes) {
    setUpdatingTaskId(taskId);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/leads/tasks",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            taskId,
            leadId,
            ...changes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Unable to update task."
        );
        return;
      }

      setMessage(data.message || "Task updated.");

      await loadTasks();
    } catch {
      setError("Unable to update task.");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  function formatDate(value) {
    if (!value) {
      return "No due date";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  function formatStatus(value) {
    if (!value) {
      return "Unknown";
    }

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function formatPriority(value) {
    if (!value) {
      return "Normal";
    }

    return value
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  return (
    <section>
      <h2>Tasks & Follow-ups</h2>

      <form onSubmit={handleCreateTask}>
        <p>
          <label>
            Task title
            <br />
            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              maxLength={500}
              placeholder="Follow up with lead"
              disabled={saving}
            />
          </label>
        </p>

        <p>
          <label>
            Description
            <br />
            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={3}
              maxLength={10000}
              placeholder="Optional details..."
              disabled={saving}
            />
          </label>
        </p>

        <p>
          <label>
            Priority
            <br />
            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value)
              }
              disabled={saving}
            >
              {PRIORITIES.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </p>

        <p>
          <label>
            Due date & time
            <br />
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) =>
                setDueAt(event.target.value)
              }
              disabled={saving}
            />
          </label>
        </p>

        <button
          type="submit"
          disabled={saving || !title.trim()}
        >
          {saving ? "Creating..." : "Create Task"}
        </button>
      </form>

      {message && (
        <p role="status">{message}</p>
      )}

      {error && (
        <p role="alert">{error}</p>
      )}

      <h3>Follow-ups</h3>

      {loading ? (
        <p>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p>No tasks yet.</p>
      ) : (
        <div>
          {tasks.map((task) => {
            const isCompleted =
              task.status === "completed";

            const isUpdating =
              updatingTaskId === task.id;

            return (
              <article key={task.id}>
                <p>
                  <strong>{task.title}</strong>
                </p>

                {task.description && (
                  <p>{task.description}</p>
                )}

                <p>
                  Status:{" "}
                  <strong>
                    {formatStatus(task.status)}
                  </strong>
                  {" | "}
                  Priority:{" "}
                  <strong>
                    {formatPriority(task.priority)}
                  </strong>
                </p>

                <p>
                  Due: {formatDate(task.due_at)}
                </p>

                {task.completed_at && (
                  <p>
                    Completed:{" "}
                    {formatDate(task.completed_at)}
                  </p>
                )}

                <p>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() =>
                      updateTask(task.id, {
                        status: isCompleted
                          ? "open"
                          : "completed",
                      })
                    }
                  >
                    {isUpdating
                      ? "Updating..."
                      : isCompleted
                        ? "Reopen Task"
                        : "Mark Complete"}
                  </button>
                </p>

                <hr />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
