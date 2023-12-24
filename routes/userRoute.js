const express = require("express")
const router = express.Router()
const {register,registerLoad,loginLoad,login,logout,loaddashboard} = require("../controllers/userController")

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

router.route("/register").get(registerLoad).post(upload.single('image'),register)
router.route("/").get(loginLoad).post(login)
router.route("/logout").get(logout)
router.route("/dashboard").get(loaddashboard)
router.route("*").get(function(req,res){
    res.redirect("/")
})

module.exports = router