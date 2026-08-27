import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getKrovoroAuthContext } from "../../../../lib/krovoro-auth";

const ALLOWED_STATUSES = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
];

const ALLOWED_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
];

function getSupabaseConfig() {
  return {
    supabaseUrl: process.env.KROVORO_SUPABASE_URL,
    anonKey: process.env.KROVORO_SUPABASE_ANON_KEY,
  };
}

async function getAccessToken() {
  const cookieStore = await cookies();

  return cookieStore.get("krovoro_access_token")?.value || null;
}

async function verifyLead({
  leadId,
  organizationId,
  supabaseUrl,
  anonKey,
  accessToken,
}) {
  const url = new URL(`${supabaseUrl}/rest/v1/leads`);

  url.searchParams.set(
    "select",
    "id,contact_id,organization_id"
  );

  url.searchParams.set("id", `eq.${leadId}`);

  url.searchParams.set(
    "organization_id",
    `eq.${organizationId}`
  );

  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      status: 502,
      message: "Unable to verify lead.",
    };
  }

  const rows = await response.json();
  const lead = rows[0];

  if (!lead) {
    return {
      ok: false,
      status: 404,
      message: "Lead not found.",
    };
  }

  return {
    ok: true,
    lead,
  };
}

async function verifyTask({
  taskId,
  leadId,
  organizationId,
  supabaseUrl,
  anonKey,
  accessToken,
}) {
  const url = new URL(`${supabaseUrl}/rest/v1/tasks`);

  url.searchParams.set(
    "select",
    [
      "id",
      "organization_id",
      "lead_id",
      "contact_id",
      "assigned_to_user_id",
      "created_by_user_id",
      "title",
      "description",
      "status",
      "priority",
      "due_at",
      "completed_at",
      "metadata",
      "created_at",
      "updated_at",
    ].join(",")
  );

  url.searchParams.set("id", `eq.${taskId}`);

  url.searchParams.set(
    "organization_id",
    `eq.${organizationId}`
  );

  url.searchParams.set(
    "lead_id",
    `eq.${leadId}`
  );

  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      status: 502,
      message: "Unable to verify task.",
    };
  }

  const rows = await response.json();
  const task = rows[0];

  if (!task) {
    return {
      ok: false,
      status: 404,
      message: "Task not found.",
    };
  }

  return {
    ok: true,
    task,
  };
}

function normalizeDueAt(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return {
      valid: true,
      value: null,
    };
  }

  if (typeof value !== "string") {
    return {
      valid: false,
      value: null,
    };
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return {
      valid: false,
      value: null,
    };
  }

  return {
    valid: true,
    value: parsed.toISOString(),
  };
}

