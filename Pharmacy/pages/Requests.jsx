import React, { useEffect, useState } from "react";
import {
  MapPin,
  Phone,
  FileText,
  Clock,
  RefreshCw,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Button } from "../components/Button";
import { api } from "../services/api";

const STORAGE_KEY = "pharmacy_user";
const GOOGLE_MAPS_APIKEY = "AIzaSyA7D56WKApJ8Ash580RI_SroCDi27-MghE";

const getCurrentPharmacyUser = () => {
  const raw =
    localStorage.getItem(STORAGE_KEY) ||
    localStorage.getItem("user") ||
    localStorage.getItem("pharmacy_user");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

/** ✅ Normalize image coming from DB
 * Supports:
 * - data:image/...;base64,...
 * - raw base64 string (no prefix)
 * - http/https url
 * - file:// (old mobile local path) => invalid for web
 */
const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const isValidLngLat = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return false;

  const lng = toNumber(coords[0]);
  const lat = toNumber(coords[1]);

  if (lng === null || lat === null) return false;
  if (lng === 0 && lat === 0) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;

  return true;
};

const calculateDistanceKm = (fromCoords, toCoords) => {
  if (!isValidLngLat(fromCoords) || !isValidLngLat(toCoords)) return null;

  const lng1 = toNumber(fromCoords[0]);
  const lat1 = toNumber(fromCoords[1]);
  const lng2 = toNumber(toCoords[0]);
  const lat2 = toNumber(toCoords[1]);

  const R = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const formatDistanceText = (distanceKm) => {
  if (distanceKm == null) return null;
  if (distanceKm < 1) return `${Math.max(distanceKm * 1000, 0).toFixed(0)} m away`;
  return `${distanceKm.toFixed(1)} km away`;
};

const getBrowserPharmacyCoords = () => {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve([
          Number(position.coords.longitude),
          Number(position.coords.latitude),
        ]);
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
};

const isCoordinateLikeAddress = (address) => {
  const text = String(address || "").trim().toLowerCase();
  if (!text) return true;

  return (
    text === "current gps location" ||
    text === "current location" ||
    text === "address not available" ||
    text === "unknown location" ||
    text.startsWith("lat ") ||
    text.includes("lng ") ||
    /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(text)
  );
};

const reverseGeocodeCoords = async (coords) => {
  if (!isValidLngLat(coords)) return null;

  const lng = coords[0];
  const lat = coords[1];

  try {
    const googleUrl =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${lat},${lng}` +
      `&key=${GOOGLE_MAPS_APIKEY}`;

    const googleRes = await fetch(googleUrl);
    const googleData = await googleRes.json();

    if (googleData?.status === "OK" && googleData?.results?.length > 0) {
      return googleData.results[0].formatted_address;
    }
  } catch (error) {
    console.log("Google reverse geocode failed:", error.message);
  }

  try {
    const bigDataUrl =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${lat}&longitude=${lng}&localityLanguage=en`;

    const bigDataRes = await fetch(bigDataUrl);
    const bigData = await bigDataRes.json();

    const parts = [
      bigData?.locality,
      bigData?.city,
      bigData?.principalSubdivision,
      bigData?.countryName,
    ].filter(Boolean);

    if (parts.length > 0) {
      return [...new Set(parts)].join(", ");
    }
  } catch (error) {
    console.log("BigDataCloud reverse geocode failed:", error.message);
  }

  try {
    const osmUrl =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    const osmRes = await fetch(osmUrl, {
      headers: { Accept: "application/json" },
    });
    const osmData = await osmRes.json();

    if (osmData?.display_name) {
      return osmData.display_name;
    }
  } catch (error) {
    console.log("OSM reverse geocode failed:", error.message);
  }

  return null;
};

const geocodeAddress = async (address) => {
  const safeAddress = String(address || "").trim();
  if (!safeAddress) return null;

  try {
    const googleUrl =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(safeAddress)}` +
      `&components=country:PK` +
      `&key=${GOOGLE_MAPS_APIKEY}`;

    const googleRes = await fetch(googleUrl);
    const googleData = await googleRes.json();

    if (googleData?.status === "OK" && googleData?.results?.length > 0) {
      const loc = googleData.results[0].geometry.location;
      return [Number(loc.lng), Number(loc.lat)];
    }
  } catch (error) {
    console.log("Google geocode failed:", error.message);
  }

  try {
    const osmUrl =
      `https://nominatim.openstreetmap.org/search` +
      `?format=jsonv2&limit=1&q=${encodeURIComponent(safeAddress)}`;

    const osmRes = await fetch(osmUrl, {
      headers: { Accept: "application/json" },
    });
    const osmData = await osmRes.json();

    if (Array.isArray(osmData) && osmData.length > 0) {
      return [Number(osmData[0].lon), Number(osmData[0].lat)];
    }
  } catch (error) {
    console.log("OSM geocode failed:", error.message);
  }

  return null;
};

