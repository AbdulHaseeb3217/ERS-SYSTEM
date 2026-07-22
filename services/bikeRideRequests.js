// services/bikeRideRequests.js

import { buildUrl } from "./apiConfig";

export const createBikeRideRequest = async (payload) => {
  const res = await fetch(buildUrl("/api/bikeride/request"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    const error = new Error(
      data?.message || "Could not create bike ride request"
    );

    error.type = data?.type;
    error.ride = data?.ride || data?.activeRide || null;
    error.activeRide = data?.activeRide || data?.ride || null;

    throw error;
  }

  return data?.ride;
};

// Patient side active bike ride check
export const getActiveBikeRideSession = async (patientId) => {
  if (!patientId) {
    throw new Error("patientId is required");
  }

  const res = await fetch(buildUrl(`/api/bikeride/active-session/${patientId}`));
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to fetch active bike ride");
  }

  return data?.ride || data?.activeRide || null;
};

// Rider side active bike ride check.
// Bike rider logout/login ke baad agar accepted/arrived_at_pickup/in_progress ride chal rahi ho
// to BikeRiderMenuScreen is API se ride fetch karke ActiveBikeRide screen open karegi.
export const getActiveBikeRiderSession = async (riderId) => {
  if (!riderId) {
    throw new Error("riderId is required");
  }

  const res = await fetch(
    buildUrl(`/api/bikeride/active-rider-session/${riderId}`)
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to fetch active rider bike ride");
  }

  return data?.ride || data?.activeRide || null;
};

export const fetchBikeRideStatus = async (rideId) => {
  if (!rideId) {
    throw new Error("rideId is required");
  }

  const res = await fetch(buildUrl(`/api/bikeride/status/${rideId}`));
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to fetch bike ride status");
  }

  return data?.ride;
};

export const fetchPendingBikeRides = async () => {
  const res = await fetch(buildUrl("/api/bikeride/pending"));
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to fetch pending bike rides");
  }

  return data?.rides || [];
};

