// src/Pharmacy/services/authService.js
import { api } from "./api";

const USE_REAL_BACKEND = true;
const STORAGE_KEY = "pharmacy_user";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const authService = {
  login: async (email, password) => {
    if (USE_REAL_BACKEND) {
      const response = await api.login({ email, password });
      const userToSave = { ...response.user, token: response.token };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userToSave));
      return userToSave;
    }

    await delay(800);
    throw new Error("Invalid credentials");
  },

  register: async (data) => {
    if (USE_REAL_BACKEND) {
      const response = await api.register(data);
      const userToSave = { ...response.user, token: response.token };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userToSave));
      return userToSave;
    }

    await delay(1000);
    return data;
  },

  verifyEmail: async (email) => {
    if (USE_REAL_BACKEND) return await api.verifyEmail({ email });
    await delay(400);
    return true;
  },

  resetPassword: async (email, newPassword) => {
    if (USE_REAL_BACKEND) return await api.resetPassword(email, newPassword);
    await delay(800);
    return true;
  },

  updateProfile: async (updatedData) => {
    const currentUserStr = localStorage.getItem(STORAGE_KEY);
    if (!currentUserStr) throw new Error("No user logged in");

    const currentUser = JSON.parse(currentUserStr);
    const userId = currentUser.id || currentUser._id;

    const response = await api.updateProfile(userId, updatedData);
    const updatedUser = { ...currentUser, ...response.user };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  },

  getProfile: async (id) => {
    const response = await api.getProfile(id);

    const currentUserStr = localStorage.getItem(STORAGE_KEY);
    if (currentUserStr) {
      const currentUser = JSON.parse(currentUserStr);
      const mergedUser = { ...currentUser, ...response.user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedUser));
      return mergedUser;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
    return response.user;
  },

  changePassword: async (currentPassword, newPassword) => {
    const currentUserStr = localStorage.getItem(STORAGE_KEY);
    if (!currentUserStr) throw new Error("No user logged in");

    const currentUser = JSON.parse(currentUserStr);
    const userId = currentUser.id || currentUser._id;

    return await api.changePassword(userId, currentPassword, newPassword);
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  getCurrentUser: () => {
    const user = localStorage.getItem(STORAGE_KEY);
    return user ? JSON.parse(user) : null;
  },

  saveUser: (user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  },
};
