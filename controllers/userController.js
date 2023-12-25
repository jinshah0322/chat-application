const User = require("../models/userModel")
const bcryptjs = require("bcryptjs")
const sendEmail = require("../helper/sendEmail")
const mongoose = require("mongoose")

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
                            const data = {
                                to: email,
                                text: `Hey ${username}`,
                                subject: "Welcome to our chat application website",
                                html: "<h3>Congrulations you have successfully registered to our chat application website</h3>"
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
        res.render("dashboard",{user:await User.findOne({_id:currentId})})
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
    console.log(req.body);
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

module.exports = {
    registerLoad,
    register,
    loginLoad,
    login,
    logout,
    loaddashboard,
    loadprofile,
    loadreqsent,
    reqsent,
    sendrequest,
    pendingrequest,
    finishrequest
}