const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();


// ========================================
// SIGNUP
// ========================================

router.post("/signup", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    const existingUser =
      await User.findOne({
        email: email.toLowerCase(),
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const user =
      await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
      });

    res.status(201).json({
      success: true,
      message:
        "Account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error(
      "Signup error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Signup failed",
    });
  }
});


// ========================================
// LOGIN
// ========================================

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const user =
      await User.findOne({
        email: email.toLowerCase(),
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    const token =
      jwt.sign(
        {
          userId: user._id.toString(),
          email: user.email,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

    res.status(200).json({
      success: true,
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error(
      "Login error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});


// ========================================
// GET USERS
// ========================================

router.get("/", async (req, res) => {
  try {
    const users =
      await User.find()
        .select("-password")
        .sort({
          name: 1,
        });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });

  } catch (error) {
    console.error(
      "Error fetching users:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch users",
    });
  }
});


module.exports = router;