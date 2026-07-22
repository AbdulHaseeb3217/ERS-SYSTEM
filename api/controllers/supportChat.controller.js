const supportChatService = require("../services/supportChat.service");

const createSupportChat = async (req, res) => {
  try {
    const chat = await supportChatService.createSupportChat(req.body);

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      chat,
    });
  } catch (error) {
    console.error("createSupportChat error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create support ticket",
    });
  }
};

const getUserSupportChats = async (req, res) => {
  try {
    const chats = await supportChatService.getUserSupportChats({
      userType: req.params.userType,
      userId: req.params.userId,
    });

    return res.status(200).json({
      success: true,
      chats,
    });
  } catch (error) {
    console.error("getUserSupportChats error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch user chats",
    });
  }
};

const getAllSupportChatsForAdmin = async (req, res) => {
  try {
    const chats = await supportChatService.getAllSupportChatsForAdmin({
      status: req.query.status,
      userType: req.query.userType,
    });

    return res.status(200).json({
      success: true,
      chats,
    });
  } catch (error) {
    console.error("getAllSupportChatsForAdmin error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch support chats",
    });
  }
};

const getSupportChatById = async (req, res) => {
  try {
    const chat = await supportChatService.getSupportChatById({
      chatId: req.params.chatId,
      readerType: req.query.readerType,
    });

    return res.status(200).json({
      success: true,
      chat,
    });
  } catch (error) {
    console.error("getSupportChatById error:", error);

    return res.status(404).json({
      success: false,
      message: error.message || "Support chat not found",
    });
  }
};

const addMessageToSupportChat = async (req, res) => {
  try {
    const chat = await supportChatService.addMessageToSupportChat({
      chatId: req.params.chatId,
      senderType: req.body.senderType,
      senderName: req.body.senderName,
      message: req.body.message,
    });

    return res.status(200).json({
      success: true,
      message: "Message sent successfully",
      chat,
    });
  } catch (error) {
    console.error("addMessageToSupportChat error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to send message",
    });
  }
};

const closeSupportChat = async (req, res) => {
  try {
    const chat = await supportChatService.closeSupportChat({
      chatId: req.params.chatId,
    });

    return res.status(200).json({
      success: true,
      message: "Support chat closed",
      chat,
    });
  } catch (error) {
    console.error("closeSupportChat error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to close support chat",
    });
  }
};

const reopenSupportChat = async (req, res) => {
  try {
    const chat = await supportChatService.reopenSupportChat({
      chatId: req.params.chatId,
    });

    return res.status(200).json({
      success: true,
      message: "Support chat reopened",
      chat,
    });
  } catch (error) {
    console.error("reopenSupportChat error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to reopen support chat",
    });
  }
};

const getAdminUnreadCount = async (req, res) => {
  try {
    const count = await supportChatService.getAdminUnreadCount();

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("getAdminUnreadCount error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch unread count",
    });
  }
};

module.exports = {
  createSupportChat,
  getUserSupportChats,
  getAllSupportChatsForAdmin,
  getSupportChatById,
  addMessageToSupportChat,
  closeSupportChat,
  reopenSupportChat,
  getAdminUnreadCount,
};