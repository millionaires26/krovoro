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

  const pageSize = 5;
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

if (search) {
  const searchTerms = search
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const searchGroups = searchTerms.map(
    (term) =>
      `or(` +
      [
        `first_name.ilike.*${term}*`,
        `last_name.ilike.*${term}*`,
        `email.ilike.*${term}*`,
        `phone.ilike.*${term}*`,
        `source.ilike.*${term}*`,
      ].join(",") +
      `)`
  );

  contactsUrl.searchParams.set(
    "and",
    `(${searchGroups.join(",")})`
  );
}

if (status) {
  contactsUrl.searchParams.set(
    "status",
    `eq.${status}`
  );
}

const sortMap = {
  created_desc: "created_at.desc",
  created_asc: "created_at.asc",
  name_asc: "first_name.asc",
  name_desc: "first_name.desc",
};

contactsUrl.searchParams.set(
  "order",
  sortMap[sort] || sortMap.created_desc
);

const offset = (page - 1) * pageSize;

contactsUrl.searchParams.set(
  "limit",
  String(pageSize + 1)
);

contactsUrl.searchParams.set(
  "offset",
  String(offset)
);

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

  const fetchedContacts = await response.json();

const hasNextPage =
  fetchedContacts.length > pageSize;

const contacts = hasNextPage
  ? fetchedContacts.slice(0, pageSize)
  : fetchedContacts;

const hasPreviousPage = page > 1;

function buildContactsUrl(overrides = {}) {
  const nextSearch =
    overrides.search !== undefined
      ? overrides.search
      : search;

  const nextStatus =
    overrides.status !== undefined
      ? overrides.status
      : status;

  const nextSort =
    overrides.sort !== undefined
      ? overrides.sort
      : sort;

  const nextPage =
    overrides.page !== undefined
      ? overrides.page
      : page;

  const query = new URLSearchParams();

  if (nextSearch) {
    query.set("search", nextSearch);
  }

  if (nextStatus) {
    query.set("status", nextStatus);
  }

  if (
    nextSort &&
    nextSort !== "created_desc"
  ) {
    query.set("sort", nextSort);
  }

  if (nextPage > 1) {
    query.set("page", String(nextPage));
  }

  const queryString = query.toString();

  return queryString
    ? `/contacts?${queryString}`
    : "/contacts";
}

return (
    <main>
      <h1>Contacts</h1>

      <p>
        Organization:{" "}
        <strong>{auth.organization.name}</strong>
      </p>

     <p>
  Showing <strong>{contacts.length}</strong> contact
  {contacts.length === 1 ? "" : "s"}
  {page > 1 ? ` on page ${page}` : ""}
</p>

<form
  action="/contacts"
  method="GET"
  style={{
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "end",
    marginBottom: "20px",
  }}
>
  <label>
    Search
    <br />
    <input
      type="search"
      name="search"
      defaultValue={search}
      placeholder="Name, email, phone, source"
    />
  </label>

  <label>
    Status
    <br />
    <select
      name="status"
      defaultValue={status}
    >
      <option value="">All statuses</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  </label>

  <label>
    Sort
    <br />
    <select
      name="sort"
      defaultValue={sort}
    >
      <option value="created_desc">
        Newest first
      </option>
      <option value="created_asc">
        Oldest first
      </option>
      <option value="name_asc">
        Name A–Z
      </option>
      <option value="name_desc">
        Name Z–A
      </option>
    </select>
  </label>

  <button type="submit">
    Apply
  </button>

  {(search ||
    status ||
    sort !== "created_desc") && (
    <a href="/contacts">
      Clear
    </a>
  )}
</form>

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

{(hasPreviousPage || hasNextPage) && (
  <nav
    aria-label="Contact pagination"
    style={{
      display: "flex",
      gap: "12px",
      alignItems: "center",
      marginTop: "20px",
      marginBottom: "20px",
    }}
  >
    {hasPreviousPage ? (
      <a href={buildContactsUrl({ page: page - 1 })}>
        Previous
      </a>
    ) : (
      <span>Previous</span>
    )}

    <span>
      Page <strong>{page}</strong>
    </span>

    {hasNextPage ? (
      <a href={buildContactsUrl({ page: page + 1 })}>
        Next
      </a>
    ) : (
      <span>Next</span>
    )}
  </nav>
)}

<LogoutButton />
    </main>
  );
}
