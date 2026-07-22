// api/controllers/admin.controller.js

const adminService = require("../services/admin.service");
const adminNotificationService = require("../services/adminNotification.service");

const Admin = require("../models/admin.model");
const bcrypt = require("bcryptjs");

const Patient = require("../models/patient.model");
const Driver = require("../models/ambulanceDriver.model");
const Rider = require("../models/rider.model");
const Pharmacy = require("../models/pharmacy.model");

const AmbulanceRequest = require("../models/ambulanceRequest.model");
const BikeRide = require("../models/bikeRide.model");
const MedicineOrder = require("../models/medicineOrder.model");

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await adminService.authenticateAdmin(email, password);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({
      message: error.message,
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const statusRegex = (value) => new RegExp(`^\\s*${value}\\s*$`, "i");
    const statusIn = (statuses) => statuses.map((s) => statusRegex(s));

    const activeUserFilter = {
      $or: [
        { status: { $in: statusIn(["active", "approved"]) } },
        { accountStatus: { $in: statusIn(["active", "approved"]) } },
        { isActive: true },
        { isApproved: true, isBlocked: { $ne: true } },
      ],
    };

    const pendingUserFilter = {
      $or: [
        { status: statusRegex("pending") },
        { accountStatus: statusRegex("pending") },
      ],
    };

    const [
      totalPatients,
      activePatients,
      pendingPatients,

      totalDrivers,
      activeDrivers,

      totalRiders,
      activeRiders,

      totalPharmacies,
      activePharmacies,
    ] = await Promise.all([
      Patient.countDocuments(),
      Patient.countDocuments(activeUserFilter),
      Patient.countDocuments(pendingUserFilter),

      Driver.countDocuments(),
      Driver.countDocuments(activeUserFilter),

      Rider.countDocuments(),
      Rider.countDocuments(activeUserFilter),

      Pharmacy.countDocuments(),
      Pharmacy.countDocuments(activeUserFilter),
    ]);

    const notActiveStatuses = [
      "pending",
      "completed",
      "delivered",
      "paid",
      "cancelled",
      "canceled",
      "no_driver",
    ];

    const notActiveRegex = statusIn(notActiveStatuses);

    const ambulanceInProgressStatuses = [
      "accepted",
      "on_the_way",
      "arrived",
      "arrived_at_patient",
      "selected_hospital",
      "navigating_to_hospital",
      "reached_hospital",
      "payment_pending",
      "in_progress",
    ];

    const [ambulanceActive, ambulanceInProgress, ambulancePending] =
      await Promise.all([
        AmbulanceRequest.countDocuments({
          status: { $nin: notActiveRegex },
        }),

        AmbulanceRequest.countDocuments({
          status: { $in: statusIn(ambulanceInProgressStatuses) },
        }),

        AmbulanceRequest.countDocuments({
          status: statusRegex("pending"),
        }),
      ]);

    const bikeInProgressStatuses = [
      "accepted",
      "arrived_at_patient",
      "arrived_at_pickup",
      "in_progress",
      "navigating_to_hospital",
      "payment_pending",
    ];

    const [bikeActive, bikeInProgress, bikePending] = await Promise.all([
      BikeRide.countDocuments({
        status: { $nin: notActiveRegex },
      }),

      BikeRide.countDocuments({
        status: { $in: statusIn(bikeInProgressStatuses) },
      }),

      BikeRide.countDocuments({
        status: statusRegex("pending"),
      }),
    ]);

    const medicineProcessingStatuses = [
      "pharmacy_processing",
      "dispatching",
      "delivering",
      "reached_pharmacy",
      "navigating_to_patient",
      "payment_pending",
    ];

    const [medicineActive, medicineProcessing, medicineDelivered] =
      await Promise.all([
        MedicineOrder.countDocuments({
          status: { $nin: notActiveRegex },
        }),

        MedicineOrder.countDocuments({
          status: { $in: statusIn(medicineProcessingStatuses) },
        }),

        MedicineOrder.countDocuments({
          status: { $in: statusIn(["delivered", "completed"]) },
        }),
      ]);

    return res.status(200).json({
      success: true,

      stats: {
        totalPatients,
        activePatients,
        pendingPatients,

        totalDrivers,
        activeDrivers,

        totalRiders,
        activeRiders,

        totalPharmacies,
        pharmacies: totalPharmacies,
        activePharmacies,
      },

      requests: {
        ambulance: {
          active: ambulanceActive,
          inProgress: ambulanceInProgress,
          pending: ambulancePending,
        },

        bike: {
          active: bikeActive,
          inProgress: bikeInProgress,
          pending: bikePending,
        },

        pharmacy: {
          active: medicineActive,
          processing: medicineProcessing,
          delivered: medicineDelivered,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);

    return res.status(500).json({
      success: false,
      message: "Data fetch karne mein masla hua",
    });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const { id, name, phone } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Admin ID is required.",
      });
    }

    if (id === "admin_root") {
      return res.status(200).json({
        message: "Profile updated successfully!",
        user: {
          id: "admin_root",
          name: name,
          email: "a.haseeb3127@gmail.com",
          phone: phone,
        },
      });
    }

    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    if (name) admin.fullName = name;
    if (phone) admin.phone = phone;

    await admin.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: admin._id,
        name: admin.fullName,
        email: admin.email,
        phone: admin.phone,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);

    return res.status(500).json({
      message: "Server error while updating profile.",
    });
  }
};

const changeAdminPassword = async (req, res) => {
  try {
    const { id, currentPassword, newPassword } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Admin ID is required.",
      });
    }

    if (id === "admin_root") {
      const DEFAULT_PASS = "57790381";

      if (currentPassword !== DEFAULT_PASS) {
        return res.status(400).json({
          message: "Current password is incorrect.",
        });
      }

      return res.status(200).json({
        message: "Password changed successfully!",
      });
    }

    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    admin.passwordHash = await bcrypt.hash(newPassword, salt);

    await admin.save();

    return res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change Password Error:", error);

    return res.status(500).json({
      message: "Server error while changing password.",
    });
  }
};

const calcAgeFromDOB = (dob) => {
  if (!dob) return null;

  const d = new Date(dob);

  if (Number.isNaN(d.getTime())) return null;

  const today = new Date();

  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }

  return age;
};

