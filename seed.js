require("dotenv").config();

const connectDB = require("./config/db");

const User = require("./models/User");
const Doctor = require("./models/Doctor");
const Appointment = require("./models/Appointment");

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("Clearing existing data...");

    await Appointment.deleteMany({});
    await Doctor.deleteMany({});
    await User.deleteMany({});

    console.log("Creating users...");

    const users = await User.insertMany([
      {
        name: "Sameeksha Gour",
        email: "sameeksha@example.com",
      },
      {
        name: "Rahul Sharma",
        email: "rahul@example.com",
      },
    ]);

    console.log("Creating doctors...");

    const doctors = await Doctor.insertMany([
      {
        name: "Dr. Ananya Sharma",
        specialization: "General Medicine",
        availableDays: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
        ],
        startTime: "09:00",
        endTime: "17:00",
      },
      {
        name: "Dr. Rohan Mehta",
        specialization: "Cardiology",
        availableDays: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
        ],
        startTime: "10:00",
        endTime: "16:00",
      },
      {
        name: "Dr. Priya Rao",
        specialization: "Dermatology",
        availableDays: [
          "Monday",
          "Wednesday",
          "Friday",
        ],
        startTime: "11:00",
        endTime: "18:00",
      },
    ]);

    console.log("Creating demo appointment...");

    const appointment = await Appointment.create({
      user: users[0]._id,
      doctor: doctors[0]._id,
      date: "2026-08-20",
      time: "10:00",
      reason: "Regular consultation",
      status: "confirmed",
    });

    console.log("\nDatabase seeded successfully!\n");

    console.log("Demo User ID:");
    console.log(users[0]._id.toString());

    console.log("\nDoctors created:");
    doctors.forEach((doctor) => {
      console.log(
        `${doctor.name} - ${doctor.specialization}`
      );
    });

    console.log("\nDemo Appointment ID:");
    console.log(appointment._id.toString());

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
};

seedDatabase();