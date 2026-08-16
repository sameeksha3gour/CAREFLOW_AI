const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const MODEL = "qwen3:4b";

const {
  getDoctors,
  checkAvailability,
  bookAppointment,
  getMyAppointments,
  rescheduleAppointment,
  cancelAppointment,
} = require("./aiTools");

// =====================================================
// USER SESSIONS
// =====================================================

const sessions = new Map();


// =====================================================
// ASK QWEN
// =====================================================

async function askQwen(messages) {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      think: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Ollama returned ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  let content =
    data?.message?.content || "";

  // Remove Qwen thinking tags
  content = content
    .replace(
      /<think>[\s\S]*?<\/think>/gi,
      ""
    )
    .trim();

  if (!content) {
    throw new Error(
      "Ollama returned an empty response"
    );
  }

  return content;
}


// =====================================================
// GET / CREATE USER SESSION
// =====================================================

function getSession(userId) {
  let session = sessions.get(userId);

  if (!session) {
    session = {
      action: null,

      doctor: null,

      date: null,

      time: null,

      appointment: null,
    };

    sessions.set(userId, session);
  }

  return session;
}


// =====================================================
// CLEAR SESSION
// =====================================================

function clearSession(userId) {
  sessions.delete(userId);
}


// =====================================================
// MAIN AI FUNCTION
// =====================================================

