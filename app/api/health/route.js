export async function GET() {
  return Response.json({
    status: "ok",
    service: "krovoro-api",
    version: "1.0.0",
  });
}
