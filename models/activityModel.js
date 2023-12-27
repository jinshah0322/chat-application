const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
const activitySchema = new mongoose.Schema({
    activityType: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now },
});

//Export the model
module.exports = mongoose.model('Activity', activitySchema);