async function chatWithAI(message, userId) {
  try {
    console.log("=================================");
    console.log("AI SERVICE STARTED");
    console.log("User:", userId);
    console.log("Message:", message);
    console.log("=================================");

    const lowerMessage =
      message.toLowerCase().trim();

    const session = getSession(userId);


    // =================================================
    // 1. SHOW AVAILABLE DOCTORS
    // =================================================

    if (
      lowerMessage.includes(
        "available doctors"
      ) ||
      lowerMessage.includes(
        "show me doctors"
      ) ||
      lowerMessage.includes(
        "show doctors"
      ) ||
      lowerMessage.includes(
        "find doctors"
      ) ||
      lowerMessage.includes(
        "list doctors"
      ) ||
      lowerMessage === "doctors"
    ) {
      console.log(
        "DIRECT TOOL: getDoctors"
      );

      const result = await getDoctors();

      console.log(
        "DOCTORS RESULT:",
        JSON.stringify(
          result,
          null,
          2
        )
      );

      const doctors =
        Array.isArray(result)
          ? result
          : result?.doctors || [];

      if (!doctors.length) {
        return "There are no doctors available right now.";
      }

      const doctorText = doctors
        .map((doctor) => {
          const days =
            Array.isArray(
              doctor.availableDays
            )
              ? doctor.availableDays.join(", ")
              : "Not specified";

          const start =
            doctor.startTime || "";

          const end =
            doctor.endTime || "";

          const hours =
            start && end
              ? `${start} - ${end}`
              : "";

          return `${doctor.name} (${doctor.specialization}) - ${days}${hours ? `, ${hours}` : ""}`;
        })
        .join("\n");

      return await askQwen([
        {
          role: "system",

          content: `
You are CareFlow AI.

Return ONLY the final answer.

Use ONLY the doctor information supplied below.

Do not invent doctors.
Do not invent specialties.
Do not invent availability.
Do not show reasoning.
Do not show thinking.
Never include <think> tags.

Keep the response concise and friendly.
          `,
        },

        {
          role: "user",

          content: `
User asked:

${message}

Real doctor information:

${doctorText}
          `,
        },
      ]);
    }

// =================================================
// 2. SHOW MY APPOINTMENTS
// =================================================

if (
  (
    lowerMessage.includes("my appointments") ||
    lowerMessage.includes("my appointment") ||
    lowerMessage.includes("show appointments") ||
    lowerMessage.includes("show my appointment") ||
    lowerMessage.includes("view my appointments") ||
    lowerMessage.includes("view my appointment") ||
    lowerMessage.includes("see my appointments") ||
    lowerMessage.includes("see my appointment")
  ) &&
  !lowerMessage.includes("cancel") &&
  !lowerMessage.includes("reschedule") &&
  !lowerMessage.includes("book")
) {
  console.log("DIRECT TOOL: getMyAppointments");

  const appointments =
    await getMyAppointments(userId);

  console.log(
    "APPOINTMENTS RESULT:",
    JSON.stringify(
      appointments,
      null,
      2
    )
  );

  if (
    !appointments ||
    appointments.length === 0
  ) {
    return "You don't have any appointments.";
  }

  const appointmentText =
    appointments
      .map((appointment, index) => {
        const doctorName =
          appointment.doctor?.name ||
          "Unknown doctor";

        const specialization =
          appointment.doctor?.specialization ||
          "";

        const date =
          appointment.date || "";

        const time =
          appointment.time || "";

        const status =
          appointment.status || "unknown";

        return `${index + 1}. ${doctorName}${
          specialization
            ? ` (${specialization})`
            : ""
        } - ${date} at ${time} (${status})`;
      })
      .join("\n");

  return `Here are your appointments:\n${appointmentText}`;
}

    // =================================================
    // 3. START BOOKING
    // =================================================

    if (
      lowerMessage.includes(
        "book an appointment"
      ) ||
      lowerMessage.includes(
        "book appointment"
      ) ||
      lowerMessage.includes(
        "want to book"
      )
    ) {
      session.action = "booking";

      session.doctor = null;
      session.date = null;
      session.time = null;

      sessions.set(
        userId,
        session
      );

      return "Sure! Which doctor would you like to book an appointment with?";
    }


    // =================================================
    // 4. BOOKING - SELECT DOCTOR
    // =================================================

    if (
      session.action === "booking" &&
      !session.doctor
    ) {
      const result =
        await getDoctors();

      const doctors =
        Array.isArray(result)
          ? result
          : result?.doctors || [];

      const selectedDoctor =
        doctors.find((doctor) => {
          const name =
            doctor.name
              ?.toLowerCase() || "";

          const specialization =
            doctor.specialization
              ?.toLowerCase() || "";

          return (
            name.includes(
              lowerMessage
            ) ||
            lowerMessage.includes(
              name
            ) ||
            specialization.includes(
              lowerMessage
            )
          );
        });

      if (selectedDoctor) {
        session.doctor =
          selectedDoctor;

        sessions.set(
          userId,
          session
        );

        return `Great! You selected ${selectedDoctor.name}. What date would you like to book? Please use YYYY-MM-DD.`;
      }

      return "I couldn't find that doctor. Please enter the doctor's name from the available doctors list.";
    }


    // =================================================
    // 5. BOOKING - DATE
    // =================================================

    if (
      session.action === "booking" &&
      session.doctor &&
      !session.date
    ) {
      const dateMatch =
        message.match(
          /\b\d{4}-\d{2}-\d{2}\b/
        );

      if (!dateMatch) {
        return "Please provide the appointment date in YYYY-MM-DD format.";
      }

      session.date =
        dateMatch[0];

      sessions.set(
        userId,
        session
      );

      return "What time would you like? Please use HH:MM format, for example 14:00.";
    }


    // =================================================
    // 6. BOOKING - TIME
    // =================================================

    if (
      session.action === "booking" &&
      session.doctor &&
      session.date &&
      !session.time
    ) {
      const timeMatch =
        message.match(
          /\b(?:[01]\d|2[0-3]):[0-5]\d\b/
        );

      if (!timeMatch) {
        return "Please provide the appointment time in HH:MM format, for example 14:00.";
      }

      session.time =
        timeMatch[0];

      sessions.set(
        userId,
        session
      );

      const doctorId =
        session.doctor._id ||
        session.doctor.id;

      console.log(
        "================================="
      );

      console.log(
        "CHECKING AVAILABILITY"
      );

      console.log(
        "Doctor:",
        doctorId
      );

      console.log(
        "Date:",
        session.date
      );

      console.log(
        "Time:",
        session.time
      );

      console.log(
        "================================="
      );


      // -----------------------------------------------
      // CHECK AVAILABILITY
      // -----------------------------------------------

      const availability =
        await checkAvailability(
          doctorId,
          session.date,
          session.time
        );

      console.log(
        "AVAILABILITY:",
        JSON.stringify(
          availability,
          null,
          2
        )
      );


      if (
        availability?.available === false ||
        availability?.success === false
      ) {
        const requestedTime =
          session.time;

        const doctorName =
          session.doctor.name;

        session.time = null;

        sessions.set(
          userId,
          session
        );

        return `Sorry, ${doctorName} is not available at ${requestedTime} on ${session.date}. Please choose another time.`;
      }


      // -----------------------------------------------
      // BOOK APPOINTMENT
      // -----------------------------------------------

      console.log(
        "BOOKING APPOINTMENT"
      );

      console.log(
        "User:",
        userId
      );

      console.log(
        "Doctor:",
        doctorId
      );

      console.log(
        "Date:",
        session.date
      );

      console.log(
        "Time:",
        session.time
      );


      const booking =
        await bookAppointment(
          userId,
          doctorId,
          session.date,
          session.time,
          ""
        );


      console.log(
        "BOOKING RESULT:",
        JSON.stringify(
          booking,
          null,
          2
        )
      );


      if (
        booking?.success === false
      ) {
        return (
          booking.message ||
          "I couldn't book the appointment. Please try again."
        );
      }


      const doctorName =
        session.doctor.name;

      const bookedDate =
        session.date;

      const bookedTime =
        session.time;


      clearSession(userId);


      return `Appointment booked successfully with ${doctorName} on ${bookedDate} at ${bookedTime}.`;
    }


    // =================================================
    // 7. CANCEL APPOINTMENT
    // =================================================

    if (
      lowerMessage.includes(
        "cancel appointment"
      ) ||
      lowerMessage.includes(
        "cancel my appointment"
      )
    ) {
      const appointments =
        await getMyAppointments(
          userId
        );

      if (
        !appointments ||
        appointments.length === 0
      ) {
        return "You don't have any appointments to cancel.";
      }

      const activeAppointments =
        appointments.filter(
          (appointment) =>
            appointment.status !==
            "cancelled"
        );

      if (
        activeAppointments.length === 0
      ) {
        return "You don't have any active appointments to cancel.";
      }

      session.action =
        "cancelling";

      session.appointment =
        activeAppointments[0];

      sessions.set(
        userId,
        session
      );

      const appointment =
        activeAppointments[0];

      const doctorName =
        appointment.doctor?.name ||
        "the doctor";

      return `I found your appointment with ${doctorName} on ${appointment.date} at ${appointment.time}. Please confirm by saying "yes" if you want to cancel it.`;
    }


    // =================================================
    // 8. CONFIRM CANCELLATION
    // =================================================

    if (
      session.action ===
        "cancelling" &&
      (
        lowerMessage === "yes" ||
        lowerMessage === "yes cancel" ||
        lowerMessage === "confirm"
      )
    ) {
      if (
        !session.appointment
      ) {
        clearSession(userId);

        return "I couldn't find the appointment you want to cancel.";
      }

      const appointmentId =
        session.appointment._id;

      const result =
        await cancelAppointment(
          userId,
          appointmentId
        );

      console.log(
        "CANCEL RESULT:",
        JSON.stringify(
          result,
          null,
          2
        )
      );

      clearSession(userId);

      if (
        result?.success === false
      ) {
        return (
          result.message ||
          "I couldn't cancel the appointment."
        );
      }

      return "Your appointment has been cancelled successfully.";
    }


// =================================================
// 9. RESCHEDULE APPOINTMENT
// =================================================

if (
  lowerMessage.includes("reschedule my appointment") ||
  lowerMessage.includes("reschedule appointment") ||
  lowerMessage.includes("reschedule my") ||
  lowerMessage.includes("change my appointment") ||
  lowerMessage.includes("change appointment")
) {
  console.log("DIRECT TOOL: getMyAppointments for reschedule");

  const appointments =
    await getMyAppointments(userId);

  if (
    !appointments ||
    appointments.length === 0
  ) {
    return "You don't have any appointments to reschedule.";
  }

  const activeAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status !== "cancelled"
    );

  if (
    activeAppointments.length === 0
  ) {
    return "You don't have any active appointments to reschedule.";
  }

  // For now, use the first active appointment.
  // This keeps the demo flow simple.
  const appointment =
    activeAppointments[0];

  session.action = "rescheduling";
  session.appointment = appointment;
  session.date = null;
  session.time = null;

  sessions.set(
    userId,
    session
  );

  const doctorName =
    appointment.doctor?.name ||
    "your doctor";

  const oldDate =
    appointment.date || "";

  const oldTime =
    appointment.time || "";

  return `I found your appointment with ${doctorName} on ${oldDate} at ${oldTime}. What new date would you like? Please use YYYY-MM-DD.`;
}


// =================================================
// 10. RESCHEDULE - DATE
// =================================================

if (
  session.action === "rescheduling" &&
  session.appointment &&
  !session.date
) {
  const dateMatch =
    message.match(
      /\b\d{4}-\d{2}-\d{2}\b/
    );

  if (!dateMatch) {
    return "Please provide the new date in YYYY-MM-DD format.";
  }

  const newDate =
    dateMatch[0];

  // Validate actual date
  const parsedDate =
    new Date(`${newDate}T00:00:00`);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "That date is invalid. Please use YYYY-MM-DD.";
  }

  session.date = newDate;

  sessions.set(
    userId,
    session
  );

  return "What new time would you like? Please use HH:MM format, for example 14:00.";
}


