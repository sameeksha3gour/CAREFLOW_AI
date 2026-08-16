const express = require("express");

const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");

const router = express.Router();

/*
========================================
1. CHECK APPOINTMENT AVAILABILITY
GET /api/appointments/availability
========================================
*/

router.get("/availability", async (req, res) => {
  try {
    const { doctorId, date, time } = req.query;

    if (!doctorId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "doctorId, date and time are required",
      });
    }

    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const requestedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    const dayName = requestedDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    if (!doctor.availableDays.includes(dayName)) {
      return res.status(200).json({
        success: true,
        available: false,
        message: `${doctor.name} is not available on ${dayName}`,
      });
    }

    if (
      time < doctor.startTime ||
      time >= doctor.endTime
    ) {
      return res.status(200).json({
        success: true,
        available: false,
        message: `Doctor is available between ${doctor.startTime} and ${doctor.endTime}`,
      });
    }

    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date,
      time,
      status: "confirmed",
    });

    if (existingAppointment) {
      return res.status(200).json({
        success: true,
        available: false,
        message: "This time slot is already booked",
      });
    }

    return res.status(200).json({
      success: true,
      available: true,
      message: "Time slot is available",
    });
  } catch (error) {
    console.error("Availability check failed:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


/*
========================================
2. GET APPOINTMENTS
GET /api/appointments
GET /api/appointments?userId=USER_ID
========================================
*/

router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;

    const filter = {};

    if (userId) {
      filter.user = userId;
    }

    const appointments = await Appointment.find(filter)
      .populate("user", "name email")
      .populate("doctor", "name specialization")
      .sort({
        date: 1,
        time: 1,
      });

    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error(
      "Failed to fetch appointments:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch appointments",
    });
  }
});


/*
========================================
3. CREATE APPOINTMENT
POST /api/appointments
========================================
*/

router.post("/", async (req, res) => {
  try {
    const {
      userId,
      doctorId,
      date,
      time,
      reason,
    } = req.body;

    if (!userId || !doctorId || !date || !time) {
      return res.status(400).json({
        success: false,
        message:
          "userId, doctorId, date and time are required",
      });
    }

    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const existingAppointment =
      await Appointment.findOne({
        doctor: doctorId,
        date,
        time,
        status: "confirmed",
      });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    const appointment = await Appointment.create({
      user: userId,
      doctor: doctorId,
      date,
      time,
      reason: reason || "",
      status: "confirmed",
    });

    const populatedAppointment =
      await Appointment.findById(appointment._id)
        .populate("user", "name email")
        .populate("doctor", "name specialization");

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error(
      "Appointment creation failed:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to create appointment",
    });
  }
});


/*
========================================
4. RESCHEDULE APPOINTMENT
PUT /api/appointments/:id
========================================
*/

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: "date and time are required",
      });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled appointment cannot be rescheduled",
      });
    }

    const doctor = await Doctor.findById(
      appointment.doctor
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const requestedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    const dayName = requestedDate.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
      }
    );

    if (!doctor.availableDays.includes(dayName)) {
      return res.status(400).json({
        success: false,
        message:
          `${doctor.name} is not available on ${dayName}`,
      });
    }

    if (
      time < doctor.startTime ||
      time >= doctor.endTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Doctor is available between ${doctor.startTime} and ${doctor.endTime}`,
      });
    }

    const conflictingAppointment =
      await Appointment.findOne({
        _id: { $ne: id },
        doctor: appointment.doctor,
        date,
        time,
        status: "confirmed",
      });

    if (conflictingAppointment) {
      return res.status(409).json({
        success: false,
        message:
          "The new time slot is already booked",
      });
    }

    appointment.date = date;
    appointment.time = time;

    await appointment.save();

    const updatedAppointment =
      await Appointment.findById(id)
        .populate("user", "name email")
        .populate("doctor", "name specialization");

    res.status(200).json({
      success: true,
      message:
        "Appointment rescheduled successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error(
      "Reschedule failed:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to reschedule appointment",
    });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const appointment =
      await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Appointment is already cancelled",
      });
    }

    appointment.status = "cancelled";

    await appointment.save();

    const cancelledAppointment =
      await Appointment.findById(id)
        .populate("user", "name email")
        .populate("doctor", "name specialization");

    res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      appointment: cancelledAppointment,
    });
  } catch (error) {
    console.error(
      "Cancellation failed:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to cancel appointment",
    });
  }
});

module.exports = router;