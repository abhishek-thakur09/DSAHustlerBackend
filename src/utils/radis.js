const { createClient }  =  require('redis');

const client = createClient({
    username: 'default',
    password: process.env.Redis_PASS,
    socket: {
        host: 'redis-18200.c330.asia-south1-1.gce.cloud.redislabs.com',
        port: 18200
    }
});


client.on("error", (err)=>{
    console.error("Redis client error : ", err);
})


client.on("connect", (err)=>{
    console.log("connecting to redis....");
})

client.on("ready", (err)=>{
    console.log("Ready to use!");
})


client.connect();

module.exports = client;