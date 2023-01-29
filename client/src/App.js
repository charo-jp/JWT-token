import { useState } from "react";
import axios from "axios";
import jwt_decode from "jwt-decode";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  // username: user.username,
  // isAdmin: user.isAdmin,
  // accessToken,
  // refreshToken,
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const refreshToken = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/refresh", {
        token: user.refreshToken,
      });
      setUser({
        ...user,
        // accessToken is not changed!
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      });
      return res.data;
    } catch (err) {
      console.log(err);
    }
  };

  /**
   * Create a custom instances for API requests. useful when you want to do something
   * before sending a request.
   *
   * The purpose of this instance is to check whether access token is valid.
   */
  const axiosJWT = axios.create();

  axiosJWT.interceptors.request.use(
    // do something before every request
    async (config) => {
      let currentDate = new Date();
      // decoded access token
      const decodedToken = jwt_decode(user.accessToken);
      if (decodedToken.exp * 1000 < currentDate.getTime()) {
        const data = await refreshToken();
        config.headers["authorization"] = "Bearer " + data.accessToken;
        console.log(data.accessToken);
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/login", {
        username: username,
        password: password,
      });
      setUser(res.data);
      console.log(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    setSuccess(false);
    setError(false);
    try {
      console.log(user.accessToken);

      await axiosJWT.delete(`http://localhost:5000/api/users/${id}`, {
        headers: { authorization: "Bearer " + user.accessToken },
      });
      // req.status is actually a number!
      setSuccess(true);
    } catch (err) {
      setError(true);
      console.log(err);
    }
  };

  return (
    <div className="container">
      {user ? (
        <div className="home">
          <span>
            Welcome to the <b>{user.isAdmin ? "admin" : "user"}</b> dashboard{" "}
            <b>{user.username}</b>.
          </span>
          <span>Delete Users:</span>
          <button className="deleteButton" onClick={(e) => handleDelete(e, 1)}>
            Delete Charo
          </button>
          <button className="deleteButton" onClick={(e) => handleDelete(e, 2)}>
            Delete Jane
          </button>
          {error && (
            <span className="error">
              You are not allowed to delete this user!
            </span>
          )}
          {success && (
            <span className="success">
              User has been deleted successfully...
            </span>
          )}
        </div>
      ) : (
        <div className="login">
          <form onSubmit={handleSubmit}>
            <span className="formTitle">Lama Login</span>
            <input
              type="text"
              placeholder="username"
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" className="submitButton">
              Login
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