const normalizePatient = async (p) => {
  const obj = p?.toObject ? p.toObject({ virtuals: true }) : p;

  const patientObjectId = obj?._id;
  const patientIdText = String(obj?.patientId || obj?._id || "").trim();
  const patientNameText = String(obj?.name || obj?.fullName || "").trim();
  const patientPhoneText = String(obj?.phone || obj?.phoneNumber || "").trim();

  const dobISO = obj?.dateOfBirth
    ? new Date(obj.dateOfBirth).toISOString().slice(0, 10)
    : "";

  const age =
    obj?.age !== undefined && obj?.age !== null
      ? obj.age
      : calcAgeFromDOB(obj?.dateOfBirth);

  const money = (value) => {
    const n = Number(value || 0);

    if (!Number.isFinite(n) || n <= 0) return "Pending";

    return `Rs. ${n.toLocaleString("en-PK")}`;
  };

  const cleanAddress = (loc, fallback = "N/A") => {
    if (!loc) return fallback;
    if (typeof loc === "string") return loc || fallback;

    return loc.address || loc.name || fallback;
  };

  const joinOrderItems = (order) => {
    const items = [];

    if (Array.isArray(order?.medicineItems)) {
      order.medicineItems.forEach((x) => {
        if (typeof x === "string") items.push(x);
        else if (x?.name) items.push(x.name);
      });
    }

    if (Array.isArray(order?.equipmentItems)) {
      order.equipmentItems.forEach((x) => {
        if (typeof x === "string") items.push(x);
        else if (x?.name) items.push(x.name);
      });
    }

    if (Array.isArray(order?.items)) {
      order.items.forEach((x) => {
        if (typeof x === "string") items.push(x);
        else if (x?.name) items.push(x.name);
      });
    }

    return items.filter(Boolean).join(", ") || "Medicine / Equipment";
  };

  const patientMatch = [
    { patient: patientObjectId },
    { patientId: patientObjectId },
    { customerId: patientObjectId },
  ];

  if (patientIdText) {
    patientMatch.push({ patientCode: patientIdText });
    patientMatch.push({ patientId: patientIdText });
  }

  if (patientPhoneText) {
    patientMatch.push({ "patientInfo.phone": patientPhoneText });
    patientMatch.push({ patientPhone: patientPhoneText });
    patientMatch.push({ phone: patientPhoneText });
  }

  if (patientNameText) {
    patientMatch.push({ "patientInfo.name": patientNameText });
    patientMatch.push({ patientName: patientNameText });
    patientMatch.push({ name: patientNameText });
  }

  const [rawAmbulanceHistory, rawBikeHistory, rawOrderHistory] =
    await Promise.all([
      AmbulanceRequest.find({ $or: patientMatch })
        .populate("driver", "fullName name phone ambulanceNumber vehicleNumber")
        .sort({ createdAt: -1, requestedAt: -1 })
        .limit(20),

      BikeRide.find({ $or: patientMatch })
        .populate("rider", "fullName name phone bikeNumber bikeNo")
        .sort({ createdAt: -1, requestedAt: -1 })
        .limit(20),

      MedicineOrder.find({ $or: patientMatch })
        .populate("pharmacy", "pharmacyName name phone address")
        .populate("rider", "fullName name phone bikeNumber bikeNo")
        .sort({ createdAt: -1, requestedAt: -1 })
        .limit(20),
    ]);

  const formattedAmbulanceHistory = rawAmbulanceHistory.map((req) => {
    const r = req?.toObject ? req.toObject({ virtuals: true }) : req;

    return {
      id: String(r?._id || ""),
      code:
        r?.requestCode ||
        r?.orderCode ||
        `AMB-${String(r?._id || "").slice(-4).toUpperCase()}`,
      type: "Ambulance",
      personLabel: "Driver Name",
      personName:
        r?.driver?.fullName ||
        r?.driver?.name ||
        r?.driverInfo?.name ||
        r?.driverName ||
        "Assigning...",
      vehicleLabel: "Ambulance Number",
      vehicleNumber:
        r?.driver?.ambulanceNumber ||
        r?.driver?.vehicleNumber ||
        r?.ambulanceNumber ||
        r?.vehicleNumber ||
        "N/A",
      pickup: cleanAddress(r?.pickupLocation, r?.pickupAddress || "N/A"),
      dropoff:
        cleanAddress(r?.dropoffLocation, "") ||
        r?.selectedHospital?.name ||
        r?.hospitalName ||
        "N/A",
      pickupLocation: cleanAddress(r?.pickupLocation, r?.pickupAddress || "N/A"),
      dropLocation:
        cleanAddress(r?.dropoffLocation, "") ||
        r?.selectedHospital?.name ||
        r?.hospitalName ||
        "N/A",
      amount: money(r?.fareAmount || r?.fare),
      fare: money(r?.fareAmount || r?.fare),
      dateTime: r?.createdAt ? new Date(r.createdAt).toLocaleString() : "N/A",
      status: r?.status || "pending",
      createdAt: r?.createdAt || r?.requestedAt || null,
    };
  });

  const formattedBikeHistory = rawBikeHistory.map((ride) => {
    const r = ride?.toObject ? ride.toObject({ virtuals: true }) : ride;

    return {
      id: String(r?._id || ""),
      code:
        r?.rideCode ||
        r?.orderCode ||
        `BIKE-${String(r?._id || "").slice(-4).toUpperCase()}`,
      type: "Bike",
      personLabel: "Rider Name",
      personName:
        r?.rider?.fullName ||
        r?.rider?.name ||
        r?.riderInfo?.name ||
        "Assigning...",
      vehicleLabel: "Bike Number",
      vehicleNumber:
        r?.rider?.bikeNumber ||
        r?.rider?.bikeNo ||
        r?.riderInfo?.bikeNumber ||
        r?.bikeNumber ||
        "N/A",
      pickup: cleanAddress(r?.pickupLocation, "N/A"),
      dropoff: cleanAddress(r?.dropoffLocation, "N/A"),
      pickupLocation: cleanAddress(r?.pickupLocation, "N/A"),
      dropLocation: cleanAddress(r?.dropoffLocation, "N/A"),
      amount: money(r?.fareAmount || r?.fare),
      fare: money(r?.fareAmount || r?.fare),
      dateTime: r?.createdAt ? new Date(r.createdAt).toLocaleString() : "N/A",
      status: r?.status || "pending",
      createdAt: r?.createdAt || r?.requestedAt || null,
    };
  });

  const travelHistory = [
    ...formattedAmbulanceHistory,
    ...formattedBikeHistory,
  ].sort((a, b) => {
    const da = new Date(a.createdAt || a.dateTime).getTime();
    const db = new Date(b.createdAt || b.dateTime).getTime();

    if (Number.isNaN(da) || Number.isNaN(db)) return 0;

    return db - da;
  });

  const formattedOrderHistory = rawOrderHistory.map((ord) => {
    const o = ord?.toObject ? ord.toObject({ virtuals: true }) : ord;

    return {
      id: String(o?._id || ""),
      code:
        o?.orderCode || `MED-${String(o?._id || "").slice(-4).toUpperCase()}`,
      orderCode:
        o?.orderCode || `MED-${String(o?._id || "").slice(-4).toUpperCase()}`,
      pharmacyName:
        o?.pharmacyInfo?.name ||
        o?.pharmacy?.pharmacyName ||
        o?.pharmacy?.name ||
        "Unknown Pharmacy",
      riderName:
        o?.riderInfo?.name ||
        o?.rider?.fullName ||
        o?.rider?.name ||
        "Assigning...",
      deliveredBy:
        o?.riderInfo?.name ||
        o?.rider?.fullName ||
        o?.rider?.name ||
        "Assigning...",
      riderPhone: o?.riderInfo?.phone || o?.rider?.phone || "N/A",
      items: joinOrderItems(o),
      amount: money(o?.amount || o?.totalAmount),
      paymentStatus: o?.paymentStatus || "unpaid",
      deliveryAddress: cleanAddress(o?.deliveryLocation, "N/A"),
      dateTime: o?.createdAt ? new Date(o.createdAt).toLocaleString() : "N/A",
      status: o?.status || "pharmacy_processing",
      createdAt: o?.createdAt || o?.requestedAt || null,
    };
  });

  return {
    id: String(obj._id),
    patientId: obj.patientId || `PT${String(obj._id).slice(-4).toUpperCase()}`,
    name: obj.name || obj.fullName || "",
    phone: obj.phone || obj.phoneNumber || "",
    email: obj.email || "",
    age: age ?? "",
    dateOfBirth: dobISO,
    cnic: obj.cnic || "N/A",
    address: obj.address || "",
    status: (obj.status || "pending").toLowerCase(),
    joinDate: obj.createdAt
      ? new Date(obj.createdAt).toISOString().slice(0, 10)
      : "",

    emergencyCalls: rawAmbulanceHistory.length,
    bikeRides: rawBikeHistory.length,
    orders: rawOrderHistory.length,

    ambulanceHistory: formattedAmbulanceHistory,
    bikeHistory: formattedBikeHistory,

    travelHistory,
    ambulanceBikeHistory: travelHistory,

    orderHistory: formattedOrderHistory,
  };
};

