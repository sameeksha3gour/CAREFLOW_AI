import { useEffect, useState } from "react";
import "./App.css";
import DoctorCalendar from "./components/DoctorCalendar";

const API = "http://127.0.0.1:5000";

// =====================================================
// QUICK ACTIONS
// =====================================================

const quickActions = [
  {
    label: "Find Doctors",
    icon: "🩺",
    text: "Show me all available doctors.",
  },
  {
    label: "My Appointments",
    icon: "📅",
    text: "Show me my appointments.",
  },
  {
    label: "Book Appointment",
    icon: "➕",
    text: "I want to book an appointment.",
  },
  {
    label: "Reschedule",
    icon: "🔄",
    text: "I want to reschedule an appointment.",
  },
  {
    label: "Cancel",
    icon: "✕",
    text: "I want to cancel an appointment.",
  },
];


// =====================================================
// AUTH SCREEN
// =====================================================

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        mode === "login"
          ? "/api/users/login"
          : "/api/users/signup";

      const body =
        mode === "login"
          ? {
              email: email.trim(),
              password,
            }
          : {
              name: name.trim(),
              email: email.trim(),
              password,
            };

      const response = await fetch(
        `${API}${endpoint}`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Authentication failed."
        );
      }

      // =================================================
      // SIGN UP
      // =================================================

      if (mode === "signup") {
        setSuccess(
          "Account created successfully. Please login."
        );

        setMode("login");
        setPassword("");

        return;
      }

      // =================================================
      // LOGIN
      // =================================================

      localStorage.setItem(
        "careflow_token",
        data.token
      );

      localStorage.setItem(
        "careflow_user",
        JSON.stringify(data.user)
      );

      onLogin(
        data.user,
        data.token
      );

    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );

      setError(
        error.message ||
          "Unable to authenticate."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-card">

        <div className="auth-logo">
          +
        </div>

        <h1>
          CareFlow AI
        </h1>

        <p className="auth-subtitle">
          Your AI Appointment Assistant
        </p>

        {/* =================================================
            LOGIN / SIGNUP TABS
        ================================================= */}

        <div className="auth-tabs">

          <button
            type="button"
            className={
              mode === "login"
                ? "active"
                : ""
            }
            onClick={() => {
              setMode("login");
              setError("");
              setSuccess("");
            }}
          >
            Login
          </button>

          <button
            type="button"
            className={
              mode === "signup"
                ? "active"
                : ""
            }
            onClick={() => {
              setMode("signup");
              setError("");
              setSuccess("");
            }}
          >
            Sign Up
          </button>

        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          className="auth-form"
          onSubmit={submit}
        >

          {mode === "signup" && (
            <label>
              Full Name

              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
              />
            </label>
          )}

          <label>
            Email

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
            />
          </label>

          <label>
            Password

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
            />
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login to CareFlow"
              : "Create Account"}
          </button>

        </form>

      </div>

    </div>
  );
}


// =====================================================
// CHAT SCREEN
// =====================================================

