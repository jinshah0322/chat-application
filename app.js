require("dotenv").config()
const express = require("express")
const { mongoose } = require("mongoose")
const bodyParser = require("body-parser")
const userRoute = require("./routes/userRoute")
const session = require("express-session")

const app = express()
const http = require('http').Server(app)
app.use(session({secret:process.env.EXPRESS_SESSION_SECRET}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
app.set('views', './views')
app.use(express.static('public'))

mongoose.connect(process.env.MONGO_URL)

app.use("/",userRoute)

http.listen(process.env.PORT,()=>{
    console.log(`Server is listening on PORT: ${process.env.PORT}`);
})