const getAllPatients = async (req, res) => {
  try {
    const { q = "" } = req.query;
    const search = q.trim();

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { cnic: { $regex: search, $options: "i" } },
      ];
    }

    const patients = await Patient.find(filter).sort({ createdAt: -1 });
    const normalized = await Promise.all(
      patients.map((p) => normalizePatient(p))
    );

    return res.status(200).json({
      patients: normalized,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Patients fetch karne mein masla hua",
    });
  }
};

const updatePatientProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const allowed = [
      "name",
      "fullName",
      "phone",
      "email",
      "cnic",
      "address",
      "age",
    ];

    const $set = {};

    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        $set[k] = req.body[k];
      }
    }

    const updated = await Patient.findByIdAndUpdate(
      id,
      { $set },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Patient not found",
      });
    }

    const normalized = await normalizePatient(updated);

    return res.status(200).json({
      message: "Profile updated",
      patient: normalized,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Update karne mein masla hua",
    });
  }
};

const updatePatientStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    let newStatus = null;

    if (action === "block") newStatus = "blocked";
    else if (action === "activate" || action === "approve") newStatus = "active";
    else {
      return res.status(400).json({
        message: "Invalid action",
      });
    }

    const updated = await Patient.findByIdAndUpdate(
      id,
      { status: newStatus },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Patient not found",
      });
    }

    const normalized = await normalizePatient(updated);

    return res.status(200).json({
      message: `Patient status updated to ${newStatus}`,
      patient: normalized,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Status update fail hua",
    });
  }
};

const normalizeDriver = async (d) => {
  const obj = d?.toObject ? d.toObject({ virtuals: true }) : d;

  const driverObjectId = obj?._id;
  const driverIdText = String(
    obj?.driverId || obj?.driverCode || obj?.code || obj?._id || ""
  ).trim();
  const driverNameText = String(
    obj?.name || obj?.fullName || obj?.driverName || ""
  ).trim();
  const driverPhoneText = String(obj?.phone || obj?.phoneNumber || "").trim();

  const dobISO = obj?.dateOfBirth
    ? new Date(obj.dateOfBirth).toISOString().slice(0, 10)
    : "";

  const age =
    obj?.age !== undefined && obj?.age !== null
      ? obj.age
      : calcAgeFromDOB(obj?.dateOfBirth);

  const money = (value) => {
    const n = Number(value || 0);

    if (!Number.isFinite(n) || n <= 0) return "Pending";

    return `Rs. ${n.toLocaleString("en-PK")}`;
  };

  const cleanAddress = (loc, fallback = "N/A") => {
    if (!loc) return fallback;
    if (typeof loc === "string") return loc || fallback;

    return loc.address || loc.name || fallback;
  };

  const getPatientName = (x) => {
    return (
      x?.patientInfo?.name ||
      x?.patient?.fullName ||
      x?.patient?.name ||
      x?.patientName ||
      "Unknown Patient"
    );
  };

  const getPatientPhone = (x) => {
    return (
      x?.patientInfo?.phone ||
      x?.patient?.phone ||
      x?.patient?.phoneNumber ||
      x?.patientPhone ||
      "N/A"
    );
  };

  const driverMatch = [
    { driver: driverObjectId },
    { driverId: driverObjectId },
    { ambulanceDriver: driverObjectId },
  ];

  if (driverIdText) {
    driverMatch.push({ driverCode: driverIdText });
    driverMatch.push({ driverId: driverIdText });
    driverMatch.push({ "driverInfo.id": driverIdText });
  }

  if (driverPhoneText) {
    driverMatch.push({ "driverInfo.phone": driverPhoneText });
    driverMatch.push({ driverPhone: driverPhoneText });
    driverMatch.push({ phone: driverPhoneText });
  }

  if (driverNameText) {
    driverMatch.push({ "driverInfo.name": driverNameText });
    driverMatch.push({ driverName: driverNameText });
    driverMatch.push({ name: driverNameText });
  }

  const rawRideHistory = await AmbulanceRequest.find({ $or: driverMatch })
    .populate("patient", "fullName name phone phoneNumber")
    .sort({ createdAt: -1, requestedAt: -1 })
    .limit(50);

  const rideHistory = rawRideHistory.map((req) => {
    const r = req?.toObject ? req.toObject({ virtuals: true }) : req;

    const pickup = cleanAddress(r?.pickupLocation, r?.pickupAddress || "N/A");

    const dropoff =
      cleanAddress(r?.dropoffLocation, "") ||
      r?.selectedHospital?.name ||
      r?.hospitalName ||
      r?.dropoffAddress ||
      "N/A";

    const dateObj = r?.createdAt || r?.requestedAt || null;
    const dateTime = dateObj ? new Date(dateObj).toLocaleString() : "N/A";
    const date = dateObj ? new Date(dateObj).toLocaleDateString() : "N/A";
    const time = dateObj
      ? new Date(dateObj).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";

    const distanceValue =
      r?.distanceKm ||
      r?.distance ||
      r?.travelDistance ||
      r?.routeDistance ||
      0;

    return {
      id: String(r?._id || ""),
      code:
        r?.requestCode ||
        r?.orderCode ||
        `AMB-${String(r?._id || "").slice(-4).toUpperCase()}`,
      type: "ambulance",
      title: `Ambulance Ride - #${
        r?.requestCode ||
        r?.orderCode ||
        String(r?._id || "").slice(-8).toUpperCase()
      }`,
      patient: getPatientName(r),
      patientName: getPatientName(r),
      patientPhone: getPatientPhone(r),
      pickup,
      dropoff,
      destination: dropoff,
      pickupLocation: pickup,
      dropLocation: dropoff,
      date,
      time,
      dateTime,
      fare: money(r?.fareAmount || r?.fare || r?.paymentAmount || r?.amount || 0),
      fareRaw: Number(
        r?.fareAmount || r?.fare || r?.paymentAmount || r?.amount || 0
      ),
      distanceKm: Number(distanceValue || 0),
      priority: r?.priority || "standard",
      status: r?.status || "pending",
      createdAt: r?.createdAt || r?.requestedAt || null,
    };
  });

  return {
    id: String(obj._id),
    driverId: obj.driverId || obj.driverCode || obj.code || obj._id,
    name: obj.name || obj.fullName || obj.driverName || "",
    phone: obj.phone || obj.phoneNumber || "",
    status: (obj.status || "pending").toLowerCase(),
    age: age ?? "",
    dateOfBirth: dobISO,
    cnic: obj.cnic || obj.cnicNumber || "",
    cnicImageUrl:
      obj.cnicImageUrl ||
      obj.cnicImage ||
      obj.cnicPhoto ||
      obj.cnicPicture ||
      "",
    address: obj.address || "",
    licenseNumber: obj.licenseNumber || obj.licenseNo || "",
    ambulanceNumber: obj.ambulanceNumber || obj.vehicleNumber || "",
    vehicleType: obj.vehicleType || obj.vehicle || "Ambulance",
    vehicle: obj.vehicleType || obj.vehicle || "Ambulance",
    totalTrips: rideHistory.length,
    totalRides: rideHistory.length,
    joinDate: obj.createdAt
      ? new Date(obj.createdAt).toISOString().slice(0, 10)
      : "",
    rideHistory,
    ambulanceHistory: rideHistory,
  };
};

