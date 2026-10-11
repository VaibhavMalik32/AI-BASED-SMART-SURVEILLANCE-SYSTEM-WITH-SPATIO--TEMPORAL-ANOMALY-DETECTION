import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardStats } from "../../src/services/videoApi";
import axios from "axios";

function AnomalyVideos() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ anomalies: 0 });
  const [videos, setVideos] = useState([]);
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  useEffect(() => {
    getDashboardStats().then(setStats).catch(console.log);
    axios
      .get(`${BASE_URL}/video/anomalies`)
      .then((res) => setVideos(res.data.anomaly))
      .catch(() => setVideos([]));
  }, [BASE_URL]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
        >
          ← Back
        </button>
        <span className="text-sm font-medium text-slate-900">Anomaly videos</span>
        <span className="text-xs font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
          {stats.anomalies} anomalies
        </span>
      </div>

      <div className="p-6">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">
          Flagged for review
        </p>

        {videos.length === 0 ? (
          <div className="border border-slate-200 rounded-xl p-12 text-center bg-white">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-slate-500 text-sm">No anomalies detected</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {videos.map((video) => (
              <div
                key={video._id}
                className="bg-white rounded-xl overflow-hidden border border-slate-200 border-t-2 border-t-red-500 hover:border-slate-300 transition-colors cursor-pointer"
              >
                <div className="relative bg-slate-100 h-48">
                  {video.framePath ? (
                    <img
                      src={`${video.framePath}`}
                      alt="frame"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700 text-sm">
                      No preview
                    </div>
                  )}
                  <span className="absolute top-2.5 right-2.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                    Anomaly
                  </span>
                </div>

                <div className="p-4">
                  <p
                    onClick={() => navigate(`/video/${video._id}`)}
                    className="text-sm font-medium text-black hover:underline cursor-pointer truncate mb-3"
                  >
                    {video.fileName}
                  </p>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-700 font-semibold">Anomaly time</span>
                      <span className="text-xs text-slate-700">{video.anomalyTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-700 font-semibold">Confidence</span>
                      <span className="text-xs font-medium text-red-500">
                        {video.confidence.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{ width: `${video.confidence}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnomalyVideos;