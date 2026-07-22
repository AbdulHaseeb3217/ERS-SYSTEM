import axios from "axios";

const API_BASE = "http://localhost:5000/api/admin";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // Assuming your token key is 'token'
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// =======================
// ✅ ADMIN SETTINGS
// =======================
export const updateAdminProfileApi = async (payload) => {
  const res = await api.put("/profile/update", payload);
  return res.data;
};

export const changeAdminPasswordApi = async (payload) => {
  const res = await api.put("/profile/change-password", payload);
  return res.data;
};

// =======================
// ✅ PATIENTS
// =======================
export const getPatients = async (q = "") => {
  const res = await api.get(`/patients?q=${encodeURIComponent(q)}`);
  return res.data;
};
export const updatePatient = async (id, payload) => {
  const res = await api.patch(`/patients/${id}`, payload);
  return res.data;
};
export const updatePatientStatus = async (id, action) => {
  const res = await api.patch(`/patients/${id}/status`, { action });
  return res.data;
};

// =======================
// ✅ DRIVERS
// =======================
export const getDrivers = async (q = "") => {
  const res = await api.get(`/drivers?q=${encodeURIComponent(q)}`);
  return res.data;
};
export const updateDriver = async (id, payload) => {
  const res = await api.patch(`/drivers/${id}`, payload);
  return res.data;
};
export const updateDriverStatus = async (id, action) => {
  const res = await api.patch(`/drivers/${id}/status`, { action });
  return res.data;
};

// =======================
// ✅ RIDERS
// =======================
export const getRiders = async (q = "") => {
  const res = await api.get(`/riders?q=${encodeURIComponent(q)}`);
  return res.data;
};
export const updateRider = async (id, payload) => {
  const res = await api.patch(`/riders/${id}`, payload);
  return res.data;
};
export const updateRiderStatus = async (id, action) => {
  const res = await api.patch(`/riders/${id}/status`, { action });
  return res.data;
};

// =======================
// ✅ PHARMACIES
// =======================
export const getPharmacies = async (q = "") => {
  const res = await api.get(`/pharmacies?q=${encodeURIComponent(q)}`);
  return res.data;
};
export const updatePharmacy = async (id, payload) => {
  const res = await api.patch(`/pharmacies/${id}`, payload);
  return res.data;
};
export const updatePharmacyStatus = async (id, action) => {
  const res = await api.patch(`/pharmacies/${id}/status`, { action });
  return res.data;
};

export default api;