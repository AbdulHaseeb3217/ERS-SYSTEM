const API_URL = "http://localhost:5000/api";
const STORAGE_KEY = "pharmacy_user";

const getHeaders = () => {
  const userStr = localStorage.getItem(STORAGE_KEY);
  const headers = { "Content-Type": "application/json" };

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.token) headers["Authorization"] = `Bearer ${user.token}`;
    } catch (e) {
      console.error(e);
    }
  }

  return headers;
};

const getStoredPharmacyId = () => {
  const userStr = localStorage.getItem(STORAGE_KEY);

  if (!userStr) return "";

  try {
    const user = JSON.parse(userStr);
    return user.id || user._id || "";
  } catch (e) {
    console.error(e);
    return "";
  }
};

const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

export const api = {

  login: async (c) => {
    const r = await fetch(`${API_URL}/pharmacy/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c),
    });

    return handleResponse(r);
  },


  register: async (d) => {
    const r = await fetch(`${API_URL}/pharmacy/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });

    return handleResponse(r);
  },


  verifyEmail: async (d) => {
    const r = await fetch(`${API_URL}/pharmacy/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });

    return handleResponse(r);
  },


  resetPassword: async (e, p) => {
    const r = await fetch(`${API_URL}/pharmacy/reset-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: e,
        newPassword: p,
      }),
    });

    return handleResponse(r);
  },


  updateProfile: async (id, d) => {
    const r = await fetch(`${API_URL}/pharmacy/update/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(d),
    });

    return handleResponse(r);
  },


  getProfile: async (id) => {
    const r = await fetch(`${API_URL}/pharmacy/profile/${id}`, {
      method: "GET",
      headers: getHeaders(),
    });

    return handleResponse(r);
  },


  changePassword: async (id, o, n) => {
    const r = await fetch(`${API_URL}/pharmacy/change-password/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        currentPassword: o,
        newPassword: n,
      }),
    });

    return handleResponse(r);
  },


  getDashboardStats: async (id) => {
    const r = await fetch(`${API_URL}/pharmacy/stats/${id}`, {
      method: "GET",
      headers: getHeaders(),
    });

    return handleResponse(r);
  },


  toggleOnlineStatus: async (id) => {
    const r = await fetch(`${API_URL}/pharmacy/toggle-status/${id}`, {
      method: "PUT",
      headers: getHeaders(),
    });

    return handleResponse(r);
  },


  getRequests: async () => {
    const id = getStoredPharmacyId();

    const response = await fetch(`${API_URL}/pharmacy/requests/${id}`, {
      method: "GET",
      headers: getHeaders(),
    });

    return handleResponse(response);
  },


  getPendingNotifications: async () => {
    const id = getStoredPharmacyId();

    const response = await fetch(`${API_URL}/pharmacy/requests/${id}`, {
      method: "GET",
      headers: getHeaders(),
    });

    return handleResponse(response);
  },


  // ✅ UPDATED FUNCTION - PRICE VALUES ADDED
  approveAndDispatchRequest: async (
    pharmacyId,
    orderId,
    pricing
  ) => {

    const response = await fetch(
      `${API_URL}/pharmacy/approve-dispatch`,
      {
        method: "POST",
        headers: getHeaders(),

        body: JSON.stringify({

          pharmacyId,
          orderId,

          medicineAmount:
            Number(pricing?.medicineAmount || 0),

          equipmentAmount:
            Number(pricing?.equipmentAmount || 0),

          deliveryCharges:
            Number(pricing?.deliveryCharges || 0),

        }),
      }
    );


    return handleResponse(response);
  },


  ignoreRequest: async (pharmacyId, orderId) => {

    const response = await fetch(
      `${API_URL}/pharmacy/ignore-request`,
      {
        method: "POST",
        headers: getHeaders(),

        body: JSON.stringify({
          pharmacyId,
          orderId,
        }),
      }
    );

    return handleResponse(response);
  },


  getCompletedPharmacyOrders: async (pharmacyId) => {

    const response = await fetch(
      `${API_URL}/medicine-orders/pharmacy/${pharmacyId}/completed`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    return handleResponse(response);
  },

};