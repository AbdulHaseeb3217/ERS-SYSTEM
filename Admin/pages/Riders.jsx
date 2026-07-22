import React, { useState, useMemo, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  Search,
  Eye,
  X,
  Users,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Bike,
  ShoppingBag,
  Filter,
} from "lucide-react";

import { getRiders, updateRider, updateRiderStatus } from "../services/adminApi";

/* ---------------- Helpers (format + validation) ---------------- */
const sanitizeName = (val) => String(val ?? "").replace(/[^A-Za-z\s]/g, "");
const sanitizePhone = (val) => String(val ?? "").replace(/[^0-9]/g, "").slice(0, 11);

const formatCNIC = (val) => {
  let digits = String(val ?? "").replace(/\D/g, "").slice(0, 13);
  let formatted = digits;

  if (digits.length > 5) formatted = digits.slice(0, 5) + "-" + digits.slice(5);
  if (digits.length > 12) {
    formatted =
      digits.slice(0, 5) +
      "-" +
      digits.slice(5, 12) +
      "-" +
      digits.slice(12, 13);
  }

  return formatted;
};

const formatLicense = (val) => {
  const allDigits = String(val ?? "").replace(/\D/g, "").slice(0, 16);
  const first13 = allDigits.slice(0, 13);
  const last3 = allDigits.slice(13, 16);

  let formatted = first13;

  if (first13.length > 5) formatted = first13.slice(0, 5) + "-" + first13.slice(5);
  if (first13.length > 12) {
    formatted =
      first13.slice(0, 5) +
      "-" +
      first13.slice(5, 12) +
      "-" +
      first13.slice(12, 13);
  }

  if (first13.length === 13) {
    formatted = formatted + "#" + last3;
  }

  return formatted.slice(0, 19);
};

const formatBikeNo = (val) => {
  const raw = String(val ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const letters = raw.replace(/[^A-Z]/g, "").slice(0, 3);
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);

  let formatted = letters;
  if (letters.length === 3) formatted = letters + "-" + digits;

  return formatted.slice(0, 8);
};

