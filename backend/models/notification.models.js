import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({

    title:{
        type:String,
        required:true
    },

    message:{
        type:String,
        required:true
    },

    type:{
        type:String,
        enum:["anomaly","clean","upload"],
        required:true
    },

    fileName:{
        type:String
    },

    confidence:{
        type:Number
    },

    anomalyTime:{
        type:String
    },

    isRead:{
        type:Boolean,
        default:false
    }

},{
    timestamps:true
});

export const Notification = mongoose.model(
    "Notification",
    notificationSchema
);