import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AdminApp from "./Admin/App.jsx";
import PharmacyApp from "./Pharmacy/App.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ Pharmacy ALWAYS first */}
        <Route path="/pharmacy/*" element={<PharmacyApp />} />

        {/* ✅ If user types /pharmacy, send to pharmacy login */}
        <Route path="/pharmacy" element={<Navigate to="/pharmacy/login" replace />} />

        {/* ✅ Admin last catch-all */}
        <Route path="/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}
