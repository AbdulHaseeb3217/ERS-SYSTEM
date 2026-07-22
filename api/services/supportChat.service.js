const SupportChat = require("../models/supportChat.model");

const createSupportChat = async ({
  userId,
  userType,
  userName,
  userPhone,
  subject,
  message,
}) => {
  if (!userId) throw new Error("User id is required");
  if (!userType) throw new Error("User type is required");
  if (!subject) throw new Error("Subject is required");
  if (!message) throw new Error("Message is required");

  const chat = await SupportChat.create({
    userId,
    userType,
    userName: userName || "",
    userPhone: userPhone || "",
    subject,
    status: "open",
    lastMessage: message,
    lastMessageAt: new Date(),
    unreadForAdmin: 1,
    unreadForUser: 0,
    messages: [
      {
        senderType: "user",
        senderName: userName || "User",
        message,
        isReadByAdmin: false,
        isReadByUser: true,
      },
    ],
  });

  return chat.toJSON();
};

const getUserSupportChats = async ({ userId, userType }) => {
  if (!userId) throw new Error("User id is required");
  if (!userType) throw new Error("User type is required");

  const chats = await SupportChat.find({
    userId,
    userType,
  }).sort({ lastMessageAt: -1 });

  return chats.map((chat) => chat.toJSON());
};

const getAllSupportChatsForAdmin = async ({ status, userType } = {}) => {
  const filter = {};

  if (status && status !== "all") {
    filter.status = status;
  }

  if (userType && userType !== "all") {
    filter.userType = userType;
  }

  const chats = await SupportChat.find(filter).sort({ lastMessageAt: -1 });

  return chats.map((chat) => chat.toJSON());
};

const getSupportChatById = async ({ chatId, readerType }) => {
  if (!chatId) throw new Error("Chat id is required");

  const chat = await SupportChat.findById(chatId);

  if (!chat) throw new Error("Support chat not found");

  if (readerType === "admin") {
    chat.unreadForAdmin = 0;
    chat.messages = chat.messages.map((msg) => {
      if (msg.senderType === "user") {
        msg.isReadByAdmin = true;
      }
      return msg;
    });
    await chat.save();
  }

  if (readerType === "user") {
    chat.unreadForUser = 0;
    chat.messages = chat.messages.map((msg) => {
      if (msg.senderType === "admin") {
        msg.isReadByUser = true;
      }
      return msg;
    });
    await chat.save();
  }

  return chat.toJSON();
};

const addMessageToSupportChat = async ({
  chatId,
  senderType,
  senderName,
  message,
}) => {
  if (!chatId) throw new Error("Chat id is required");
  if (!senderType) throw new Error("Sender type is required");
  if (!message) throw new Error("Message is required");

  const chat = await SupportChat.findById(chatId);

  if (!chat) throw new Error("Support chat not found");

  if (chat.status === "closed") {
    throw new Error("This support ticket is closed. Please reopen it first.");
  }

  chat.messages.push({
    senderType,
    senderName: senderName || senderType,
    message,
    isReadByAdmin: senderType === "admin",
    isReadByUser: senderType === "user",
  });

  chat.lastMessage = message;
  chat.lastMessageAt = new Date();

  if (senderType === "user") {
    chat.unreadForAdmin += 1;
  }

  if (senderType === "admin") {
    chat.unreadForUser += 1;
  }

  await chat.save();

  return chat.toJSON();
};

const closeSupportChat = async ({ chatId }) => {
  if (!chatId) throw new Error("Chat id is required");

  const chat = await SupportChat.findByIdAndUpdate(
    chatId,
    { status: "closed" },
    { new: true }
  );

  if (!chat) throw new Error("Support chat not found");

  return chat.toJSON();
};

const reopenSupportChat = async ({ chatId }) => {
  if (!chatId) throw new Error("Chat id is required");

  const chat = await SupportChat.findByIdAndUpdate(
    chatId,
    { status: "open" },
    { new: true }
  );

  if (!chat) throw new Error("Support chat not found");

  return chat.toJSON();
};

const getAdminUnreadCount = async () => {
  const result = await SupportChat.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$unreadForAdmin" },
      },
    },
  ]);

  return result?.[0]?.total || 0;
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