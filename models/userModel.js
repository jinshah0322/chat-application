const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
    },
    mobile:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true,
    },
    is_online:{
        type:String,
        default:'0'
    },
    image:{
        type:String,
        required:true
    },
    requestsSent: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    requestsReceived: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    friends: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
},{timestamps:true});

//Export the model
module.exports = mongoose.model('User', userSchema);