function ChatScreen({
  user,
  token,
  onLogout,
}) {

  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [showCalendar, setShowCalendar] =
    useState(false);


  // ===================================================
  // SEND MESSAGE TO AI
  // ===================================================

  const sendMessage = async (
    text = message
  ) => {

    const finalMessage =
      text.trim();

    if (
      !finalMessage ||
      loading
    ) {
      return;
    }

    setLoading(true);

    setMessages((previous) => [
      ...previous,

      {
        role: "user",
        content: finalMessage,
      },
    ]);

    setMessage("");

    try {

      const response =
        await fetch(
          `${API}/api/ai/chat`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              message: finalMessage,
            }),
          }
        );

      const data =
        await response.json();

      // Token expired
      if (response.status === 401) {
        onLogout();
        return;
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "AI request failed."
        );
      }

      setMessages((previous) => [
        ...previous,

        {
          role: "assistant",
          content:
            data.message ||
            "I couldn't process that request.",
        },
      ]);

    } catch (error) {

      console.error(
        "AI chat error:",
        error
      );

      setMessages((previous) => [
        ...previous,

        {
          role: "assistant",
          content:
            error.message ||
            "Sorry, I couldn't connect to CareFlow AI.",
        },
      ]);

    } finally {
      setLoading(false);
    }
  };


  // ===================================================
  // QUICK ACTION
  // ===================================================

  const handleQuickAction = (action) => {

    // Book Appointment opens calendar directly.
    if (
      action.label ===
      "Book Appointment"
    ) {

      setShowCalendar(true);

      return;
    }

    if (action.text) {
      sendMessage(action.text);
    }
  };


  // ===================================================
  // INPUT SUBMIT
  // ===================================================

  const handleSubmit = (event) => {

    event.preventDefault();

    sendMessage();
  };


  // ===================================================
  // BACK TO CHAT
  // ===================================================

  const handleBackToChat = () => {

    setShowCalendar(false);
  };


  // ===================================================
  // CALENDAR BOOKING COMPLETE
  // ===================================================

  const handleCalendarBooking = (
    bookingMessage
  ) => {

    // Close calendar first
    setShowCalendar(false);

    // Send booking confirmation/request
    // to the existing AI flow.
    if (bookingMessage) {
      sendMessage(bookingMessage);
    }
  };


  // ===================================================
  // NEW CHAT
  // ===================================================

  const handleNewChat = () => {

    if (loading) {
      return;
    }

    setMessages([]);
    setMessage("");
    setShowCalendar(false);
  };


  // ===================================================
  // MAIN UI
  // ===================================================

  return (
    <div className="app">

      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="background-shape shape-one"></div>

      <div className="background-shape shape-two"></div>


      <main className="chat-container">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="header">

          <div className="brand">

            {/* Back button only appears
                when calendar is open */}

            {showCalendar && (
              <button
                type="button"
                className="back-button"
                onClick={
                  handleBackToChat
                }
                title="Back to chat"
              >
                ←
              </button>
            )}

            <div className="logo">
              +
            </div>

            <div className="brand-text">

              <h1>
                CareFlow AI
              </h1>

              <p>
                {showCalendar
                  ? "Book your appointment"
                  : "AI Appointment Assistant"}
              </p>

            </div>

          </div>


          {/* =================================================
              HEADER RIGHT
          ================================================= */}

          <div className="header-right">

            <div className="status">

              <span className="status-dot"></span>

              Online

            </div>


            {/* NEW CHAT */}

            {!showCalendar && (
              <button
                type="button"
                className="new-chat-button"
                onClick={
                  handleNewChat
                }
                disabled={
                  loading ||
                  messages.length === 0
                }
              >
                + New Chat
              </button>
            )}


            {/* USER */}

            <div className="user-menu">

              <span>
                {user?.name ||
                  "User"}
              </span>

              <button
                type="button"
                onClick={onLogout}
              >
                Logout
              </button>

            </div>

          </div>

        </div>


        {/* =================================================
            CHAT AREA
        ================================================= */}

        <div className="chat-box">


          {/* =================================================
              CALENDAR
          ================================================= */}

          {showCalendar && (

            <div className="calendar-wrapper">

              {/* BACK BUTTON */}

              <button
                type="button"
                className="calendar-back-button"
                onClick={
                  handleBackToChat
                }
              >
                ← Back to Chat
              </button>


              <DoctorCalendar

                token={token}

                onClose={
                  handleBackToChat
                }

                onBookingReady={
                  handleCalendarBooking
                }

              />

            </div>

          )}


          {/* =================================================
              WELCOME SCREEN
          ================================================= */}

          {messages.length === 0 &&
            !showCalendar && (

            <div className="welcome">

              <div className="welcome-icon">
                👋
              </div>


              <h2>
                Hello,{" "}
                {user?.name ||
                  "there"}!
              </h2>


              <p>
                I can help you find
                doctors, manage
                appointments, and
                check availability.
              </p>


              {/* =================================================
                  QUICK ACTIONS
              ================================================= */}

              <div className="quick-actions">

                {quickActions.map(
                  (action) => (

                  <button
                    key={
                      action.label
                    }

                    type="button"

                    className="quick-action"

                    onClick={() =>
                      handleQuickAction(
                        action
                      )
                    }
                  >

                    <span className="action-icon">
                      {action.icon}
                    </span>

                    <span>
                      {action.label}
                    </span>

                  </button>

                ))}

              </div>

            </div>

          )}


          {/* =================================================
              CHAT MESSAGES
          ================================================= */}

          {messages.map(
            (msg, index) => (

            <div
              key={index}
              className={`message-row ${msg.role}`}
            >

              {/* AI AVATAR */}

              {msg.role ===
                "assistant" && (

                <div className="avatar ai-avatar">
                  +
                </div>

              )}


              {/* MESSAGE */}

              <div
                className={`message ${msg.role}`}
              >
                {msg.content}
              </div>


              {/* USER AVATAR */}

              {msg.role ===
                "user" && (

                <div className="avatar user-avatar">

                  {(user?.name ||
                    "U")
                    .charAt(0)
                    .toUpperCase()}

                </div>

              )}

            </div>

          ))}


          {/* =================================================
              THINKING
          ================================================= */}

          {loading && (

            <div className="message-row assistant">

              <div className="avatar ai-avatar">
                +
              </div>

              <div className="message assistant typing">

                <span></span>

                <span></span>

                <span></span>

              </div>

            </div>

          )}

        </div>


        {/* =================================================
            CHAT INPUT
        ================================================= */}

        {!showCalendar && (

          <form
            className="input-area"
            onSubmit={handleSubmit}
          >

            <input
              type="text"
              placeholder="Ask CareFlow AI anything..."
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              disabled={loading}
            />

            <button
              type="submit"
              className="send-button"
              disabled={
                loading ||
                !message.trim()
              }
            >
              {loading
                ? "..."
                : "Send ➤"}
            </button>

          </form>

        )}


        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="footer">

          CareFlow AI • Appointment
          management made simple

        </div>

      </main>

    </div>
  );
}


