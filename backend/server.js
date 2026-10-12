const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const rootDir = path.join(__dirname, "..");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const sessions = new Map();
const travelRecords = [];
const vehicleRecords = [];
const tripHistory = [];
const documentRecords = [];

const users = [
  {
    id: 1,
    fullName: "Aisha Rahman",
    email: "aisha@greenridecampus.edu",
    employeeId: "EMP-1001",
    organisationId: "GRC-01",
    organisationName: "GreenRide Campus",
    department: "Computer Science",
    role: "employee",
    travelMedium: "carpool",
    phone: "+91 9876543210",
    passwordHash: bcrypt.hashSync("GreenRide@123", 10),
    createdAt: new Date().toISOString(),
    vehicle: {
      registrationNumber: "KA04AB1234",
      vehicleType: "car",
      make: "Hyundai",
      model: "Creta",
      year: 2022,
      fuelType: "petrol",
      ownerName: "Aisha Rahman",
      status: "verified"
    },
    documents: {
      rc: { number: "RC-765421", expiry: "2027-06-12", status: "verified" },
      puc: { number: "PUC-4051", expiry: "2026-11-26", status: "expiring-soon" }
    }
  },
  {
    id: 2,
    fullName: "Rohan Mehta",
    email: "admin@greenridecampus.edu",
    employeeId: "ADM-2001",
    organisationId: "GRC-01",
    organisationName: "GreenRide Campus",
    department: "Operations",
    role: "admin",
    travelMedium: "public-transport",
    phone: "+91 9123456780",
    passwordHash: bcrypt.hashSync("GreenRide@123", 10),
    createdAt: new Date().toISOString(),
    vehicle: {
      registrationNumber: "KA05CD9988",
      vehicleType: "scooter",
      make: "TVS",
      model: "Jupiter",
      year: 2020,
      fuelType: "petrol",
      ownerName: "Rohan Mehta",
      status: "verified"
    },
    documents: {
      rc: { number: "RC-981245", expiry: "2028-01-20", status: "verified" },
      puc: { number: "PUC-9980", expiry: "2026-10-29", status: "expiring-soon" }
    }
  }
];

const createBaseStats = () => ({
  totalEmployees: users.filter((user) => user.role === "employee").length,
  totalVehicles: Math.max(users.filter((user) => user.vehicle).length, 18),
  documentsForReview: 5,
  expiringSoon: 7,
  totalDistanceKm: 3285,
  tripsCompleted: 144,
  avgCommuteKm: 26,
  sustainabilityIndex: 82
});

function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ message: "Session expired or missing. Please log in again." });
  }

  const activeUser = users.find((user) => user.id === sessions.get(token));
  if (!activeUser) {
    return res.status(401).json({ message: "Session user does not exist." });
  }

  req.user = activeUser;
  next();
}

