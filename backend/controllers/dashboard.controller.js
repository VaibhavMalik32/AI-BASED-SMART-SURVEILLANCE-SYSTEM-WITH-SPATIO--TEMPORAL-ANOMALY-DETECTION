import { Video } from "../models/video.models.js";

export const dashboardStats = async(req,res)=>{

    const total =
        await Video.countDocuments();

    const anomalies =
        await Video.countDocuments({
            status:"anomaly"
        });

    const clean =
        await Video.countDocuments({
            status:"clean"
        });

    return res.status(200).json({
        total,
        anomalies,
        clean
    });
};

export const anomalyVideos = async(req,res)=>{

    const anomaly =
        await Video.find({
            status:"anomaly"
        });

    return res.status(200).json({
        success:true,
        count:anomaly.length,
        anomaly
    });
};

export const cleanVideos = async(req,res)=>{

    const clean =
        await Video.find({
            status:"clean"
        });

    return res.status(200).json({
        success:true,
        count:clean.length,
        clean
    });
};