// services/apiConfig.js

export const API_IP = "192.168.1.9";
export const API_PORT = 5000;

export const BASE_URL = `http://${API_IP}:${API_PORT}`;


export const GOOGLE_MAPS_APIKEY = "AIzaSyA7D56WKApJ8Ash580RI_SroCDi27-MghE";

export const buildUrl = (path) => {
  if (!path) return BASE_URL;

  let p = String(path).trim();

  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  if (!p.startsWith("/")) p = `/${p}`;

  return `${BASE_URL}${p}`;
};