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
        res.render("dashboard",{user:req.session.user})
    }catch(error){
        console.log(error);
    }
}

const loadprofile = async(req,res)=>{
    try{
        res.render("profile",{user:req.session.user})
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
        const reqsentid = req.session.user.requestsSent
        const currentID = req.session.user._id
        users= users.filter(item=>!reqsentid.includes(item._id.toString()))
        users = users.filter(item=>item._id.toString()!==currentID)
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
    sendrequest
}
