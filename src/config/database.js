const mongoose = require("mongoose");
require("dotenv").config();


const mongoDb = async()=>{
    try{
        await mongoose.connect(process.env.MongoDb_URL);
        console.log("mongoDb connected successfully!!");
    }
    catch(error){
        console.error("mongoDb connection is not extablish!!", error.message);
    }
}

module.exports = mongoDb;
