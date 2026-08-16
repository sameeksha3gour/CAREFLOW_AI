const express = require("express");

const Doctor = require("../models/Doctor");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({
      name: 1,
    });

    res.status(200).json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    console.error("Error fetching doctors:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch doctors",
    });
  }
});

module.exports = router;