const getAllDrivers = async (req, res) => {
  try {
    const { q = "" } = req.query;
    const search = q.trim();

    const filter = {};

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { driverId: { $regex: search, $options: "i" } },
        { driverCode: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { ambulanceNumber: { $regex: search, $options: "i" } },
        { vehicleNumber: { $regex: search, $options: "i" } },
      ];
    }

    const drivers = await Driver.find(filter).sort({ createdAt: -1 });
    const normalized = await Promise.all(
      drivers.map((d) => normalizeDriver(d))
    );

    const stats = {
      total: normalized.length,
      active: normalized.filter((x) => x.status === "active").length,
      pending: normalized.filter((x) => x.status === "pending").length,
      blocked: normalized.filter((x) => x.status === "blocked").length,
    };

    return res.status(200).json({
      drivers: normalized,
      stats,
    });
  } catch (error) {
    console.error("getAllDrivers error:", error);

    return res.status(500).json({
      message: "Drivers fetch karne mein masla hua",
    });
  }
};

const getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        message: "Driver not found",
      });
    }

    const normalized = await normalizeDriver(driver);

    return res.status(200).json({
      driver: normalized,
    });
  } catch (error) {
    console.error("getDriverById error:", error);

    return res.status(500).json({
      message: "Driver fetch karne mein masla hua",
    });
  }
};

const updateDriverProfile = async (req, res) => {
  try {
    const allowed = [
      "name",
      "fullName",
      "phone",
      "phoneNumber",
      "cnic",
      "cnicNumber",
      "address",
      "licenseNumber",
      "licenseNo",
      "ambulanceNumber",
      "vehicleNumber",
      "vehicleType",
      "vehicle",
      "dateOfBirth",
      "status",
    ];

    const $set = {};

    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        $set[k] = req.body[k];
      }
    }

    if ($set.dateOfBirth) {
      const d = new Date($set.dateOfBirth);

      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({
          message: "Invalid dateOfBirth.",
        });
      }

      $set.dateOfBirth = d;
    }

    const updated = await Driver.findByIdAndUpdate(
      req.params.id,
      { $set },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Driver not found",
      });
    }

    const normalized = await normalizeDriver(updated);

    return res.status(200).json({
      message: "Driver updated",
      driver: normalized,
    });
  } catch (error) {
    console.error("updateDriverProfile error:", error);

    return res.status(500).json({
      message: "Driver update karne mein masla hua",
    });
  }
};

const updateDriverStatus = async (req, res) => {
  try {
    const { action } = req.body;

    let newStatus = null;
    let approvalStatus = null;

    if (action === "block") {
      newStatus = "blocked";
      approvalStatus = "blocked";
    }

    if (action === "approve") {
      newStatus = "active";
      approvalStatus = "approved";
    }

    if (action === "activate") {
      newStatus = "active";
      approvalStatus = "approved";
    }

    if (!newStatus) {
      return res.status(400).json({
        message: "Invalid action.",
      });
    }

    const updated = await Driver.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: newStatus,
        },
      },
      {
        new: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Driver not found",
      });
    }

    await adminNotificationService.updateRegistrationNotificationStatus({
      targetType: "ambulance_driver",
      targetId: updated._id,
      approvalStatus,
    });

    const normalized = await normalizeDriver(updated);

    return res.status(200).json({
      message: "Status updated",
      driver: normalized,
    });
  } catch (error) {
    console.error("updateDriverStatus error:", error);

    return res.status(500).json({
      message: "Status update karne mein masla hua",
    });
  }
};

