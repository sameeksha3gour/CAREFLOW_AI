const express = require("express");
const Conversation = require("../models/Conversation");
const chatWithAI = require("../services/aiService");
const auth = require("../middleware/auth");

const router = express.Router();


// =====================================================
// AI CHAT
// =====================================================

router.post("/chat", auth, async (req, res) => {
  try {

    const {
      message,
      conversationId,
    } = req.body;


    // =================================================
    // USER FROM JWT
    // =================================================

    const userId = req.user.userId;


    // =================================================
    // VALIDATION
    // =================================================

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User authentication is required",
      });
    }

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }


    // =================================================
    // FIND EXISTING CONVERSATION
    // =================================================

    let conversation = null;


    if (conversationId) {

      conversation =
        await Conversation.findOne({
          _id: conversationId,
          user: userId,
        });

    }


    // =================================================
    // CREATE NEW CONVERSATION
    // =================================================

    if (!conversation) {

      conversation =
        await Conversation.create({

          user: userId,

          title:
            message
              .trim()
              .substring(0, 45) ||
            "New Conversation",

          messages: [],
        });

    }


    // =================================================
    // SAVE USER MESSAGE
    // =================================================

    conversation.messages.push({

      role: "user",

      content:
        message.trim(),

    });

    await conversation.save();


    // =================================================
    // CALL YOUR EXISTING AI SERVICE
    // =================================================

    const aiResponse =
      await chatWithAI(
        message.trim(),
        userId
      );


    // =================================================
    // CONVERT AI RESPONSE TO STRING
    // =================================================

    let cleanResponse = "";


    if (
      typeof aiResponse ===
      "string"
    ) {

      cleanResponse =
        aiResponse;

    } else if (
      aiResponse?.content
    ) {

      cleanResponse =
        aiResponse.content;

    } else if (
      aiResponse?.message?.content
    ) {

      cleanResponse =
        aiResponse.message.content;

    } else {

      cleanResponse =
        JSON.stringify(
          aiResponse
        );

    }


    // =================================================
    // REMOVE QWEN THINKING / REASONING
    // =================================================

    // Example:
    // <think>
    // internal reasoning
    // </think>
    // final answer

    if (
      cleanResponse.includes(
        "</think>"
      )
    ) {

      cleanResponse =
        cleanResponse
          .split("</think>")
          .pop()
          .trim();

    }


    // Remove complete <think>...</think>
    cleanResponse =
      cleanResponse
        .replace(
          /<think>[\s\S]*?<\/think>/gi,
          ""
        )
        .trim();


    // Remove remaining opening tag
    cleanResponse =
      cleanResponse
        .replace(
          /<think>/gi,
          ""
        )
        .trim();


    // =================================================
    // FALLBACK
    // =================================================

    if (!cleanResponse) {

      cleanResponse =
        "I couldn't generate a response. Please try again.";

    }


    // =================================================
    // SAVE AI RESPONSE
    // =================================================

    conversation.messages.push({

      role: "assistant",

      content:
        cleanResponse,

    });

    await conversation.save();


    // =================================================
    // LOG
    // =================================================

    console.log(
      "Conversation:",
      conversation._id.toString()
    );

    console.log(
      "User:",
      message
    );

    console.log(
      "AI:",
      cleanResponse
    );


    // =================================================
    // SEND RESPONSE
    // =================================================

    return res.status(200).json({

      success: true,

      message:
        cleanResponse,

      conversationId:
        conversation._id,

    });


  } catch (error) {

    console.error(
      "AI request failed:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "AI request failed",

      error:
        error.message,

    });

  }
});


module.exports = router;