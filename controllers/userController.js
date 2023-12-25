const User = require("../models/userModel")
const bcryptjs = require("bcryptjs")
const sendEmail = require("../helper/sendEmail")
const mongoose = require("mongoose")
const Chat = require("../models/chatModel")
const registerLoad = async (req,res)=>{
    try{
        res.render("register")
    } catch(error){
        console.log(error);
    }
}

const register = async(req,res)=>{
    try{
        const {username,email,mobile,password} = req.body
        const existingUserEmail = await User.findOne({ email: email });
        const existingUserNumber = await User.findOne({ mobile: mobile });
        if(!existingUserEmail){
            if(!existingUserNumber){
                if(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(email)){
                    if(/^(\+\d{1,3}[- ]?)?\d{10}$/.test(mobile)){
                        if(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,1024}$/.test(password)){
                            const salt = await bcryptjs.genSalt(10);    
                            const hashedPassword = await bcryptjs.hash(password, salt)
                            const user = new User({
                                username:username,
                                email:email,
                                password:hashedPassword,
                                image:"images/"+req.file.filename,
                                mobile:mobile
                            })
                            const html = `
                                <h2>Welcome to our chat application </h2>
                                <p>Dear ${username},</p>
                                <p>Thank you for joining our chatting community! We are excited to have you on board. With our application, you can connect with friends, chat with new people, and enjoy a seamless communication experience. To get started, log in to your account and explore the features of our application. If you have any questions or need assistance, feel free to contact our support team at <a href="mailto:jinshah0322@gmail.com">jinshah0322@gmail.com</a></p>
                                <p>Best regards,<br>[Jinay Shah]</p>
                            `
                            const data = {
                                to: email,
                                text: `Hey ${username}`,
                                subject: "Welcome to our chat application ",
                                html: html
                            }
                            sendEmail(data)
                            await user.save()
                            res.redirect('/')
                        } else{res.render('register',{message:'Enter strong password'})}
                    } else{res.render('register',{message:'Enter Valid moile number'})}
                } else{res.render('register',{message:'Enter Valid email address'})}
            } else{res.render('register',{message:'User with same Mobile Number already exist'})}
        } else{res.render('register',{message:'User with same email address already exist'})}
    } catch(error){
        console.log(error);
    }
}

const loginLoad = async(req,res)=>{
    try{
        res.render("login")
    } catch(error){ 
        console.log(error);
    }
}

const login = async(req,res)=>{
    try{
        const { email, password } = req.body
        const user = await User.findOne({ email: email })
        if (!user) {
            res.render('login',{ message: "User not found", success: false})
        } else {
            const validPassword = await bcryptjs.compare(password, user.password)
            if (!validPassword) {
                res.render('login',{ message: "Incorrect Password", success: false})
            } else {
                req.session.user = user
                res.redirect('/dashboard')
            }
        }
    }catch(error){
        console.log(error);
    }
}

const logout = async(req,res)=>{
    try{
        req.session.destroy()
        res.redirect("/")
    } catch(error){
        console.log(error);
    }
}

const loaddashboard = async(req,res)=>{
    try{
        const currentId = req.session.user._id
        const friends = (await User.find({_id:currentId},{friends:1,_id:0}))[0].friends
        const users = await User.find({_id:{$in:friends}})
        res.render("dashboard",{user:await User.findOne({_id:currentId}),users:users})
    }catch(error){
        console.log(error);
    }
}

const loadprofile = async(req,res)=>{
    try{
        const currentId = req.session.user._id
        res.render("profile",{user:await User.findOne({_id:currentId})})
    }catch(error){
        console.log(error);
    }
}

const loadreqsent = async(req,res)=>{
    try{
        res.render("requestsent")
    }catch(error){
        console.log(error);
    }
}

