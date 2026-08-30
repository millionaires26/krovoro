"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { krovoroFetch } from "../../lib/krovoro-fetch";
import LeadStageSelect from "./LeadStageSelect";

export default function PipelineBoard({ stages }) {
  const router = useRouter();

  const [draggingLeadId, setDraggingLeadId] =
    useState(null);

  const [savingLeadId, setSavingLeadId] =
    useState(null);

  const [error, setError] = useState("");

  function findLead(leadId) {
    for (const stage of stages) {
      const lead = stage.leads.find(
        (item) => item.id === leadId
      );

      if (lead) {
        return lead;
      }
    }

    return null;
  }

  function handleDragStart(event, leadId) {
    setDraggingLeadId(leadId);
    setError("");

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      leadId
    );
  }

  function handleDragEnd() {
    setDraggingLeadId(null);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(event, stageId) {
    event.preventDefault();

    const leadId =
      event.dataTransfer.getData("text/plain") ||
      draggingLeadId;

    setDraggingLeadId(null);

    if (!leadId) {
      return;
    }

    const lead = findLead(leadId);

    if (!lead) {
      setError("Unable to find the selected lead.");
      return;
    }

    if (lead.stage_id === stageId) {
      return;
    }

    setSavingLeadId(leadId);
    setError("");

    try {
      const response = await krovoroFetch(
        "/api/leads/stage",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leadId,
            stageId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to update lead stage."
        );

        return;
      }

      router.refresh();
    } catch {
      setError("Unable to update lead stage.");
    } finally {
      setSavingLeadId(null);
    }
  }

  return (
    <div>
      {error && (
        <p role="alert">
          <strong>{error}</strong>
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
          overflowX: "auto",
          paddingBottom: "16px",
        }}
      >
        {stages.map((stage) => (
          <section
            key={stage.id}
            onDragOver={handleDragOver}
            onDrop={(event) =>
              handleDrop(event, stage.id)
            }
            style={{
              minWidth: "280px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <h3>
              {stage.name} ({stage.leads.length})
            </h3>

            {stage.leads.length === 0 ? (
              <p>No leads</p>
            ) : (
              stage.leads.map((lead) => (
                <article
                  key={lead.id}
                  draggable={
                    savingLeadId !== lead.id
                  }
                  onDragStart={(event) =>
                    handleDragStart(
                      event,
                      lead.id
                    )
                  }
                  onDragEnd={handleDragEnd}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    padding: "10px",
                    marginBottom: "10px",
                    cursor:
                      savingLeadId === lead.id
                        ? "wait"
                        : "grab",
                    opacity:
                      draggingLeadId === lead.id
                        ? 0.5
                        : 1,
                  }}
                >
                  <p>
                    <strong>
                      <a href={`/leads/${lead.id}`}>
                        {[
                          lead.first_name,
                          lead.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ") ||
                          "Unnamed lead"}
                      </a>
                    </strong>
                  </p>

                  {lead.email && (
                    <p>{lead.email}</p>
                  )}

                  {lead.phone && (
                    <p>{lead.phone}</p>
                  )}

                  {lead.source && (
                    <p>
                      Source: {lead.source}
                    </p>
                  )}

                  {lead.estimated_value !== null && (
                    <p>
                      Value: $
                      {Number(
                        lead.estimated_value
                      ).toLocaleString()}
                    </p>
                  )}

                  {lead.probability !== null && (
                    <p>
                      Probability:{" "}
                      {lead.probability}%
                    </p>
                  )}

                  <LeadStageSelect
                    leadId={lead.id}
                    currentStageId={
                      lead.stage_id
                    }
                    stages={stages}
                  />

                  {savingLeadId === lead.id && (
                    <p>Moving...</p>
                  )}
                </article>
              ))
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
