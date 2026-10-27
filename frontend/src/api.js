let currentCsrfToken = "";
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function setCsrfToken(token) {
  currentCsrfToken = token || "";
}

export function getCsrfToken() {
  return currentCsrfToken;
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Attach CSRF token on mutation requests if available
  if (currentCsrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes((options.method || "GET").toUpperCase())) {
    headers["X-CSRF-Token"] = currentCsrfToken;
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const response = await fetch(url, {
    // Include cookies for session authentication
    credentials: "include",
    headers,
    ...options,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  // Update CSRF token if returned in response
  if (data?.csrf_token) {
    currentCsrfToken = data.csrf_token;
  }

  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.code;
    error.data = data;
    throw error;
  }

  return data;
}

// ── Health & Metrics (Public) ────────────────────────────────────

export function getHealth() {
  return request("/api/health");
}

export function getModelMetrics() {
  return request("/api/model/metrics");
}

export function getSamples() {
  return request("/api/samples");
}

// ── Authentication Endpoints ─────────────────────────────────────

export function getCsrf() {
  return request("/api/auth/csrf");
}

export function registerUser(email, password, confirm_password) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, confirm_password }),
  });
}

export function loginUser(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logoutUser() {
  return request("/api/auth/logout", {
    method: "POST",
  });
}

export function getCurrentUser() {
  return request("/api/auth/me");
}

export function forgotPassword(email) {
  return request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token, password, confirm_password) {
  return request("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password, confirm_password }),
  });
}

export function updatePreferences(store_history_opt_in) {
  return request("/api/auth/preferences", {
    method: "PATCH",
    body: JSON.stringify({ store_history_opt_in }),
  });
}

// ── User Prediction History (Protected) ──────────────────────────

export function getUserHistory() {
  return request("/api/history");
}

export function clearUserHistory() {
  return request("/api/history", {
    method: "DELETE",
  });
}

export function deleteHistoryItem(itemId) {
  return request(`/api/history/${itemId}`, {
    method: "DELETE",
  });
}

// ── Core NLP & Prediction (Protected) ────────────────────────────

export function predictSpam(text) {
  return request("/api/predict", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function analyzeText(text) {
  return request("/api/analyze", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function compareTexts(text1, text2) {
  return request("/api/similarity", {
    method: "POST",
    body: JSON.stringify({ text1, text2 }),
  });
}

export function generateWordCloud(text) {
  return request("/api/wordcloud", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
