const express = require("express");
const mongoose = require("mongoose");

const Conversation = require(
  "../models/Conversation"
);

const router = express.Router();


// =====================================================
// GET USER CONVERSATIONS
// =====================================================

router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const conversations =
      await Conversation.find({
        user: userId,
      })
        .sort({
          updatedAt: -1,
        })
        .select(
          "title messages createdAt updatedAt"
        )
        .lean();

    return res.status(200).json({
      success: true,
      conversations,
    });

  } catch (error) {

    console.error(
      "Get conversations error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch conversations",
    });
  }
});


// =====================================================
// CREATE CONVERSATION
// =====================================================

router.post("/", async (req, res) => {
  try {
    const {
      userId,
      title,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const conversation =
      await Conversation.create({
        user: userId,

        title:
          title?.trim() ||
          "New Conversation",

        messages: [],
      });

    return res.status(201).json({
      success: true,
      conversation,
    });

  } catch (error) {

    console.error(
      "Create conversation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create conversation",
    });
  }
});


// =====================================================
// GET ONE CONVERSATION
// =====================================================

router.get("/:conversationId", async (
  req,
  res
) => {
  try {
    const {
      conversationId,
    } = req.params;

    const {
      userId,
    } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        conversationId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid conversationId",
      });
    }

    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        user: userId,
      }).lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message:
          "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });

  } catch (error) {

    console.error(
      "Get conversation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch conversation",
    });
  }
});


// =====================================================
// DELETE CONVERSATION
// =====================================================

router.delete(
  "/:conversationId",
  async (req, res) => {
    try {

      const {
        conversationId,
      } = req.params;

      const {
        userId,
      } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message:
            "userId is required",
        });
      }

      const deleted =
        await Conversation.findOneAndDelete({
          _id: conversationId,
          user: userId,
        });

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message:
            "Conversation not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Conversation deleted successfully",
      });

    } catch (error) {

      console.error(
        "Delete conversation error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete conversation",
      });
    }
  }
);


module.exports = router;