// =====================================================
// MAIN APP
// =====================================================

function App() {

  const [user, setUser] =
    useState(null);

  const [token, setToken] =
    useState(null);


  // ===================================================
  // RESTORE LOGIN SESSION
  // ===================================================

  useEffect(() => {

    const savedToken =
      localStorage.getItem(
        "careflow_token"
      );

    const savedUser =
      localStorage.getItem(
        "careflow_user"
      );

    if (
      !savedToken ||
      !savedUser
    ) {
      return;
    }

    try {

      const parsedUser =
        JSON.parse(savedUser);

      setToken(savedToken);

      setUser(parsedUser);

    } catch (error) {

      console.error(
        "Session restore failed:",
        error
      );

      localStorage.removeItem(
        "careflow_token"
      );

      localStorage.removeItem(
        "careflow_user"
      );
    }

  }, []);


  // ===================================================
  // LOGIN
  // ===================================================

  const handleLogin = (
    loggedInUser,
    loggedInToken
  ) => {

    setUser(
      loggedInUser
    );

    setToken(
      loggedInToken
    );
  };


  // ===================================================
  // LOGOUT
  // ===================================================

  const handleLogout = () => {

    localStorage.removeItem(
      "careflow_token"
    );

    localStorage.removeItem(
      "careflow_user"
    );

    setUser(null);

    setToken(null);
  };


  // ===================================================
  // SHOW LOGIN
  // ===================================================

  if (
    !user ||
    !token
  ) {

    return (
      <AuthScreen
        onLogin={
          handleLogin
        }
      />
    );
  }


  // ===================================================
  // SHOW CHAT
  // ===================================================

  return (
    <ChatScreen

      user={user}

      token={token}

      onLogout={
        handleLogout
      }

    />
  );
}


export default App;