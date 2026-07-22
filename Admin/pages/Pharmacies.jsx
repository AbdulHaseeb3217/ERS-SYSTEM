import React, { useState, useMemo, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  Search,
  Eye,
  X,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Store,
  ShoppingBag,
  FileText,
  ShieldCheck,
  Power,
  Package,
  Bike,
  CreditCard,
  Clock,
} from "lucide-react";

import { getPharmacies, updatePharmacy, updatePharmacyStatus } from "../services/adminApi";

/* ---------------- Helpers (format + validation same as pharmacy register) ---------------- */
const sanitizePharmacyName = (val) =>
  String(val ?? "")
    .replace(/[^A-Za-z\s.-]/g, "")
    .replace(/\s{2,}/g, " ");

const isValidPharmacyName = (val) => {
  const name = String(val ?? "").trim();
  const nameRegex = /^[A-Za-z\s.-]+$/;
  if (!nameRegex.test(name)) return false;
  if (/^[-.]|[-.]$/.test(name)) return false;
  return /[A-Za-z]/.test(name);
};

const sanitizePhone = (val) => String(val ?? "").replace(/\D/g, "").slice(0, 11);
const isValidPhone = (val) => /^\d{11}$/.test(String(val ?? "").trim());

const isValidEmail = (val) => {
  const email = String(val ?? "").trim();
  return email.includes("@") && email.includes(".") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const formatPharmacyLicense = (val) => {
  let cleaned = String(val ?? "").replace(/\//g, "").toUpperCase();
  cleaned = cleaned.replace(/[^A-Z0-9]/g, "").slice(0, 10);

  let formatted = "";
  if (cleaned.length > 0) formatted = cleaned.slice(0, 3);
  if (cleaned.length > 3) formatted += "/" + cleaned.slice(3, 8);
  if (cleaned.length > 8) formatted += "/" + cleaned.slice(8, 10);

  return formatted;
};

const isValidPharmacyLicense = (val) => /^[A-Z]{3}\/\d{5}\/\d{2}$/.test(String(val ?? "").trim());

const statusLabel = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "delivered" || s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";
  if (s === "payment_pending") return "Payment Pending";
  if (s === "navigating_to_patient") return "To Patient";
  if (s === "reached_pharmacy") return "Reached Pharmacy";
  if (s === "delivering") return "Delivering";
  if (s === "dispatching") return "Approved";
  if (s === "pharmacy_processing") return "Processing";
  return status || "N/A";
};

const paymentLabel = (paymentStatus) => {
  const s = String(paymentStatus || "").toLowerCase();
  if (s === "paid") return "Paid";
  if (s === "unpaid") return "Unpaid";
  return paymentStatus || "Unpaid";
};

const OrderHistoryCard = ({ order }) => {
  const isCompleted = ["delivered", "completed"].includes(String(order?.status || "").toLowerCase());
  const items = Array.isArray(order?.items) ? order.items : [];

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/60 text-left">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            {order.orderId || order.orderCode || "Order"}
          </p>
          <p className="text-sm font-bold text-gray-900 mt-1">{order.patientName || "Unknown Patient"}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{order.orderDate || "-"}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isCompleted ? "bg-green-100 text-green-700 border border-green-200" : "bg-blue-100 text-blue-700 border border-blue-200"}`}>
            {statusLabel(order.status)}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
            {paymentLabel(order.paymentStatus)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-gray-100 rounded-lg p-3">
          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Rider</p>
          <div className="flex items-center gap-1.5 text-gray-800">
            <Bike size={13} className="text-gray-400" />
            <p className="text-[11px] font-bold">{order.riderName || "N/A"}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-3">
          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Delivery Time</p>
          <div className="flex items-center gap-1.5 text-gray-800">
            <Clock size={13} className="text-gray-400" />
            <p className="text-[11px] font-bold">{order.deliveryTime || "N/A"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 p-3 mb-3">
        <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Items Delivered</p>
        {items.length > 0 ? (
          <ul className="space-y-1.5">
            {items.map((item, idx) => (
              <li key={`${item}-${idx}`} className="flex items-center gap-2 text-[12px] text-gray-700 font-medium">
                <CheckCircle size={14} className="text-green-500 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-gray-400 italic">No items found</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-[10px] text-gray-500 font-medium">Total Amount</p>
          <p className="text-lg font-black text-gray-900">PKR {Number(order.totalAmount || 0).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500">
          <CreditCard size={14} />
          <span className="text-[11px] font-bold">{paymentLabel(order.paymentStatus)}</span>
        </div>
      </div>
    </div>
  );
};

const Pharmacies = ({ user, onLogout, onSetActivePage }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [modalTab, setModalTab] = useState("profile");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [notification, setNotification] = useState(null);

  const [loading, setLoading] = useState(false);
  const [pharmacies, setPharmacies] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, blocked: 0 });

  const [updateFormData, setUpdateFormData] = useState({
    name: "",
    phone: "",
    email: "",
    licenseNumber: "",
    address: "",
  });
  const [updateFormErrors, setUpdateFormErrors] = useState({});

  const clearUpdateFieldError = (key) => {
    setUpdateFormErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateUpdateForm = () => {
    const errors = {};

    const name = updateFormData.name.trim();
    const phone = updateFormData.phone.trim();
    const email = updateFormData.email.trim();
    const licenseNumber = updateFormData.licenseNumber.trim();
    const address = updateFormData.address.trim();

    if (!name) {
      errors.name = "Pharmacy Name is required.";
    } else if (!isValidPharmacyName(name)) {
      errors.name = "Pharmacy Name must contain only alphabets, spaces, dots (.), or hyphens (-). It cannot start/end with dot or hyphen.";
    }

    if (!phone) {
      errors.phone = "Contact Number is required.";
    } else if (!isValidPhone(phone)) {
      errors.phone = "Contact Number must be exactly 11 digits.";
    }

    if (!email) {
      errors.email = "Email Address is required.";
    } else if (!isValidEmail(email)) {
      errors.email = "Invalid Email Address.";
    }

    if (!licenseNumber) {
      errors.licenseNumber = "License Number is required.";
    } else if (!isValidPharmacyLicense(licenseNumber)) {
      errors.licenseNumber = "Invalid License. Complete the format: ABC/12345/25";
    }

    if (!address) {
      errors.address = "Pharmacy address is required.";
    }

    setUpdateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 2500);
  };

  const fetchPharmacies = async (q = "") => {
    try {
      setLoading(true);
      const data = await getPharmacies(q);
      setPharmacies(data?.pharmacies || []);
      setStats(data?.stats || { total: 0, active: 0, pending: 0, blocked: 0 });
    } catch (e) {
      console.error(e);
      showNotification("error", e?.response?.data?.message || "Pharmacies load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmacies("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchPharmacies(searchQuery), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const filteredPharmacies = useMemo(() => {
    // already server search ho raha hai; yeh extra safety filter
    return pharmacies.filter((p) => {
      const n = (p?.name || "").toLowerCase();
      const id = (p?.pharmacyId || p?.id || "").toLowerCase();
      const q = searchQuery.toLowerCase();
      return !q || n.includes(q) || id.includes(q);
    });
  }, [pharmacies, searchQuery]);

  const getStatusBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "active":
        return (
          <span className="px-2.5 py-0.5 bg-[#00d053] text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
            active
          </span>
        );
      case "pending":
        return (
          <span className="px-2.5 py-0.5 bg-[#f59e0b] text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
            pending
          </span>
        );
      case "blocked":
        return (
          <span className="px-2.5 py-0.5 bg-[#f43f5e] text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
            blocked
          </span>
        );
      default:
        return null;
    }
  };

  const openDetails = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setModalTab("profile");
  };

  const handleUpdateClick = () => {
    if (!selectedPharmacy) return;
    setUpdateFormData({
      name: selectedPharmacy.name || "",
      phone: selectedPharmacy.phone || "",
      email: selectedPharmacy.email || "",
      licenseNumber: selectedPharmacy.licenseNumber || "",
      address: selectedPharmacy.address || "",
    });
    setUpdateFormErrors({});
    setShowUpdateModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPharmacy?.id) return;
    if (!validateUpdateForm()) return;

    try {
      const payload = {
        name: updateFormData.name.trim(),
        phone: updateFormData.phone.trim(),
        email: updateFormData.email.trim(),
        licenseNumber: updateFormData.licenseNumber.trim(),
        address: updateFormData.address.trim(),
      };

      const res = await updatePharmacy(selectedPharmacy.id, payload);
      const updated = res?.pharmacy;

      // list update
      setPharmacies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      // modal update
      setSelectedPharmacy(updated);

      showNotification("success", "Pharmacy profile updated!");
      setShowUpdateModal(false);
    } catch (e2) {
      console.error(e2);
      showNotification("error", e2?.response?.data?.message || "Update failed");
    }
  };

  const handleStatusAction = async (action) => {
    if (!selectedPharmacy?.id) return;
    try {
      const res = await updatePharmacyStatus(selectedPharmacy.id, action);
      const updated = res?.pharmacy;

      setPharmacies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedPharmacy(updated);

      // stats refresh (simple way)
      fetchPharmacies(searchQuery);

      showNotification("success", "Status updated!");
    } catch (e) {
      console.error(e);
      showNotification("error", e?.response?.data?.message || "Status update failed");
    }
  };

  return (
    <div className="flex bg-[#f9fafb] min-h-screen">
      <Sidebar activeTab="pharmacies" onLogout={onLogout} onTabClick={onSetActivePage} />

      <main className="flex-1 ml-64 p-8">
        {notification && (
          <div
            className={`fixed top-6 right-6 z-[250] flex items-center space-x-3 px-6 py-4 rounded-xl shadow-2xl border animate-in slide-in-from-right-8 duration-300 ${
              notification.type === "success"
                ? "bg-green-50 border-green-100 text-green-700"
                : "bg-red-50 border-red-100 text-red-700"
            }`}
          >
            {notification.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-bold">{notification.message}</span>
          </div>
        )}

        <header className="flex justify-between items-center mb-8">
          <div className="text-left">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Pharmacies</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">
              Emergency Response System Admin Panel
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-800 leading-tight">{user?.name || "Admin User"}</p>
              <p className="text-[10px] text-gray-400 font-medium">{user?.email || "admin@ers.com"}</p>
            </div>
            <div className="w-8 h-8 bg-[#e10000] rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-sm">
              {(user?.name || "A").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] text-gray-400 font-bold mb-1 uppercase tracking-tight">Total Pharmacies</p>
            <h3 className="text-xl font-bold text-gray-800">{stats.total}</h3>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] text-gray-400 font-bold mb-1 uppercase tracking-tight">Active Pharmacies</p>
            <h3 className="text-xl font-bold text-gray-800">{stats.active}</h3>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] text-gray-400 font-bold mb-1 uppercase tracking-tight">Pending Approval</p>
            <h3 className="text-xl font-bold text-gray-800 text-[#f59e0b]">{stats.pending}</h3>
          </div>
        </div>

        {/* Pharmacy Management Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-6 text-left">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Pharmacy Management</h2>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              View, approve, and manage all registered pharmacies
            </p>
          </div>

          <div className="px-6 py-4">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pharmacies..."
                className="w-full bg-gray-50 border-none rounded-lg pl-10 pr-4 py-2.5 text-xs font-medium text-gray-700 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Pharmacy Name
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td className="px-6 py-10 text-sm text-gray-400" colSpan={6}>
                      Loading pharmacies...
                    </td>
                  </tr>
                ) : filteredPharmacies.length === 0 ? (
                  <tr>
                    <td className="px-6 py-10 text-sm text-gray-400" colSpan={6}>
                      No pharmacies found.
                    </td>
                  </tr>
                ) : (
                  filteredPharmacies.map((pharmacy) => (
                    <tr key={pharmacy.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-700">
                        {pharmacy.pharmacyId || pharmacy.id}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-gray-800">{pharmacy.name}</td>
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-600">
                        <div className="flex items-center space-x-1.5">
                          <MapPin size={12} className="text-gray-300" />
                          <span>{pharmacy.location || pharmacy.address || "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(pharmacy.status)}</td>
                      <td className="px-6 py-4 text-[11px] font-bold text-gray-700">{pharmacy.ordersCount || 0}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => openDetails(pharmacy)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-800 transition-colors border border-gray-100 shadow-sm"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Pharmacy Details Modal */}
      {selectedPharmacy && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 text-left">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Pharmacy Details - {selectedPharmacy.name}</h2>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                  Complete profile and order history
                </p>
              </div>
              <button onClick={() => setSelectedPharmacy(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 bg-gray-50/30">
              <div className="bg-gray-100 p-1 rounded-xl flex">
                <button
                  onClick={() => setModalTab("profile")}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    modalTab === "profile" ? "bg-white shadow-sm text-gray-800" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setModalTab("history")}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    modalTab === "history" ? "bg-white shadow-sm text-gray-800" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Order History ({selectedPharmacy.ordersCount || 0})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white text-left">
              {modalTab === "profile" ? (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <section>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                      Pharmacy Information
                    </h3>
                    <div className="grid grid-cols-2 gap-y-5">
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight uppercase">
                          Pharmacy ID
                        </p>
                        <p className="text-[11px] font-bold text-gray-800">
                          {selectedPharmacy.pharmacyId || selectedPharmacy.id}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight uppercase">
                          Pharmacy Name
                        </p>
                        <div className="flex items-center space-x-1.5 text-gray-800">
                          <Store size={12} className="text-gray-300" />
                          <p className="text-[11px] font-bold">{selectedPharmacy.name}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight uppercase">
                          License Number
                        </p>
                        <p className="text-[11px] font-bold text-gray-800">{selectedPharmacy.licenseNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight uppercase">
                          Operating Hours
                        </p>
                        <p className="text-[11px] font-bold text-gray-800">{selectedPharmacy.operatingHours || "24/7"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight uppercase">
                          Phone Number
                        </p>
                        <p className="text-[11px] font-bold text-gray-800">{selectedPharmacy.phone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight uppercase">
                          Email Address
                        </p>
                        <p className="text-[11px] font-bold text-gray-800">{selectedPharmacy.email}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight uppercase">Address</p>
                        <div className="flex items-start space-x-1.5 text-gray-800">
                          <MapPin size={12} className="text-gray-300 mt-0.5" />
                          <p className="text-[11px] font-bold leading-tight">
                            {selectedPharmacy.address || selectedPharmacy.location || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="h-[1px] bg-gray-50"></div>

                  <section>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                      Account & Performance
                    </h3>
                    <div className="grid grid-cols-2 gap-y-5">
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight uppercase">Status</p>
                        <div className="mt-1">{getStatusBadge(selectedPharmacy.status)}</div>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight uppercase">Total Orders</p>
                        <div className="flex items-center space-x-1.5 text-[#00d053]">
                          <ShoppingBag size={12} />
                          <p className="text-[11px] font-bold">{selectedPharmacy.ordersCount || 0}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight uppercase">Completed Orders</p>
                        <div className="flex items-center space-x-1.5 text-green-600">
                          <CheckCircle size={12} />
                          <p className="text-[11px] font-bold">{selectedPharmacy.completedOrdersCount || 0}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight uppercase">Total Revenue</p>
                        <p className="text-[11px] font-bold text-gray-800">PKR {Number(selectedPharmacy.totalRevenue || 0).toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight uppercase">Join Date</p>
                        <div className="flex items-center space-x-1.5 text-gray-400">
                          <Calendar size={12} />
                          <p className="text-[11px] font-bold text-gray-800">{selectedPharmacy.joinDate || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                Array.isArray(selectedPharmacy.orderHistory) && selectedPharmacy.orderHistory.length > 0 ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                  {selectedPharmacy.orderHistory.map((order) => (
                    <OrderHistoryCard key={order.id || order.orderId} order={order} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <Package size={26} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-xs text-gray-400 font-bold italic uppercase tracking-wider">No history found</p>
                </div>
              )
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
              {selectedPharmacy.status === "pending" && (
                <button
                  onClick={() => handleStatusAction("approve")}
                  className="flex-1 py-3 px-4 bg-[#00d053] text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-lg shadow-green-50"
                >
                  <ShieldCheck size={14} />
                  Approve Pharmacy
                </button>
              )}

              {selectedPharmacy.status === "blocked" && (
                <button
                  onClick={() => handleStatusAction("activate")}
                  className="flex-1 py-3 px-4 bg-[#3b82f6] text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-50"
                >
                  <Power size={14} />
                  Activate Pharmacy
                </button>
              )}

              {selectedPharmacy.status === "active" && (
                <button
                  onClick={() => handleStatusAction("block")}
                  className="flex-1 py-3 px-4 bg-[#f43f5e] text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-50"
                >
                  <AlertCircle size={14} />
                  Block Pharmacy
                </button>
              )}

              <button
                onClick={handleUpdateClick}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all bg-white shadow-sm"
              >
                <FileText size={14} />
                Update Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Pharmacy Profile Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 text-left">
              <div>
                <h2 className="text-sm font-bold text-gray-800 tracking-tight">Update Pharmacy Profile</h2>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                  Update pharmacy information below
                </p>
              </div>
              <button onClick={() => { setShowUpdateModal(false); setUpdateFormErrors({}); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleUpdateSubmit}
              className="p-6 space-y-4 text-left custom-scrollbar max-h-[70vh] overflow-y-auto"
            >
              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">
                  Pharmacy Name
                </label>
                <input
                  type="text"
                  value={updateFormData.name}
                  onChange={(e) => {
                    setUpdateFormData({ ...updateFormData, name: sanitizePharmacyName(e.target.value) });
                    if (updateFormErrors.name) clearUpdateFieldError("name");
                  }}
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs font-bold text-gray-700 focus:ring-1 focus:ring-red-500 outline-none transition-all shadow-sm ${updateFormErrors.name ? "border-red-500" : "border-gray-200"}`}
                />
                {updateFormErrors.name && <p className="text-[10px] text-red-600 font-bold mt-1.5">{updateFormErrors.name}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Phone</label>
                <input
                  type="text"
                  value={updateFormData.phone}
                  onChange={(e) => {
                    setUpdateFormData({ ...updateFormData, phone: sanitizePhone(e.target.value) });
                    if (updateFormErrors.phone) clearUpdateFieldError("phone");
                  }}
                  maxLength={11}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 focus:ring-1 focus:ring-red-500 outline-none transition-all ${updateFormErrors.phone ? "border-red-500" : "border-gray-100"}`}
                />
                {updateFormErrors.phone && <p className="text-[10px] text-red-600 font-bold mt-1.5">{updateFormErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={updateFormData.email}
                  onChange={(e) => {
                    setUpdateFormData({ ...updateFormData, email: e.target.value });
                    if (updateFormErrors.email) clearUpdateFieldError("email");
                  }}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 focus:ring-1 focus:ring-red-500 outline-none transition-all ${updateFormErrors.email ? "border-red-500" : "border-gray-100"}`}
                />
                {updateFormErrors.email && <p className="text-[10px] text-red-600 font-bold mt-1.5">{updateFormErrors.email}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">
                  License Number
                </label>
                <input
                  type="text"
                  value={updateFormData.licenseNumber}
                  onChange={(e) => {
                    setUpdateFormData({ ...updateFormData, licenseNumber: formatPharmacyLicense(e.target.value) });
                    if (updateFormErrors.licenseNumber) clearUpdateFieldError("licenseNumber");
                  }}
                  maxLength={12}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 focus:ring-1 focus:ring-red-500 outline-none transition-all uppercase ${updateFormErrors.licenseNumber ? "border-red-500" : "border-gray-100"}`}
                />
                {updateFormErrors.licenseNumber && <p className="text-[10px] text-red-600 font-bold mt-1.5">{updateFormErrors.licenseNumber}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Address</label>
                <textarea
                  value={updateFormData.address}
                  onChange={(e) => {
                    setUpdateFormData({ ...updateFormData, address: e.target.value });
                    if (updateFormErrors.address) clearUpdateFieldError("address");
                  }}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 focus:ring-1 focus:ring-red-500 outline-none transition-all resize-none h-20 shadow-inner ${updateFormErrors.address ? "border-red-500" : "border-gray-100"}`}
                />
                {updateFormErrors.address && <p className="text-[10px] text-red-600 font-bold mt-1.5">{updateFormErrors.address}</p>}
              </div>

              <div className="pt-4 sticky bottom-0 bg-white">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#e10000] text-white text-[11px] font-bold rounded-xl hover:bg-red-700 transition-all shadow-xl shadow-red-100 uppercase tracking-widest"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default Pharmacies;
