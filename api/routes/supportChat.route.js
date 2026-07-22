const express = require("express");
const router = express.Router();

const supportChatController = require("../controllers/supportChat.controller");

router.post("/create", supportChatController.createSupportChat);

router.get(
  "/user/:userType/:userId",
  supportChatController.getUserSupportChats
);

router.get("/admin/all", supportChatController.getAllSupportChatsForAdmin);

router.get("/admin/unread-count", supportChatController.getAdminUnreadCount);

router.get("/:chatId", supportChatController.getSupportChatById);

router.post("/:chatId/message", supportChatController.addMessageToSupportChat);

router.patch("/:chatId/close", supportChatController.closeSupportChat);

router.patch("/:chatId/reopen", supportChatController.reopenSupportChat);

module.exports = router;