function createRouteOptions(origin, destination, travelMode) {
  const baseDistance = {
    walking: 3,
    bicycle: 5,
    "public-transport": 8,
    carpool: 10,
    "personal-vehicle": 12,
    motorcycle: 9
  };

  const modeFactor = baseDistance[travelMode] || 8;
  const distanceKm = Math.max(4, Math.round((Math.abs(origin.length) + Math.abs(destination.length)) / 5 + modeFactor));

  return [
    { label: "Fastest Route", distanceKm: distanceKm, eta: `${Math.max(10, Math.round(distanceKm * 1.8))} min`, recommended: true },
    { label: "Eco Route", distanceKm: Math.max(4, distanceKm + 2), eta: `${Math.max(12, Math.round((distanceKm + 2) * 2.1))} min`, recommended: false },
    { label: "Less Traffic Route", distanceKm: Math.max(5, distanceKm - 1), eta: `${Math.max(16, Math.round((distanceKm - 1) * 2.4))} min`, recommended: false }
  ];
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/register", async (req, res) => {
  const {
    fullName,
    email,
    employeeId,
    organisationName,
    organisationId,
    password,
    confirmPassword,
    travelMedium,
    role
  } = req.body || {};

  if (!fullName || !email || !employeeId || !organisationName || !organisationId || !password || !confirmPassword) {
    return res.status(400).json({ message: "All required registration fields must be provided." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long." });
  }

  if (users.some((user) => user.email.toLowerCase() === String(email).toLowerCase() || user.employeeId.toLowerCase() === String(employeeId).toLowerCase())) {
    return res.status(409).json({ message: "A user with that email or employee ID already exists." });
  }

  const nextId = users.length ? Math.max(...users.map((user) => user.id)) + 1 : 1;
  const newUser = {
    id: nextId,
    fullName,
    email,
    employeeId,
    organisationId,
    organisationName,
    department: "General",
    role: role === "admin" ? "admin" : "employee",
    travelMedium: travelMedium || "carpool",
    phone: "",
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
    vehicle: null,
    documents: {
      rc: { number: "", expiry: "", status: "missing" },
      puc: { number: "", expiry: "", status: "missing" }
    }
  };

  users.push(newUser);
  return res.status(201).json({ message: "Registration successful. Please log in." });
});

app.post("/api/login", async (req, res) => {
  const { loginField, password } = req.body || {};

  if (!loginField || !password) {
    return res.status(400).json({ message: "User ID/email and password are required." });
  }

  const user = users.find((entry) => {
    const loginValue = String(loginField).trim();
    return (
      entry.email.toLowerCase() === loginValue.toLowerCase() ||
      entry.employeeId.toLowerCase() === loginValue.toLowerCase() ||
      entry.organisationId.toLowerCase() === loginValue.toLowerCase()
    );
  });

  if (!user) {
    return res.status(401).json({ message: "We could not find a matching account." });
  }

  const isPasswordValid = await bcrypt.compare(String(password), user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Incorrect password." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, user.id);

  return res.json({
    token,
    user: sanitizeUser(user)
  });
});

app.get("/api/profile", authRequired, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.get("/api/dashboard", authRequired, (req, res) => {
  const stats = createBaseStats();
  const user = req.user;

  if (user.role === "admin") {
    return res.json({
      role: "admin",
      summary: {
        totalEmployees: users.filter((entry) => entry.role === "employee").length + 1,
        totalVehicles: Math.max(vehicleRecords.length, 24),
        expiringSoon: 6,
        totalDistanceKm: 4781,
        sustainabilityIndex: 87
      },
      recentAlerts: [
        { label: "5 vehicles need document review", severity: "warning" },
        { label: "2 expired PUC certificates", severity: "danger" },
        { label: "12 new routes added this week", severity: "success" }
      ],
      stats,
      organisation: user.organisationName,
      userName: user.fullName
    });
  }

  return res.json({
    role: "employee",
    summary: {
      totalDistanceKm: 214,
      tripsCompleted: 18,
      activeVehicle: user.vehicle ? "Verified" : "Pending",
      expiringSoon: 2,
      sustainabilityIndex: 81
    },
    stats,
    userName: user.fullName,
    organisation: user.organisationName,
    recentAlerts: [
      { label: "Your RC is valid for 1 year", severity: "success" },
      { label: "PUC expires in 16 days", severity: "warning" },
      { label: "3 eco trips this week", severity: "success" }
    ]
  });
});

app.post("/api/travel-registration", authRequired, (req, res) => {
  const payload = req.body || {};
  const record = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    fullName: payload.fullName || req.user.fullName,
    employeeId: payload.employeeId || req.user.employeeId,
    organisationId: payload.organisationId || req.user.organisationId,
    department: payload.department || req.user.department,
    preferredTravelMedium: payload.preferredTravelMedium || req.user.travelMedium,
    dailyCommuteDistance: payload.dailyCommuteDistance || "18 km",
    homeLocation: payload.homeLocation || "Hennur",
    destination: payload.destination || "GreenRide Campus",
    usesPersonalVehicle: payload.usesPersonalVehicle === true,
    createdAt: new Date().toISOString()
  };

  travelRecords.push(record);
  return res.status(201).json({ message: "Travel registration saved successfully.", record });
});

app.get("/api/travel-records", authRequired, (req, res) => {
  const records = travelRecords.filter((entry) => entry.userId === req.user.id);
  res.json({ records: records.length ? records : [
    {
      fullName: req.user.fullName,
      employeeId: req.user.employeeId,
      department: req.user.department,
      preferredTravelMedium: req.user.travelMedium,
      dailyCommuteDistance: "18 km",
      homeLocation: "Hennur",
      destination: "GreenRide Campus",
      usesPersonalVehicle: !!req.user.vehicle
    }
  ] });
});

app.post("/api/vehicle", authRequired, (req, res) => {
  const payload = req.body || {};
  const vehicle = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    registrationNumber: payload.registrationNumber || "",
    vehicleType: payload.vehicleType || "car",
    make: payload.make || "",
    model: payload.model || "",
    year: payload.year || new Date().getFullYear(),
    fuelType: payload.fuelType || "petrol",
    ownerName: payload.ownerName || req.user.fullName,
    status: "pending-verification",
    verifiedByOrganisation: false
  };

  req.user.vehicle = vehicle;
  vehicleRecords.push(vehicle);

  return res.status(201).json({ message: "Vehicle details saved successfully.", vehicle });
});

app.get("/api/vehicle", authRequired, (req, res) => {
  const vehicle = req.user.vehicle || {
    registrationNumber: "",
    vehicleType: "car",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    fuelType: "petrol",
    ownerName: req.user.fullName,
    status: "pending"
  };

  res.json({ vehicle });
});

app.get("/api/documents", authRequired, (req, res) => {
  const docs = req.user.documents || {
    rc: { number: "", expiry: "", status: "missing" },
    puc: { number: "", expiry: "", status: "missing" }
  };

  res.json({ documents: docs });
});

app.post("/api/documents", authRequired, (req, res) => {
  const { rcNumber, rcExpiry, pucNumber, pucExpiry } = req.body || {};
  const docs = {
    rc: {
      number: rcNumber || "",
      expiry: rcExpiry || "",
      status: rcExpiry ? "verified" : "missing"
    },
    puc: {
      number: pucNumber || "",
      expiry: pucExpiry || "",
      status: pucExpiry ? "verified" : "missing"
    }
  };

  req.user.documents = docs;
  documentRecords.push({ userId: req.user.id, ...docs, reviewedAt: new Date().toISOString() });

  return res.status(201).json({ message: "Vehicle document tracking updated.", documents: docs });
});

app.post("/api/routes/estimate", authRequired, (req, res) => {
  const { origin, destination, travelMode } = req.body || {};

  if (!origin || !destination) {
    return res.status(400).json({ message: "Origin and destination are required to estimate a route." });
  }

  const options = createRouteOptions(origin, destination, travelMode || "carpool");
  res.json({
    origin,
    destination,
    travelMode: travelMode || "carpool",
    options,
    recommended: options[0]
  });
});

app.post("/api/trips/complete", authRequired, (req, res) => {
  const payload = req.body || {};
  const trip = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    date: payload.date || new Date().toISOString(),
    origin: payload.origin || "Hennur",
    destination: payload.destination || "GreenRide Campus",
    mode: payload.mode || req.user.travelMedium,
    distanceKm: payload.distanceKm || 18,
    duration: payload.duration || "28 min",
    routeLabel: payload.routeLabel || "Fastest Route",
    savedAt: new Date().toISOString()
  };

  tripHistory.push(trip);
  res.status(201).json({ message: "Trip saved successfully.", trip });
});

