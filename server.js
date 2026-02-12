const express = require("express");
const mongoDb = require("./src/config/database.js");
const cors = require("cors");
const cookieParser = require("cookie-parser");


require("dotenv").config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));


app.use(express.json());

app.use(cookieParser());




const authroute = require("./src/routers/Auth.routes.js");
const Problems = require("./src/routers/problems.routes.js");

app.use("/auth", authroute);
app.use("/api", Problems);


app.listen(process.env.PORT_NO, async()=>{
    await mongoDb();
    console.log(`server is running correctly!! ${process.env.PORT_NO}`);
})

