import React, { useState } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");

  const [showSignup, setShowSignup] = useState(false);
  const [suUsername, setSuUsername] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suRole, setSuRole] = useState("student");

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) return alert("Enter username and password");

    try {
      const res = await fetch("https://scholarship-backend.azurewebsites.net/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return alert(data.message || "Login failed");
      }

      // Success: set cookies (include user_id returned by server)
      Cookies.set("username", username, { expires: 1 });
      Cookies.set("name", username, { expires: 1 });
      Cookies.set("role", role, { expires: 1 });
      if (data.user_id) Cookies.set("user_id", String(data.user_id), { expires: 1 });

      navigate(role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  const handleSignup = async () => {
    if (!suUsername || !suPassword) return alert("Enter username and password");

    try {
      const res = await fetch("https://scholarship-backend.azurewebsites.net/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: suUsername, password: suPassword, role: suRole }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return alert(data.message || "Signup failed");
      }

      alert(data.message || "Registered successfully");
      // Optionally fill login form with new credentials and close signup
      setUsername(suUsername);
      setPassword(suPassword);
      setRole(suRole);
      setShowSignup(false);
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  return (
    <div className="backdrop-blur-lg bg-white/60 p-10 rounded-2xl shadow-xl w-96">
      <h1 className="text-3xl font-bold text-cyan-700 text-center mb-6">Login</h1>

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full p-2 mb-4 rounded-lg border border-cyan-300 focus:outline-cyan-500"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 mb-4 rounded-lg border border-cyan-300 focus:outline-cyan-500"
      />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="w-full p-2 mb-6 rounded-lg border border-cyan-300 focus:outline-cyan-500"
      >
        <option value="student">Student</option>
        <option value="teacher">Teacher</option>
      </select>

      <button
        onClick={handleLogin}
        className="w-full bg-cyan-500 text-white py-2 rounded-xl hover:bg-cyan-700 transition mb-3"
      >
        Login
      </button>

      <button
        onClick={() => setShowSignup(true)}
        className="w-full border border-cyan-500 text-cyan-700 py-2 rounded-xl hover:bg-cyan-50 transition"
      >
        Signup
      </button>

      {showSignup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white p-6 rounded-xl w-80 shadow-lg">
            <h2 className="text-2xl font-semibold text-cyan-700 mb-4">Signup</h2>

            <input
              type="text"
              placeholder="Username"
              value={suUsername}
              onChange={(e) => setSuUsername(e.target.value)}
              className="w-full p-2 mb-3 rounded-lg border border-cyan-300 focus:outline-cyan-500"
            />

            <input
              type="password"
              placeholder="Password"
              value={suPassword}
              onChange={(e) => setSuPassword(e.target.value)}
              className="w-full p-2 mb-3 rounded-lg border border-cyan-300 focus:outline-cyan-500"
            />

            <select
              value={suRole}
              onChange={(e) => setSuRole(e.target.value)}
              className="w-full p-2 mb-4 rounded-lg border border-cyan-300 focus:outline-cyan-500"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>

            <div className="flex gap-3">
              <button
                onClick={handleSignup}
                className="flex-1 bg-cyan-500 text-white py-2 rounded-xl hover:bg-cyan-700 transition"
              >
                Register
              </button>
              <button
                onClick={() => setShowSignup(false)}
                className="flex-1 border border-cyan-500 text-cyan-700 py-2 rounded-xl hover:bg-cyan-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