const getPharmacyCoordsForDistance = async () => {
  const browserCoords = await getBrowserPharmacyCoords();
  if (isValidLngLat(browserCoords)) return browserCoords;

  const currentUser = getCurrentPharmacyUser();
  const savedCoords = currentUser?.location?.coordinates;
  if (isValidLngLat(savedCoords)) return savedCoords;

  const address = currentUser?.address;
  const geocodedCoords = await geocodeAddress(address);
  if (isValidLngLat(geocodedCoords)) return geocodedCoords;

  return null;
};

const normalizePrescriptionImage = (value) => {
  if (!value || typeof value !== "string") return { kind: "none" };

  // old mobile local file path
  if (value.startsWith("file://")) return { kind: "local" };

  // already proper data-uri
  if (value.startsWith("data:image")) return { kind: "data", src: value };

  // looks like raw base64
  const cleaned = value.replace(/\s/g, "");
  const looksLikeBase64 =
    cleaned.length > 200 && /^[A-Za-z0-9+/]+={0,2}$/.test(cleaned);

  if (looksLikeBase64) {
    return { kind: "data", src: `data:image/jpeg;base64,${cleaned}` };
  }

  // normal url
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return { kind: "url", src: value };
  }

  return { kind: "none" };
};

const ImageViewerModal = ({ open, src, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setDragging(false);
    }
  }, [open, src]);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const clampZoom = (z) => Math.max(1, Math.min(6, z));

  const zoomIn = () =>
    setZoom((z) => clampZoom(Number((z + 0.25).toFixed(2))));
  const zoomOut = () =>
    setZoom((z) => clampZoom(Number((z - 0.25).toFixed(2))));

  const onWheelZoom = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom((z) => clampZoom(Number((z + delta).toFixed(2))));
  };

  const onMouseDown = (e) => {
    if (zoom <= 1) return;
    setDragging(true);
    setStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - start.x, y: e.clientY - start.y });
  };

  const onMouseUp = () => setDragging(false);

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-white rounded-xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-gray-900 text-sm">Prescription</h3>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 disabled:opacity-50"
              onClick={zoomOut}
              disabled={zoom <= 1}
              title="Zoom out"
            >
              −
            </button>

            <div className="text-xs font-bold text-gray-600 w-16 text-center">
              {Math.round(zoom * 100)}%
            </div>

            <button
              className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50"
              onClick={zoomIn}
              title="Zoom in"
            >
              +
            </button>

            <button
              className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50"
              onClick={resetView}
              title="Reset (100%)"
            >
              Reset
            </button>

            <button
              onClick={onClose}
              className="ml-2 p-2 rounded-md hover:bg-gray-100"
              aria-label="Close"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 bg-gray-50">
          <div
            className="w-full h-[78vh] bg-white rounded-lg border overflow-auto"
            onWheel={onWheelZoom}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div className="min-w-full min-h-full flex items-center justify-center p-4">
              <img
                src={src}
                alt="Prescription Full"
                draggable={false}
                onMouseDown={onMouseDown}
                className="select-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default",
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              />
            </div>
          </div>

          <p className="mt-2 text-[11px] text-gray-500 text-center">
            Tip: Mouse wheel = zoom • Zoom ke baad drag/pan • Scrollbars bhi
            available hain.
          </p>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex gap-2 justify-end">
          <Button variant="success" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