const reqsent = async(req,res)=>{
    try{
        const searchTerm = req.body.searchTerm
        var users = await User.find(
            {$or: [
            { username: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { mobile: { $regex: searchTerm, $options: 'i' } },
        ]});
        const currentID = req.session.user._id
        users = users.filter(item=>item._id.toString()!==currentID)
        var reqsentid = await User.find({_id:currentID},{requestsSent:1,_id:0})
        var reqsentid = reqsentid.map(doc => doc.requestsSent).flat();
        users= users.filter(item=>!reqsentid.toString().includes(item._id.toString()))
        console.log(users);
        res.render('requestsent', { users, searchTerm });
    } catch(error){
        console.log(error);
    }
}

const sendrequest = async(req,res)=>{
    const userId = req.body.userId;
    const currentId = req.session.user._id
    await User.updateOne({_id:userId},{$push:{requestsReceived:currentId}})
    await User.updateOne({_id:currentId},{$push:{requestsSent:userId}})
    res.redirect("/dashboard")
}

const pendingrequest = async(req,res)=>{
    try{
        const currentID = req.session.user._id
        var reqrecid = await User.find({_id:currentID},{requestsReceived:1,_id:0})
        var reqrecid = reqrecid.map(doc => doc.requestsReceived).flat();
        const users = await User.find({_id:{$in:reqrecid}})
        res.render("pendingrequest",{users:users})
    }catch(error){
        console.log(error);
    }
}

const finishrequest = async(req,res)=>{
    const {userId,accept} = req.body
    const currentId = req.session.user._id
    if(accept){
        await User.updateOne({_id:currentId},{$pull:{requestsReceived:userId}})
        await User.updateOne({_id:userId},{$pull:{requestsSent:currentId}})
        await User.updateOne({_id:currentId},{$push:{friends:userId}})
        await User.updateOne({_id:userId},{$push:{friends:currentId}})
    } else{
        await User.updateOne({_id:userId},{$pull:{requestsSent:currentId}})
        await User.updateOne({_id:currentId},{$pull:{requestsReceived:userId}})
    }
    res.redirect('/pendingrequest')
}

const saveChat = async (req,res)=>{
    try{
        var chat = new Chat({
            sender_id:req.body.sender_id,
            receiver_id:req.body.receiver_id,
            message:req.body.message
        })
        var newChat = await chat.save()
        res.status(200).send({success:true,message:"Chat added to db successfully",data:newChat})
    }catch(error){
        res.status(400).send({success:false,message:error.message})
    }
}

const loadForgotPassword = async(req,res)=>{
    try{
        res.render("forgotpassword")
    }catch(error){
        console.log(error.message);
    }
}

const forgotPassword = async(req,res)=>{
    try{
        const email = req.body.email
        const user = await User.findOne({email:email})
        const characters = process.env.PASSWORD_GENERATOR_STRING;
        if(user){
            let generatedPassword = '';
            for (let i = 0; i < 15; i++) {
                const randomIndex = Math.floor(Math.random() * characters.length);
                generatedPassword += characters.charAt(randomIndex);
            }
            const salt = await bcryptjs.genSalt(10);    
            const hashedPassword = await bcryptjs.hash(generatedPassword, salt)
            await User.updateOne({email:email},{$set:{password:hashedPassword}})
            const html = `
            <h2>Password Recovery Instructions</h2>
            <p>Dear ${user.username},</p>
            <p>We received a request to recover your account password. If you did not initiate this request, please disregard this email.</p>
            <p>Your new temporary password is <b>${generatedPassword}</b> you can change this later after loging in.Please dont share this to other for you safety purpose.If you have any questions or did not request a password reset, please contact our support team at <a href="mailto:jinshah0322@gmail.com">jinshah0322@gmail.com</a>.</p>
            <p>Best regards,<br>Jinay Shah</p>
            `
            const data = {
                to: email,
                text: `Recover Password`,
                subject: "Password Recovery Instructions",
                html: html
            }
            sendEmail(data)
            res.render("forgotpassword",{message:"Check your email address",success:true})
        } else{
            res.render("forgotpassword",{message:"user not found",success:false})
        }
    }catch(error){
        console.log(error.message);
    }
}

const loadChangePassword = async(req,res)=>{
    try{    
        res.render("changepassword")
    }catch(error){
        console.log(error.message);
    }
}

const changePassword = async(req,res)=>{
    try{
        const currentId = req.session.user._id
        const user = await User.findOne({_id:currentId})
        const {oldPassword,newPassword} = req.body
        const validPassword = await bcryptjs.compare(oldPassword, user.password)
        if (!validPassword) {
            res.render('changepassword',{ message: "Old Password is incorrect", success: false})
        } else {
            if(await bcryptjs.compare(newPassword, user.password)){
                res.render('changepassword',{ message: "Password same as previous", success: false})
            } else{
                if(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,1024}$/.test(newPassword)){
                    const salt = await bcryptjs.genSalt(10);    
                    const hashedPassword = await bcryptjs.hash(newPassword, salt)
                    await User.updateOne({_id:currentId},{$set:{password:hashedPassword}})
                    const html = `
                    <h2>Password Recovery Instructions</h2>
                    <p>Dear ${user.username},</p>
                    <p>We received a request to change your account password. If you did not initiate this request, please or if you have any questions or did not request a password change, please contact our support team at <a href="mailto:jinshah0322@gmail.com">jinshah0322@gmail.com</a>.</p>
                    <p>As per your request we have successfully changed your password you can verify it by again loging in.</p>
                    <p>Best regards,<br>Jinay Shah</p>
                    `
                    const data = {
                        to: user.email,
                        text: `Change Password`,
                        subject: "Password Reset Instructions",
                        html: html
                    }
                    sendEmail(data)
                    res.redirect('/profile')
                } else{
                    res.render('changepassword',{message:'Enter strong password'})
                }
            }
        }
    }catch(error){
        console.log(error.message);
    }
}

module.exports = {
    registerLoad,register,loginLoad,login,logout,loaddashboard,loadprofile,loadreqsent,reqsent,sendrequest,pendingrequest,finishrequest,saveChat,loadForgotPassword,forgotPassword,loadChangePassword,changePassword
}