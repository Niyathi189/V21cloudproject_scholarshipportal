import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import Login from "./pages/Login";
import Teacher from "./pages/Teacher";
import Student from "./pages/Student";

function App() {
  const user = Cookies.get("role");

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={user === "teacher" ? "/teacher" : "/student"} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/teacher" element={<Teacher />} />
      <Route path="/student" element={<Student />} />
    </Routes>
  );
}

function ProtectedRoute({ role, Component }) {
  const navigate = useNavigate();
  const userRole = Cookies.get("role");

  React.useEffect(() => {
    if (userRole !== role) navigate("/login");
  }, [userRole]);

  return userRole === role ? <Component /> : null;
}

export default App;
