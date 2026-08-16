const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");

// ========================================
// 1. GET DOCTORS
// ========================================

const getDoctors = async () => {
  const doctors = await Doctor.find()
    .select(
      "name specialization availableDays startTime endTime"
    )
    .sort({ name: 1 })
    .lean();

  return doctors;
};


// ========================================
// 2. CHECK AVAILABILITY
// ========================================

const checkAvailability = async (
  doctorId,
  date,
  time
) => {
  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    return {
      available: false,
      message: "Doctor not found",
    };
  }

  // Validate date
  const requestedDate = new Date(
    `${date}T00:00:00`
  );

  if (Number.isNaN(requestedDate.getTime())) {
    return {
      available: false,
      message: "Invalid date",
    };
  }

  // Get weekday
  const dayName =
    requestedDate.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
      }
    );

  // Check working day
  if (
    !doctor.availableDays.includes(dayName)
  ) {
    return {
      available: false,
      message: `${doctor.name} is not available on ${dayName}.`,
    };
  }

  // Validate time
  if (
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
  ) {
    return {
      available: false,
      message:
        "Invalid time. Please use HH:MM format.",
    };
  }

  // Check working hours
  if (
    doctor.startTime &&
    doctor.endTime
  ) {
    if (
      time < doctor.startTime ||
      time > doctor.endTime
    ) {
      return {
        available: false,
        message: `${doctor.name} is available from ${doctor.startTime} to ${doctor.endTime}.`,
      };
    }
  }

  // Check existing appointment
  const existingAppointment =
    await Appointment.findOne({
      doctor: doctorId,
      date: date,
      time: time,
      status: {
        $ne: "cancelled",
      },
    });

  if (existingAppointment) {
    return {
      available: false,
      message: `The ${time} slot is already booked with ${doctor.name}.`,
    };
  }

  return {
    available: true,
    message: "Time slot is available",
  };
};


// ========================================
// 3. BOOK APPOINTMENT
// ========================================

const bookAppointment = async (
  userId,
  doctorId,
  date,
  time,
  reason
) => {
  const doctor =
    await Doctor.findById(doctorId);

  if (!doctor) {
    return {
      success: false,
      message: "Doctor not found",
    };
  }

  const availability =
    await checkAvailability(
      doctorId,
      date,
      time
    );

  if (!availability.available) {
    return {
      success: false,
      message: availability.message,
    };
  }

  const appointment =
    await Appointment.create({
      user: userId,
      doctor: doctorId,
      date: date,
      time: time,
      reason: reason || "",
      status: "confirmed",
    });

  const result =
    await Appointment.findById(
      appointment._id
    )
      .populate(
        "user",
        "name email"
      )
      .populate(
        "doctor",
        "name specialization"
      )
      .lean();

  return {
    success: true,
    message:
      "Appointment booked successfully",
    appointment: result,
  };
};


// ========================================
// 4. GET MY APPOINTMENTS
// ========================================

const getMyAppointments = async (
  userId
) => {
  const appointments =
    await Appointment.find({
      user: userId,
    })
      .populate(
        "doctor",
        "name specialization"
      )
      .sort({
        date: 1,
        time: 1,
      })
      .lean();

  return appointments;
};


// ========================================
// 5. RESCHEDULE APPOINTMENT
// ========================================

const rescheduleAppointment =
  async (
    userId,
    appointmentId,
    date,
    time
  ) => {
    const appointment =
      await Appointment.findOne({
        _id: appointmentId,
        user: userId,
      });

    if (!appointment) {
      return {
        success: false,
        message: "Appointment not found",
      };
    }

    if (
      appointment.status ===
      "cancelled"
    ) {
      return {
        success: false,
        message:
          "Cancelled appointment cannot be rescheduled",
      };
    }

    const doctor =
      await Doctor.findById(
        appointment.doctor
      );

    if (!doctor) {
      return {
        success: false,
        message: "Doctor not found",
      };
    }

    const availability =
      await checkAvailability(
        appointment.doctor,
        date,
        time
      );

    if (!availability.available) {
      return {
        success: false,
        message: availability.message,
      };
    }

    appointment.date = date;
    appointment.time = time;

    await appointment.save();

    const updatedAppointment =
      await Appointment.findById(
        appointment._id
      )
        .populate(
          "user",
          "name email"
        )
        .populate(
          "doctor",
          "name specialization"
        )
        .lean();

    return {
      success: true,
      message:
        "Appointment rescheduled successfully",
      appointment:
        updatedAppointment,
    };
  };


// ========================================
// 6. CANCEL APPOINTMENT
// ========================================

const cancelAppointment = async (
  userId,
  appointmentId
) => {
  const appointment =
    await Appointment.findOne({
      _id: appointmentId,
      user: userId,
    });

  if (!appointment) {
    return {
      success: false,
      message: "Appointment not found",
    };
  }

  if (
    appointment.status ===
    "cancelled"
  ) {
    return {
      success: false,
      message:
        "Appointment is already cancelled",
    };
  }

  appointment.status = "cancelled";

  await appointment.save();

  const cancelledAppointment =
    await Appointment.findById(
      appointment._id
    )
      .populate(
        "user",
        "name email"
      )
      .populate(
        "doctor",
        "name specialization"
      )
      .lean();

  return {
    success: true,
    message:
      "Appointment cancelled successfully",
    appointment:
      cancelledAppointment,
  };
};


// ========================================
// EXPORT ALL AI TOOLS
// ========================================

module.exports = {
  getDoctors,
  checkAvailability,
  bookAppointment,
  getMyAppointments,
  rescheduleAppointment,
  cancelAppointment,
};