import "server-only";

export async function sendKrovoroEmail({
  to,
  subject,
  text,
  html,
}) {
  if (
    typeof to !== "string" ||
    !to.trim() ||
    typeof subject !== "string" ||
    !subject.trim() ||
    typeof text !== "string" ||
    !text.trim() ||
    typeof html !== "string" ||
    !html.trim()
  ) {
    throw new Error(
      "Krovoro email requires a recipient, subject, text body, and HTML body."
    );
  }

  throw new Error(
    "Krovoro email provider is not configured yet."
  );
}