export const acceptBikeRideRequest = async ({ rideId, riderId }) => {
  if (!rideId) {
    throw new Error("rideId is required");
  }

  if (!riderId) {
    throw new Error("riderId is required");
  }

  const res = await fetch(buildUrl("/api/bikeride/accept"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rideId,
      riderId,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to accept bike ride request");
  }

  return data?.ride || data?.data;
};

export const updateBikeRideStatus = async ({
  rideId,
  riderId,
  status,
  cancelledBy,
}) => {
  if (!rideId) {
    throw new Error("rideId is required");
  }

  if (!status) {
    throw new Error("status is required");
  }

  const res = await fetch(buildUrl("/api/bikeride/status/update"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rideId,
      riderId,
      status,
      cancelledBy,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to update bike ride status");
  }

  return data?.ride || data?.data;
};

export const updateBikeRiderLiveLocation = async ({
  rideId,
  riderId,
  lat,
  lng,
  latitude,
  longitude,
}) => {
  if (!rideId) {
    throw new Error("rideId is required");
  }

  if (!riderId) {
    throw new Error("riderId is required");
  }

  const res = await fetch(buildUrl("/api/bikeride/rider-location/update"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rideId,
      riderId,
      lat,
      lng,
      latitude,
      longitude,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to update bike rider location");
  }

  return data?.ride || data?.data;
};


export const markBikeRidePaymentPending = async ({ rideId, riderId }) => {
  if (!rideId) {
    throw new Error("rideId is required");
  }

  const res = await fetch(buildUrl("/api/bikeride/payment/pending"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rideId, riderId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to move bike ride to payment pending");
  }

  return data?.ride || data?.data;
};

export const updateBikeRidePaymentAmount = async ({ rideId, riderId, fareAmount }) => {
  if (!rideId) {
    throw new Error("rideId is required");
  }

  const res = await fetch(buildUrl("/api/bikeride/payment/amount/update"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rideId, riderId, fareAmount }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to update bike ride payment amount");
  }

  return data?.ride || data?.data;
};

export const confirmBikeRidePaymentReceived = async ({ rideId, riderId }) => {
  if (!rideId) {
    throw new Error("rideId is required");
  }

  const res = await fetch(buildUrl("/api/bikeride/payment/confirm"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rideId, riderId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to confirm bike ride payment");
  }

  return data?.ride || data?.data;
};


// Medicine delivery request flow for bike rider app
export const fetchPendingMedicineDeliveries = async (riderId) => {
  if (!riderId) throw new Error("riderId is required");
  const res = await fetch(buildUrl(`/api/medicine-orders/delivery/pending?riderId=${encodeURIComponent(riderId)}`));
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to fetch pending medicine deliveries");
  }

  const orders = data?.orders || data?.requests || [];

  return orders.map((order) => ({
    ...order,
    pricing: {
      medicineAmount: Number(
        order?.pricing?.medicineAmount ??
        order?.medicineAmount ??
        order?.orderPricing?.medicineAmount ??
        0
      ),
      equipmentAmount: Number(
        order?.pricing?.equipmentAmount ??
        order?.pricing?.medicalEquipmentAmount ??
        order?.equipmentAmount ??
        order?.orderPricing?.equipmentAmount ??
        0
      ),
      deliveryCharges: Number(
        order?.pricing?.deliveryCharges ??
        order?.deliveryCharges ??
        order?.riderEarning ??
        order?.orderPricing?.deliveryCharges ??
        0
      ),
      totalAmount: Number(
        order?.pricing?.totalAmount ??
        (
          Number(order?.pricing?.medicineAmount ?? order?.medicineAmount ?? 0) +
          Number(order?.pricing?.equipmentAmount ?? order?.equipmentAmount ?? 0) +
          Number(order?.pricing?.deliveryCharges ?? order?.deliveryCharges ?? order?.riderEarning ?? 0)
        )
      ),
    },
  }));
};

export const getActiveMedicineDeliverySession = async (riderId) => {
  if (!riderId) {
    throw new Error("riderId is required");
  }

  const res = await fetch(
    buildUrl(`/api/medicine-orders/delivery/active-rider-session/${riderId}`)
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to fetch active medicine delivery");
  }

  return data?.order || data?.delivery || null;
};

export const acceptMedicineDeliveryRequest = async ({ orderId, riderId }) => {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  if (!riderId) {
    throw new Error("riderId is required");
  }

  const res = await fetch(buildUrl("/api/medicine-orders/delivery/accept"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId, riderId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to accept medicine delivery request");
  }

  return data?.order || data?.delivery;
};

export const updateMedicineDeliveryRiderLiveLocation = async ({
  orderId,
  riderId,
  lat,
  lng,
  latitude,
  longitude,
}) => {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  if (!riderId) {
    throw new Error("riderId is required");
  }

  const res = await fetch(buildUrl("/api/medicine-orders/delivery/rider-location/update"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId, riderId, lat, lng, latitude, longitude }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to update medicine delivery rider location");
  }

  return data?.order || data?.delivery;
};

export const markMedicineDeliveryReachedPharmacy = async ({ orderId, riderId }) => {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  if (!riderId) {
    throw new Error("riderId is required");
  }

  const res = await fetch(buildUrl("/api/medicine-orders/delivery/reached-pharmacy"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId, riderId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to mark medicine delivery as reached pharmacy");
  }

  return data?.order || data?.delivery;
};


export const markMedicineDeliveryNavigatingToPatient = async ({ orderId, riderId }) => {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  if (!riderId) {
    throw new Error("riderId is required");
  }

  const res = await fetch(buildUrl("/api/medicine-orders/delivery/navigate-to-patient"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId, riderId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to start navigation to patient");
  }

  return data?.order || data?.delivery;
};

export const markMedicineDeliveryPaymentPending = async ({ orderId, riderId }) => {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  if (!riderId) {
    throw new Error("riderId is required");
  }

  const res = await fetch(buildUrl("/api/medicine-orders/delivery/payment/pending"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId, riderId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to move medicine delivery to payment pending");
  }

  return data?.order || data?.delivery;
};

export const updateMedicineDeliveryPaymentAmount = async ({ orderId, riderId, amount }) => {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  const res = await fetch(buildUrl("/api/medicine-orders/delivery/payment/amount/update"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId, riderId, amount }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to update medicine delivery payment amount");
  }

  return data?.order || data?.delivery;
};

export const confirmMedicineDeliveryPaymentReceived = async ({ orderId, riderId }) => {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  const res = await fetch(buildUrl("/api/medicine-orders/delivery/payment/confirm"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId, riderId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Failed to confirm medicine delivery payment");
  }

  return data?.order || data?.delivery;
};

export const cancelMedicineDeliveryRequest = async ({
  orderId,
  riderId,
  cancelledBy = "rider",
}) => {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  if (!riderId) {
    throw new Error("riderId is required");
  }

  const res = await fetch(buildUrl("/api/medicine-orders/delivery/cancel"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId,
      riderId,
      cancelledBy,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.success === false) {
    throw new Error(
      data?.message || "Failed to cancel medicine delivery request"
    );
  }

  return data?.order || data?.delivery;
};

