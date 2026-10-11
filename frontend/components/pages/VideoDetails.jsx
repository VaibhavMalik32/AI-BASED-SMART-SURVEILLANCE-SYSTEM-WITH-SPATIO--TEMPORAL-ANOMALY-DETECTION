import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function VideoDetails(){
    const BASE_URL = import.meta.env.VITE_BACKEND_URL;
    const { id } = useParams();

    const navigate = useNavigate();

    const [video,setVideo] = useState(null);

    useEffect(()=>{

        axios
        .get(`${BASE_URL}/video/${id}`)
        .then(res=>setVideo(res.data));

    },[id,BASE_URL]);

    if(!video){

        return <h1>Loading...</h1>;

    }

    return(

        <div className="h-100 bg-slate-100 p-8">

            <button
                onClick={()=>navigate(-1)}
                className="mb-5 bg-blue-500 text-white px-4 py-2 rounded"
            >
                Back
            </button>

            <div className="bg-white rounded-xl shadow-lg p-6 border">

                <h1 className="text-2xl font-bold mb-5 text-center">
                    {video.fileName}
                </h1>

                <video
                    controls
                    className="w-200 h-100 rounded-lg ml-70 border"
                >
                    <source
                        src={video.videoPath}
                        type="video/mp4"
                    />
                </video>
                
                <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-10">

                    {/* Anomaly Frame */}
                    <div className="bg-slate-50 rounded-xl shadow-md p-6">

                        <h2 className="text-xl font-bold mb-5 text-center">
                            Detected Anomaly Frame
                        </h2>

                        <img
                            src={video.framePath}
                            alt="Anomaly Frame"
                            className="w-full h-80 object-contain rounded-lg"
                        />

                    </div>

                    {/* Analysis Details */}
                    <div className="bg-slate-50 rounded-xl shadow-md p-6 flex flex-col justify-center">

                        <h2 className="text-xl font-bold mb-6 text-center">
                            Analysis Result
                        </h2>

                        <div className="space-y-5 text-lg">

                            <div className="flex justify-between border-b pb-3">
                                <span className="font-semibold">Status</span>

                                <span
                                    className={`font-bold ${
                                        video.status === "anomaly"
                                            ? "text-red-600"
                                            : "text-green-600"
                                    }`}
                                >
                                    {video.status}
                                </span>
                            </div>

                            <div className="flex justify-between border-b pb-3">
                                <span className="font-semibold">
                                    Anomaly Time
                                </span>

                                <span>{video.anomalyTime}</span>
                            </div>

                            <div className="flex justify-between border-b pb-3">
                                <span className="font-semibold">
                                    Confidence
                                </span>

                                <span>{video.confidence.toFixed(2)}%</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="font-semibold">
                                    File Name
                                </span>

                                <span className="text-right break-all">
                                    {video.fileName}
                                </span>
                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

}

export default VideoDetails;