const normalizeRider = async (r) => {
  const obj = r?.toObject ? r.toObject({ virtuals: true }) : r;

  const riderObjectId = obj?._id;
  const riderIdText = String(
    obj?.riderId || obj?.riderCode || obj?.code || obj?._id || ""
  ).trim();
  const riderNameText = String(
    obj?.name || obj?.fullName || obj?.riderName || ""
  ).trim();
  const riderPhoneText = String(obj?.phone || obj?.phoneNumber || "").trim();

  const dobISO = obj?.dateOfBirth
    ? new Date(obj.dateOfBirth).toISOString().slice(0, 10)
    : "";

  const age =
    obj?.age !== undefined && obj?.age !== null
      ? obj.age
      : calcAgeFromDOB(obj?.dateOfBirth);

  const money = (value) => {
    const n = Number(value || 0);

    if (!Number.isFinite(n) || n <= 0) return "Rs. 0";

    return `Rs. ${n.toLocaleString("en-PK")}`;
  };

  const cleanAddress = (loc, fallback = "N/A") => {
    if (!loc) return fallback;
    if (typeof loc === "string") return loc || fallback;

    return loc.address || loc.name || fallback;
  };

  const getPatientName = (x) => {
    return (
      x?.patientInfo?.name ||
      x?.patient?.fullName ||
      x?.patient?.name ||
      x?.patientName ||
      "Unknown Patient"
    );
  };

  const riderMatch = [
    { rider: riderObjectId },
    { riderId: riderObjectId },
    { deliveryRider: riderObjectId },
  ];

  if (riderIdText) {
    riderMatch.push({ riderCode: riderIdText });
    riderMatch.push({ riderId: riderIdText });
  }

  if (riderPhoneText) {
    riderMatch.push({ "riderInfo.phone": riderPhoneText });
    riderMatch.push({ riderPhone: riderPhoneText });
    riderMatch.push({ phone: riderPhoneText });
  }

  if (riderNameText) {
    riderMatch.push({ "riderInfo.name": riderNameText });
    riderMatch.push({ riderName: riderNameText });
    riderMatch.push({ name: riderNameText });
  }

  const [rawDeliveryHistory, rawRideHistory] = await Promise.all([
    MedicineOrder.find({ $or: riderMatch })
      .populate("patient", "fullName name phone phoneNumber")
      .populate("pharmacy", "pharmacyName name phone address")
      .sort({ createdAt: -1, requestedAt: -1 })
      .limit(30),

    BikeRide.find({ $or: riderMatch })
      .populate("patient", "fullName name phone phoneNumber")
      .sort({ createdAt: -1, requestedAt: -1 })
      .limit(30),
  ]);

  const deliveryHistory = rawDeliveryHistory.map((order) => {
    const o = order?.toObject ? order.toObject({ virtuals: true }) : order;

    const pharmacyName =
      o?.pharmacyInfo?.name ||
      o?.pharmacy?.pharmacyName ||
      o?.pharmacy?.name ||
      "Unknown Pharmacy";

    const deliveryAddress =
      o?.deliveryLocation?.address || o?.deliveryAddress || "N/A";

    return {
      id: String(o?._id || ""),
      type: "delivery",
      title: `Order Delivery - #${
        o?.orderCode || String(o?._id || "").slice(-8).toUpperCase()
      }`,
      code:
        o?.orderCode ||
        `MED-${String(o?._id || "").slice(-4).toUpperCase()}`,
      patientName: getPatientName(o),
      pickup: pharmacyName,
      destination: deliveryAddress,
      pickupLabel: "Pickup (Pharmacy)",
      destinationLabel: "Destination",
      dateTime: o?.createdAt
        ? new Date(o.createdAt).toLocaleString()
        : o?.requestedAt
        ? new Date(o.requestedAt).toLocaleString()
        : "N/A",
      fare: money(
        o?.deliveryFee ||
          o?.deliveryCharges ||
          o?.riderFee ||
          o?.riderFare ||
          o?.fareAmount ||
          o?.fare ||
          o?.amount ||
          o?.totalAmount ||
          o?.paymentAmount ||
          0
      ),
      amount: money(
        o?.amount ||
          o?.totalAmount ||
          o?.paymentAmount ||
          o?.deliveryFee ||
          o?.deliveryCharges ||
          o?.riderFee ||
          o?.riderFare ||
          o?.fareAmount ||
          o?.fare ||
          0
      ),
      status: o?.status || "pharmacy_processing",
      paymentStatus: o?.paymentStatus || "unpaid",
      createdAt: o?.createdAt || o?.requestedAt || null,
    };
  });

  const rideHistory = rawRideHistory.map((ride) => {
    const b = ride?.toObject ? ride.toObject({ virtuals: true }) : ride;

    return {
      id: String(b?._id || ""),
      type: "ride",
      title: `Bike Ride - #${
        b?.rideCode ||
        b?.orderCode ||
        String(b?._id || "").slice(-8).toUpperCase()
      }`,
      code:
        b?.rideCode ||
        b?.orderCode ||
        `BIKE-${String(b?._id || "").slice(-4).toUpperCase()}`,
      patientName: getPatientName(b),
      pickup: cleanAddress(b?.pickupLocation, b?.pickupAddress || "N/A"),
      destination:
        cleanAddress(b?.dropoffLocation, "") ||
        b?.dropoffAddress ||
        b?.hospitalName ||
        "N/A",
      pickupLabel: "Pickup",
      destinationLabel: "Destination",
      dateTime: b?.createdAt
        ? new Date(b.createdAt).toLocaleString()
        : b?.requestedAt
        ? new Date(b.requestedAt).toLocaleString()
        : "N/A",
      fare: money(b?.fareAmount || b?.fare || b?.totalFare || 0),
      amount: money(b?.fareAmount || b?.fare || b?.totalFare || 0),
      status: b?.status || "pending",
      createdAt: b?.createdAt || b?.requestedAt || null,
    };
  });

  const deliveryRideHistory = [...deliveryHistory, ...rideHistory].sort(
    (a, b) => {
      const da = new Date(a.createdAt || a.dateTime).getTime();
      const db = new Date(b.createdAt || b.dateTime).getTime();

      if (Number.isNaN(da) || Number.isNaN(db)) return 0;

      return db - da;
    }
  );

  return {
    id: String(obj._id),
    riderId: obj.riderId || obj.riderCode || obj.code || obj._id,
    name: obj.name || obj.fullName || obj.riderName || "",
    phone: obj.phone || obj.phoneNumber || "",
    vehicle: obj.vehicle || obj.vehicleType || "Bike",
    status: (obj.status || "pending").toLowerCase(),
    age: age ?? "",
    dateOfBirth: dobISO,
    cnic: obj.cnic || obj.cnicNumber || "",
    cnicImageUrl:
      obj.cnicImageUrl ||
      obj.cnicImage ||
      obj.cnicPhoto ||
      obj.cnicPicture ||
      "",
    address: obj.address || "",
    bikeNumber: obj.bikeNumber || obj.bikeNo || "",
    licenseNumber: obj.licenseNumber || obj.licenseNo || "",
    totalDeliveries: deliveryHistory.length,
    totalRides: rideHistory.length,
    joinDate: obj.createdAt
      ? new Date(obj.createdAt).toISOString().slice(0, 10)
      : "",
    deliveryHistory,
    rideHistory,
    deliveryRideHistory,
  };
};

const getAllRiders = async (req, res) => {
  try {
    const { q = "" } = req.query;
    const search = q.trim();

    const filter = {};

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { riderId: { $regex: search, $options: "i" } },
        { riderCode: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { bikeNumber: { $regex: search, $options: "i" } },
      ];
    }

    const riders = await Rider.find(filter).sort({ createdAt: -1 });
    const normalized = await Promise.all(
      riders.map((r) => normalizeRider(r))
    );

    const stats = {
      total: normalized.length,
      active: normalized.filter((x) => x.status === "active").length,
      pending: normalized.filter((x) => x.status === "pending").length,
      blocked: normalized.filter((x) => x.status === "blocked").length,
    };

    return res.status(200).json({
      riders: normalized,
      stats,
    });
  } catch (error) {
    console.error("getAllRiders error:", error);

    return res.status(500).json({
      message: "Riders fetch karne mein masla hua",
    });
  }
};

