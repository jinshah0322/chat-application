const express = require("express")
const router = express.Router()
const {register,registerLoad,loginLoad,login,logout,loaddashboard,loadprofile,loadreqsent,reqsent,sendrequest} = require("../controllers/userController")

const path = require("path")
const multer = require("multer")

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname,'../public/images'))
    },
    filename: function (req, file, cb) {
        const name = Date.now() + '-' + file.originalname
        cb(null,name)
    }
})

const upload = multer({ storage: storage })

const {isLogin,isLogout} = require("../middlewares/auth")

router.route("/register").get(isLogout,registerLoad).post(upload.single('image'),register)
router.route("/").get(isLogout,loginLoad).post(login)
router.route("/logout").get(isLogin,logout)
router.route("/dashboard").get(isLogin,loaddashboard)
router.route("/profile").get(isLogin,loadprofile)
router.route("/requestsent").get(isLogin,loadreqsent).post(isLogin,reqsent)
router.route("/send-request").post(isLogin,sendrequest)
router.route("*").get(function(req,res){
    res.redirect("/")
})

module.exports = router