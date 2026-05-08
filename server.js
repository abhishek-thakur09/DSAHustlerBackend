const express = require("express");
const mongoDb = require("./src/config/database.js");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
require("./src/middleware/passport.js");


require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());


const Authrouter = require("./src/routers/Auth.routes.js");
const Problemrouter = require("./src/routers/problems.routes.js");
const AiRouter = require("./src/routers/AIhandle.js");

app.use("/auth", Authrouter);
app.use("/api", Problemrouter);
app.use("/ai", AiRouter);



app.listen(process.env.PORT_NO, async () => {
  await mongoDb();
  console.log(`server is running correctly!! ${process.env.PORT_NO}`);
});
