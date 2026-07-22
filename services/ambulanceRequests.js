import { buildUrl } from "./apiConfig";

export const fetchPendingRequests = async (driverId) => {
   const query = driverId ? `?driverId=${encodeURIComponent(driverId)}` : "";
  const url = buildUrl(`/api/ambulance/request/pending${query}`);

  const res = await fetch(url);
  const text = await res.text();

  let data = {};
  try {
    data = JSON.parse(text);
  } catch (e) {}

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `HTTP ${res.status}: ${text.slice(0, 120)}`);
  }

  return data?.requests || [];
};
