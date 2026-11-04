import React, { useEffect, useState, useRef } from "react";
import api, { getApiError } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { LoadingState, SectionHeading } from "../../components/Common.jsx";
import { Icon } from "../../components/Icon.jsx";
import { format12HourTime } from "../../lib/dateTime.js";

export function MessagesPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  async function loadContacts() {
    setLoadingContacts(true);
    try {
      const res = await api.get("/messages/contacts");
      const list = res.data?.contacts || [];
      setContacts(list);
      if (list.length > 0 && !selectedContact) {
        setSelectedContact(list[0]);
      }
    } catch (err) {
      setError(getApiError(err, "Failed to load messaging contacts."));
    } finally {
      setLoadingContacts(false);
    }
  }

  async function loadConversation(contactId) {
    if (!contactId) return;
    setLoadingMessages(true);
    try {
      const res = await api.get(`/messages/conversations/${contactId}`);
      setMessages(res.data?.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (selectedContact?._id) {
      loadConversation(selectedContact._id);
    }
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!inputText.trim() || !selectedContact?._id) return;
    setSendLoading(true);
    try {
      const res = await api.post("/messages", {
        recipient: selectedContact._id,
        content: inputText.trim(),
      });
      setMessages((prev) => [...prev, res.data.message]);
      setInputText("");
    } catch (err) {
      alert(getApiError(err, "Failed to send message."));
    } finally {
      setSendLoading(false);
    }
  }

  return (
    <div className="dashboard-content space-y-6">
      <SectionHeading
        title="Direct Resident & Warden Messaging"
        subtitle="Secure, official communication channel between hostel residents and administration."
      />

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white rounded-xl border border-slate-200 overflow-hidden min-h-[550px]">
        {/* Contact list */}
        <div className="border-r border-slate-200 p-4 space-y-3 bg-slate-50/50">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Conversations</h3>
          {loadingContacts ? (
            <LoadingState label="Loading contacts…" />
          ) : (
            <div className="space-y-1">
              {contacts.map((c) => {
                const isSelected = selectedContact?._id === c._id;
                return (
                  <button
                    key={c._id}
                    onClick={() => setSelectedContact(c)}
                    className={`w-full text-left p-3 rounded-lg text-xs transition flex items-center justify-between ${
                      isSelected
                        ? "bg-slate-900 text-white font-semibold"
                        : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <div>
                      <div className="font-bold">{c.name}</div>
                      <div className={`text-[11px] capitalize ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                        {c.role} {c.studentId ? `• ID: ${c.studentId}` : ""}
                      </div>
                    </div>
                    <Icon name="ChevronRight" size={14} />
                  </button>
                );
              })}
              {!contacts.length && <div className="text-slate-400 text-xs py-4 text-center">No assigned contacts found.</div>}
            </div>
          )}
        </div>

        {/* Chat window */}
        <div className="md:col-span-2 flex flex-col justify-between h-[550px] p-4">
          {selectedContact ? (
            <>
              {/* Header */}
              <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{selectedContact.name}</h4>
                  <p className="text-xs text-slate-500 capitalize">{selectedContact.role} • {selectedContact.phone || selectedContact.email}</p>
                </div>
                <button
                  className="button button-sm secondary"
                  onClick={() => loadConversation(selectedContact._id)}
                >
                  <Icon name="RotateCw" size={13} />
                </button>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
                {loadingMessages ? (
                  <LoadingState label="Loading chat history…" />
                ) : (
                  <>
                    {messages.map((m) => {
                      const isMe = m.sender === user?._id || m.sender?._id === user?._id;
                      return (
                        <div
                          key={m._id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-xs md:max-w-md px-3.5 py-2 rounded-2xl text-xs ${
                              isMe
                                ? "bg-slate-900 text-white rounded-br-none"
                                : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 px-1">
                            {format12HourTime(m.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                    {!messages.length && (
                      <div className="text-center text-slate-400 text-xs py-12">
                        No messages yet. Send a note to begin conversation.
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Send Form */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  className="flex-1 p-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="Type an official message or query..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button type="submit" className="button primary px-4 py-2" disabled={sendLoading || !inputText.trim()}>
                  <Icon name="Send" size={14} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
              Select a contact to view and send messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

