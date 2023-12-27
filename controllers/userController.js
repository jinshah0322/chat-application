const User = require("../models/userModel")
const bcryptjs = require("bcryptjs")
const sendEmail = require("../helper/sendEmail")
const mongoose = require("mongoose")
const Chat = require("../models/chatModel")
const Activity = require("../models/activityModel");


const registerLoad = async (req,res)=>{
    try{
        res.render("register")
    } catch(error){
        console.log(error.message);
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
                            const activity = new Activity({
                                activityType: "userRegistration",
                                userId: user._id,
                            });
                            await activity.save();
                            res.redirect('/')
                        } else{res.render('register',{message:'Enter strong password'})}
                    } else{res.render('register',{message:'Enter Valid moile number'})}
                } else{res.render('register',{message:'Enter Valid email address'})}
            } else{res.render('register',{message:'User with same Mobile Number already exist'})}
        } else{res.render('register',{message:'User with same email address already exist'})}
    } catch(error){
        console.log(error.message);
    }
}

const loginLoad = async(req,res)=>{
    try{
        res.render("login")
    } catch(error){ 
        console.log(error.message);
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
                const activity = new Activity({
                    activityType: "userLogin",
                    userId: user._id,
                });
                await activity.save();
                if(user.isAdmin){
                    res.redirect("/admin")
                } else{
                    res.redirect('/dashboard')
                }
            }
        }
    }catch(error){
        console.log(error.message);
    }
}

const logout = async(req,res)=>{
    try{
        const activity = new Activity({
            activityType: "userLogout",
            userId: req.session.user._id, 
        });
        await activity.save();
        req.session.destroy()
        res.redirect("/")
    } catch(error){
        console.log(error.message);
    }
}

const loaddashboard = async(req,res)=>{
    try{
        const currentId = req.session.user._id
        const friends = (await User.find({_id:currentId},{friends:1,_id:0}))[0].friends
        const users = await User.find({_id:{$in:friends}})
        res.render("dashboard",{user:await User.findOne({_id:currentId}),users:users})
    }catch(error){
        console.log(error.message);
    }
}

const loadprofile = async(req,res)=>{
    try{
        const currentId = req.session.user._id
        res.render("profile",{user:await User.findOne({_id:currentId})})
    }catch(error){
        console.log(error.message);
    }
}

const loadreqsent = async(req,res)=>{
    try{
        res.render("requestsent")
    }catch(error){
        console.log(error.message);
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
        reqsentid = reqsentid.map(doc => doc.requestsSent).flat();
        users= users.filter(item=>!reqsentid.toString().includes(item._id.toString()))
        reqsentid = await User.find({_id:currentID},{friends:1,_id:0})
        reqsentid = reqsentid.map(doc => doc.friends).flat();
        users= users.filter(item=>!reqsentid.toString().includes(item._id.toString()))
        res.render('requestsent', { users, searchTerm });
    } catch(error){
        console.log(error.message);
    }
}