const getRiderById = async (req, res) => {
  try {
    const rider = await Rider.findById(req.params.id);

    if (!rider) {
      return res.status(404).json({
        message: "Rider not found",
      });
    }

    const normalized = await normalizeRider(rider);

    return res.status(200).json({
      rider: normalized,
    });
  } catch (error) {
    console.error("getRiderById error:", error);

    return res.status(500).json({
      message: "Rider fetch karne mein masla hua",
    });
  }
};

const updateRiderProfile = async (req, res) => {
  try {
    const allowed = [
      "name",
      "fullName",
      "phone",
      "phoneNumber",
      "cnic",
      "cnicNumber",
      "address",
      "vehicle",
      "vehicleType",
      "bikeNumber",
      "bikeNo",
      "licenseNumber",
      "licenseNo",
      "dateOfBirth",
      "status",
    ];

    const $set = {};

    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        $set[k] = req.body[k];
      }
    }

    if ($set.dateOfBirth) {
      const d = new Date($set.dateOfBirth);

      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({
          message: "Invalid dateOfBirth.",
        });
      }

      $set.dateOfBirth = d;
    }

    const updated = await Rider.findByIdAndUpdate(
      req.params.id,
      { $set },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Rider not found",
      });
    }

    const normalized = await normalizeRider(updated);

    return res.status(200).json({
      message: "Rider updated",
      rider: normalized,
    });
  } catch (error) {
    console.error("updateRiderProfile error:", error);

    return res.status(500).json({
      message: "Rider update karne mein masla hua",
    });
  }
};

const updateRiderStatus = async (req, res) => {
  try {
    const { action } = req.body;

    let newStatus = null;
    let approvalStatus = null;

    if (action === "block") {
      newStatus = "blocked";
      approvalStatus = "blocked";
    }

    if (action === "approve") {
      newStatus = "active";
      approvalStatus = "approved";
    }

    if (action === "activate") {
      newStatus = "active";
      approvalStatus = "approved";
    }

    if (!newStatus) {
      return res.status(400).json({
        message: "Invalid action.",
      });
    }

    const updated = await Rider.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: newStatus,
        },
      },
      {
        new: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Rider not found",
      });
    }

    await adminNotificationService.updateRegistrationNotificationStatus({
      targetType: "bike_rider",
      targetId: updated._id,
      approvalStatus,
    });

    const normalized = await normalizeRider(updated);

    return res.status(200).json({
      message: "Status updated",
      rider: normalized,
    });
  } catch (error) {
    console.error("updateRiderStatus error:", error);

    return res.status(500).json({
      message: "Status update karne mein masla hua",
    });
  }
};

const formatDateForPharmacyOrder = (value) => {
  if (!value) return "-";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString();
};

const formatDateTimeForPharmacyOrder = (value) => {
  if (!value) return "-";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString();
};

const getMinutesBetweenForPharmacyOrder = (start, end) => {
  if (!start || !end) return null;

  const a = new Date(start).getTime();
  const b = new Date(end).getTime();

  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;

  return Math.max(1, Math.round((b - a) / 60000));
};

const makePharmacyOrderItems = (order = {}) => {
  const meds = Array.isArray(order.medicineItems) ? order.medicineItems : [];
  const equipment = Array.isArray(order.equipmentItems)
    ? order.equipmentItems
    : [];
  const items = Array.isArray(order.items) ? order.items : [];

  const all = [...meds, ...equipment, ...items]
    .map((item) => {
      if (typeof item === "string") return item;
      if (item?.name) return item.name;
      if (item?.medicineName) return item.medicineName;
      if (item?.equipmentName) return item.equipmentName;

      return "";
    })
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  return all.length > 0 ? all : ["Medicine order"];
};

const getPharmacyOrderAmount = (order = {}) => {
  const value =
    order.amount ??
    order.totalAmount ??
    order.paymentAmount ??
    order.fareAmount ??
    0;

  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
};

const normalizePharmacyOrderHistoryItem = (order) => {
  const obj = order?.toObject ? order.toObject({ virtuals: true }) : order;

  const deliveryMinutes =
    getMinutesBetweenForPharmacyOrder(
      obj.riderAssignedAt || obj.approvedAt || obj.requestedAt || obj.createdAt,
      obj.deliveredAt || obj.updatedAt
    ) || obj.estimatedDeliveryMinutes;

  return {
    id: String(obj._id || obj.id || ""),
    orderId:
      obj.orderCode ||
      `ORD-${String(obj._id || obj.id || "")
        .slice(-5)
        .toUpperCase()}`,
    orderCode: obj.orderCode || "",
    patientName:
      obj.patientInfo?.name ||
      obj.patient?.fullName ||
      obj.patient?.name ||
      obj.patientName ||
      "Unknown Patient",
    patientPhone:
      obj.patientInfo?.phone ||
      obj.patient?.phone ||
      obj.patient?.phoneNumber ||
      obj.patientPhone ||
      "",
    riderName:
      obj.riderInfo?.name ||
      obj.rider?.fullName ||
      obj.rider?.name ||
      obj.riderName ||
      "Assigning...",
    riderPhone: obj.riderInfo?.phone || obj.rider?.phone || obj.riderPhone || "",
    bikeNumber:
      obj.riderInfo?.bikeNumber ||
      obj.rider?.bikeNumber ||
      obj.rider?.bikeNo ||
      obj.bikeNumber ||
      "",
    orderDate: formatDateForPharmacyOrder(obj.requestedAt || obj.createdAt),
    orderDateTime: formatDateTimeForPharmacyOrder(
      obj.requestedAt || obj.createdAt
    ),
    deliveryTime: deliveryMinutes ? `${deliveryMinutes} mins` : "N/A",
    items: makePharmacyOrderItems(obj),
    medicineItems: Array.isArray(obj.medicineItems) ? obj.medicineItems : [],
    equipmentItems: Array.isArray(obj.equipmentItems) ? obj.equipmentItems : [],
    totalAmount: getPharmacyOrderAmount(obj),
    status: obj.status || "pharmacy_processing",
    paymentStatus: obj.paymentStatus || "unpaid",
    deliveryAddress: obj.deliveryLocation?.address || obj.deliveryAddress || "N/A",
    createdAt: obj.createdAt || obj.requestedAt || null,
  };
};

