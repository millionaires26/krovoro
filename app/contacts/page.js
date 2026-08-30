import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LogoutButton from "../components/LogoutButton";
import { getKrovoroAuthContext } from "../../lib/krovoro-auth";

export const dynamic = "force-dynamic";

export default async function ContactsPage({ searchParams }) {
  const params = await searchParams;

  const search =
    typeof params?.search === "string"
      ? params.search.trim()
      : "";

  const status =
    typeof params?.status === "string"
      ? params.status.trim()
      : "";

  const sort =
    typeof params?.sort === "string"
      ? params.sort.trim()
      : "created_desc";

  const requestedPage = Number.parseInt(
    params?.page || "1",
    10
  );

  const page =
    Number.isInteger(requestedPage) &&
    requestedPage > 0
      ? requestedPage
      : 1;

  const pageSize = 25;
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
    throw new Error("Krovoro database configuration is missing.");
  }

  const cookieStore = await cookies();

  const accessToken = cookieStore.get(
    "krovoro_access_token"
  )?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const contactsUrl = new URL(
    `${supabaseUrl}/rest/v1/contacts`
  );

  contactsUrl.searchParams.set(
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

  contactsUrl.searchParams.set(
    "organization_id",
    `eq.${auth.organization.id}`
  );

  contactsUrl.searchParams.set(
    "order",
    "created_at.desc"
  );

  contactsUrl.searchParams.set("limit", "100");

  const response = await fetch(
    contactsUrl.toString(),
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Unable to load Krovoro contacts.");
  }

  const contacts = await response.json();

  return (
    <main>
      <h1>Contacts</h1>

      <p>
        Organization:{" "}
        <strong>{auth.organization.name}</strong>
      </p>

      <p>
        Total contacts: <strong>{contacts.length}</strong>
      </p>

      <p>
        <a href="/dashboard">Back to Dashboard</a>
      </p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Source</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>

        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id}>
              <td>
  <a href={`/contacts/${contact.id}`}>
    {[contact.first_name, contact.last_name]
      .filter(Boolean)
      .join(" ") || "—"}
  </a>
</td>

              <td>{contact.email || "—"}</td>
              <td>{contact.phone || "—"}</td>
              <td>{contact.source || "—"}</td>
              <td>{contact.status || "—"}</td>

              <td>
                {contact.created_at
                  ? new Date(
                      contact.created_at
                    ).toLocaleString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <LogoutButton />
    </main>
  );
}
