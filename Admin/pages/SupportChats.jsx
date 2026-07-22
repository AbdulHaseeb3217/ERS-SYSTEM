import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { logout } from "../services/authService";
import { Send, RefreshCw, MessageCircle } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api";

const SupportChats = ({ user, onLogout, onSetActivePage }) => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadChats = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_BASE_URL}/support-chats/admin/all?status=${statusFilter}&userType=${typeFilter}`
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setChats(data.chats || []);
      } else {
        setChats([]);
      }
    } catch (error) {
      console.error("Load support chats error:", error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const openChat = async (chat) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/support-chats/${chat.id}?readerType=admin`
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setSelectedChat(data.chat);
        loadChats();
      }
    } catch (error) {
      console.error("Open chat error:", error);
    }
  };

  const sendReply = async () => {
    if (!selectedChat?.id || !reply.trim()) return;

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
            senderType: "admin",
            senderName: user?.name || "Admin",
            message: reply.trim(),
          }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setSelectedChat(data.chat);
        setReply("");
        loadChats();
      } else {
        alert(data.message || "Failed to send the reply. Please try again.");
      }
    } catch (error) {
      alert("Network error while sending reply");
    } finally {
      setSending(false);
    }
  };

  const updateChatStatus = async (status) => {
    if (!selectedChat?.id) return;

    try {
      const endpoint =
        status === "closed"
          ? `${API_BASE_URL}/support-chats/${selectedChat.id}/close`
          : `${API_BASE_URL}/support-chats/${selectedChat.id}/reopen`;

      const res = await fetch(endpoint, {
        method: "PATCH",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSelectedChat(data.chat);
        loadChats();
      }
    } catch (error) {
      console.error("Status update error:", error);
    }
  };

  useEffect(() => {
    loadChats();
  }, [statusFilter, typeFilter]);

  const formatType = (type) => {
    if (type === "patient") return "Patient";
    if (type === "ambulance_driver") return "Ambulance Driver";
    if (type === "bike_rider") return "Bike Rider";
    if (type === "pharmacy") return "Pharmacy";
    return type || "User";
  };

  return (
    <div className="flex bg-[#f9fafb] min-h-screen font-sans">
      <Sidebar
        activeTab="support"
        onLogout={onLogout || logout}
        onTabClick={onSetActivePage}
      />

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Support Chats</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
              User Support Tickets and Admin Replies
            </p>
          </div>

          <button
            onClick={loadChats}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500 hover:text-red-600 shadow-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </header>

        <div className="grid grid-cols-12 gap-5">
          <section className="col-span-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 border border-gray-100 rounded-lg px-3 py-2 text-xs"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="flex-1 border border-gray-100 rounded-lg px-3 py-2 text-xs"
                >
                  <option value="all">All Users</option>
                  <option value="patient">Patient</option>
                  <option value="ambulance_driver">Ambulance Driver</option>
                  <option value="bike_rider">Bike Rider</option>
                  <option value="pharmacy">Pharmacy</option>
                </select>
              </div>
            </div>

            <div className="h-[calc(100vh-190px)] overflow-y-auto">
              {loading ? (
                <p className="p-5 text-xs text-gray-400 font-bold">
                  Loading chats...
                </p>
              ) : chats.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="mx-auto text-gray-300" size={32} />
                  <p className="text-xs text-gray-400 font-bold mt-3">
                    No support chats found
                  </p>
                </div>
              ) : (
                chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => openChat(chat)}
                    className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 ${
                      selectedChat?.id === chat.id ? "bg-red-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-gray-800">
                          {chat.subject}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          {chat.userName || "Unknown"} •{" "}
                          {formatType(chat.userType)}
                        </p>
                      </div>

                      {chat.unreadForAdmin > 0 && (
                        <span className="bg-red-500 text-white text-[9px] font-bold rounded-full px-2 py-0.5">
                          {chat.unreadForAdmin}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-400 mt-2 truncate">
                      {chat.lastMessage}
                    </p>

                    <div className="flex justify-between items-center mt-2">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          chat.status === "open"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {chat.status}
                      </span>

                      <span className="text-[9px] text-gray-400">
                        {chat.lastMessageAt
                          ? new Date(chat.lastMessageAt).toLocaleString()
                          : ""}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="col-span-8 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-[calc(100vh-145px)]">
            {!selectedChat ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <MessageCircle className="mx-auto text-gray-300" size={42} />
                  <p className="text-sm font-bold text-gray-500 mt-3">
                    Select a support chat
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    User messages will appear here
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-gray-800">
                      {selectedChat.subject}
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {selectedChat.userName || "Unknown"} •{" "}
                      {formatType(selectedChat.userType)} •{" "}
                      {selectedChat.userPhone || "No phone"}
                    </p>
                  </div>

                  {selectedChat.status === "open" ? (
                    <button
                      onClick={() => updateChatStatus("closed")}
                      className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold"
                    >
                      Close Ticket
                    </button>
                  ) : (
                    <button
                      onClick={() => updateChatStatus("open")}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold"
                    >
                      Reopen
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
                  {selectedChat.messages?.map((msg) => {
                    const isAdmin = msg.senderType === "admin";

                    return (
                      <div
                        key={msg.id}
                        className={`mb-4 flex ${
                          isAdmin ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                            isAdmin
                              ? "bg-red-500 text-white"
                              : "bg-white text-gray-700 border border-gray-100"
                          }`}
                        >
                          <p className="text-xs leading-relaxed">
                            {msg.message}
                          </p>
                          <p
                            className={`text-[9px] mt-2 ${
                              isAdmin ? "text-red-100" : "text-gray-400"
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

                <div className="p-4 border-t border-gray-100 flex gap-3">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    disabled={selectedChat.status === "closed"}
                    placeholder={
                      selectedChat.status === "closed"
                        ? "Ticket closed. Reopen to reply."
                        : "Type reply..."
                    }
                    className="flex-1 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-200 disabled:bg-gray-100"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendReply();
                    }}
                  />

                  <button
                    onClick={sendReply}
                    disabled={sending || selectedChat.status === "closed"}
                    className="px-5 py-3 bg-red-500 text-white rounded-xl font-bold text-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send size={14} />
                    Send
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default SupportChats;