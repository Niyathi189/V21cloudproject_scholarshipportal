import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";

export default function Student() {
  const navigate = useNavigate();
  const name = Cookies.get("name") || Cookies.get("username") || "";
  const studentIdRaw = Cookies.get("user_id") || "";
  const studentId = Number(studentIdRaw) || null;

  const [view, setView] = useState("available"); // 'available' | 'pending'
  const [loading, setLoading] = useState(false);

  const [scholarships, setScholarships] = useState([]);
  const [pendingApps, setPendingApps] = useState([]);

  const [showApply, setShowApply] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState(null);

  // form fields for application
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [tenthMark, setTenthMark] = useState("");
  const [twelfthMark, setTwelfthMark] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [currentYear, setCurrentYear] = useState("");

  // Chatbot states
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const handleLogout = () => {
    Cookies.remove("name");
    Cookies.remove("role");
    Cookies.remove("username");
    Cookies.remove("user_id");
    navigate("/login");
  };

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return { message: await res.text().catch(() => "") || "Unexpected response" };
    }
  };

  const fetchAvailable = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://scholar-backend-hba2dpdme8dfckb0.southeastasia-01.azurewebsites.net/api/student/scholarships");
      if (!res.ok) {
        const err = await safeJson(res);
        return alert(err.message || "Failed to fetch scholarships");
      }
      const data = await res.json();
      setScholarships(data || []);
    } catch (err) {
      alert("Network error: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    if (!studentId) {
      setPendingApps([]);
      return; // silent if not logged in
    }
    setLoading(true);
    try {
      const res = await fetch(`https://scholar-backend-hba2dpdme8dfckb0.southeastasia-01.azurewebsites.net/api/student/applications/${encodeURIComponent(studentId)}`);
      if (!res.ok) {
        const err = await safeJson(res);
        return alert(err.message || "Failed to fetch your applications");
      }
      const data = await res.json();
      setPendingApps(data || []);
    } catch (err) {
      alert("Network error: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === "available") fetchAvailable();
    if (view === "pending") fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const openApply = (sch) => {
    setSelectedScholarship(sch);
    // reset form
    setFirstName("");
    setLastName("");
    setCgpa("");
    setTenthMark("");
    setTwelfthMark("");
    setAddress("");
    setPhoneNo("");
    setEmail("");
    setDepartment("");
    setCurrentYear("");
    setShowApply(true);
  };

  const submitApplication = async (e) => {
    e?.preventDefault();
    if (!selectedScholarship) return alert("No scholarship selected.");
    if (!studentId) return alert("Student ID missing. Login required.");
    // basic validation
    if (!firstName || !lastName || !email) return alert("Please provide first name, last name and email.");

    setLoading(true);
    try {
      const payload = {
        scholarship_id: Number(selectedScholarship.scholarship_id),
        student_id: Number(studentId),
        first_name: firstName,
        last_name: lastName,
        cgpa: parseFloat(cgpa) || null,
        tenth_mark: parseFloat(tenthMark) || null,
        twelfth_mark: parseFloat(twelfthMark) || null,
        address,
        phone_no: phoneNo,
        email,
        department,
        current_year: parseInt(currentYear) || null,
      };

      const res = await fetch("https://scholar-backend-hba2dpdme8dfckb0.southeastasia-01.azurewebsites.net/api/student/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);
      if (!res.ok) return alert(data.message || "Failed to apply");
      alert(data.message || "Applied successfully");
      setShowApply(false);
      setView("pending");
      fetchPending();
    } catch (err) {
      alert("Network error: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Presentation helpers
  const isExpired = (deadline) => {
    if (!deadline) return false;
    const d = new Date(deadline);
    return d < new Date();
  };
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "-");

  // Chatbot functions
  const sendChatMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !studentId) return;
    if (chatLoading) return;

    const userQuestion = chatInput.trim();
    setChatInput("");
    
    // Add user message to chat
    const userMessage = { role: "user", content: userQuestion, timestamp: new Date() };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/chatbot-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          question: userQuestion,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      // Add bot response to chat
      const botMessage = {
        role: "assistant",
        content: data.answer || "I'm sorry, I couldn't process your question.",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage = {
        role: "assistant",
        content: `Error: ${err.message || "Failed to connect to chatbot. Please try again."}`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex relative">
      {/* LEFT SIDEBAR */}
      <aside className="w-72 bg-white shadow-lg border-r flex-shrink-0">
        <div className="px-6 py-6 border-b">
          <div className="text-2xl font-bold text-cyan-700">ScholarHub</div>
          <div className="text-sm text-gray-500 mt-1">Student Dashboard</div>
        </div>

        <div className="px-4 py-6">
          <div className="text-sm text-gray-600 mb-2">Welcome</div>
          <div className="font-medium text-gray-800 mb-4">{name || "Student"}</div>

          <nav className="space-y-2">
            <button
              onClick={() => setView("available")}
              className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${view === "available" ? "bg-cyan-50 border border-cyan-200 text-cyan-700" : "hover:bg-gray-50"}`}
            >
              <span className="text-lg">📚</span>
              <div>
                <div className="font-medium">Available Scholarships</div>
                <div className="text-xs text-gray-500">Browse open opportunities</div>
              </div>
            </button>

            <button
              onClick={() => setView("pending")}
              className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${view === "pending" ? "bg-cyan-50 border border-cyan-200 text-cyan-700" : "hover:bg-gray-50"}`}
            >
              <span className="text-lg">📝</span>
              <div>
                <div className="font-medium">Your Applications</div>
                <div className="text-xs text-gray-500">Pending / processed</div>
              </div>
            </button>

            <button
              onClick={() => setShowChatbot(!showChatbot)}
              className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${showChatbot ? "bg-cyan-50 border border-cyan-200 text-cyan-700" : "hover:bg-gray-50"}`}
            >
              <span className="text-lg">💬</span>
              <div>
                <div className="font-medium">Chatbot Helper</div>
                <div className="text-xs text-gray-500">Ask questions about scholarships</div>
              </div>
            </button>
          </nav>

          <div className="mt-6">
            <label className="text-xs text-gray-500">Student ID</label>
            <div className="mt-1 text-sm font-medium text-gray-700">{studentIdRaw || "Not logged in"}</div>
          </div>
        </div>

        <div className="px-6 mt-auto py-6 border-t">
          <button onClick={handleLogout} className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600">
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">{view === "available" ? "Available Scholarships" : "Your Applications"}</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">{loading ? "Loading..." : `${view === "available" ? scholarships.length : pendingApps.length} items`}</div>
            <button
              onClick={() => setShowChatbot(!showChatbot)}
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 flex items-center gap-2 transition"
            >
              <span>💬</span>
              <span>Chatbot Helper</span>
            </button>
          </div>
        </header>

        {view === "available" && (
          <section>
            {scholarships.length === 0 && !loading && (
              <div className="rounded-md bg-white p-6 shadow-sm text-center text-gray-600">No scholarships available at the moment.</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scholarships.map((s) => (
                <article key={s.scholarship_id} className="bg-white p-5 rounded-lg shadow-sm border hover:shadow-md transition relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{s.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{s.description || "No description provided."}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-1 rounded ${isExpired(s.deadline) ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {isExpired(s.deadline) ? "Closed" : "Open"}
                      </div>
                      <div className="text-xs text-gray-400 mt-2">Deadline</div>
                      <div className="text-sm font-medium">{formatDate(s.deadline)}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-500">Created by: {s.teacher_name || s.teacher_id || "—"}</div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openApply(s)}
                        disabled={isExpired(s.deadline)}
                        className={`px-3 py-1 rounded-md text-white ${isExpired(s.deadline) ? "bg-gray-300 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-700"}`}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {view === "pending" && (
          <section>
            {pendingApps.length === 0 && !loading && (
              <div className="rounded-md bg-white p-6 shadow-sm text-center text-gray-600">You have no applications yet.</div>
            )}

            <div className="space-y-4">
              {pendingApps.map((a) => (
                <div key={a.application_id} className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between">
                  <div>
                    <div className="text-md font-medium text-gray-800">{a.title}</div>
                    <div className="text-sm text-gray-500">Applied: {a.applied_at ? new Date(a.applied_at).toLocaleString() : "-"}</div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-block px-3 py-1 rounded text-sm ${a.status === "approved" ? "bg-green-100 text-green-700" : a.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {a.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* APPLY MODAL */}
      {showApply && selectedScholarship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Apply: {selectedScholarship.title}</h2>
              <button onClick={() => setShowApply(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <form onSubmit={submitApplication} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="w-full p-3 border rounded-md" />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="w-full p-3 border rounded-md" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="CGPA" className="w-full p-3 border rounded-md" />
                <input value={tenthMark} onChange={(e) => setTenthMark(e.target.value)} placeholder="10th mark" className="w-full p-3 border rounded-md" />
                <input value={twelfthMark} onChange={(e) => setTwelfthMark(e.target.value)} placeholder="12th mark" className="w-full p-3 border rounded-md" />
              </div>

              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="w-full p-3 border rounded-md" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} placeholder="Phone no" className="w-full p-3 border rounded-md" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border rounded-md" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department" className="w-full p-3 border rounded-md" />
                <input value={currentYear} onChange={(e) => setCurrentYear(e.target.value)} placeholder="Current year" className="w-full p-3 border rounded-md" />
              </div>

              <div className="flex items-center gap-3 justify-end mt-4">
                <button type="button" onClick={() => setShowApply(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2 rounded-md bg-cyan-600 text-white hover:bg-cyan-700">
                  {loading ? "Applying..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHATBOT SIDEBAR */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l z-50 transition-transform duration-300 ease-in-out ${
          showChatbot ? "translate-x-0" : "translate-x-full"
        } flex flex-col`}
      >
        {/* Chatbot Header */}
        <div className="px-6 py-4 border-b bg-cyan-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-cyan-700">Scholarship Helper</h3>
            <p className="text-xs text-gray-600">Ask me anything about your applications</p>
          </div>
          <button
            onClick={() => setShowChatbot(false)}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <div className="text-4xl mb-2">🤖</div>
              <p className="text-sm">Hello! I'm your Scholarship Form Helper.</p>
              <p className="text-xs mt-2">Ask me about your applications, requirements, or any scholarship-related questions!</p>
            </div>
          )}
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-cyan-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t p-4">
          <form onSubmit={sendChatMessage} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={chatLoading || !studentId}
            />
            <button
              type="submit"
              disabled={chatLoading || !studentId || !chatInput.trim()}
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {chatLoading ? "..." : "Send"}
            </button>
          </form>
          {!studentId && (
            <p className="text-xs text-red-500 mt-2">Please log in to use the chatbot</p>
          )}
        </div>
      </div>

      {/* Floating Chatbot Button */}
      {!showChatbot && (
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-cyan-600 text-white rounded-full shadow-lg hover:bg-cyan-700 transition-all hover:scale-110 flex items-center justify-center text-2xl z-40"
          title="Open Chatbot Helper"
        >
          💬
        </button>
      )}
    </div>
  );
}
