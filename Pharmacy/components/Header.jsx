import React, { useEffect, useState } from "react";
import { Bell, LogOut, X, Package, MapPin } from "lucide-react";
import { api } from "../services/api";

export const Header = ({
  user,
  isOnline,
  onToggleStatus,
  onLogout,
  title,
  onUpdatePendingCount,
}) => {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [seenRequestIds, setSeenRequestIds] = useState([]);

  const pharmacyId = user?.id || user?._id;

  const getRequestId = (request) => String(request?.id || request?._id || "");

  const unseenCount = pendingRequests.filter(
    (request) => !seenRequestIds.includes(getRequestId(request))
  ).length;

  const fetchPendingNotifications = async () => {
    if (!pharmacyId) return;

    try {
      setNotificationLoading(true);

      const requests = await api.getPendingNotifications();
      const safeRequests = Array.isArray(requests) ? requests : [];

      setPendingRequests(safeRequests);

      if (onUpdatePendingCount) {
        onUpdatePendingCount(safeRequests.length);
      }
    } catch (error) {
      console.error("Failed to fetch pharmacy notifications", error);
      setPendingRequests([]);
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingNotifications();

    const interval = setInterval(() => {
      fetchPendingNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [pharmacyId]);

  const handleBellClick = async () => {
    const nextOpen = !notificationOpen;
    setNotificationOpen(nextOpen);

    if (nextOpen) {
      try {
        setNotificationLoading(true);

        const requests = await api.getPendingNotifications();
        const safeRequests = Array.isArray(requests) ? requests : [];

        setPendingRequests(safeRequests);

        const ids = safeRequests.map((request) => getRequestId(request));
        setSeenRequestIds((prev) => Array.from(new Set([...prev, ...ids])));

        if (onUpdatePendingCount) {
          onUpdatePendingCount(safeRequests.length);
        }
      } catch (error) {
        console.error("Failed to open pharmacy notifications", error);
      } finally {
        setNotificationLoading(false);
      }
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "Just now";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Just now";

    return date.toLocaleString();
  };

  const getItemsText = (request) => {
    const medicines = Array.isArray(request?.medicineItems)
      ? request.medicineItems
      : [];

    const equipment = Array.isArray(request?.equipmentItems)
      ? request.equipmentItems
      : [];

    const allItems = [...medicines, ...equipment]
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    return allItems.length ? allItems.join(", ") : "Medicine / Equipment";
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-gray-800 hidden md:block">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600">Status:</span>

          <button
            onClick={onToggleStatus}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isOnline ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`${
                isOnline ? "translate-x-6" : "translate-x-1"
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </button>

          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              isOnline
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {/* ✅ Pharmacy Notification Bell */}
        <div className="relative">
          <button
            onClick={handleBellClick}
            className="relative text-gray-500 hover:text-green-600 transition-colors"
          >
            <Bell size={20} />

            {unseenCount > 0 && (
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {notificationOpen && (
            <div className="absolute right-0 top-9 w-[370px] bg-white border border-gray-100 rounded-2xl shadow-xl z-[9999] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Pharmacy Notifications
                  </h3>

                  <p className="text-[10px] text-gray-400 font-medium mt-1">
                    Pending prescription requests
                  </p>
                </div>

                <button
                  onClick={() => setNotificationOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-[390px] overflow-y-auto">
                {notificationLoading && pendingRequests.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider animate-pulse">
                      Loading notifications...
                    </p>
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="py-10 text-center px-5">
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                      <Bell size={18} />
                    </div>

                    <p className="text-xs font-bold text-gray-700">
                      No pending requests
                    </p>

                    <p className="text-[11px] text-gray-400 mt-1">
                      New medicine requests will appear here.
                    </p>
                  </div>
                ) : (
                  pendingRequests.map((request) => (
                    <div
                      key={getRequestId(request)}
                      className="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                          <Package size={16} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[12px] font-bold text-gray-800 leading-snug">
                              New Medicine Request
                            </p>

                            <span
                              className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${
                                request.priority === "emergency"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {request.priority || "regular"}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                            {request.patientInfo?.name ||
                              request.patient?.fullName ||
                              "Patient"}{" "}
                            ne medicine request submit ki hai.
                          </p>

                          <p className="text-[11px] text-gray-700 mt-2 font-semibold leading-relaxed">
                            Items: {getItemsText(request)}
                          </p>

                          <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                            <MapPin size={11} />

                            <span>
                              {request.distanceText ||
                                request.deliveryLocation?.address ||
                                "Location unavailable"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] text-gray-400 font-medium">
                              Status: {request.status || "pharmacy_processing"}
                            </p>

                            <p className="text-[9px] text-gray-400 font-medium">
                              {formatDateTime(
                                request.requestedAt || request.createdAt
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};