const Riders = ({ user, onLogout, onSetActivePage }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRider, setSelectedRider] = useState(null);
  const [modalTab, setModalTab] = useState("profile");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [notification, setNotification] = useState(null);

  const [riders, setRiders] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);

  const [cnicImageModal, setCnicImageModal] = useState(null);
  const [updateErrors, setUpdateErrors] = useState({});

  const [updateFormData, setUpdateFormData] = useState({
    name: "",
    phone: "",
    cnic: "",
    licenseNumber: "",
    bikeNumber: "",
    address: "",
    dateOfBirth: "",
  });

  const showNotificationMsg = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 2500);
  };

  const loadRiders = async (q = "") => {
    try {
      setLoading(true);
      const data = await getRiders(q);
      setRiders(data.riders || []);
      setStats(data.stats || { total: 0, active: 0, pending: 0, blocked: 0 });
    } catch (e) {
      console.error("Riders fetch error:", e);
      showNotificationMsg("error", "Riders load nahi ho rahe. Backend/port check karo.");
    } finally {
      setLoading(false);
    }
  };

  const getCnicImageSrc = (rider) => {
    const value =
      rider?.cnicImageUrl ||
      rider?.cnicImage ||
      rider?.cnicPhoto ||
      rider?.cnicPicture;

    if (!value || typeof value !== "string") return "";

    if (value.startsWith("data:image/")) return value;

    if (value.startsWith("http://") || value.startsWith("https://")) return value;

    const cleaned = value.replace(/\s/g, "");
    const looksLikeBase64 =
      cleaned.length > 200 && /^[A-Za-z0-9+/]+={0,2}$/.test(cleaned);

    if (looksLikeBase64) {
      return `data:image/jpeg;base64,${cleaned}`;
    }

    return "";
  };

  useEffect(() => {
    loadRiders("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadRiders(searchQuery), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const filteredRiders = useMemo(() => riders, [riders]);

  const getStatusBadge = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "active") {
      return <span className="px-2 py-0.5 bg-[#00d053] text-white text-[9px] font-bold rounded-md uppercase">active</span>;
    }
    if (normalized === "pending") {
      return <span className="px-2 py-0.5 bg-[#f59e0b] text-white text-[9px] font-bold rounded-md uppercase">pending</span>;
    }
    if (normalized === "blocked") {
      return <span className="px-2 py-0.5 bg-[#f43f5e] text-white text-[9px] font-bold rounded-md uppercase">blocked</span>;
    }
    if (["completed", "delivered", "paid"].includes(normalized)) {
      return <span className="px-2 py-0.5 bg-[#00d053] text-white text-[9px] font-bold rounded-md uppercase">{String(status).replace(/_/g, " ")}</span>;
    }
    if (["cancelled", "canceled"].includes(normalized)) {
      return <span className="px-2 py-0.5 bg-[#f43f5e] text-white text-[9px] font-bold rounded-md uppercase">{String(status).replace(/_/g, " ")}</span>;
    }
    if (["pending", "accepted", "in_progress", "delivering", "navigating_to_patient", "payment_pending", "dispatching", "reached_pharmacy"].includes(normalized)) {
      return <span className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-md uppercase">{String(status).replace(/_/g, " ")}</span>;
    }

    return <span className="px-2 py-0.5 bg-gray-400 text-white text-[9px] font-bold rounded-md uppercase">{status || "N/A"}</span>;
  };

  const handleOpenRider = (rider) => {
    setSelectedRider(rider);
    setModalTab("profile");
  };

  const handleUpdateProfileClick = () => {
    if (!selectedRider) return;

    setUpdateFormData({
      name: selectedRider.name || "",
      phone: selectedRider.phone || "",
      cnic: selectedRider.cnic || "",
      licenseNumber: selectedRider.licenseNumber || "",
      bikeNumber: selectedRider.bikeNumber || "",
      address: selectedRider.address || "",
      dateOfBirth: selectedRider.dateOfBirth || "",
    });

    setUpdateErrors({});
    setShowUpdateModal(true);
  };

  const syncRiderInList = (updatedRider) => {
    setRiders((prev) => prev.map((r) => (r.id === updatedRider.id ? updatedRider : r)));
    if (selectedRider?.id === updatedRider.id) setSelectedRider(updatedRider);
  };

  const clearUpdateError = (key) => {
    setUpdateErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateUpdateForm = () => {
    const newErrors = {};

    const name = updateFormData.name.trim();
    const phone = updateFormData.phone.trim();
    const cnic = updateFormData.cnic.trim();
    const licenseNumber = updateFormData.licenseNumber.trim();
    const bikeNumber = updateFormData.bikeNumber.trim();
    const address = updateFormData.address.trim();
    const dateOfBirth = updateFormData.dateOfBirth.trim();

    if (!name) newErrors.name = "Full name is required";
    if (!phone) newErrors.phone = "Contact number is required";
    if (!cnic) newErrors.cnic = "CNIC number is required";
    if (!licenseNumber) newErrors.licenseNumber = "License number is required";
    if (!bikeNumber) newErrors.bikeNumber = "Bike number is required";
    if (!dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!address) newErrors.address = "Address is required";

    if (name && !/^[A-Za-z\s]+$/.test(name)) {
      newErrors.name = "Name only alphabets allowed";
    }

    if (phone && !/^\d{11}$/.test(phone)) {
      newErrors.phone = "Phone must be 11 digits";
    }

    if (cnic && !/^\d{5}-\d{7}-\d{1}$/.test(cnic)) {
      newErrors.cnic = "CNIC must be 12345-6789012-3";
    }

    if (licenseNumber && !/^\d{5}-\d{7}-\d{1}#\d{3}$/.test(licenseNumber)) {
      newErrors.licenseNumber = "License must be 12345-6789012-8#512";
    }

    if (bikeNumber && !/^[A-Z]{3}-\d{4}$/.test(bikeNumber)) {
      newErrors.bikeNumber = "Bike number must be ABC-1234";
    }

    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      newErrors.dateOfBirth = "Date must be YYYY-MM-DD";
    }

    setUpdateErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!selectedRider?.id) return;
    if (!validateUpdateForm()) {
      showNotificationMsg("error", "Invalid information. Red errors check karo.");
      return;
    }

    try {
      const payload = {
        fullName: updateFormData.name.trim(),
        phone: updateFormData.phone.trim(),
        cnic: updateFormData.cnic.trim(),
        licenseNumber: updateFormData.licenseNumber.trim(),
        bikeNumber: updateFormData.bikeNumber.trim(),
        address: updateFormData.address.trim(),
        dateOfBirth: updateFormData.dateOfBirth.trim(),
      };

      const res = await updateRider(selectedRider.id, payload);
      if (res?.rider) {
        syncRiderInList(res.rider);
        showNotificationMsg("success", "Rider profile updated successfully!");
        setShowUpdateModal(false);
        setUpdateErrors({});
        loadRiders(searchQuery);
      } else {
        showNotificationMsg("error", "Update failed!");
      }
    } catch (err) {
      console.error(err);
      showNotificationMsg("error", "Update failed! Backend check karo.");
    }
  };

  const handleStatusAction = async (action) => {
    if (!selectedRider?.id) return;

    try {
      const res = await updateRiderStatus(selectedRider.id, action);
      if (res?.rider) {
        syncRiderInList(res.rider);

        if (action === "block") showNotificationMsg("success", "Rider blocked!");
        if (action === "approve") showNotificationMsg("success", "Rider approved!");
        if (action === "activate") showNotificationMsg("success", "Rider activated!");

        loadRiders(searchQuery);
      } else {
        showNotificationMsg("error", "Status update failed!");
      }
    } catch (err) {
      console.error(err);
      showNotificationMsg("error", "Status update failed! Backend check karo.");
    }
  };

  const EmptyHistory = () => (
    <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
      <p className="text-xs text-gray-400 font-bold italic uppercase tracking-wider">No rider delivery / ride history found</p>
    </div>
  );

  const selectedRiderCnicImage = getCnicImageSrc(selectedRider);

  const getFareText = (item) => {
    const value =
      item?.fare ||
      item?.fareAmount ||
      item?.amount ||
      item?.amountRaw ||
      item?.totalAmount ||
      item?.totalPrice ||
      item?.deliveryFee ||
      item?.deliveryCharges ||
      item?.deliveryFare ||
      item?.orderAmount ||
      item?.medicineAmount ||
      item?.deliveryChargesAmount ||
      item?.riderFare ||
      item?.riderEarning;

    if (value === null || value === undefined || value === "") {
      return "Rs. 0";
    }

    const text = String(value);

    if (text.toLowerCase().includes("rs")) {
      return text;
    }

    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return `Rs. ${numberValue.toLocaleString("en-PK")}`;
    }

    return text;
  };

  const HistoryCard = ({ item }) => {
    const isDelivery = item.type === "delivery";

    return (
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="flex justify-between items-start gap-3 mb-5">
          <div className="flex items-start space-x-2">
            {isDelivery ? (
              <div className="p-1.5 bg-green-50 text-green-500 rounded-md">
                <ShoppingBag size={14} />
              </div>
            ) : (
              <div className="p-1.5 bg-blue-50 text-blue-500 rounded-md">
                <Bike size={14} />
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold text-gray-800 leading-tight">{item.title}</p>
              {item.patientName && (
                <div className="mt-2 bg-gray-50/70 px-2 py-1 rounded-lg inline-block border border-gray-100">
                  <p className="text-[10px] font-medium text-gray-400">
                    Patient: <span className="text-gray-800 font-bold ml-1">{item.patientName}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
          {getStatusBadge(item.status)}
        </div>

        <div className="grid grid-cols-2 gap-y-5">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              {isDelivery ? "Pickup (Pharmacy)" : "Pickup"}
            </p>
            <div className="flex items-start space-x-1.5 text-gray-400">
              <MapPin size={11} className="mt-0.5" />
              <p className="text-[11px] font-bold text-gray-800 leading-tight">{item.pickup || "N/A"}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Destination</p>
            <div className="flex items-start space-x-1.5 text-gray-400">
              <MapPin size={11} className="mt-0.5" />
              <p className="text-[11px] font-bold text-gray-800 leading-tight">{item.destination || "N/A"}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Date & Time</p>
            <p className="text-[11px] font-bold text-gray-800 leading-tight tracking-tighter">{item.dateTime || "N/A"}</p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Fare Earned</p>
            <p className="text-[11px] font-bold text-green-600 leading-tight">
              {getFareText(item)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex bg-[#f9fafb] min-h-screen">
      <Sidebar activeTab="riders" onLogout={onLogout} onTabClick={onSetActivePage} />

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
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Riders</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Emergency Response System Admin Panel</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-800 leading-tight">{user?.name || "Admin User"}</p>
              <p className="text-[10px] text-gray-400 font-medium">{user?.email || "admin@ers.com"}</p>
            </div>
            <div className="w-8 h-8 bg-[#e10000] rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-white">
              {(user?.name?.[0] || "A").toUpperCase()}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between text-left">
            <div>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Riders</p>
              <h3 className="text-lg font-bold text-gray-800">{stats.total}</h3>
            </div>
            <div className="bg-blue-500 p-2 rounded-lg text-white">
              <Users size={18} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between text-left">
            <div>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Active Now</p>
              <h3 className="text-lg font-bold text-gray-800">{stats.active}</h3>
            </div>
            <div className="bg-green-500 p-2 rounded-lg text-white">
              <CheckCircle size={18} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between text-left">
            <div>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Pending Approval</p>
              <h3 className="text-lg font-bold text-gray-800">{stats.pending}</h3>
            </div>
            <div className="bg-orange-500 p-2 rounded-lg text-white">
              <Clock size={18} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-6 text-left">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Rider Management</h2>
            <p className="text-[11px] text-gray-400 font-medium mt-1">View, approve, and manage all bike riders</p>
          </div>

          <div className="px-6 py-4 flex items-center space-x-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID, or phone..."
                className="w-full bg-gray-50 border-none rounded-lg pl-10 pr-4 py-2.5 text-xs font-medium text-gray-700 outline-none"
              />
            </div>
            <button className="p-2.5 bg-gray-50 text-gray-400 rounded-lg">
              <Filter size={16} />
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs font-bold text-gray-400">Loading riders...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rider ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deliveries</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {filteredRiders.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-700">{String(r.riderId || "").slice(0, 10)}</td>
                      <td className="px-6 py-4 text-[11px] font-bold text-gray-800">{r.name}</td>
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-600">{r.phone}</td>
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-600">{r.vehicle}</td>
                      <td className="px-6 py-4">{getStatusBadge(r.status)}</td>
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-700">{r.totalDeliveries || 0}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenRider(r)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-800 transition-colors border border-gray-100 shadow-sm"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredRiders.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-xs font-bold text-gray-400">
                        No riders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selectedRider && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-left">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Rider Details - {selectedRider.name}</h2>
                <p className="text-[11px] text-gray-400 font-medium">Complete profile and activity history</p>
              </div>
              <button onClick={() => setSelectedRider(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 bg-gray-50/30">
              <div className="bg-gray-100 p-1 rounded-xl flex">
                <button
                  onClick={() => setModalTab("profile")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    modalTab === "profile" ? "bg-white shadow-sm text-gray-800" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setModalTab("history")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    modalTab === "history" ? "bg-white shadow-sm text-gray-800" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Order Delivery / Ride History
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {modalTab === "profile" ? (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <section>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1">Rider ID</p>
                        <p className="text-xs font-bold text-gray-800">{String(selectedRider.riderId || "").slice(0, 12)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1">Full Name</p>
                        <p className="text-xs font-bold text-gray-800">{selectedRider.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1">Age</p>
                        <p className="text-xs font-bold text-gray-800">
                          {selectedRider.age !== "" && selectedRider.age !== null && selectedRider.age !== undefined
                            ? `${selectedRider.age} years`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1">CNIC Number</p>
                        <p className="text-xs font-bold text-gray-800">{selectedRider.cnic || "-"}</p>
                      </div>

                      <div className="col-span-2">
                        <p className="text-[10px] font-medium text-gray-400 mb-1">CNIC Image</p>

                        {selectedRiderCnicImage ? (
                          <button
                            type="button"
                            onClick={() => setCnicImageModal(selectedRiderCnicImage)}
                            className="w-full border border-gray-100 rounded-xl bg-gray-50 p-3 hover:bg-gray-100 transition-all"
                          >
                            <img
                              src={selectedRiderCnicImage}
                              alt="Rider CNIC"
                              className="w-full h-44 object-contain rounded-lg bg-white"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase">
                              Click to view full CNIC image
                            </p>
                          </button>
                        ) : (
                          <div className="border border-dashed border-gray-200 rounded-xl bg-gray-50 p-4 text-center">
                            <p className="text-xs font-bold text-gray-400">No CNIC image uploaded</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1">Phone Number</p>
                        <p className="text-xs font-bold text-gray-800">{selectedRider.phone || "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-medium text-gray-400 mb-1">Address</p>
                        <div className="flex items-center space-x-1">
                          <MapPin size={10} className="text-gray-300" />
                          <p className="text-xs font-bold text-gray-800">{selectedRider.address || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="h-[1px] bg-gray-50"></div>

                  <section>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Vehicle & License Information</h3>
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1">Vehicle Type</p>
                        <p className="text-xs font-bold text-gray-800">{selectedRider.vehicle || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1">Bike Number</p>
                        <p className="text-xs font-bold text-gray-800 uppercase font-mono">{selectedRider.bikeNumber || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1">License Number</p>
                        <p className="text-xs font-bold text-gray-800 uppercase">{selectedRider.licenseNumber || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1">Status</p>
                        <div className="mt-1">{getStatusBadge(selectedRider.status)}</div>
                      </div>
                    </div>
                  </section>

                  <div className="h-[1px] bg-gray-50"></div>

                  <section>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Performance Statistics</h3>
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1">Total Deliveries</p>
                        <p className="text-xs font-bold text-[#00d053]">{selectedRider.totalDeliveries || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1">Total Rides</p>
                        <p className="text-xs font-bold text-[#3b82f6]">{selectedRider.totalRides || 0}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-medium text-gray-400 mb-1">Join Date</p>
                        <div className="flex items-center space-x-1.5 text-gray-400">
                          <Calendar size={12} />
                          <p className="text-xs font-bold text-gray-800">{selectedRider.joinDate || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h3 className="text-xs font-bold text-gray-800 mb-4 uppercase tracking-tight">
                    Activity Log - {selectedRider.name}
                  </h3>

                  {(selectedRider.deliveryRideHistory || []).length === 0 ? (
                    <EmptyHistory />
                  ) : (
                    (selectedRider.deliveryRideHistory || []).map((item, index) => (
                      <HistoryCard key={item.id || index} item={item} />
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex justify-between gap-3">
              {selectedRider.status === "active" && (
                <button
                  onClick={() => handleStatusAction("block")}
                  className="flex-1 py-3 px-4 bg-[#f43f5e] text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-50"
                >
                  <X size={14} />
                  Block Rider
                </button>
              )}

              {selectedRider.status === "pending" && (
                <button
                  onClick={() => handleStatusAction("approve")}
                  className="flex-1 py-3 px-4 bg-[#00d053] text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-lg shadow-green-100"
                >
                  <CheckCircle size={14} />
                  Approve Rider
                </button>
              )}

              {selectedRider.status === "blocked" && (
                <button
                  onClick={() => handleStatusAction("activate")}
                  className="flex-1 py-3 px-4 bg-[#3b82f6] text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
                >
                  <CheckCircle size={14} />
                  Activate Rider
                </button>
              )}

              <button
                onClick={handleUpdateProfileClick}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all bg-white shadow-sm"
              >
                <Users size={14} />
                Update Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {cnicImageModal && (
        <div
          className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4"
          onClick={() => setCnicImageModal(null)}
        >
          <div
            className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Rider CNIC Image</h3>
              <button
                onClick={() => setCnicImageModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-gray-50">
              <img
                src={cnicImageModal}
                alt="Rider CNIC Full"
                className="w-full max-h-[75vh] object-contain bg-white rounded-xl border"
              />
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 text-left">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Update Rider Profile</h2>
                <p className="text-[11px] text-gray-400 font-medium">Edit rider account information</p>
              </div>
              <button onClick={() => { setShowUpdateModal(false); setUpdateErrors({}); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  value={updateFormData.name}
                  onChange={(e) => {
                    setUpdateFormData({ ...updateFormData, name: sanitizeName(e.target.value) });
                    if (updateErrors.name) clearUpdateError("name");
                  }}
                  className={`w-full px-4 py-2.5 bg-gray-50 border ${updateErrors.name ? "border-red-500" : "border-gray-100"} rounded-xl text-xs font-bold text-gray-700 outline-none`}
                />
                {updateErrors.name && <p className="text-[10px] text-red-500 font-bold mt-1">{updateErrors.name}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Date of Birth</label>
                <input
                  type="date"
                  value={updateFormData.dateOfBirth}
                  onChange={(e) => {
                    setUpdateFormData({ ...updateFormData, dateOfBirth: e.target.value });
                    if (updateErrors.dateOfBirth) clearUpdateError("dateOfBirth");
                  }}
                  className={`w-full px-4 py-2.5 bg-gray-50 border ${updateErrors.dateOfBirth ? "border-red-500" : "border-gray-100"} rounded-xl text-xs font-bold text-gray-700 outline-none`}
                />
                {updateErrors.dateOfBirth ? (
                  <p className="text-[10px] text-red-500 font-bold mt-1">{updateErrors.dateOfBirth}</p>
                ) : (
                  <p className="text-[10px] text-gray-400 mt-1">Age automatically DOB se calculate hoga.</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Phone</label>
                <input
                  type="text"
                  value={updateFormData.phone}
                  onChange={(e) => {
                    setUpdateFormData({ ...updateFormData, phone: sanitizePhone(e.target.value) });
                    if (updateErrors.phone) clearUpdateError("phone");
                  }}
                  maxLength={11}
                  className={`w-full px-4 py-2.5 bg-gray-50 border ${updateErrors.phone ? "border-red-500" : "border-gray-100"} rounded-xl text-xs font-bold text-gray-700 outline-none`}
                />
                {updateErrors.phone && <p className="text-[10px] text-red-500 font-bold mt-1">{updateErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">CNIC</label>
                <input
                  type="text"
                  value={updateFormData.cnic}
                  onChange={(e) => {
                    setUpdateFormData({ ...updateFormData, cnic: formatCNIC(e.target.value) });
                    if (updateErrors.cnic) clearUpdateError("cnic");
                  }}
                  maxLength={15}
                  className={`w-full px-4 py-2.5 bg-gray-50 border ${updateErrors.cnic ? "border-red-500" : "border-gray-100"} rounded-xl text-xs font-bold text-gray-700 outline-none`}
                />
                {updateErrors.cnic && <p className="text-[10px] text-red-500 font-bold mt-1">{updateErrors.cnic}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">License Number</label>
                <input
                  type="text"
                  value={updateFormData.licenseNumber}
                  onChange={(e) => {
                    setUpdateFormData({ ...updateFormData, licenseNumber: formatLicense(e.target.value) });
                    if (updateErrors.licenseNumber) clearUpdateError("licenseNumber");
                  }}
                  maxLength={19}
                  className={`w-full px-4 py-2.5 bg-gray-50 border ${updateErrors.licenseNumber ? "border-red-500" : "border-gray-100"} rounded-xl text-xs font-bold text-gray-700 outline-none uppercase`}
                />
                {updateErrors.licenseNumber && <p className="text-[10px] text-red-500 font-bold mt-1">{updateErrors.licenseNumber}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Bike Number</label>
                <input
                  type="text"
                  value={updateFormData.bikeNumber}
                  onChange={(e) => {
                    setUpdateFormData({ ...updateFormData, bikeNumber: formatBikeNo(e.target.value) });
                    if (updateErrors.bikeNumber) clearUpdateError("bikeNumber");
                  }}
                  maxLength={8}
                  className={`w-full px-4 py-2.5 bg-gray-50 border ${updateErrors.bikeNumber ? "border-red-500" : "border-gray-100"} rounded-xl text-xs font-bold text-gray-700 outline-none uppercase`}
                />
                {updateErrors.bikeNumber && <p className="text-[10px] text-red-500 font-bold mt-1">{updateErrors.bikeNumber}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Residential Address</label>
                <textarea
                  value={updateFormData.address}
                  onChange={(e) => {
                    setUpdateFormData({ ...updateFormData, address: e.target.value });
                    if (updateErrors.address) clearUpdateError("address");
                  }}
                  className={`w-full px-4 py-2.5 bg-gray-50 border ${updateErrors.address ? "border-red-500" : "border-gray-100"} rounded-xl text-xs font-bold text-gray-700 outline-none resize-none h-20`}
                />
                {updateErrors.address && <p className="text-[10px] text-red-500 font-bold mt-1">{updateErrors.address}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#e10000] text-white text-[11px] font-bold rounded-xl hover:bg-red-700 transition-all uppercase tracking-widest"
              >
                Save Changes
              </button>
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

export default Riders;
