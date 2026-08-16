const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2000";

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return res.ok;
  } catch (error) {
    console.error("Failed to refresh access token:", error);
    return false;
  }
}

export async function apiFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  let url: string;
  if (typeof input === "string") {
    url = input.startsWith("http") ? input : `${API_BASE_URL}${input.startsWith("/") ? "" : "/"}${input}`;
  } else if (input instanceof URL) {
    url = input.toString();
  } else {
    url = input.url;
  }

  const options: RequestInit = {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  };

  let response = await fetch(url, options);

  const isAuthEndpoint =
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/register") ||
    url.includes("/api/auth/refresh");

  if (response.status === 401 && !isAuthEndpoint) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;

    if (refreshed) {
      response = await fetch(url, options);
    } else {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
  }

  return response;
}