const normalizePharmacy = async (p) => {
  const obj = p?.toObject ? p.toObject({ virtuals: true }) : p;

  const rawOrders = await MedicineOrder.find({
    $or: [
      { pharmacy: obj._id },
      { pharmacyId: obj._id },
      { "pharmacyInfo.id": String(obj._id) },
      { "pharmacyInfo._id": String(obj._id) },
      { "pharmacyInfo.name": obj.pharmacyName || obj.name || "" },
    ],
  })
    .populate("patient", "fullName name phone phoneNumber")
    .populate("rider", "fullName name phone bikeNumber bikeNo")
    .sort({ requestedAt: -1, createdAt: -1 })
    .lean();

  const orderHistory = rawOrders.map(normalizePharmacyOrderHistoryItem);

  const completedOrders = orderHistory.filter((o) =>
    ["delivered", "completed"].includes(String(o.status || "").toLowerCase())
  );

  const totalRevenue = orderHistory
    .filter((o) => String(o.paymentStatus || "").toLowerCase() === "paid")
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  return {
    id: String(obj._id),
    pharmacyId: obj.pharmacyId || obj._id,
    name: obj.pharmacyName || obj.name || "",
    location: obj.address || "",
    status: (obj.status || "pending").toLowerCase(),
    licenseNumber: obj.licenseNumber || "",
    operatingHours: obj.operatingHours || "24/7",
    phone: obj.phone || "",
    email: obj.email || "",
    address: obj.address || "",
    ordersCount: orderHistory.length,
    completedOrdersCount: completedOrders.length,
    totalRevenue,
    orderHistory,
    joinDate: obj.createdAt
      ? new Date(obj.createdAt).toISOString().slice(0, 10)
      : "",
    verification: {
      adminApproval: obj?.verification?.adminApproval || "pending",
      licenseStatus: obj?.verification?.licenseStatus || "pending",
      ersNetworkStatus:
        obj?.verification?.ersNetworkStatus || "disconnected",
    },
  };
};

const getAllPharmacies = async (req, res) => {
  try {
    const { q = "" } = req.query;
    const search = q.trim();

    const filter = {};

    if (search) {
      filter.$or = [
        { pharmacyName: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { pharmacyId: { $regex: search, $options: "i" } },
        { licenseNumber: { $regex: search, $options: "i" } },
      ];
    }

    const pharmacies = await Pharmacy.find(filter).sort({ createdAt: -1 });
    const normalized = await Promise.all(
      pharmacies.map((p) => normalizePharmacy(p))
    );

    const stats = {
      total: normalized.length,
      active: normalized.filter((x) => x.status === "active").length,
      pending: normalized.filter((x) => x.status === "pending").length,
      blocked: normalized.filter((x) => x.status === "blocked").length,
    };

    return res.status(200).json({
      pharmacies: normalized,
      stats,
    });
  } catch (error) {
    console.error("getAllPharmacies error:", error);

    return res.status(500).json({
      message: "Pharmacies fetch karne mein masla hua",
    });
  }
};

const getPharmacyById = async (req, res) => {
  try {
    const p = await Pharmacy.findById(req.params.id);

    if (!p) {
      return res.status(404).json({
        message: "Pharmacy not found",
      });
    }

    return res.status(200).json({
      pharmacy: await normalizePharmacy(p),
    });
  } catch (error) {
    console.error("getPharmacyById error:", error);

    return res.status(500).json({
      message: "Pharmacy fetch karne mein masla hua",
    });
  }
};

const updatePharmacyProfile = async (req, res) => {
  try {
    const allowed = [
      "pharmacyName",
      "name",
      "phone",
      "email",
      "licenseNumber",
      "operatingHours",
      "address",
    ];

    const $set = {};

    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        $set[k] = req.body[k];
      }
    }

    if ($set.name && !$set.pharmacyName) {
      $set.pharmacyName = $set.name;
      delete $set.name;
    }

    const updated = await Pharmacy.findByIdAndUpdate(
      req.params.id,
      { $set },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Pharmacy not found",
      });
    }

    return res.status(200).json({
      message: "Pharmacy updated",
      pharmacy: await normalizePharmacy(updated),
    });
  } catch (error) {
    console.error("updatePharmacyProfile error:", error);

    return res.status(500).json({
      message: "Pharmacy update karne mein masla hua",
    });
  }
};

const updatePharmacyStatus = async (req, res) => {
  try {
    const { action } = req.body;

    let status = null;
    let adminApproval = null;
    let licenseStatus = null;
    let ersNetworkStatus = null;

    if (action === "approve" || action === "activate") {
      status = "active";
      adminApproval = "approved";
      licenseStatus = "verified";
      ersNetworkStatus = "connected";
    } else if (action === "block") {
      status = "blocked";
      adminApproval = "rejected";
      licenseStatus = "rejected";
      ersNetworkStatus = "disconnected";
    }

    if (!status) {
      return res.status(400).json({
        message: "Invalid action.",
      });
    }

    const updated = await Pharmacy.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          "verification.adminApproval": adminApproval,
          "verification.licenseStatus": licenseStatus,
          "verification.ersNetworkStatus": ersNetworkStatus,
          "verification.lastReviewAt": new Date(),
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Pharmacy not found",
      });
    }

    return res.status(200).json({
      message: "Status updated",
      pharmacy: await normalizePharmacy(updated),
    });
  } catch (error) {
    console.error("updatePharmacyStatus error:", error);

    return res.status(500).json({
      message: "Status update karne mein masla hua",
    });
  }
};

const safeText = (value, fallback = "N/A") => {
  const text = String(value || "").trim();

  return text || fallback;
};

const formatMoneyAdmin = (value) => {
  const n = Number(value || 0);

  if (!Number.isFinite(n) || n <= 0) return "Rs. 0";

  return `Rs. ${n.toLocaleString("en-PK")}`;
};

const joinItemsAdmin = (...lists) => {
  const items = lists
    .flat()
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  return items.length ? items.join(", ") : "-";
};

const normalizeMedicineOrderForAdmin = (order) => {
  const obj = order?.toObject ? order.toObject({ virtuals: true }) : order;

  const patientName =
    obj?.patientInfo?.name ||
    obj?.patient?.fullName ||
    obj?.patient?.name ||
    "Unknown Patient";

  const patientPhone =
    obj?.patientInfo?.phone ||
    obj?.patient?.phone ||
    obj?.patient?.phoneNumber ||
    "N/A";

  const pharmacyName =
    obj?.pharmacyInfo?.name ||
    obj?.pharmacy?.pharmacyName ||
    obj?.pharmacy?.name ||
    "Not assigned";

  const pharmacyPhone = obj?.pharmacyInfo?.phone || obj?.pharmacy?.phone || "N/A";

  const riderName =
    obj?.riderInfo?.name ||
    obj?.rider?.fullName ||
    obj?.rider?.name ||
    "Not assigned";

  const riderPhone = obj?.riderInfo?.phone || obj?.rider?.phone || "N/A";

  const bikeNumber =
    obj?.riderInfo?.bikeNumber ||
    obj?.rider?.bikeNumber ||
    obj?.rider?.bikeNo ||
    "N/A";

  const medicinesText = joinItemsAdmin(obj?.medicineItems || []);
  const equipmentText = joinItemsAdmin(obj?.equipmentItems || []);
  const allItems = joinItemsAdmin(
    obj?.medicineItems || [],
    obj?.equipmentItems || []
  );

  return {
    _id: String(obj?._id || obj?.id || ""),
    id:
      obj?.orderCode ||
      `MED-${String(obj?._id || "").slice(-4).toUpperCase()}`,
    type: "medicine",
    patientName,
    patientPhone,
    pharmacyName,
    pharmacyPhone,
    assigneeName: riderName,
    assigneePhone: riderPhone,
    assigneeId: bikeNumber,
    items: allItems,
    medicinesText,
    equipmentText,
    amount: formatMoneyAdmin(obj?.amount),
    amountRaw: Number(obj?.amount || 0),
    deliveryAddress: obj?.deliveryLocation?.address || "N/A",
    status: obj?.status || "pharmacy_processing",
    paymentStatus: obj?.paymentStatus || "unpaid",
    priority: obj?.priority || "regular",
    createdAt: obj?.createdAt || obj?.requestedAt,
    requestedAt: obj?.requestedAt,
    approvedAt: obj?.approvedAt,
    riderAssignedAt: obj?.riderAssignedAt,
    deliveredAt: obj?.deliveredAt,
    cancelledAt: obj?.cancelledAt,
  };
};

