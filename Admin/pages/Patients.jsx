import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  Search,
  Eye,
  X,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Ambulance,
  Bike,
  Package,
  ShoppingBag,
} from "lucide-react";

import {
  getPatients,
  updatePatient,
  updatePatientStatus,
} from "../services/adminApi";

const Patients = ({ user, onLogout, onSetActivePage }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [modalTab, setModalTab] = useState("profile");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [notification, setNotification] = useState(null);

  const [updateFormData, setUpdateFormData] = useState({
    name: "",
    age: "",
    phone: "",
    email: "",
    address: "",
  });

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await getPatients(searchQuery);
      setPatients(data.patients || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
      showNotification("error", "Failed to fetch patients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const getStatusBadge = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "active") {
      return (
        <span className="px-2.5 py-0.5 bg-[#00d053] text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
          active
        </span>
      );
    }

    if (normalized === "blocked") {
      return (
        <span className="px-2.5 py-0.5 bg-[#f43f5e] text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
          blocked
        </span>
      );
    }

    if (normalized === "pending") {
      return (
        <span className="px-2.5 py-0.5 bg-yellow-500 text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
          pending
        </span>
      );
    }

    if (["completed", "delivered", "paid"].includes(normalized)) {
      return (
        <span className="px-2.5 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
          {String(status).replace(/_/g, " ")}
        </span>
      );
    }

    if (["cancelled", "canceled"].includes(normalized)) {
      return (
        <span className="px-2.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
          {String(status).replace(/_/g, " ")}
        </span>
      );
    }

    if (
      [
        "accepted",
        "dispatching",
        "delivering",
        "navigating_to_patient",
        "payment_pending",
        "in_progress",
        "processing",
        "pharmacy_processing",
      ].includes(normalized)
    ) {
      return (
        <span className="px-2.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
          {String(status).replace(/_/g, " ")}
        </span>
      );
    }

    return (
      <span className="px-2.5 py-0.5 bg-gray-400 text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
        {status || "N/A"}
      </span>
    );
  };

  const getTravelValue = (record, keys, fallback = "N/A") => {
    for (const key of keys) {
      const value = record?.[key];

      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }

    return fallback;
  };

  const handleUpdateClick = () => {
    if (selectedPatient) {
      setUpdateFormData({
        name: selectedPatient.name || "",
        age: selectedPatient.age || "",
        phone: selectedPatient.phone || "",
        email: selectedPatient.email || "",
        address: selectedPatient.address || "",
      });
      setShowUpdateModal(true);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await updatePatient(selectedPatient.id, updateFormData);

      const updatedList = patients.map((p) =>
        p.id === selectedPatient.id ? res.patient : p
      );

      setPatients(updatedList);
      setSelectedPatient(res.patient);

      showNotification("success", "Patient profile updated successfully!");
      setShowUpdateModal(false);
    } catch (error) {
      showNotification("error", "Failed to update profile.");
    }
  };

  const handleStatusChange = async (action) => {
    if (!selectedPatient) return;

    try {
      const res = await updatePatientStatus(selectedPatient.id, action);

      const updatedList = patients.map((p) =>
        p.id === selectedPatient.id ? res.patient : p
      );

      setPatients(updatedList);
      setSelectedPatient(res.patient);

      const successMsg =
        action === "block"
          ? "Patient blocked successfully"
          : "Patient activated successfully";

      showNotification("success", successMsg);
    } catch (error) {
      showNotification("error", "Failed to update status.");
    }
  };

  const renderActionButtons = () => {
    const status = selectedPatient.status?.toLowerCase();

    if (status === "active") {
      return (
        <button
          onClick={() => handleStatusChange("block")}
          className="flex-1 py-3 px-4 bg-[#f43f5e] shadow-red-50 hover:bg-red-600 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
        >
          <AlertCircle size={14} />
          Block Patient
        </button>
      );
    }

    if (status === "blocked") {
      return (
        <button
          onClick={() => handleStatusChange("activate")}
          className="flex-1 py-3 px-4 bg-[#3b82f6] shadow-blue-50 hover:bg-blue-600 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
        >
          <CheckCircle size={14} />
          Activate Patient
        </button>
      );
    }

    if (status === "pending") {
      return (
        <button
          onClick={() => handleStatusChange("activate")}
          className="flex-1 py-3 px-4 bg-[#00d053] shadow-green-50 hover:bg-green-600 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
        >
          <CheckCircle size={14} />
          Approve & Activate
        </button>
      );
    }

    return null;
  };

  const HistoryEmpty = ({ label }) => (
    <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
      <p className="text-xs text-gray-400 font-bold italic uppercase tracking-wider">
        No {label} history found
      </p>
    </div>
  );

  const TravelHistoryCard = ({ record }) => {
    const typeText = String(record?.type || "").toLowerCase();
    const isAmbulance = typeText.includes("ambulance");

    const code = getTravelValue(
      record,
      ["code", "requestCode", "rideCode", "orderCode", "id"],
      isAmbulance ? "AMB-" : "BIKE-"
    );

    const personLabel = isAmbulance ? "Driver Name" : "Rider Name";

    const personName = isAmbulance
      ? getTravelValue(
          record,
          ["personName", "driverName", "assigneeName", "driver"],
          "Assigning..."
        )
      : getTravelValue(
          record,
          ["personName", "riderName", "assigneeName", "rider"],
          "Assigning..."
        );

    const vehicleLabel = isAmbulance ? "Ambulance Number" : "Bike Number";

    const vehicleNumber = isAmbulance
      ? getTravelValue(
          record,
          ["vehicleNumber", "ambulanceNumber", "assigneeId", "vehicleNo"],
          "N/A"
        )
      : getTravelValue(
          record,
          ["vehicleNumber", "bikeNumber", "bikeNo", "assigneeId"],
          "N/A"
        );

    const amount = getTravelValue(
      record,
      ["amount", "fare", "fareAmount", "totalAmount"],
      "Pending"
    );

    const dateTime = getTravelValue(
      record,
      ["dateTime", "createdAt", "requestedAt"],
      "N/A"
    );

    const pickup = getTravelValue(
      record,
      ["pickup", "pickupLocation", "pickupAddress"],
      "N/A"
    );

    const dropoff = getTravelValue(
      record,
      [
        "dropoff",
        "dropLocation",
        "dropoffLocation",
        "destination",
        "hospitalName",
      ],
      "N/A"
    );

    return (
      <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm hover:bg-gray-50/50 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isAmbulance
                  ? "bg-red-50 text-red-500"
                  : "bg-blue-50 text-blue-500"
              }`}
            >
              {isAmbulance ? <Ambulance size={17} /> : <Bike size={17} />}
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-800">{code}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {isAmbulance ? "Ambulance" : "Bike Ride"}
              </p>
            </div>
          </div>

          {getStatusBadge(record?.status)}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[10px] font-medium text-gray-400">
              {personLabel}
            </p>
            <p className="text-[11px] font-bold text-gray-800">{personName}</p>
          </div>

          <div>
            <p className="text-[10px] font-medium text-gray-400">
              {vehicleLabel}
            </p>
            <p className="text-[11px] font-bold text-gray-800">
              {vehicleNumber}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-medium text-gray-400">Amount</p>
            <p className="text-[11px] font-bold text-gray-800">{amount}</p>
          </div>

          <div>
            <p className="text-[10px] font-medium text-gray-400">
              Date & Time
            </p>
            <p className="text-[11px] font-bold text-gray-800">{dateTime}</p>
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t border-gray-50">
          <div className="flex items-start gap-2">
            <MapPin size={12} className="text-gray-300 mt-0.5" />
            <div>
              <p className="text-[10px] font-medium text-gray-400">Pickup</p>
              <p className="text-[11px] font-bold text-gray-800 leading-snug">
                {pickup}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin size={12} className="text-gray-300 mt-0.5" />
            <div>
              <p className="text-[10px] font-medium text-gray-400">
                Drop-off / Destination
              </p>
              <p className="text-[11px] font-bold text-gray-800 leading-snug">
                {dropoff}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const OrderHistoryCard = ({ order }) => {
    const code =
      order?.code ||
      order?.orderCode ||
      order?.id ||
      "MED-";

    const pharmacyName =
      order?.pharmacyName ||
      order?.pharmacy ||
      "Unknown Pharmacy";

    const riderName =
      order?.riderName ||
      order?.deliveredBy ||
      order?.assigneeName ||
      "Assigning...";

    const amount =
      order?.amount ||
      order?.totalAmount ||
      "Pending";

    const paymentStatus =
      order?.paymentStatus ||
      "unpaid";

    const items =
      order?.items ||
      order?.medicineItems ||
      "Medicine / Equipment";

    const deliveryAddress =
      order?.deliveryAddress ||
      order?.deliveryLocation ||
      "N/A";

    const dateTime =
      order?.dateTime ||
      order?.createdAt ||
      order?.requestedAt ||
      "N/A";

    return (
      <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm hover:bg-gray-50/50 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-green-50 text-green-600">
              <Package size={17} />
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-800">{code}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Medicine Order
              </p>
            </div>
          </div>

          {getStatusBadge(order?.status)}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[10px] font-medium text-gray-400">Pharmacy</p>
            <p className="text-[11px] font-bold text-gray-800">
              {pharmacyName}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-medium text-gray-400">Rider</p>
            <p className="text-[11px] font-bold text-gray-800">{riderName}</p>
          </div>

          <div>
            <p className="text-[10px] font-medium text-gray-400">Amount</p>
            <p className="text-[11px] font-bold text-gray-800">{amount}</p>
          </div>

          <div>
            <p className="text-[10px] font-medium text-gray-400">Payment</p>
            <div className="mt-1">{getStatusBadge(paymentStatus)}</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={13} className="text-gray-400" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Items Ordered
            </p>
          </div>

          <p className="text-[11px] font-bold text-gray-800 leading-snug">
            {items}
          </p>
        </div>

        <div className="flex items-start gap-2">
          <MapPin size={12} className="text-gray-300 mt-0.5" />
          <div>
            <p className="text-[10px] font-medium text-gray-400">
              Delivery Address
            </p>
            <p className="text-[11px] font-bold text-gray-800 leading-snug">
              {deliveryAddress}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2 text-gray-400">
          <Calendar size={12} />
          <p className="text-[10px] font-bold">{dateTime}</p>
        </div>
      </div>
    );
  };

  const renderModalContent = () => {
    if (modalTab === "profile") {
      return (
        <div className="space-y-8 animate-in fade-in duration-300">
          <section>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              Personal Information
            </h3>

            <div className="grid grid-cols-2 gap-y-5">
              <div>
                <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">
                  Patient ID
                </p>
                <p className="text-[11px] font-bold text-gray-800">
                  {selectedPatient.patientId || selectedPatient.id}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">
                  Full Name
                </p>
                <p className="text-[11px] font-bold text-gray-800">
                  {selectedPatient.name}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">
                  Age
                </p>
                <p className="text-[11px] font-bold text-gray-800">
                  {selectedPatient.age || "-"} years
                </p>
              </div>

              <div>
                <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">
                  Phone Number
                </p>
                <p className="text-[11px] font-bold text-gray-800">
                  {selectedPatient.phone}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">
                  Email Address
                </p>
                <p className="text-[11px] font-bold text-gray-800">
                  {selectedPatient.email}
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">
                  Address
                </p>
                <div className="flex items-start space-x-1.5 text-gray-800">
                  <MapPin size={12} className="text-gray-300 mt-0.5" />
                  <p className="text-[11px] font-bold leading-tight">
                    {selectedPatient.address}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="h-[1px] bg-gray-50"></div>

          <section>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              Account Information
            </h3>

            <div className="grid grid-cols-2 gap-y-5">
              <div>
                <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">
                  Status
                </p>
                <div className="mt-1">{getStatusBadge(selectedPatient.status)}</div>
              </div>

              <div>
                <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">
                  Join Date
                </p>
                <div className="flex items-center space-x-1.5 text-gray-400">
                  <Calendar size={12} />
                  <p className="text-[11px] font-bold text-gray-800">
                    {selectedPatient.joinDate}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">
                  Ambulance/Bike History
                </p>
                <p className="text-[11px] font-bold text-gray-800">
                  {(
                    selectedPatient.travelHistory ||
                    selectedPatient.ambulanceBikeHistory ||
                    []
                  ).length}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-medium text-gray-400 mb-1 tracking-tight">
                  Medicine Orders
                </p>
                <p className="text-[11px] font-bold text-gray-800">
                  {(selectedPatient.orderHistory || []).length}
                </p>
              </div>
            </div>
          </section>
        </div>
      );
    }

    if (modalTab === "ambulance") {
      const history =
        selectedPatient.travelHistory ||
        selectedPatient.ambulanceBikeHistory ||
        [
          ...(selectedPatient.ambulanceHistory || []),
          ...(selectedPatient.bikeHistory || []),
        ];

      if (!history.length) {
        return <HistoryEmpty label="ambulance / bike" />;
      }

      return (
        <div className="space-y-3 animate-in fade-in duration-300">
          {history.map((record, index) => (
            <TravelHistoryCard
              key={`${record.type}-${record.id || index}`}
              record={record}
            />
          ))}
        </div>
      );
    }

    const orders = selectedPatient.orderHistory || [];

    if (!orders.length) {
      return <HistoryEmpty label="medicine order" />;
    }

    return (
      <div className="space-y-3 animate-in fade-in duration-300">
        {orders.map((order, index) => (
          <OrderHistoryCard key={order.id || index} order={order} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex bg-[#f9fafb] min-h-screen">
      <Sidebar
        activeTab="patients"
        onLogout={onLogout}
        onTabClick={onSetActivePage}
      />

      <main className="flex-1 ml-64 p-8">
        {notification && (
          <div
            className={`fixed top-6 right-6 z-[250] flex items-center space-x-3 px-6 py-4 rounded-xl shadow-2xl border animate-in slide-in-from-right-8 duration-300 ${
              notification.type === "success"
                ? "bg-green-50 border-green-100 text-green-700"
                : "bg-red-50 border-red-100 text-red-700"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="text-sm font-bold">{notification.message}</span>
          </div>
        )}

        <header className="flex justify-between items-center mb-8">
          <div className="text-left">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              Patients
            </h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">
              Emergency Response System Admin Panel
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-800 leading-tight">
                {user?.name || "Admin User"}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">
                {user?.email || "a.haseeb3127@gmail.com"}
              </p>
            </div>

            <div className="w-8 h-8 bg-[#e10000] rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-white">
              {(user?.name || "A").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 text-left">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] text-gray-400 font-bold mb-1">
              Total Patients
            </p>
            <h3 className="text-xl font-bold text-gray-800 tracking-tight">
              {patients.length}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] text-gray-400 font-bold mb-1">
              Active Patients
            </p>
            <h3 className="text-xl font-bold text-gray-800 tracking-tight">
              {patients.filter((p) => p.status === "active").length}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] text-gray-400 font-bold mb-1">
              Blocked Patients
            </p>
            <h3 className="text-xl font-bold text-gray-800 tracking-tight">
              {patients.filter((p) => p.status === "blocked").length}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] text-gray-400 font-bold mb-1">
              Pending Patients
            </p>
            <h3 className="text-xl font-bold text-yellow-600 tracking-tight">
              {patients.filter((p) => p.status === "pending").length}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-6 text-left">
            <h2 className="text-sm font-bold text-gray-800">
              Patient Management
            </h2>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              View and manage all registered patients/customers
            </p>
          </div>

          <div className="px-6 py-4">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients by name or phone..."
                className="w-full bg-gray-50 border-none rounded-lg pl-10 pr-4 py-2.5 text-xs font-medium text-gray-700 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Patient ID
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-8 text-xs text-gray-400"
                    >
                      Loading patients...
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-8 text-xs text-gray-400"
                    >
                      No patients found
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-700">
                        {patient.patientId || patient.id}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-gray-800">
                        {patient.name}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-600">
                        {patient.phone}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-gray-600">
                        {patient.email}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(patient.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedPatient(patient);
                            setModalTab("profile");
                          }}
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

      {selectedPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 text-left">
              <div>
                <h2 className="text-sm font-bold text-gray-800">
                  Patient Details - {selectedPatient.name}
                </h2>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                  Complete profile and activity history
                </p>
              </div>

              <button
                onClick={() => setSelectedPatient(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 bg-gray-50/30">
              <div className="bg-gray-100 p-1 rounded-xl flex">
                <button
                  onClick={() => setModalTab("profile")}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    modalTab === "profile"
                      ? "bg-white shadow-sm text-gray-800"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Profile
                </button>

                <button
                  onClick={() => setModalTab("ambulance")}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    modalTab === "ambulance"
                      ? "bg-white shadow-sm text-gray-800"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Ambulance/Bike
                </button>

                <button
                  onClick={() => setModalTab("order")}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    modalTab === "order"
                      ? "bg-white shadow-sm text-gray-800"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Orders
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white text-left">
              {renderModalContent()}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
              {renderActionButtons()}

              <button
                onClick={handleUpdateClick}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all bg-white"
              >
                <FileText size={14} />
                Update Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 text-left">
              <div>
                <h2 className="text-sm font-bold text-gray-800 tracking-tight">
                  Update Patient Profile
                </h2>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                  Update patient information below
                </p>
              </div>

              <button
                onClick={() => setShowUpdateModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleUpdateSubmit}
              className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar text-left"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={updateFormData.name}
                    onChange={(e) =>
                      setUpdateFormData({
                        ...updateFormData,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-1 focus:ring-red-500 outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">
                      Age
                    </label>
                    <input
                      type="text"
                      value={updateFormData.age}
                      onChange={(e) =>
                        setUpdateFormData({
                          ...updateFormData,
                          age: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={updateFormData.phone}
                      onChange={(e) =>
                        setUpdateFormData({
                          ...updateFormData,
                          phone: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    type="email"
                    value={updateFormData.email}
                    onChange={(e) =>
                      setUpdateFormData({
                        ...updateFormData,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 focus:ring-1 focus:ring-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-800 mb-1.5 uppercase tracking-wide">
                    Address
                  </label>
                  <textarea
                    value={updateFormData.address}
                    onChange={(e) =>
                      setUpdateFormData({
                        ...updateFormData,
                        address: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 focus:ring-1 focus:ring-red-500 outline-none transition-all resize-none h-20"
                  />
                </div>
              </div>

              <div className="pt-4 sticky bottom-0 bg-white">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#e10000] text-white text-[11px] font-bold rounded-xl hover:bg-red-700 transition-all shadow-xl shadow-red-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default Patients;