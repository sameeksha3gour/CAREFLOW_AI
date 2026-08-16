import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:5000";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function DoctorCalendar({
  token,
  onBookingReady,
  onClose,
}) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] =
    useState(null);

  const [currentMonth, setCurrentMonth] =
    useState(new Date());

  const [selectedDate, setSelectedDate] =
    useState(null);

  const [selectedTime, setSelectedTime] =
    useState(null);

  const [loadingDoctors, setLoadingDoctors] =
    useState(true);

  const [error, setError] =
    useState("");


  // =====================================================
  // FETCH DOCTORS
  // =====================================================

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true);
        setError("");

        const response = await fetch(
          `${API}/api/doctors`
        );

        const data =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Unable to load doctors."
          );
        }

        setDoctors(
          data.doctors || data.data || []
        );
      } catch (err) {
        console.error(
          "Doctor fetch error:",
          err
        );

        setError(
          "Unable to load doctors."
        );
      } finally {
        setLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, []);


  // =====================================================
  // DOCTOR WORKING DAYS
  // =====================================================

  const workingDays = useMemo(() => {
    if (!selectedDoctor) {
      return [];
    }

    return (
      selectedDoctor.availableDays || []
    ).map((day) =>
      day.toLowerCase()
    );
  }, [selectedDoctor]);


  // =====================================================
  // CHECK IF DATE IS AVAILABLE
  // =====================================================

  const isDoctorAvailableOnDate = (
    date
  ) => {
    if (!selectedDoctor) {
      return false;
    }

    const dayName =
      DAYS[date.getDay()];

    return workingDays.includes(
      dayName.toLowerCase()
    );
  };


  // =====================================================
  // PREVENT PAST DATES
  // =====================================================

  const isPastDate = (date) => {
    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const checkDate =
      new Date(date);

    checkDate.setHours(
      0,
      0,
      0,
      0
    );

    return checkDate < today;
  };


  // =====================================================
  // DATE KEY
  // =====================================================

  const formatDate = (date) => {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };


  // =====================================================
  // FORMAT DISPLAY DATE
  // =====================================================

  const formatDisplayDate = (
    date
  ) => {
    if (!date) {
      return "";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
  };


  // =====================================================
  // GENERATE CALENDAR DAYS
  // =====================================================

  const calendarDays = useMemo(() => {
    const year =
      currentMonth.getFullYear();

    const month =
      currentMonth.getMonth();

    const firstDay =
      new Date(
        year,
        month,
        1
      ).getDay();

    const daysInMonth =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    const days = [];

    // Empty cells before first day
    for (
      let i = 0;
      i < firstDay;
      i++
    ) {
      days.push(null);
    }

    // Actual days
    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      days.push(
        new Date(
          year,
          month,
          day
        )
      );
    }

    return days;
  }, [currentMonth]);


  // =====================================================
  // CHANGE MONTH
  // =====================================================

  const changeMonth = (amount) => {
    setCurrentMonth(
      (previous) =>
        new Date(
          previous.getFullYear(),
          previous.getMonth() +
            amount,
          1
        )
    );

    setSelectedDate(null);
    setSelectedTime(null);
  };


  // =====================================================
  // TIME TO MINUTES
  // =====================================================

  const timeToMinutes = (
    time
  ) => {
    if (!time) {
      return 0;
    }

    const [
      hours,
      minutes,
    ] = time
      .split(":")
      .map(Number);

    return (
      hours * 60 + minutes
    );
  };


  // =====================================================
  // MINUTES TO TIME
  // =====================================================

  const minutesToTime = (
    minutes
  ) => {
    const hours =
      Math.floor(
        minutes / 60
      );

    const mins =
      minutes % 60;

    return (
      String(hours).padStart(
        2,
        "0"
      ) +
      ":" +
      String(mins).padStart(
        2,
        "0"
      )
    );
  };


  // =====================================================
  // FORMAT TIME
  // =====================================================

  const formatTime = (
    time
  ) => {
    const [
      hour,
      minute,
    ] = time
      .split(":")
      .map(Number);

    const date =
      new Date();

    date.setHours(
      hour,
      minute,
      0,
      0
    );

    return date.toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };


  // =====================================================
  // GENERATE TIME SLOTS
  // =====================================================

  const timeSlots = useMemo(() => {
    if (
      !selectedDoctor ||
      !selectedDate
    ) {
      return [];
    }

    const start =
      selectedDoctor.startTime ||
      "09:00";

    const end =
      selectedDoctor.endTime ||
      "17:00";

    const startMinutes =
      timeToMinutes(start);

    const endMinutes =
      timeToMinutes(end);

    const slots = [];

    // 30-minute appointment slots
    for (
      let minutes = startMinutes;
      minutes < endMinutes;
      minutes += 30
    ) {
      slots.push(
        minutesToTime(minutes)
      );
    }

    return slots;
  }, [
    selectedDoctor,
    selectedDate,
  ]);


  // =====================================================
  // SELECT DOCTOR
  // =====================================================

  const handleDoctorChange = (
    doctorId
  ) => {
    const doctor =
      doctors.find(
        (item) =>
          String(item._id) ===
          String(doctorId)
      );

    setSelectedDoctor(
      doctor || null
    );

    setSelectedDate(null);
    setSelectedTime(null);
  };


  // =====================================================
  // SELECT DATE
  // =====================================================

  const handleDateClick = (
    date
  ) => {
    if (!date) {
      return;
    }

    if (isPastDate(date)) {
      return;
    }

    if (
      !isDoctorAvailableOnDate(
        date
      )
    ) {
      return;
    }

    setSelectedDate(date);
    setSelectedTime(null);
  };


  // =====================================================
  // CONFIRM
  // =====================================================

  const handleConfirm = () => {
    if (
      !selectedDoctor ||
      !selectedDate ||
      !selectedTime
    ) {
      return;
    }

    const date =
      formatDate(
        selectedDate
      );

    const message =
      `Book an appointment with ${selectedDoctor.name} on ${date} at ${selectedTime}.`;

    onBookingReady(message);
  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loadingDoctors) {
    return (
      <div className="calendar-panel">
        <div className="calendar-loading">
          Loading doctors...
        </div>
      </div>
    );
  }


  return (
    <div className="calendar-panel">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="calendar-header">

        <div>
          <div className="calendar-title">
            Book Appointment
          </div>

          <div className="calendar-subtitle">
            Choose a doctor, date and time
          </div>
        </div>

       <button
  type="button"
  className="calendar-close"
  onClick={onClose}
>
  ← Back
</button>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="calendar-error">
          {error}
        </div>
      )}


      {/* =================================================
          DOCTOR SELECT
      ================================================= */}

      <div className="calendar-section">

        <label className="calendar-label">
          Select Doctor
        </label>

        <select
          className="doctor-select"

          value={
            selectedDoctor?._id || ""
          }

          onChange={(e) =>
            handleDoctorChange(
              e.target.value
            )
          }
        >

          <option value="">
            Choose a doctor
          </option>

          {doctors.map(
            (doctor) => (
              <option
                key={doctor._id}
                value={doctor._id}
              >
                {doctor.name} —{" "}
                {doctor.specialization}
              </option>
            )
          )}

        </select>

      </div>


      {/* =================================================
          SELECTED DOCTOR INFO
      ================================================= */}

      {selectedDoctor && (
        <div className="doctor-info">

          <div className="doctor-avatar">
            🩺
          </div>

          <div className="doctor-details">

            <strong>
              {selectedDoctor.name}
            </strong>

            <span>
              {selectedDoctor.specialization}
            </span>

            <small>
              Available:{" "}
              {(
                selectedDoctor
                  .availableDays || []
              ).join(", ")}
            </small>

            <small>
              Hours:{" "}
              {formatTime(
                selectedDoctor.startTime ||
                  "09:00"
              )}
              {" – "}
              {formatTime(
                selectedDoctor.endTime ||
                  "17:00"
              )}
            </small>

          </div>

        </div>
      )}


      {/* =================================================
          CALENDAR
      ================================================= */}

      {selectedDoctor && (
        <div className="calendar-section">

          <div className="month-navigation">

            <button
              type="button"
              onClick={() =>
                changeMonth(-1)
              }
            >
              ‹
            </button>

            <strong>
              {currentMonth.toLocaleDateString(
                "en-US",
                {
                  month: "long",
                  year: "numeric",
                }
              )}
            </strong>

            <button
              type="button"
              onClick={() =>
                changeMonth(1)
              }
            >
              ›
            </button>

          </div>


          <div className="calendar-weekdays">

            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map(
              (day) => (
                <div
                  key={day}
                >
                  {day}
                </div>
              )
            )}

          </div>


          <div className="calendar-grid">

            {calendarDays.map(
              (date, index) => {

                if (!date) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="calendar-empty"
                    />
                  );
                }


                const available =
                  isDoctorAvailableOnDate(
                    date
                  );

                const past =
                  isPastDate(
                    date
                  );

                const selected =
                  selectedDate &&
                  formatDate(
                    selectedDate
                  ) ===
                    formatDate(
                      date
                    );


                const today =
                  formatDate(
                    new Date()
                  ) ===
                  formatDate(
                    date
                  );


                return (
                  <button
                    key={date.toISOString()}
                    type="button"

                    className={[
                      "calendar-day",

                      available &&
                        !past
                        ? "available"
                        : "unavailable",

                      selected
                        ? "selected"
                        : "",

                      today
                        ? "today"
                        : "",
                    ].join(" ")}

                    disabled={
                      !available ||
                      past
                    }

                    onClick={() =>
                      handleDateClick(
                        date
                      )
                    }
                  >
                    {date.getDate()}
                  </button>
                );
              }
            )}

          </div>


          {/* LEGEND */}

          <div className="calendar-legend">

            <span>
              <i className="legend-dot available-dot"></i>
              Available
            </span>

            <span>
              <i className="legend-dot unavailable-dot"></i>
              Unavailable
            </span>

          </div>

        </div>
      )}


      {/* =================================================
          TIME SLOTS
      ================================================= */}

      {selectedDate && (
        <div className="calendar-section">

          <div className="selected-date-title">
            {formatDisplayDate(
              selectedDate
            )}
          </div>

          <div className="time-title">
            Available Times
          </div>


          <div className="time-grid">

            {timeSlots.map(
              (time) => (

                <button
                  key={time}
                  type="button"

                  className={
                    selectedTime ===
                    time
                      ? "time-slot selected"
                      : "time-slot"
                  }

                  onClick={() =>
                    setSelectedTime(
                      time
                    )
                  }
                >
                  {formatTime(
                    time
                  )}
                </button>

              )
            )}

          </div>

        </div>
      )}


      {/* =================================================
          CONFIRM
      ================================================= */}

      {selectedDoctor &&
        selectedDate &&
        selectedTime && (

          <div className="booking-summary">

            <div>
              <span>
                Doctor
              </span>

              <strong>
                {selectedDoctor.name}
              </strong>
            </div>


            <div>
              <span>
                Date
              </span>

              <strong>
                {formatDisplayDate(
                  selectedDate
                )}
              </strong>
            </div>


            <div>
              <span>
                Time
              </span>

              <strong>
                {formatTime(
                  selectedTime
                )}
              </strong>
            </div>


            <button
              type="button"
              className="confirm-booking"
              onClick={
                handleConfirm
              }
            >
              Continue Booking
            </button>

          </div>

        )}

    </div>
  );
}

export default DoctorCalendar;