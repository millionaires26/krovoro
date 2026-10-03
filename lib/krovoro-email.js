import "server-only";

import {
  SESv2Client,
  SendEmailCommand,
} from "@aws-sdk/client-sesv2";

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

  const region =
    process.env.KROVORO_AWS_REGION;

  const accessKeyId =
    process.env.KROVORO_AWS_ACCESS_KEY_ID;

  const secretAccessKey =
    process.env.KROVORO_AWS_SECRET_ACCESS_KEY;

  const fromEmail =
    process.env.KROVORO_EMAIL_FROM;

  if (
    !region ||
    !accessKeyId ||
    !secretAccessKey ||
    !fromEmail
  ) {
    throw new Error(
      "Krovoro email configuration is incomplete."
    );
  }

  const client = new SESv2Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const command = new SendEmailCommand({
    FromEmailAddress: fromEmail,
    Destination: {
      ToAddresses: [to.trim()],
    },
    Content: {
      Simple: {
        Subject: {
          Data: subject.trim(),
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: text,
            Charset: "UTF-8",
          },
          Html: {
            Data: html,
            Charset: "UTF-8",
          },
        },
      },
    },
  });

  const response = await client.send(command);

  if (!response?.MessageId) {
    throw new Error(
      "Amazon SES did not confirm email delivery submission."
    );
  }

  return {
    messageId: response.MessageId,
  };
}