export async function GET(request) {
  try {
    const auth = await getKrovoroAuthContext();

    if (!auth.authenticated) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Organization access required.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const leadId = searchParams.get("leadId")?.trim();

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead ID is required.",
        },
        { status: 400 }
      );
    }

    const { supabaseUrl, anonKey } = getSupabaseConfig();

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Database service is not configured.",
        },
        { status: 500 }
      );
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const verifiedLead = await verifyLead({
      leadId,
      organizationId: auth.organization.id,
      supabaseUrl,
      anonKey,
      accessToken,
    });

    if (!verifiedLead.ok) {
      return NextResponse.json(
        {
          success: false,
          message: verifiedLead.message,
        },
        { status: verifiedLead.status }
      );
    }

    const tasksUrl = new URL(
      `${supabaseUrl}/rest/v1/tasks`
    );

    tasksUrl.searchParams.set(
      "select",
      [
        "id",
        "organization_id",
        "contact_id",
        "lead_id",
        "assigned_to_user_id",
        "created_by_user_id",
        "title",
        "description",
        "status",
        "priority",
        "due_at",
        "completed_at",
        "metadata",
        "created_at",
        "updated_at",
      ].join(",")
    );

    tasksUrl.searchParams.set(
      "organization_id",
      `eq.${auth.organization.id}`
    );

    tasksUrl.searchParams.set(
      "lead_id",
      `eq.${leadId}`
    );

    tasksUrl.searchParams.set(
      "order",
      "completed_at.asc.nullsfirst,due_at.asc.nullslast,created_at.desc"
    );

    const response = await fetch(
      tasksUrl.toString(),
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Supabase tasks read failed:",
        response.status
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to load tasks.",
        },
        { status: 502 }
      );
    }

    const tasks = await response.json();

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error(
      "Krovoro tasks GET API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load tasks.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await getKrovoroAuthContext();

    if (!auth.authenticated) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Organization access required.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const leadId =
      typeof body?.leadId === "string"
        ? body.leadId.trim()
        : "";

    const title =
      typeof body?.title === "string"
        ? body.title.trim()
        : "";

    const description =
      typeof body?.description === "string"
        ? body.description.trim()
        : "";

    const priority =
      typeof body?.priority === "string"
        ? body.priority.trim()
        : "normal";

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead ID is required.",
        },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Task title is required.",
        },
        { status: 400 }
      );
    }

    if (title.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message: "Task title is too long.",
        },
        { status: 400 }
      );
    }

    if (description.length > 10000) {
      return NextResponse.json(
        {
          success: false,
          message: "Task description is too long.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid task priority.",
        },
        { status: 400 }
      );
    }

    const dueAt = normalizeDueAt(body?.dueAt);

    if (!dueAt.valid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid due date.",
        },
        { status: 400 }
      );
    }

    const { supabaseUrl, anonKey } = getSupabaseConfig();

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Database service is not configured.",
        },
        { status: 500 }
      );
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const verifiedLead = await verifyLead({
      leadId,
      organizationId: auth.organization.id,
      supabaseUrl,
      anonKey,
      accessToken,
    });

    if (!verifiedLead.ok) {
      return NextResponse.json(
        {
          success: false,
          message: verifiedLead.message,
        },
        { status: verifiedLead.status }
      );
    }

    const lead = verifiedLead.lead;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/tasks`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          organization_id: auth.organization.id,
          contact_id: lead.contact_id,
          lead_id: lead.id,
          assigned_to_user_id: auth.user.id,
          created_by_user_id: auth.user.id,
          title,
          description: description || null,
          status: "open",
          priority,
          due_at: dueAt.value,
          completed_at: null,
          metadata: {
            source: "krovoro_crm",
          },
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Supabase task insert failed:",
        response.status,
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to create task.",
        },
        { status: 502 }
      );
    }

    const rows = await response.json();
    const task = rows[0];

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          message: "Task was not created.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Task created.",
        task,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Krovoro tasks POST API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create task.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const auth = await getKrovoroAuthContext();

    if (!auth.authenticated) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Organization access required.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const taskId =
      typeof body?.taskId === "string"
        ? body.taskId.trim()
        : "";

    const leadId =
      typeof body?.leadId === "string"
        ? body.leadId.trim()
        : "";

    if (!taskId || !leadId) {
      return NextResponse.json(
        {
          success: false,
          message: "Task ID and Lead ID are required.",
        },
        { status: 400 }
      );
    }

    const { supabaseUrl, anonKey } = getSupabaseConfig();

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Database service is not configured.",
        },
        { status: 500 }
      );
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const verifiedLead = await verifyLead({
      leadId,
      organizationId: auth.organization.id,
      supabaseUrl,
      anonKey,
      accessToken,
    });

    if (!verifiedLead.ok) {
      return NextResponse.json(
        {
          success: false,
          message: verifiedLead.message,
        },
        { status: verifiedLead.status }
      );
    }

    const verifiedTask = await verifyTask({
      taskId,
      leadId,
      organizationId: auth.organization.id,
      supabaseUrl,
      anonKey,
      accessToken,
    });

    if (!verifiedTask.ok) {
      return NextResponse.json(
        {
          success: false,
          message: verifiedTask.message,
        },
        { status: verifiedTask.status }
      );
    }

    const existingTask = verifiedTask.task;
    const updates = {};

    if (Object.hasOwn(body, "title")) {
      const title =
        typeof body.title === "string"
          ? body.title.trim()
          : "";

      if (!title) {
        return NextResponse.json(
          {
            success: false,
            message: "Task title is required.",
          },
          { status: 400 }
        );
      }

      if (title.length > 500) {
        return NextResponse.json(
          {
            success: false,
            message: "Task title is too long.",
          },
          { status: 400 }
        );
      }

      updates.title = title;
    }

    if (Object.hasOwn(body, "description")) {
      const description =
        typeof body.description === "string"
          ? body.description.trim()
          : "";

      if (description.length > 10000) {
        return NextResponse.json(
          {
            success: false,
            message: "Task description is too long.",
          },
          { status: 400 }
        );
      }

      updates.description = description || null;
    }

    if (Object.hasOwn(body, "priority")) {
      const priority =
        typeof body.priority === "string"
          ? body.priority.trim()
          : "";

      if (!ALLOWED_PRIORITIES.includes(priority)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid task priority.",
          },
          { status: 400 }
        );
      }

      updates.priority = priority;
    }

    if (Object.hasOwn(body, "dueAt")) {
      const dueAt = normalizeDueAt(body.dueAt);

      if (!dueAt.valid) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid due date.",
          },
          { status: 400 }
        );
      }

      updates.due_at = dueAt.value;
    }

    if (Object.hasOwn(body, "status")) {
      const status =
        typeof body.status === "string"
          ? body.status.trim()
          : "";

      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid task status.",
          },
          { status: 400 }
        );
      }

      updates.status = status;

      if (status === "completed") {
        updates.completed_at =
          existingTask.completed_at ||
          new Date().toISOString();
      } else {
        updates.completed_at = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No task changes were provided.",
        },
        { status: 400 }
      );
    }

    const updateUrl = new URL(
      `${supabaseUrl}/rest/v1/tasks`
    );

    updateUrl.searchParams.set(
      "id",
      `eq.${taskId}`
    );

    updateUrl.searchParams.set(
      "organization_id",
      `eq.${auth.organization.id}`
    );

    updateUrl.searchParams.set(
      "lead_id",
      `eq.${leadId}`
    );

    const response = await fetch(
      updateUrl.toString(),
      {
        method: "PATCH",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(updates),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Supabase task update failed:",
        response.status,
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to update task.",
        },
        { status: 502 }
      );
    }

    const rows = await response.json();
    const task = rows[0];

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          message: "Task was not updated.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        task.status === "completed"
          ? "Task completed."
          : "Task updated.",
      task,
    });
  } catch (error) {
    console.error(
      "Krovoro tasks PATCH API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update task.",
      },
      { status: 500 }
    );
  }
}
