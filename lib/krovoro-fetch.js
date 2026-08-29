export async function krovoroFetch(
  input,
  options = {}
) {
  const response = await fetch(input, {
    ...options,
    credentials: "same-origin",
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshResponse = await fetch(
    "/api/auth/refresh",
    {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    }
  );

  if (!refreshResponse.ok) {
    return response;
  }

  return fetch(input, {
    ...options,
    credentials: "same-origin",
  });
}
