import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, Eye, X, Users, MapPin, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { getDrivers, updateDriver, updateDriverStatus } from "../services/adminApi";


/* ---------------- Helpers (format + validation) ---------------- */

const sanitizeName = (val) => {
  return String(val ?? "")
    .replace(/[^a-zA-Z.\-\s]/g, "")
    .replace(/\s{2,}/g, " ");
};

const isValidName = (val) =>
  /^[A-Za-z.\-\s]+$/.test(val) && /[A-Za-z]/.test(val);

const sanitizePhone = (val) =>
  String(val ?? "").replace(/\D/g, "").slice(0, 11);

const isValidPhone = (val) => /^\d{11}$/.test(val);

const formatCNIC = (val) => {
  const d = String(val ?? "").replace(/\D/g, "").slice(0, 13);
  const p1 = d.slice(0, 5);
  const p2 = d.slice(5, 12);
  const p3 = d.slice(12, 13);

  let out = p1;
  if (d.length > 5) out += "-" + p2;
  if (d.length > 12) out += "-" + p3;

  return out;
};

const isValidCNIC = (val) => /^\d{5}-\d{7}-\d{1}$/.test(val);

const formatLicense = (val) => {
  const d = String(val ?? "").replace(/\D/g, "").slice(0, 16);
  const p1 = d.slice(0, 5);
  const p2 = d.slice(5, 12);
  const p3 = d.slice(12, 13);
  const p4 = d.slice(13, 16);

  let out = p1;
  if (d.length > 5) out += "-" + p2;
  if (d.length > 12) out += "-" + p3;
  if (d.length > 13) out += "#" + p4;

  return out;
};

const isValidLicense = (val) =>
  /^\d{5}-\d{7}-\d{1}#\d{3}$/.test(val);

const formatAmbulanceNo = (val) => {
  const raw = String(val ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  const letters = raw.replace(/[^A-Z]/g, "").slice(0, 3);
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 3);

  let out = letters;
  if (letters.length === 3 && (digits.length > 0 || raw.length >= 3)) {
    out += "-";
  }

  out += digits;

  return out.slice(0, 7);
};

const isValidAmbulanceNo = (val) => /^[A-Z]{3}-\d{3}$/.test(val);

const isValidDOB = (val) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;

  const [y, m, d] = val.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);

  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return false;
  }

  if (dt > new Date()) return false;

  return true;
};

const sanitizeVehicleType = (val) =>
  String(val ?? "")
    .replace(/[^a-zA-Z\s]/g, "")
    .replace(/\s{2,}/g, " ");

const isValidVehicleType = (val) =>
  /^[A-Za-z\s]+$/.test(val) && /[A-Za-z]/.test(val);

const normalizeDateForInput = (val) => {
  if (!val) return "";
  const text = String(val);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (text.includes("T")) return text.split("T")[0];
  return text;
};