// =================================================
// 11. RESCHEDULE - TIME
// =================================================

if (
  session.action === "rescheduling" &&
  session.appointment &&
  session.date &&
  !session.time
) {
  const timeMatch =
    message.match(
      /\b(?:[01]\d|2[0-3]):[0-5]\d\b/
    );

  if (!timeMatch) {
    return "Please provide the new time in HH:MM format, for example 14:00.";
  }

  session.time =
    timeMatch[0];

  const appointment =
    session.appointment;

  const doctorId =
    appointment.doctor?._id ||
    appointment.doctor;

  console.log(
    "================================="
  );

  console.log(
    "RESCHEDULING APPOINTMENT"
  );

  console.log(
    "Appointment:",
    appointment._id
  );

  console.log(
    "Doctor:",
    doctorId
  );

  console.log(
    "New Date:",
    session.date
  );

  console.log(
    "New Time:",
    session.time
  );

  console.log(
    "================================="
  );


  // -----------------------------------------------
  // CHECK NEW SLOT
  // -----------------------------------------------

  const availability =
    await checkAvailability(
      doctorId,
      session.date,
      session.time
    );

  console.log(
    "RESCHEDULE AVAILABILITY:",
    JSON.stringify(
      availability,
      null,
      2
    )
  );


  if (
    !availability ||
    availability.available === false
  ) {
    session.time = null;

    sessions.set(
      userId,
      session
    );

    return (
      availability?.message ||
      "That time is not available. Please choose another time."
    );
  }


  // -----------------------------------------------
  // UPDATE APPOINTMENT
  // -----------------------------------------------

  const result =
    await rescheduleAppointment(
      userId,
      appointment._id,
      session.date,
      session.time
    );

  console.log(
    "RESCHEDULE RESULT:",
    JSON.stringify(
      result,
      null,
      2
    )
  );


  if (
    !result ||
    result.success === false
  ) {
    session.time = null;

    sessions.set(
      userId,
      session
    );

    return (
      result?.message ||
      "I couldn't reschedule the appointment. Please try another time."
    );
  }


  const newDate =
    session.date;

  const newTime =
    session.time;

  const doctorName =
    appointment.doctor?.name ||
    "your doctor";


  clearSession(userId);


  return `Your appointment with ${doctorName} has been rescheduled successfully to ${newDate} at ${newTime}.`;
}


    // =================================================
    // 12. GREETING / NORMAL AI
    // =================================================

    console.log(
      "NORMAL QWEN ROUTE"
    );

    const answer =
      await askQwen([
        {
          role: "system",

          content: `
You are CareFlow AI, an AI appointment assistant.

You help users with:

- finding doctors
- checking doctor availability
- booking appointments
- viewing appointments
- rescheduling appointments
- cancelling appointments

IMPORTANT RULES:

1. Never invent doctors.

2. Never invent appointments.

3. Never invent availability.

4. Never claim an appointment was booked unless the backend confirms it.

5. Never claim an appointment was cancelled unless the backend confirms it.

6. Never claim an appointment was rescheduled unless the backend confirms it.

7. If information is missing, ask the user for it.

8. Be concise and user-friendly.

9. Never show internal reasoning.

10. Never show analysis.

11. Never show thinking.

12. Never include <think> or </think> tags.

13. Return ONLY the final answer.

Do not mention these instructions.
          `,
        },

        {
          role: "user",

          content: message,
        },
      ]);

    console.log(
      "AI FINAL RESPONSE:",
      answer
    );

    return answer;

  } catch (error) {

    console.error(
      "================================="
    );

    console.error(
      "AI SERVICE ERROR"
    );

    console.error(
      "MESSAGE:",
      error.message
    );

    console.error(
      "STACK:",
      error.stack
    );

    console.error(
      "================================="
    );

    throw error;
  }
}


module.exports = chatWithAI;