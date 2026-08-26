export async function GET() {
  const supabaseUrl = process.env.KROVORO_SUPABASE_URL;
const serviceRoleKey = process.env.KROVORO_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      {
        status: "error",
        service: "krovoro-api",
        database: "supabase",
        message: "Server configuration missing",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/organizations?select=id&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return Response.json(
        {
          status: "error",
          service: "krovoro-api",
          database: "supabase",
          message: "Database connection failed",
          upstreamStatus: response.status,
        },
        { status: 502 }
      );
    }

    await response.json();

    return Response.json({
      status: "ok",
      service: "krovoro-api",
      database: "supabase",
      connection: "verified",
    });
  } catch {
    return Response.json(
      {
        status: "error",
        service: "krovoro-api",
        database: "supabase",
        message: "Database connection failed",
      },
      { status: 502 }
    );
  }
}
