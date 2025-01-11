import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { error, log } from "console";

dotenv.config({
    path: "./env"
});

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    })
})
.catch((err)  => {
    console.log("connection failed");
})





















import express from "express";
const app = express();
/*
(async ()=>{
    try {
       await mongoose.connect(`${process.env.MONGO_URI}/DB_NAME}`)
       app.on("error",(error)=>{
        console.log("ERROR: ", error);
        throw err
       })
       app.listen(process.env.PORT,()=>{
           console.log(`Server is running on port ${process.env.PORT}`);
       })
    } catch (error) {
        console.log("ERROR: ", error);
        throw err
    }
})
*/