const Drivers = ({ user, onLogout, onSetActivePage }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [modalTab, setModalTab] = useState('profile');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [updateErrors, setUpdateErrors] = useState({});

  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);

  const [cnicImageModal, setCnicImageModal] = useState(null);

  const [updateFormData, setUpdateFormData] = useState({
    name: '',
    dateOfBirth: '',
    phone: '',
    cnic: '',
    licenseNumber: '',
    ambulanceNumber: '',
    address: '',
    vehicleType: ''
  });

  const showNotificationMsg = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 2500);
  };

  const getDriverRideHistory = (driver) => {
    return driver?.rideHistory || driver?.ambulanceHistory || driver?.tripHistory || [];
  };

  const getDisplayMoney = (value) => {
    if (value === undefined || value === null || value === "") return "Pending";
    const text = String(value);
    if (text.toLowerCase().includes("rs")) return text;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "Pending";
    return `Rs. ${n.toLocaleString("en-PK")}`;
  };

  const getCnicImageSrc = (driver) => {
    const value = driver?.cnicImageUrl || driver?.cnicImage || driver?.cnicPhoto || driver?.cnicPicture;

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

  const rideStatusBadge = (s) => {
    const st = (s || '').toLowerCase();
    if (st === 'completed') return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded-md uppercase">completed</span>;
    if (st === 'cancelled') return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-md uppercase">cancelled</span>;
    return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-bold rounded-md uppercase">{st || 'na'}</span>;
  };

  const loadDrivers = async (q = "") => {
    try {
      setLoading(true);
      const data = await getDrivers(q);
      setDrivers(data.drivers || []);
      setStats(data.stats || { total: 0, active: 0, pending: 0, blocked: 0 });
    } catch (e) {
      console.error("Drivers fetch error:", e);
      showNotificationMsg("error", "Drivers load nahi ho rahe. Backend/port check karo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers("");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadDrivers(searchQuery);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const filteredDrivers = useMemo(() => drivers, [drivers]);

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return <span className="px-2 py-0.5 bg-[#00d053] text-white text-[9px] font-bold rounded-md uppercase">active</span>;
      case 'pending':
        return <span className="px-2 py-0.5 bg-[#f59e0b] text-white text-[9px] font-bold rounded-md uppercase">pending</span>;
      case 'blocked':
        return <span className="px-2 py-0.5 bg-[#f43f5e] text-white text-[9px] font-bold rounded-md uppercase">blocked</span>;
      default:
        return null;
    }
  };

  const handleOpenDriver = (driver) => {
    setSelectedDriver(driver);
    setModalTab('profile');
  };

  const handleUpdateProfileClick = () => {
    if (!selectedDriver) return;

    setUpdateFormData({
      name: selectedDriver.name || '',
      dateOfBirth: normalizeDateForInput(selectedDriver.dateOfBirth || ''),
      phone: selectedDriver.phone || '',
      cnic: selectedDriver.cnic || '',
      licenseNumber: selectedDriver.licenseNumber || '',
      ambulanceNumber: selectedDriver.ambulanceNumber || '',
      address: selectedDriver.address || '',
      vehicleType: selectedDriver.vehicleType || selectedDriver.vehicle || 'Ambulance'
    });
    setUpdateErrors({});
    setShowUpdateModal(true);
  };


  const clearUpdateError = (key) => {
    setUpdateErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleUpdateInputChange = (key, value) => {
    let nextValue = value;

    if (key === "name") nextValue = sanitizeName(value);
    if (key === "phone") nextValue = sanitizePhone(value);
    if (key === "cnic") nextValue = formatCNIC(value);
    if (key === "licenseNumber") nextValue = formatLicense(value);
    if (key === "ambulanceNumber") nextValue = formatAmbulanceNo(value);
    if (key === "vehicleType") nextValue = sanitizeVehicleType(value);

    setUpdateFormData((prev) => ({ ...prev, [key]: nextValue }));
    if (updateErrors[key]) clearUpdateError(key);
  };

  const validateUpdateForm = () => {
    const e = {};

    const name = updateFormData.name.trim();
    const ph = updateFormData.phone.trim();
    const cn = updateFormData.cnic.trim();
    const lic = updateFormData.licenseNumber.trim();
    const amb = updateFormData.ambulanceNumber.trim();
    const db = updateFormData.dateOfBirth.trim();
    const addr = updateFormData.address.trim();
    const vt = updateFormData.vehicleType.trim();

    if (!name) {
      e.name = "Full Name is required.";
    } else if (!isValidName(name)) {
      e.name = "Name only alphabets allowed. Special chars allowed: . and - (numbers not allowed).";
    }

    if (!ph) {
      e.phone = "Contact Number is required.";
    } else if (!isValidPhone(ph)) {
      e.phone = "Contact Number must be exactly 11 digits (numbers only).";
    }

    if (!cn) {
      e.cnic = "CNIC is required.";
    } else if (!isValidCNIC(cn)) {
      e.cnic = "CNIC format must be: 12345-1234567-1";
    }

    if (!lic) {
      e.licenseNumber = "License Number is required.";
    } else if (!isValidLicense(lic)) {
      e.licenseNumber = "License format must be: 12345-1234567-8#901";
    }

    if (!amb) {
      e.ambulanceNumber = "Ambulance Number is required.";
    } else if (!isValidAmbulanceNo(amb)) {
      e.ambulanceNumber = "Ambulance Number format must be: ABC-123";
    }

    if (!db) {
      e.dateOfBirth = "Date of Birth is required.";
    } else if (!isValidDOB(db)) {
      e.dateOfBirth = "DOB format must be: YYYY-MM-DD (valid date)";
    }

    if (!addr) {
      e.address = "Address is required.";
    }

    if (!vt) {
      e.vehicleType = "Vehicle Type is required.";
    } else if (!isValidVehicleType(vt)) {
      e.vehicleType = "Vehicle Type must contain alphabets only (no numbers). Example: ALS Ambulance";
    }

    setUpdateErrors(e);

    const firstKey = Object.keys(e)[0];
    if (firstKey) {
      showNotificationMsg("error", e[firstKey]);
    }

    return Object.keys(e).length === 0;
  };

  const syncDriverInList = (updatedDriver) => {
    setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
    if (selectedDriver?.id === updatedDriver.id) setSelectedDriver(updatedDriver);
  };

  const handleUpdateSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!selectedDriver?.id) return;
    if (!validateUpdateForm()) return;

    try {
      const payload = {
        name: updateFormData.name.trim(),
        phone: updateFormData.phone.trim(),
        cnic: updateFormData.cnic.trim(),
        licenseNumber: updateFormData.licenseNumber.trim(),
        ambulanceNumber: updateFormData.ambulanceNumber.trim(),
        address: updateFormData.address.trim(),
        vehicleType: updateFormData.vehicleType.trim(),
        dateOfBirth: updateFormData.dateOfBirth.trim(),
      };

      const res = await updateDriver(selectedDriver.id, payload);
      if (res?.driver) {
        syncDriverInList(res.driver);
        showNotificationMsg('success', 'Profile updated successfully!');
        setShowUpdateModal(false);
        loadDrivers(searchQuery);
      } else {
        showNotificationMsg('error', 'Update failed!');
      }
    } catch (err) {
      console.error(err);
      showNotificationMsg('error', 'Update failed! Backend check karo.');
    }
  };

  const handleStatusAction = async (action) => {
    if (!selectedDriver?.id) return;
    if (!validateUpdateForm()) return;

    try {
      const res = await updateDriverStatus(selectedDriver.id, action);
      if (res?.driver) {
        syncDriverInList(res.driver);

        if (action === "block") showNotificationMsg("success", "Driver blocked!");
        if (action === "approve") showNotificationMsg("success", "Driver approved!");
        if (action === "activate") showNotificationMsg("success", "Driver activated!");

        loadDrivers(searchQuery);
      } else {
        showNotificationMsg("error", "Status update failed!");
      }
    } catch (err) {
      console.error(err);
      showNotificationMsg("error", "Status update failed! Backend check karo.");
    }
  };

  const selectedDriverCnicImage = getCnicImageSrc(selectedDriver);

  return (
    <div className="flex bg-[#f9fafb] min-h-screen">
      <Sidebar
        activeTab="drivers"
        onLogout={onLogout}
        onTabClick={onSetActivePage}
      />

      <main className="flex-1 ml-64 p-8">
        {notification && (
          <div className={`fixed top-6 right-6 z-[250] flex items-center space-x-3 px-6 py-4 rounded-xl shadow-2xl border animate-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-bold">{notification.message}</span>
          </div>
        )}

        <header className="flex justify-between items-center mb-8">
          <div className="text-left">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Drivers</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Emergency Response System Admin Panel</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-800 leading-tight">{user?.name || 'Admin User'}</p>
              <p className="text-[10px] text-gray-400 font-medium">{user?.email || 'admin@ers.com'}</p>
            </div>
            <div className="w-8 h-8 bg-[#e10000] rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-white">
              {(user?.name?.[0] || "A").toUpperCase()}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between text-left">
            <div>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Drivers</p>
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
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Driver Management</h2>
            <p className="text-[11px] text-gray-400 font-medium mt-1">View, approve, and manage all ambulance drivers</p>
          </div>

          <div className="px-6 py-4">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID, or phone..."
                className="w-full bg-gray-50 border-none rounded-lg pl-10 pr-4 py-2.5 text-xs font-medium text-gray-700 outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs font-bold text-gray-400">Loading drivers...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Driver ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-700">{String(driver.driverId || '').slice(0, 10)}</td>
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-800">{driver.name}</td>
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-600">{driver.phone}</td>
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-600">
                        {driver.vehicleType || driver.vehicle || 'Ambulance'}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(driver.status)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenDriver(driver)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-800 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredDrivers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-xs font-bold text-gray-400">
                        No drivers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selectedDriver && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center text-left">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Driver Details - {selectedDriver.name}</h2>
                <p className="text-[11px] text-gray-400 font-medium tracking-wide">Complete profile and activity history</p>
              </div>
              <button onClick={() => setSelectedDriver(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 bg-gray-50/50">
              <div className="bg-gray-100 p-1 rounded-xl flex">
                <button
                  onClick={() => setModalTab('profile')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${modalTab === 'profile' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setModalTab('history')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${modalTab === 'history' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Ride History
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-left">
              {modalTab === 'profile' ? (
                <div className="space-y-8">
                  <section>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">Driver ID</p>
                        <p className="text-xs font-bold text-gray-800">{String(selectedDriver.driverId || '').slice(0, 12)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">Full Name</p>
                        <p className="text-xs font-bold text-gray-800">{selectedDriver.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">Age</p>
                        <p className="text-xs font-bold text-gray-800">
                          {selectedDriver.age !== '' && selectedDriver.age !== null && selectedDriver.age !== undefined
                            ? `${selectedDriver.age} years`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">CNIC Number</p>
                        <p className="text-xs font-bold text-gray-800">{selectedDriver.cnic || '-'}</p>
                      </div>

                      <div className="col-span-2">
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">CNIC Image</p>

                        {selectedDriverCnicImage ? (
                          <button
                            type="button"
                            onClick={() => setCnicImageModal(selectedDriverCnicImage)}
                            className="w-full border border-gray-100 rounded-xl bg-gray-50 p-3 hover:bg-gray-100 transition-all"
                          >
                            <img
                              src={selectedDriverCnicImage}
                              alt="Driver CNIC"
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
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">Phone Number</p>
                        <p className="text-xs font-bold text-gray-800">{selectedDriver.phone || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">Address</p>
                        <div className="flex items-center space-x-2 text-gray-500">
                          <MapPin size={10} />
                          <p className="text-xs font-bold text-gray-800">{selectedDriver.address || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="h-[1px] bg-gray-100"></div>

                  <section>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Vehicle & License Information</h3>
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">Vehicle Type</p>
                        <p className="text-xs font-bold text-gray-800">
                          {selectedDriver.vehicleType || selectedDriver.vehicle || 'Ambulance'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">Ambulance Number</p>
                        <p className="text-xs font-bold text-gray-800 uppercase">{selectedDriver.ambulanceNumber || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">License Number</p>
                        <p className="text-xs font-bold text-gray-800 uppercase">{selectedDriver.licenseNumber || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">Status</p>
                        <div className="mt-1">{getStatusBadge(selectedDriver.status)}</div>
                      </div>
                    </div>
                  </section>

                  <div className="h-[1px] bg-gray-100"></div>

                  <section>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Performance Statistics</h3>
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">Total Rides</p>
                        <p className="text-xs font-bold text-gray-800">{selectedDriver.totalRides || getDriverRideHistory(selectedDriver).length || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">Join Date</p>
                        <div className="flex items-center space-x-2">
                          <Calendar size={12} className="text-gray-300" />
                          <p className="text-xs font-bold text-gray-800">{selectedDriver.joinDate || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="space-y-3">
                  {getDriverRideHistory(selectedDriver).length === 0 ? (
                    <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <p className="text-xs text-gray-400 font-bold italic uppercase tracking-wider">
                        No ambulance ride history found
                      </p>
                    </div>
                  ) : (
                    getDriverRideHistory(selectedDriver).map((r, index) => {
                      const pickup = r.pickup || r.pickupLocation || "N/A";
                      const dropoff = r.dropoff || r.dropLocation || r.destination || "N/A";
                      const patient = r.patient || r.patientName || "Unknown Patient";
                      const dateTime = r.dateTime || [r.date, r.time].filter(Boolean).join(" • ") || "N/A";
                      const fare = r.fare || r.amount || r.fareAmount || "Pending";

                      return (
                        <div key={r.id || index} className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="text-xs font-bold text-gray-800">
                                {r.code || r.title || `AMB-${index + 1}`}
                              </p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                                Ambulance Ride
                              </p>
                            </div>
                            <div>{rideStatusBadge(r.status)}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Patient</p>
                              <p className="text-[11px] font-bold text-gray-800">{patient}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Fare Earned</p>
                              <p className="text-[11px] font-bold text-green-600">{getDisplayMoney(fare)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Date & Time</p>
                              <p className="text-[11px] font-bold text-gray-800">{dateTime}</p>
                            </div>
                          </div>

                          <div className="space-y-2 pt-3 border-t border-gray-50">
                            <div className="flex items-start gap-2">
                              <MapPin size={12} className="text-gray-300 mt-0.5" />
                              <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Pickup</p>
                                <p className="text-[11px] font-bold text-gray-800 leading-snug">{pickup}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin size={12} className="text-gray-300 mt-0.5" />
                              <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Drop-off / Destination</p>
                                <p className="text-[11px] font-bold text-gray-800 leading-snug">{dropoff}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex justify-between gap-3">
              {selectedDriver.status === 'active' && (
                <button
                  onClick={() => handleStatusAction("block")}
                  className="flex-1 py-3 px-4 bg-[#f43f5e] text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                >
                  <X size={14} />
                  Block Driver
                </button>
              )}

              {selectedDriver.status === 'pending' && (
                <button
                  onClick={() => handleStatusAction("approve")}
                  className="flex-1 py-3 px-4 bg-[#00d053] text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-lg shadow-green-100"
                >
                  <CheckCircle size={14} />
                  Approve Driver
                </button>
              )}

              {selectedDriver.status === 'blocked' && (
                <button
                  onClick={() => handleStatusAction("activate")}
                  className="flex-1 py-3 px-4 bg-[#3b82f6] text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
                >
                  <CheckCircle size={14} />
                  Activate Driver
                </button>
              )}

              <button
                onClick={handleUpdateProfileClick}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all bg-white"
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
              <h3 className="text-sm font-bold text-gray-800">Driver CNIC Image</h3>
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
                alt="Driver CNIC Full"
                className="w-full max-h-[75vh] object-contain bg-white rounded-xl border"
              />
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center text-left">
              <div>
                <h2 className="text-sm font-bold text-gray-800 tracking-tight">Update Driver Profile</h2>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Update driver information below</p>
              </div>
              <button onClick={() => { setUpdateErrors({}); setShowUpdateModal(false); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar text-left">
              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  value={updateFormData.name}
                  onChange={(e) => handleUpdateInputChange("name", e.target.value)}
                  placeholder="Enter full name"
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none ${updateErrors.name ? 'border-red-500' : 'border-transparent'}`}
                />
                {updateErrors.name && <p className="mt-1 text-[10px] font-bold text-red-600">{updateErrors.name}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Date of Birth</label>
                <input
                  type="date"
                  value={updateFormData.dateOfBirth}
                  onChange={(e) => handleUpdateInputChange("dateOfBirth", e.target.value)}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none ${updateErrors.dateOfBirth ? 'border-red-500' : 'border-transparent'}`}
                />
                {updateErrors.dateOfBirth && <p className="mt-1 text-[10px] font-bold text-red-600">{updateErrors.dateOfBirth}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Phone</label>
                <input
                  type="text"
                  value={updateFormData.phone}
                  onChange={(e) => handleUpdateInputChange("phone", e.target.value)}
                  placeholder="03XXXXXXXXX"
                  inputMode="numeric"
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none ${updateErrors.phone ? 'border-red-500' : 'border-transparent'}`}
                />
                {updateErrors.phone && <p className="mt-1 text-[10px] font-bold text-red-600">{updateErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">CNIC</label>
                <input
                  type="text"
                  value={updateFormData.cnic}
                  onChange={(e) => handleUpdateInputChange("cnic", e.target.value)}
                  placeholder="12345-1234567-1"
                  inputMode="numeric"
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none ${updateErrors.cnic ? 'border-red-500' : 'border-transparent'}`}
                />
                {updateErrors.cnic && <p className="mt-1 text-[10px] font-bold text-red-600">{updateErrors.cnic}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Vehicle Type</label>
                <input
                  type="text"
                  value={updateFormData.vehicleType}
                  onChange={(e) => handleUpdateInputChange("vehicleType", e.target.value)}
                  placeholder="e.g. ALS Ambulance"
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none ${updateErrors.vehicleType ? 'border-red-500' : 'border-transparent'}`}
                />
                {updateErrors.vehicleType && <p className="mt-1 text-[10px] font-bold text-red-600">{updateErrors.vehicleType}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">License Number</label>
                <input
                  type="text"
                  value={updateFormData.licenseNumber}
                  onChange={(e) => handleUpdateInputChange("licenseNumber", e.target.value)}
                  placeholder="12345-1234567-8#901"
                  inputMode="numeric"
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none ${updateErrors.licenseNumber ? 'border-red-500' : 'border-transparent'}`}
                />
                {updateErrors.licenseNumber && <p className="mt-1 text-[10px] font-bold text-red-600">{updateErrors.licenseNumber}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Ambulance Number</label>
                <input
                  type="text"
                  value={updateFormData.ambulanceNumber}
                  onChange={(e) => handleUpdateInputChange("ambulanceNumber", e.target.value)}
                  placeholder="ABC-123"
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none ${updateErrors.ambulanceNumber ? 'border-red-500' : 'border-transparent'}`}
                />
                {updateErrors.ambulanceNumber && <p className="mt-1 text-[10px] font-bold text-red-600">{updateErrors.ambulanceNumber}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">Address</label>
                <textarea
                  value={updateFormData.address}
                  onChange={(e) => handleUpdateInputChange("address", e.target.value)}
                  placeholder="House/Street/Area, City"
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none resize-none h-20 ${updateErrors.address ? 'border-red-500' : 'border-transparent'}`}
                />
                {updateErrors.address && <p className="mt-1 text-[10px] font-bold text-red-600">{updateErrors.address}</p>}
              </div>
            </form>

            <div className="p-6 bg-white border-t border-gray-50">
              <button
                onClick={handleUpdateSubmit}
                className="w-full py-3.5 bg-[#e10000] text-white text-[11px] font-bold rounded-xl hover:bg-red-700 transition-all"
              >
                Save Changes
              </button>
            </div>
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

export default Drivers;