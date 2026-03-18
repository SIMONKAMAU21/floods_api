require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/floods";

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB via local instance"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Models
const AlertSchema = new mongoose.Schema({
  title: { type: String, required: true },
  severity: { type: String, enum: ["Low", "Medium", "High"], required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Alert = mongoose.model("Alert", AlertSchema);

const SafeZoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ["hospital", "shelter"], required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
});
const SafeZone = mongoose.model("SafeZone", SafeZoneSchema);

const IncidentSchema = new mongoose.Schema({
  severity: { type: String, enum: ["Low", "Medium", "High"], required: true },
  description: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  reportedAt: { type: Date, default: Date.now },
});
const Incident = mongoose.model("Incident", IncidentSchema);

const EmergencySchema = new mongoose.Schema({
  requestType: {
    type: String,
    enum: ["Rescue", "Medical", "Supplies"],
    required: true,
  },
  details: { type: String },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  status: { type: String, default: "Pending" },
  requestedAt: { type: Date, default: Date.now },
});
const Emergency = mongoose.model("Emergency", EmergencySchema);

// Routes
// 1. Get Active Alerts
app.get("/api/alerts", async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// 2. Get Safe Zones
app.get("/api/safe-zones", async (req, res) => {
  try {
    // Optionally filter by bounds from query params, but returning all for now
    const safeZones = await SafeZone.find();
    res.json(safeZones);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch safe zones" });
  }
});

// 3. Report Incident
app.post("/api/incidents", async (req, res) => {
  try {
    const { severity, description, location } = req.body;
    const incident = new Incident({ severity, description, location });
    await incident.save();

    // Auto-generate an alert if severity is High
    if (severity === "High") {
      await Alert.create({
        title: "Critical Flood Incident Reported",
        severity: "High",
        description,
      });
    }

    res
      .status(201)
      .json({ message: "Incident reported successfully", data: incident });
  } catch (error) {
    res
      .status(400)
      .json({ error: "Failed to report incident", details: error.message });
  }
});

// 4. Send Emergency Request
app.post("/api/emergencies", async (req, res) => {
  try {
    const { requestType, details, location } = req.body;
    const emergency = new Emergency({ requestType, details, location });
    await emergency.save();
    res
      .status(201)
      .json({ message: "Emergency request sent", data: emergency });
  } catch (error) {
    res.status(400).json({
      error: "Failed to send emergency request",
      details: error.message,
    });
  }
});

// Seed Initial Data Endpoint (For Testing purposes)
app.post("/api/seed", async (req, res) => {
  try {
    await Alert.deleteMany();
    await SafeZone.deleteMany();

    await Alert.insertMany([
      {
        title: "Tana River Overflow",
        severity: "High",
        description:
          "Severe flooding reported. Immediate evacuation recommended.",
      },
      {
        title: "Heavy Rainfall Warning",
        severity: "Medium",
        description: "Expect heavy rainfall over the next 48 hours.",
      },
    ]);

    // Using Nairobi approx center for seed data
    const lat = -1.2921;
    const lng = 36.8219;

    await SafeZone.insertMany([
      {
        title: "Red Cross Relief Center",
        description: "Safe Shelter - Blankets & Food",
        type: "shelter",
        location: { lat: lat + 0.005, lng: lng + 0.005 },
      },
      {
        title: "City General Hospital",
        description: "Medical Help Available",
        type: "hospital",
        location: { lat: lat - 0.004, lng: lng + 0.002 },
      },
      {
        title: "High Ground Assembly",
        description: "Evacuation Zone",
        type: "shelter",
        location: { lat: lat + 0.002, lng: lng - 0.006 },
      },
    ]);

    res.json({ message: "Database seeded with default safe zones and alerts" });
  } catch (error) {
    res.status(500).json({ error: "Failed to seed db" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Flood Response Backend running on http://localhost:${PORT}`);
});
