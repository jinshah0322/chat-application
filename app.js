require("dotenv").config()
const express = require("express")
const { mongoose } = require("mongoose")

const app = express()

await mongoose.connect(process.env.MONGO_URL)
app.listen(process.env.PORT,()=>{
    console.log(`Server is listening on PORT: ${process.env.PORT}`);
})