app.get("/api/trips", authRequired, (req, res) => {
  const trips = tripHistory.filter((entry) => entry.userId === req.user.id);
  res.json({
    trips: trips.length ? trips : [
      {
        date: new Date().toISOString(),
        origin: "Hennur",
        destination: "GreenRide Campus",
        mode: req.user.travelMedium,
        distanceKm: 18,
        duration: "28 min",
        routeLabel: "Fastest Route"
      }
    ]
  });
});

app.get("/api/emissions", authRequired, (req, res) => {
  const trips = tripHistory.filter((entry) => entry.userId === req.user.id) || [];
  const totalDistance = trips.reduce((sum, trip) => sum + Number(trip.distanceKm || 0), 0);

  res.json({
    selectedTravelMode: req.user.travelMedium || "carpool",
    fuelType: req.user.vehicle?.fuelType || "petrol",
    totalDistanceKm: totalDistance || 184,
    tripsTaken: trips.length || 12,
    estimatedCO2: (totalDistance || 184) * 0.18,
    recommendations: [
      "Use carpool or public transit when possible.",
      "Choose the eco route for lower emissions.",
      "Consider walking or cycling for short commutes."
    ]
  });
});

app.use(express.static(rootDir));

app.get("*", (req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(rootDir, "index.html"));
});

app.listen(port, () => {
  console.log(`GreenRide Campus API is serving on http://localhost:${port}`);
});