const normalizeBikeRideForAdmin = (ride) => {
  const obj = ride?.toObject ? ride.toObject({ virtuals: true }) : ride;

  return {
    _id: String(obj?._id || obj?.id || ""),
    id:
      obj?.rideCode ||
      obj?.orderCode ||
      `BIKE-${String(obj?._id || "").slice(-4).toUpperCase()}`,
    type: "bike",
    patientName:
      obj?.patientInfo?.name ||
      obj?.patient?.fullName ||
      obj?.patient?.name ||
      "Unknown Patient",
    patientPhone: obj?.patientInfo?.phone || obj?.patient?.phone || "N/A",
    assigneeName:
      obj?.riderInfo?.name ||
      obj?.rider?.fullName ||
      obj?.rider?.name ||
      "Not assigned",
    assigneePhone: obj?.riderInfo?.phone || obj?.rider?.phone || "N/A",
    assigneeId:
      obj?.riderInfo?.bikeNumber || obj?.rider?.bikeNumber || "N/A",
    pickupLocation:
      obj?.pickupLocation?.address || obj?.pickupLocation?.name || "N/A",
    dropoffLocation:
      obj?.dropoffLocation?.address || obj?.dropoffLocation?.name || "N/A",
    fare: formatMoneyAdmin(obj?.fareAmount || obj?.fare),
    status: obj?.status || "pending",
    priority: obj?.priority || "standard",
    createdAt: obj?.createdAt || obj?.requestedAt,
  };
};

const normalizeAmbulanceRequestForAdmin = (request) => {
  const obj = request?.toObject ? request.toObject({ virtuals: true }) : request;

  return {
    _id: String(obj?._id || obj?.id || ""),
    id:
      obj?.requestCode ||
      obj?.orderCode ||
      `AMB-${String(obj?._id || "").slice(-4).toUpperCase()}`,
    type: "ambulance",
    patientName:
      obj?.patientInfo?.name ||
      obj?.patient?.fullName ||
      obj?.patientName ||
      "Unknown Patient",
    patientPhone:
      obj?.patientInfo?.phone || obj?.patient?.phone || obj?.patientPhone || "N/A",
    assigneeName:
      obj?.driver?.fullName ||
      obj?.driverInfo?.name ||
      obj?.driverName ||
      "Not assigned",
    assigneePhone: obj?.driver?.phone || obj?.driverInfo?.phone || "N/A",
    assigneeId:
      obj?.driver?.ambulanceNumber ||
      obj?.ambulanceNumber ||
      obj?.vehicleNumber ||
      "N/A",
    pickupLocation: obj?.pickupLocation?.address || obj?.pickupAddress || "N/A",
    dropoffLocation:
      obj?.dropoffLocation?.address ||
      obj?.selectedHospital?.name ||
      obj?.hospitalName ||
      "N/A",
    fare: formatMoneyAdmin(obj?.fareAmount || obj?.fare),
    status: obj?.status || "pending",
    priority: obj?.priority || "standard",
    createdAt: obj?.createdAt || obj?.requestedAt,
  };
};

const getAllOrdersForAdmin = async (req, res) => {
  try {
    const [ambulanceRequests, bikeRides, medicineOrders] = await Promise.all([
      AmbulanceRequest.find({})
        .populate("driver", "fullName name phone ambulanceNumber vehicleNumber")
        .populate("patient", "fullName name phone")
        .sort({ createdAt: -1 })
        .limit(100),

      BikeRide.find({})
        .populate("rider", "fullName name phone bikeNumber bikeNo")
        .populate("patient", "fullName name phone")
        .sort({ createdAt: -1 })
        .limit(100),

      MedicineOrder.find({})
        .populate("patient", "fullName name phone phoneNumber")
        .populate("pharmacy", "pharmacyName name phone address")
        .populate("rider", "fullName name phone bikeNumber bikeNo")
        .sort({ createdAt: -1, requestedAt: -1 })
        .limit(200),
    ]);

    const ambulance = ambulanceRequests.map(normalizeAmbulanceRequestForAdmin);
    const bike = bikeRides.map(normalizeBikeRideForAdmin);
    const medicine = medicineOrders.map(normalizeMedicineOrderForAdmin);

    const activeAmbStatuses = [
      "pending",
      "accepted",
      "on_the_way",
      "arrived",
      "in_progress",
    ];

    const activeBikeStatuses = [
      "pending",
      "accepted",
      "arrived_at_patient",
      "arrived_at_pickup",
      "in_progress",
      "navigating_to_hospital",
      "payment_pending",
    ];

    const activeMedStatuses = [
      "pharmacy_processing",
      "dispatching",
      "delivering",
      "reached_pharmacy",
      "navigating_to_patient",
      "payment_pending",
    ];

    return res.status(200).json({
      success: true,
      orders: [...ambulance, ...bike, ...medicine],
      grouped: {
        ambulance,
        bike,
        medicine,
      },
      metrics: {
        totalAmb: ambulance.length,
        totalBike: bike.length,
        totalMeds: medicine.length,

        activeAmb: ambulance.filter((x) =>
          activeAmbStatuses.includes(String(x.status).toLowerCase())
        ).length,

        activeBike: bike.filter((x) =>
          activeBikeStatuses.includes(String(x.status).toLowerCase())
        ).length,

        activeMeds: medicine.filter((x) =>
          activeMedStatuses.includes(String(x.status).toLowerCase())
        ).length,
      },
    });
  } catch (error) {
    console.error("Admin getAllOrdersForAdmin error:", error);

    return res.status(500).json({
      message: "Admin orders fetch karne mein masla hua",
    });
  }
};

module.exports = {
  loginAdmin,
  getDashboardStats,
  getAllOrdersForAdmin,

  updateAdminProfile,
  changeAdminPassword,

  getAllPatients,
  updatePatientProfile,
  updatePatientStatus,

  getAllDrivers,
  getDriverById,
  updateDriverProfile,
  updateDriverStatus,

  getAllRiders,
  getRiderById,
  updateRiderProfile,
  updateRiderStatus,

  getAllPharmacies,
  getPharmacyById,
  updatePharmacyProfile,
  updatePharmacyStatus,
};