const sendrequest = async(req,res)=>{
    const userId = req.body.userId;
    const currentId = req.session.user._id
    await User.updateOne({_id:userId},{$push:{requestsReceived:currentId}})
    await User.updateOne({_id:currentId},{$push:{requestsSent:userId}})
    const activity = new Activity({
        activityType: "userSentRequest",
        userId: req.session.user._id, 
    });
    await activity.save();
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
        console.log(error.message);
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
        const activity = new Activity({
            activityType: "userAcceptedRequest",
            userId: req.session.user._id, 
        });
        await activity.save();
    } else{
        await User.updateOne({_id:userId},{$pull:{requestsSent:currentId}})
        await User.updateOne({_id:currentId},{$pull:{requestsReceived:userId}})
        const activity = new Activity({
            activityType: "userRejectedRequest",
            userId: req.session.user._id, 
        });
        await activity.save();
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
        const activity = new Activity({
            activityType: "UserChatting",
            userId: req.session.user._id, 
        });
        await activity.save();
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
            const activity = new Activity({
                activityType: "userForgotPassword",
                userId: req.session.user._id, 
            });
            await activity.save();
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
                    const activity = new Activity({
                        activityType: "userChangedPassword",
                        userId: req.session.user._id, 
                    });
                    await activity.save();
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

const loadEditProfile = async(req,res)=>{
    try{
        const userId = req.session.user._id
        const user = await User.findOne({_id:userId})
        res.render("editprofile",{user:user})
    }catch(error){
        console.log(error.message);
    }
}

const editProfile = async(req,res)=>{
    try{
        const {username,email,mobile} = req.body
        const userId = req.session.user._id
        const user = await User.findOne({_id:userId})
        if(username == ''){
            return res.json({render: "/editprofile",message:'Username can not be empty'})
        }
        if(username){
            var usernameupdate = User.updateOne({_id:userId},{username:username})
        }
        if (req.file) {
            var userimage = User.updateOne({_id:userId},{image:"images/"+req.file.filename})
        }
        if(mobile){
            if(/^(\+\d{1,3}[- ]?)?\d{10}$/.test(mobile)){
                const allNumber = await User.find({mobile:mobile})
                if(allNumber.length == 0){
                    var numberupdate = User.updateOne({_id:userId},{mobile:mobile})
                } else{
                    return res.json({render: "/editprofile",message:'User with same Mobile Number already exist'})
                }
            } else{
                return res.json({render: "/editprofile",message:'Enter Valid moile number'})
            }
        }
        if(email){
            if(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(email)){
                const allEmail = await User.find({email:email})
                if(allEmail.length == 0){
                    var emailupdate = User.updateOne({_id:userId},{email:email})
                } else{
                    return res.json({render: "/editprofile",message:'User with same email address already exist'})
                }   
            } else{
               return res.json({render: "/editprofile",message:'Enter Valid email address'})
            }
        }
        await userimage
        await usernameupdate
        await numberupdate
        await emailupdate
        const oldEmail = user.email
        const updatedUser = await User.updateOne({email:oldEmail},{username,email,mobile})
        const html = `
                <h2>Your Profile has been Updatedn </h2>
                <p>Dear ${username},</p>
                <p>We want to inform you that your profile on our application has been successfully updated. Your changes have been saved, and your profile now reflects the updated information.If you have any further updates or need assistance, feel free to log in to your account and make the necessary changes. If you have any questions, please contact our support team at <a href="mailto:jinshah0322@gmail.com">jinshah0322@gmail.com</a></p>
                <p>Best regards,<br>[Jinay Shah]</p>
            `
        var data = {
            to: email,
            text: `Hey ${username}`,
            subject: "Your Profile has been Updated",
            html: html
        }
        sendEmail(data)
        data = {
            to: oldEmail,
            text: `Hey ${username}`,
            subject: "Your Profile has been Updated",
            html: html
        }
        sendEmail()
        const activity = new Activity({
            activityType: "userEditedProfile",
            userId: req.session.user._id, 
        });
        await activity.save();
        res.json({ redirectUrl: "/profile" });
    }catch(error){
        console.log(error);
    }
}

const loadDeleteaccount = async(req,res)=> {
    try{
        res.render("deleteaccount")
    } catch(error){
        console.log(error.message);
    }
}

const deleteaccount = async(req,res)=>{
    try{
        const userId = req.session.user._id
        await User.updateMany({},{$pull:{friends:userId}})
        await User.deleteOne({_id:userId})
        await Chat.deleteMany({$or:[{sender_id:userId},{receiver_id:userId}]})
        const activity = new Activity({
            activityType: "userDeletedProfile",
            userId: req.session.user._id, 
        });
        await activity.save();
        req.session.destroy()
        res.redirect("/")
    } catch(error){
        console.log(error.message);
    }
}

const adminDashboard = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.isAdmin) {
            res.redirect('/login'); // Redirect non-admin users to login
        } else {
            res.render('adminDashboard', { activities: await Activity.find() });
        }
    } catch (error) {
        console.log(error.message);
    }
};

const adminSearch = async(req,res)=>{
    try {
        if (!req.session.user || !req.session.user.isAdmin) {
            res.redirect('/login'); // Redirect non-admin users to login
        } else {
            const {searchTerm} = req.body
            var searchTermRegex = new RegExp(searchTerm, 'i');
            var activities = await Activity.find({
                $or: [
                    { activityType: searchTermRegex },
                ]});
            res.render('adminDashboard', { activities: activities});
        }
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    registerLoad,register,loginLoad,login,logout,loaddashboard,loadprofile,loadreqsent,reqsent,sendrequest,pendingrequest,finishrequest,saveChat,loadForgotPassword,forgotPassword,loadChangePassword,changePassword,
    loadEditProfile,editProfile,loadDeleteaccount,deleteaccount,adminDashboard,adminSearch
}