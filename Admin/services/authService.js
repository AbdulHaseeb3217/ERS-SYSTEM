const API_BASE_URL = "http://localhost:5000/api";

const getToken = () => localStorage.getItem("token");

// Login Function
export const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data;
};

// Dashboard Stats Fetch Function
export const fetchDashboardData = async () => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch stats");
  }

  return await response.json();
};

// Admin Notifications
export const fetchAdminNotifications = async () => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/admin-notifications`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch admin notifications");
  }

  return data.notifications || [];
};

export const fetchAdminUnreadCount = async () => {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/admin-notifications/unread-count`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch unread count");
  }

  return Number(data.count || 0);
};

export const markAdminNotificationRead = async (notificationId) => {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/admin-notifications/${notificationId}/read`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to mark notification read");
  }

  return data.notification;
};

export const markAllAdminNotificationsRead = async () => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/admin-notifications/read-all`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to mark all notifications read");
  }

  return data;
};

// Logout Function
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
};