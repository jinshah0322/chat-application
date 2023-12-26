require("dotenv").config()
const express = require("express")
const { mongoose } = require("mongoose")
const bodyParser = require("body-parser")
const userRoute = require("./routes/userRoute")
const session = require("express-session")
const User = require("./models/userModel")
const Chat = require("./models/chatModel")

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

const io = require("socket.io")(http)
var usp= io.of('/user-namespace')  //created user name space
usp.on('connection',async (socket)=>{
    const userId = socket.handshake.auth.token
    console.log(`UserID ${userId} connected`);
    await User.updateOne({_id:userId},{$set:{is_online:'1'}})
    //Broadcasting the user as online
    socket.broadcast.emit("getOnlineUser",{userId:userId})

    //chatting implementation
    socket.on("newChat",(data)=>{
        socket.broadcast.emit("loadNewChat",data) 
    })

    //load old chats
    socket.on("existsChat",async (data)=>{
        const chats = await Chat.find({
            $or:[
                {sender_id:data.sender_id,receiver_id:data.receiver_id},
                {sender_id:data.receiver_id,receiver_id:data.sender_id}
            ]
        })
        socket.emit("loadChats",{chats:chats})
    })

    socket.on('disconnect',async ()=>{
        await User.updateOne({_id:userId},{$set:{is_online:'0'}})
        //Broadcasting the user as offline
        socket.broadcast.emit("getOfflineUser",{userId:userId})
        console.log('user disconnected');
    })
})


http.listen(process.env.PORT,()=>{
    console.log(`Server is listening on PORT: ${process.env.PORT}`);
})