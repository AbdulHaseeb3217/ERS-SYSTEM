import React, { useEffect, useState } from "react";
import {
  MessageCircle,
  Send,
  RefreshCw,
  PlusCircle,
  XCircle,
} from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api";

export const SupportChat = ({ user }) => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  const [subject, setSubject] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);

  const pharmacyId = user?._id || user?.id;
  const pharmacyName = user?.pharmacyName || user?.name || "Pharmacy";
  const pharmacyPhone = user?.phone || user?.contactNumber || "";
  const pharmacyEmail = user?.email || "";

  const loadChats = async () => {
    try {
      if (!pharmacyId) return;

      setLoading(true);

      const res = await fetch(
        `${API_BASE_URL}/support-chats/user/pharmacy/${pharmacyId}`
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setChats(data.chats || []);
      } else {
        setChats([]);
      }
    } catch (error) {
      console.error("Load pharmacy support chats error:", error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const openChat = async (chat) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/support-chats/${chat.id}?readerType=user`
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setSelectedChat(data.chat);
        loadChats();
      } else {
        alert(data.message || "Chat open nahi hui");
      }
    } catch (error) {
      alert("Network error while opening chat");
    }
  };

  const createTicket = async () => {
    if (!subject.trim() || !firstMessage.trim()) {
      alert("Subject aur message dono likho.");
      return;
    }

    if (!pharmacyId) {
      alert("Pharmacy ID missing. Please login again.");
      return;
    }

    try {
      setCreating(true);

      const res = await fetch(`${API_BASE_URL}/support-chats/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: pharmacyId,
          userType: "pharmacy",
          userName: pharmacyName,
          userPhone: pharmacyPhone,
          userEmail: pharmacyEmail,
          subject: subject.trim(),
          message: firstMessage.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubject("");
        setFirstMessage("");
        setSelectedChat(data.chat);
        loadChats();
      } else {
        alert(data.message || "Message send nahi hua");
      }
    } catch (error) {
      alert("Network error while creating support message");
    } finally {
      setCreating(false);
    }
  };

  const sendReply = async () => {
    if (!selectedChat?.id || !replyMessage.trim()) return;

    try {
      setSending(true);

      const res = await fetch(
        `${API_BASE_URL}/support-chats/${selectedChat.id}/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            senderType: "user",
            senderName: pharmacyName,
            message: replyMessage.trim(),
          }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setReplyMessage("");
        setSelectedChat(data.chat);
        loadChats();
      } else {
        alert(data.message || "Message send nahi hua");
      }
    } catch (error) {
      alert("Network error while sending message");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, [pharmacyId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadChats();

      if (selectedChat?.id) {
        openChat(selectedChat);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedChat?.id, pharmacyId]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle size={22} className="text-blue-600" />
          Support Chat
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Send your issue to admin and view replies here.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-4 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
              <PlusCircle size={17} className="text-blue-600" />
              Create Message
            </h2>

            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject e.g. Order issue"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 placeholder:text-gray-500 mb-3"
            />

            <textarea
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder="Describe your issue..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 placeholder:text-gray-500 resize-none mb-3"
            />

            <button
              onClick={createTicket}
              disabled={creating}
              className="w-full h-11 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Send size={15} />
              {creating ? "Sending..." : "Send Message"}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">My Messages</h2>

              <button
                onClick={loadChats}
                className="text-xs font-bold text-blue-600 flex items-center gap-1"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <p className="p-5 text-sm text-gray-500 font-medium">
                  Loading messages...
                </p>
              ) : chats.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle size={34} className="mx-auto text-gray-300" />
                  <p className="text-sm text-gray-500 font-semibold mt-3">
                    No support messages found.
                  </p>
                </div>
              ) : (
                chats.map((chat) => {
                  const isActive = selectedChat?.id === chat.id;

                  return (
                    <button
                      key={chat.id}
                      onClick={() => openChat(chat)}
                      className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${
                        isActive ? "bg-blue-50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {chat.subject}
                          </p>

                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {chat.lastMessage}
                          </p>
                        </div>

                        {chat.unreadForUser > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                            {chat.unreadForUser}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                            chat.status === "open"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {chat.status}
                        </span>

                        <span className="text-[10px] text-gray-400">
                          {chat.lastMessageAt
                            ? new Date(chat.lastMessageAt).toLocaleString()
                            : ""}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[650px] flex flex-col overflow-hidden">
            {!selectedChat ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageCircle size={48} className="mx-auto text-gray-300" />
                  <h2 className="text-lg font-bold text-gray-700 mt-4">
                    Select a message
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Admin replies will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      {selectedChat.subject}
                    </h2>

                    <p className="text-xs text-gray-500 mt-1">
                      {pharmacyName} • Pharmacy
                    </p>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-full ${
                      selectedChat.status === "open"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedChat.status}
                  </span>
                </div>

                <div className="flex-1 bg-gray-50 p-5 overflow-y-auto">
                  {(selectedChat.messages || []).map((msg) => {
                    const isAdmin = msg.senderType === "admin";

                    return (
                      <div
                        key={msg.id}
                        className={`mb-4 flex ${
                          isAdmin ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                            isAdmin
                              ? "bg-white text-gray-700 border border-gray-100"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">
                            {msg.message}
                          </p>

                          <p
                            className={`text-[10px] mt-2 ${
                              isAdmin ? "text-gray-400" : "text-blue-100"
                            }`}
                          >
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleString()
                              : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedChat.status === "closed" ? (
                  <div className="p-4 border-t border-gray-100 bg-white">
                    <div className="flex items-center justify-center gap-2 text-red-600 text-sm font-bold">
                      <XCircle size={16} />
                      This message is closed by admin.
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-t border-gray-100 bg-white flex gap-3">
                    <input
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type message..."
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 placeholder:text-gray-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          sendReply();
                        }
                      }}
                    />

                    <button
                      onClick={sendReply}
                      disabled={sending || !replyMessage.trim()}
                      className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                    >
                      <Send size={16} />
                      {sending ? "..." : "Send"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};