const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2000";

let refreshPromise: Promise<boolean> | null = null;

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("hydra_access_token");
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("hydra_refresh_token");
}

export function setStoredTokens(accessToken?: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  if (accessToken) localStorage.setItem("hydra_access_token", accessToken);
  if (refreshToken) localStorage.setItem("hydra_refresh_token", refreshToken);
}

export function clearStoredTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("hydra_access_token");
  localStorage.removeItem("hydra_refresh_token");
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const storedRefresh = getStoredRefreshToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (storedRefresh) {
      headers["x-refresh-token"] = storedRefresh;
    }

    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers,
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.accessToken) {
        setStoredTokens(data.accessToken);
      }
      return true;
    }
    return false;
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

  const token = getStoredAccessToken();
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init?.headers as Record<string, string>) || {}),
  };

  const options: RequestInit = {
    ...init,
    credentials: "include",
    headers: requestHeaders,
  };

  let response = await fetch(url, options);

  if (url.includes("/api/auth/login") && response.ok) {
    const clone = response.clone();
    clone.json().then((data) => {
      if (data?.accessToken || data?.refreshToken) {
        setStoredTokens(data.accessToken, data.refreshToken);
      }
    }).catch(() => {});
  }

  if (url.includes("/api/auth/logout")) {
    clearStoredTokens();
  }

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
      const freshToken = getStoredAccessToken();
      const retryHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(freshToken ? { Authorization: `Bearer ${freshToken}` } : {}),
        ...((init?.headers as Record<string, string>) || {}),
      };
      response = await fetch(url, { ...options, headers: retryHeaders });
    } else {
      clearStoredTokens();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
  }

  return response;
}
