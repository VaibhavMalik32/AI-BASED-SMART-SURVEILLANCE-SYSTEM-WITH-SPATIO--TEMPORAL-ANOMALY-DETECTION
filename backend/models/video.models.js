import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({

    fileName: {
        type: String,
        required: true
    },

    status: {
        type: String,
        required: true
    },

    anomalyTime: {
        type: String
    },

    confidence: {
        type: Number,
        required: true
    },

    framePath: {
        type: String,
        default: null
    },

    videoPath: {
        type: String,
        default: null
    }

}, {
    timestamps: true
});

export const Video = mongoose.model(
    "Video",
    videoSchema
);