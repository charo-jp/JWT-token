const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const cookie = require("cookie");
const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ["http://localhost:3000"],
  credentials: true
}));

const users = [
  {
    id: "1",
    username: "charo",
    password: "charo",
    isAdmin: true,
  },
  {
    id: "2",
    username: "jane",
    password: "janeaaa111Charoddf33",
    isAdmin: false,
  },
];

let refreshTokens = [];

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, isAdmin: user.isAdmin }, "mySecretKey", {
    expiresIn: "10s",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, isAdmin: user.isAdmin }, "myRefreshSecretKey");
};

app.post("/api/auto-login", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json("You need to log-in");
  jwt.verify(refreshToken, "myRefreshSecretKey", (err, user) => {
    err && console.log(err);

    const newAccessToken = generateAccessToken(user);

    refreshTokens.push(refreshToken);

    res.status(200).json({
      username: user.username,
      isAdmin: user.isAdmin,
      accessToken: newAccessToken,
    });
  });
})

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find((u) => {
    return u.username === username && u.password === password;
  });

  if (user) {
    // genereate access token
    const accessToken = generateAccessToken(user);

    const refreshToken = generateRefreshToken(user);

    refreshTokens.push(refreshToken);
    res.cookie("refreshToken", refreshToken, {httpOnly: true}).json({
      username: user.username,
      isAdmin: user.isAdmin,
      accessToken
    });
  } else {
    res.status(400).json("Username or password incorrect");
  }
});

/**
 * once a server receives a refreshtoken and confirms its validation,
 * we return brand new refresh token and access token
 */
app.post("/api/access", (req, res) => {
  // take the refresh token from the user
  const refreshToken = req.cookies.refreshToken;
  // send error if there is no token or it is invalid
  if (!refreshToken) return res.status(401).json("You are not authenticated");
  if (!refreshTokens.includes(refreshToken))
    return res.status(403).json("Refresh token is not valid");
  // create new access token and refresh token and send them to a user
  jwt.verify(refreshToken, "myRefreshSecretKey", (err, user) => {
    err && console.log(err);
    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);

    const newAccessToken = generateAccessToken(user);

    const newRefreshToken = generateRefreshToken(user);

    refreshTokens.push(newRefreshToken);

    res.status(200).cookie("refreshToken", newRefreshToken, {httpOnly: true}).json({
      accessToken: newAccessToken,
    });
  });
});

// checks whether accesstoken is valid.
const verify = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    // access token
    const token = authHeader.split(" ")[1];
    jwt.verify(token, "mySecretKey", (err, user) => {
      if (err) {
        console.log(err);
        return res.status(403).json("Token is not valid");
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json("You are not authenticated");
  }
};

app.delete("/api/users/:userId", verify, (req, res) => {
  // Delete a user if id belongs to you or if you are admin.
  if (req.user.id === req.params.userId || req.user.isAdmin) {
    res.status(200).json("User has been deleted");
  } else {
    res.status(403).json("You are not allowed to delete this user.");
  }
});

// Taking refresh token out of refreshtokens disables others to get a new access token.
// Both refresh token and access token required!
app.post("/api/logout", verify, (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  refreshTokens = refreshTokens.filter((token) => token != refreshToken);
  res.status(200).json("You logged out successfully");
});

app.listen(5000, () => {
  console.log("The server is running on 5000");
});
