import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import LogoutButton from "../../components/LogoutButton";
import { getKrovoroAuthContext } from "../../../lib/krovoro-auth";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}) {
  const resolvedParams = await params;

  const contactId =
    typeof resolvedParams?.id === "string"
      ? resolvedParams.id.trim()
      : "";

  if (!contactId) {
    notFound();
  }

  const auth = await getKrovoroAuthContext();

  if (!auth.authenticated) {
    if (auth.reason === "invalid_access_token") {
      redirect("/auth/refresh");
    }

    redirect("/login");
  }

  if (!auth.authorized) {
    return (
      <main>
        <h1>Access unavailable</h1>

        <p>
          Your account is not assigned to an active Krovoro organization.
        </p>

        <LogoutButton />
      </main>
    );
  }

  const supabaseUrl = process.env.KROVORO_SUPABASE_URL;
  const anonKey = process.env.KROVORO_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Krovoro database configuration is missing."
    );
  }

  const cookieStore = await cookies();

  const accessToken = cookieStore.get(
    "krovoro_access_token"
  )?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const contactUrl = new URL(
    `${supabaseUrl}/rest/v1/contacts`
  );

  contactUrl.searchParams.set(
    "select",
    [
      "id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "status",
      "source",
      "created_at",
      "updated_at",
    ].join(",")
  );

  contactUrl.searchParams.set(
    "id",
    `eq.${contactId}`
  );

  contactUrl.searchParams.set(
    "organization_id",
    `eq.${auth.organization.id}`
  );

  contactUrl.searchParams.set("limit", "1");

  const contactResponse = await fetch(
    contactUrl.toString(),
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!contactResponse.ok) {
    throw new Error(
      "Unable to load Krovoro contact."
    );
  }

  const contacts =
    await contactResponse.json();

  const contact = contacts[0];

  if (!contact) {
    notFound();
  }

  const leadsUrl = new URL(
    `${supabaseUrl}/rest/v1/leads`
  );

  leadsUrl.searchParams.set(
    "select",
    [
      "id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "source",
      "status",
      "pipeline_id",
      "stage_id",
      "estimated_value",
      "probability",
      "expected_close_date",
      "created_at",
      "updated_at",
    ].join(",")
  );

  leadsUrl.searchParams.set(
    "contact_id",
    `eq.${contact.id}`
  );

  leadsUrl.searchParams.set(
    "organization_id",
    `eq.${auth.organization.id}`
  );

  leadsUrl.searchParams.set(
    "order",
    "created_at.desc"
  );

  const leadsResponse = await fetch(
    leadsUrl.toString(),
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!leadsResponse.ok) {
    throw new Error(
      "Unable to load contact leads."
    );
  }

  const leads =
    await leadsResponse.json();

  return (
    <main>
      <h1>
        {[contact.first_name, contact.last_name]
          .filter(Boolean)
          .join(" ") || "Contact"}
      </h1>

      <p>
        Organization:{" "}
        <strong>{auth.organization.name}</strong>
      </p>

      <p>
        <a href="/contacts">
          Back to Contacts
        </a>
      </p>

      <section>
        <h2>Contact Information</h2>

        <p>
          Email:{" "}
          <strong>
            {contact.email || "—"}
          </strong>
        </p>

        <p>
          Phone:{" "}
          <strong>
            {contact.phone || "—"}
          </strong>
        </p>

        <p>
          Source:{" "}
          <strong>
            {contact.source || "—"}
          </strong>
        </p>

        <p>
          Status:{" "}
          <strong>
            {contact.status || "—"}
          </strong>
        </p>
      </section>

      <section>
        <h2>
          Leads / Opportunities ({leads.length})
        </h2>

        {leads.length === 0 ? (
          <p>
            No leads are linked to this contact.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Source</th>
                <th>Value</th>
                <th>Probability</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <a
                      href={`/leads/${lead.id}`}
                    >
                      {[
                        lead.first_name,
                        lead.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                        "Unnamed lead"}
                    </a>
                  </td>

                  <td>
                    {lead.status || "—"}
                  </td>

                  <td>
                    {lead.source || "—"}
                  </td>

                  <td>
                    {lead.estimated_value !==
                    null
                      ? `$${Number(
                          lead.estimated_value
                        ).toLocaleString()}`
                      : "—"}
                  </td>

                  <td>
                    {lead.probability !== null
                      ? `${lead.probability}%`
                      : "—"}
                  </td>

                  <td>
                    {lead.created_at
                      ? new Date(
                          lead.created_at
                        ).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Record Information</h2>

        <p>
          Created:{" "}
          {contact.created_at
            ? new Date(
                contact.created_at
              ).toLocaleString()
            : "—"}
        </p>

        <p>
          Last updated:{" "}
          {contact.updated_at
            ? new Date(
                contact.updated_at
              ).toLocaleString()
            : "—"}
        </p>
      </section>

      <LogoutButton />
    </main>
  );
}
