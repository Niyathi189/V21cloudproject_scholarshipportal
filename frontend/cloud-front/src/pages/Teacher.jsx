import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";

export default function Teacher() {
  const navigate = useNavigate();
  const cookieName = Cookies.get("name") || Cookies.get("username") || "";
  const [name] = useState(cookieName);

  // use user_id cookie set by login
  const [view, setView] = useState("create"); // 'create' | 'manage'
  const [teacherId, setTeacherId] = useState(Cookies.get("user_id") || "");
  const [loading, setLoading] = useState(false);

  // Create scholarship form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  // Scholarships & applications
  const [scholarships, setScholarships] = useState([]);
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [applications, setApplications] = useState([]);

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

  const isNumericId = (id) => {
    if (id === undefined || id === null) return false;  
    return !Number.isNaN(Number(id)) && String(id).trim() !== "";
  };

  const createScholarship = async (e) => {
    e?.preventDefault();
    const id = Number(teacherId);
    if (!isNumericId(id)) return alert("Teacher ID is required and must be a number (cookie 'user_id' or enter it).");
    if (!title || !deadline) return alert("Please provide title and deadline.");

    setLoading(true);
    try {
      const res = await fetch("https://scholarship-backend.azurewebsites.net/api/teacher/createScholarship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: id,
          title,
          description,
          deadline,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) return alert(data.message || "Failed to create scholarship");
      alert(data.message || "Scholarship created successfully");
      setTitle("");
      setDescription("");
      setDeadline("");
      if (view === "manage") fetchScholarships();
    } catch (err) {
      alert("Network error: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const fetchScholarships = async () => {
    if (!isNumericId(teacherId)) {
      setScholarships([]);
      setSelectedScholarship(null);
      setApplications([]);
      return;
    }
    const id = Number(teacherId);
    setLoading(true);
    try {
      const res = await fetch(`https://scholarship-backend.azurewebsites.net/api/teacher/scholarships/${encodeURIComponent(id)}`);
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

  const fetchApplications = async (scholarship) => {
    if (!scholarship) return;
    const sid = scholarship.scholarship_id;
    if (!sid) return alert("Invalid scholarship selected.");
    setSelectedScholarship(scholarship);
    setApplications([]);
    setLoading(true);
    try {
      const res = await fetch(`https://scholarship-backend.azurewebsites.net/api/teacher/applications/${sid}`);
      if (!res.ok) {
        const err = await safeJson(res);
        return alert(err.message || "Failed to fetch applications");
      }
      const data = await res.json();
      setApplications(data || []);
    } catch (err) {
      alert("Network error: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (application_id, status) => {
    if (!application_id) return;
    try {
      const res = await fetch("https://scholarship-backend.azurewebsites.net/api/teacher/updateApplicationStatus", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id, status }),
      });
      const data = await safeJson(res);
      if (!res.ok) return alert(data.message || "Failed to update status");
      alert(data.message || "Status updated successfully");
      if (selectedScholarship) fetchApplications(selectedScholarship);
    } catch (err) {
      alert("Network error: " + (err.message || err));
    }
  };

  useEffect(() => {
    if (view === "manage" && isNumericId(teacherId)) fetchScholarships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, teacherId]);

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "-");

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* LEFT SIDEBAR */}
      <aside className="w-72 bg-white shadow-lg border-r flex-shrink-0">
        <div className="px-6 py-6 border-b">
          <div className="text-2xl font-bold text-cyan-700">ScholarHub</div>
          <div className="text-sm text-gray-500 mt-1">Teacher Dashboard</div>
        </div>

        <div className="px-4 py-6">
          <div className="text-sm text-gray-600 mb-2">Welcome</div>
          <div className="font-medium text-gray-800 mb-4">{name || "Teacher"}</div>

          <nav className="space-y-2">
            <button
              onClick={() => setView("create")}
              className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${view === "create" ? "bg-cyan-50 border border-cyan-200 text-cyan-700" : "hover:bg-gray-50"}`}
            >
              <span className="text-lg">➕</span>
              <div>
                <div className="font-medium">Create Scholarship</div>
                <div className="text-xs text-gray-500">Add new opportunity</div>
              </div>
            </button>

            <button
              onClick={() => setView("manage")}
              className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${view === "manage" ? "bg-cyan-50 border border-cyan-200 text-cyan-700" : "hover:bg-gray-50"}`}
            >
              <span className="text-lg">🗂️</span>
              <div>
                <div className="font-medium">Manage Applications</div>
                <div className="text-xs text-gray-500">View & review applicants</div>
              </div>
            </button>
          </nav>

          <div className="mt-6">
            <label className="text-xs text-gray-500">Teacher ID</label>
            <div className="mt-1">
              <input
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Numeric teacher id (from login)"
              />
              {!isNumericId(teacherId) && (
                <p className="text-xs text-red-600 mt-1">Teacher id must be numeric for API calls.</p>
              )}
            </div>
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
          <h1 className="text-2xl font-semibold text-gray-800">{view === "create" ? "Create Scholarship" : "Manage Applications"}</h1>
          <div className="text-sm text-gray-600">{loading ? "Loading..." : `${scholarships.length} scholarships`}</div>
        </header>

        {view === "create" && (
          <section className="max-w-3xl">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-800 mb-4">New Scholarship</h3>

              <form onSubmit={createScholarship} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-700">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full mt-2 p-3 border rounded-md"
                    placeholder="Merit Scholarship"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full mt-2 p-3 border rounded-md"
                    placeholder="For top students..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-700">Deadline</label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full mt-2 p-3 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-700">Teacher ID (used by API)</label>
                    <input
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                      className="w-full mt-2 p-3 border rounded-md"
                      placeholder="Numeric teacher id"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button type="submit" disabled={loading} className="bg-cyan-600 text-white px-4 py-2 rounded-md hover:bg-cyan-700">
                    {loading ? "Creating..." : "Create Scholarship"}
                  </button>
                  <button type="button" onClick={() => { setTitle(""); setDescription(""); setDeadline(""); }} className="px-4 py-2 border rounded-md">
                    Reset
                  </button>
                </div>

                <div className="mt-4 text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  Students will fill: First name, Last name, CGPA, 10th mark, 12th mark, Address, Phone, Email, Department, Current year.
                </div>
              </form>
            </div>
          </section>
        )}

        {view === "manage" && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Your Scholarships</h3>

              {loading && <div className="text-sm text-gray-500">Loading...</div>}
              {!loading && scholarships.length === 0 && <div className="text-sm text-gray-500">No scholarships found.</div>}

              <ul className="space-y-3">
                {scholarships.map((s) => (
                  <li
                    key={s.scholarship_id}
                    onClick={() => fetchApplications(s)}
                    className={`p-3 rounded cursor-pointer border ${selectedScholarship?.scholarship_id === s.scholarship_id ? "bg-cyan-50 border-cyan-200" : "bg-white"}`}
                  >
                    <div className="font-medium text-gray-800">{s.title}</div>
                    <div className="text-xs text-gray-500 mt-1">Deadline: {formatDate(s.deadline)}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Applications {selectedScholarship ? `for "${selectedScholarship.title}"` : ""}
              </h3>

              {!selectedScholarship && <div className="text-sm text-gray-500">Select a scholarship to view applications.</div>}

              {selectedScholarship && (
                <>
                  {loading && <div className="text-sm text-gray-500">Loading applications...</div>}
                  {!loading && applications.length === 0 && <div className="text-sm text-gray-500">No applications yet.</div>}

                  <ul className="space-y-3">
                    {applications.map((app) => (
                      <li key={app.application_id} className="p-4 rounded border bg-white flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{app.first_name} {app.last_name || ""}</div>
                          <div className="text-sm text-gray-500">Email: {app.email || "—"}</div>
                          <div className="text-xs text-gray-400">Applied: {app.applied_at ? new Date(app.applied_at).toLocaleString() : "-"}</div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className={`inline-block px-3 py-1 rounded text-sm ${app.status === "approved" ? "bg-green-100 text-green-700" : app.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {app.status}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => updateApplicationStatus(app.application_id, "approved")}
                              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                              disabled={app.status === "approved"}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateApplicationStatus(app.application_id, "rejected")}
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                              disabled={app.status === "rejected"}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