const RequestCard = ({
  request,
  onIgnore,
  onApprove,
  selectedRequest,
  medicineAmount,
  equipmentAmount,
  setMedicineAmount,
  setEquipmentAmount,
}) => {
  const placeholderImage =
    "https://placehold.co/800x600?text=No+Image+Provided";

  const [modalOpen, setModalOpen] = useState(false);

  const img = normalizePrescriptionImage(request.imageUrl);

  const imageSource =
    img.kind === "data" || img.kind === "url" ? img.src : placeholderImage;

  const canOpenModal = img.kind === "data" || img.kind === "url";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-wrap justify-between items-start gap-4">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
            {request.patientName
              ? request.patientName.substring(0, 2).toUpperCase()
              : "PT"}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{request.patientName}</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {request.timestamp}
              </span>
              {request.distanceText && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {request.distanceText}
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          className={`px-2.5 py-1 rounded text-xs font-semibold border ${
            request.priority === "High"
              ? "bg-red-50 text-red-600 border-red-100"
              : "bg-yellow-50 text-yellow-600 border-yellow-100"
          }`}
        >
          {request.priority} Priority
        </div>
      </div>

      {/* Body */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase mb-1 flex items-center gap-1">
                <MapPin size={12} /> Delivery Location
              </p>
              <p
                className="text-sm font-medium text-gray-900 truncate"
                title={request.location}
              >
                {request.location}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 font-medium uppercase mb-1 flex items-center gap-1">
                <FileText size={12} /> Prescription Type
              </p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${
                  request.type.toLowerCase().includes("emergency")
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-green-50 text-green-700 border-green-200"
                }`}
              >
                {request.type}
              </span>
            </div>

            <div>
              <p className="text-xs text-gray-400 font-medium uppercase mb-1 flex items-center gap-1">
                <Phone size={12} /> Contact Number
              </p>
              <p className="text-sm font-medium text-gray-900">
                {request.contactNumber}
              </p>
            </div>
          </div>

          <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
            <p className="text-xs text-gray-500 font-medium uppercase mb-3 flex items-center gap-1">
              Required Medicines
            </p>
            <ul className="space-y-2">
              {request.medicines && request.medicines.length > 0 ? (
                request.medicines.map((med, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    {med}
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-400 italic">
                  See prescription image
                </li>
              )}
            </ul>

            {request.equipment && request.equipment.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-100">
                <p className="text-xs text-gray-500 font-medium uppercase mb-3 flex items-center gap-1">
                  Medical Equipment
                </p>
                <ul className="space-y-2">
                  {request.equipment.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Image Section */}
        <div className="lg:col-span-1">
          <p className="text-xs text-gray-400 font-medium uppercase mb-2 flex items-center gap-1">
            <FileText size={12} /> Prescription Form
          </p>

          <div className="rounded-lg border border-gray-200 bg-gray-100 overflow-hidden">
            {img.kind === "local" ? (
              <div className="h-48 flex items-center justify-center text-center p-4 bg-white">
                <div>
                  <ImageIcon className="mx-auto text-gray-400 mb-2" size={24} />
                  <p className="text-[11px] text-red-500 font-bold">
                    Old Data Format
                  </p>
                  <p className="text-[10px] text-gray-500">
                    (Image saved locally on user mobile)
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="w-full"
                onClick={() => canOpenModal && setModalOpen(true)}
                title={canOpenModal ? "Click to view full" : "No image"}
              >
                <img
                  src={imageSource}
                  alt="Prescription"
                  className="w-full h-48 object-contain bg-white"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = placeholderImage;
                  }}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedRequest?.id === request.id && (
        <div className="px-5 py-4 border-t bg-blue-50">
          <h4 className="font-bold text-sm mb-3">
            Enter Order Pricing
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Medicine Amount"
              value={medicineAmount}
              onChange={(e) => setMedicineAmount(e.target.value)}
              className="border rounded px-3 py-2"
            />

            <input
              type="number"
              placeholder="Medical Equipment Amount"
              value={equipmentAmount}
              onChange={(e) => setEquipmentAmount(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>

          <p className="mt-3 text-xs text-blue-700"></p>

          <p className="mt-2 text-sm font-semibold">
            Medicines + Equipment Total: Rs {Number(medicineAmount || 0) + Number(equipmentAmount || 0)}
          </p>
        </div>
      )}

      {/* Footer Buttons */}
      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3">
        <Button
          variant="success"
          className="flex-1"
          onClick={() => onApprove(request.id)}
        >
          Approve & Dispatch
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-gray-300"
          onClick={() => onIgnore(request.id)}
        >
          Ignore Request
        </Button>
      </div>

      {/* ✅ Modal */}
      <ImageViewerModal
        open={modalOpen}
        src={imageSource}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

export const Requests = ({ isOnline }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // NEW: Pharmacy pricing before dispatch
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [medicineAmount, setMedicineAmount] = useState("");
  const [equipmentAmount, setEquipmentAmount] = useState("");

  const fetchRequests = async () => {
    if (!isOnline) return;
    setLoading(true);
    setError(null);

    try {
      const data = await api.getRequests();
      const pharmacyCoords = await getPharmacyCoordsForDistance();

      const mapped = await Promise.all(
        data.map(async (order) => {
          const deliveryCoords = order.deliveryLocation?.coordinates;
          const frontendDistanceKm = calculateDistanceKm(
            pharmacyCoords,
            deliveryCoords
          );

          let deliveryAddress = order.deliveryLocation?.address || "";

          if (isCoordinateLikeAddress(deliveryAddress)) {
            const resolvedAddress = await reverseGeocodeCoords(deliveryCoords);
            deliveryAddress = resolvedAddress || "Address not available";
          }

          return {
            id: order._id || order.id,
            patientName:
              order.patient?.fullName || order.patientInfo?.name || "Unknown",
            contactNumber:
              order.patient?.phone || order.patientInfo?.phone || "N/A",
            location: deliveryAddress || "Unknown Location",
            medicines: order.medicineItems || [],
            equipment: order.equipmentItems || [],
            distanceText:
              order.distanceText || formatDistanceText(frontendDistanceKm),
            imageUrl: order.prescriptionImageUrl,
            priority: order.priority === "emergency" ? "High" : "Normal",
            type: order.priority
              ? order.priority.charAt(0).toUpperCase() +
                order.priority.slice(1) +
                " Prescription"
              : "General Prescription",
            timestamp: order.requestedAt
              ? new Date(order.requestedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--",
          };
        })
      );

      setRequests(mapped);
    } catch (err) {
      console.error("Fetch Error:", err);
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Updated handleIgnore handler
  const handleIgnore = async (orderId) => {
    const userStr = localStorage.getItem('user');
    if(!userStr) return;
    
    const user = JSON.parse(userStr);
    const pharmacyId = user.id || user._id;

    try {
      // 1. Database call to add this pharmacy to order's ignoredBy list
      await api.ignoreRequest(pharmacyId, orderId);
      
      // 2. State update: UI se card ko foran remove kar dein
      setRequests(prev => prev.filter(req => req.id !== orderId));
      
      console.log("Request ignored for pharmacy:", pharmacyId);
    } catch (err) {
      console.error("Ignore action failed:", err);
      alert("Could not ignore request: " + err.message);
    }
  };

  const handleApprove = async (id) => {
    const userStr = localStorage.getItem("pharmacy_user");
    if (!userStr) return;

    const user = JSON.parse(userStr);
    const pharmacyId = user.id || user._id;

    if (!selectedRequest || selectedRequest.id !== id) {
      setSelectedRequest({ id });
      setMedicineAmount("");
      setEquipmentAmount("");
      return;
    }

    try {
      await api.approveAndDispatchRequest(pharmacyId, id, {
        medicineAmount: Number(medicineAmount || 0),
        equipmentAmount: Number(equipmentAmount || 0),
      });

      setRequests((prev) => prev.filter((req) => req.id !== id));
      setSelectedRequest(null);
    } catch (err) {
      console.error("Approve action failed:", err);
      alert(err.message || "Could not approve this request");
      fetchRequests();
    }
  };

  useEffect(() => {
    fetchRequests();
    let interval;
    if (isOnline) interval = setInterval(fetchRequests, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="text-center p-20 bg-white rounded-xl border border-dashed">
        <h2 className="text-xl font-bold text-gray-400">You are Offline</h2>
        <p className="text-gray-500">
          Go Online to view pending prescription requests.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Prescription Requests
          </h1>
          <p className="text-sm text-gray-500">
            View and manage incoming medicine orders
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6">
          <strong>Error: </strong> {error}
        </div>
      ) : loading && requests.length === 0 ? (
        <div className="text-center py-20">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed">
          <p className="text-gray-500">No pending requests found at the moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              onIgnore={handleIgnore}
              onApprove={handleApprove}
              selectedRequest={selectedRequest}
              medicineAmount={medicineAmount}
              equipmentAmount={equipmentAmount}
              setMedicineAmount={setMedicineAmount}
              setEquipmentAmount={setEquipmentAmount}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Requests;
