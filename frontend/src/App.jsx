import "./App.css"
import { useEffect, useState } from "react";
import { uploadVideo, getDashboardStats } from "./services/videoApi.js";
import { Upload, Bell, AlertTriangle, CheckCircle, TrendingUp, X, Shield, Video, LayoutDashboard } from 'lucide-react';
import { useNavigate, useLocation } from "react-router-dom";
import { getNotifications, markAllNotificationsRead,deleteNotification } from "./services/notificationApi.js";


function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState({ total: 0, anomalies: 0, clean: 0 });

  const fetchNotifications = async () => {
    try { const data = await getNotifications(); setNotifications(data); }
    catch (error) { console.log(error); }
  };

  const fetchStats = async () => {
    try { const data = await getDashboardStats(); setStats(data); }
    catch (error) { console.log(error); }
  };

  useEffect(() => { fetchStats(); fetchNotifications(); }, []);

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); };
  const handleDragLeave = () => setIsDragActive(false);

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('video/')) { setFileName(file.name); handleVideoUpload(file); }
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith("video/")) { setFileName(file.name); handleVideoUpload(file); }
  };

  const handleVideoUpload = async (file) => {
    try {
      setLoading(true);
      const prediction = await uploadVideo(file);
      setVideos(prev => [{
        id: Date.now(), name: file.name,
        isAnomaly: prediction.status === "anomaly",
        confidence: prediction.confidence,
        anomalyTime: prediction.time
      }, ...prev]);
      setFileName(null);
      fetchStats(); fetchNotifications();
    } catch (error) { console.log(error); }
    finally { setLoading(false); }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleBellClick = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening && unreadCount > 0) {
      try {
        await markAllNotificationsRead();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch (err) { console.log(err); }
    }
  };
  const handleDeleteNotification = async (id) => {
    try {
      await deleteNotification(id);
      // Remove from local state instantly — no refetch needed
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.log(err);
    }
  };

  const navLinks = [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/' },
    { label: 'All Videos', icon: Video, route: '/videos' },
    { label: 'Anomalies', icon: AlertTriangle, route: '/anomalies' },
    { label: 'Clean Videos', icon: CheckCircle, route: '/clean' },
  ];

  const dashboardCards = [
    { label: 'Total Videos', value: stats.total, icon: TrendingUp, accent: 'border-t-blue-500', iconBg: 'bg-blue-50', iconColor: 'text-blue-500', badgeBg: 'bg-blue-50 text-blue-600', route: '/videos' },
    { label: 'Anomalies Detected', value: stats.anomalies, icon: AlertTriangle, accent: 'border-t-red-500', iconBg: 'bg-red-50', iconColor: 'text-red-500', badgeBg: 'bg-red-50 text-red-600', route: '/anomalies' },
    { label: 'Clean Videos', value: stats.clean, icon: CheckCircle, accent: 'border-t-green-500', iconBg: 'bg-green-50', iconColor: 'text-green-500', badgeBg: 'bg-green-50 text-green-600', route: '/clean' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Navbar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 flex-shrink-0">
        <div className="px-6 h-14 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-sky-400" />
          </div>
          <div className="flex-shrink-0">
            <p className="text-sm font-semibold text-slate-900 leading-tight">Surveillance AI</p>
            <p className="text-xs text-slate-400 leading-tight">Anomaly Detection</p>
          </div>
          <div className="ml-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-700">System online</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={handleBellClick}
              className="relative w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <Bell size={16} className="text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1">

        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
          <nav className="p-3 flex-1">
            {navLinks.map(({ label, icon: Icon, route }) => {
              const active = location.pathname === route;
              return (
                <button
                  key={route}
                  onClick={() => navigate(route)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors text-left
                    ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              );
            })}

            <div className="border-t border-slate-100 my-3" />

            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">System</p>

            {/* Live stats */}
            <div className="mx-1 rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Total</span>
                <span className="text-xs font-semibold text-slate-900">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Anomalies</span>
                <span className="text-xs font-semibold text-red-500">{stats.anomalies}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Clean</span>
                <span className="text-xs font-semibold text-green-500">{stats.clean}</span>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-slate-400">Anomaly rate</span>
                  <span className="text-[10px] text-slate-400">
                    {stats.total > 0 ? ((stats.anomalies / stats.total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${stats.total > 0 ? (stats.anomalies / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Last scan */}
            <div className="mx-1 rounded-lg bg-slate-50 border border-slate-200 p-3 mb-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Last scan</p>
              {videos.length > 0 ? (
                <>
                  <p className="text-xs font-medium text-slate-900 truncate">{videos[0].name}</p>
                  <p className={`text-[11px] font-medium mt-0.5 ${videos[0].isAnomaly ? "text-red-500" : "text-green-500"}`}>
                    {videos[0].isAnomaly ? "⚠ Anomaly detected" : "✓ Clean"}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400">No scans yet</p>
              )}
            </div>

            {/* Session summary */}
            <div className="mx-1 rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">This session</p>
              <p className="text-xs text-slate-700">
                <span className="font-semibold text-slate-900">{videos.length}</span> videos analyzed
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {videos.filter(v => v.isAnomaly).length} anomalies · {videos.filter(v => !v.isAnomaly).length} clean
              </p>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6">

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Overview</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {dashboardCards.map((card, i) => {
              const Icon = card.icon;
              const badgeLabel = i === 0
                ? `+${card.value}`
                : stats.total > 0
                ? `${((card.value / stats.total) * 100).toFixed(1)}%`
                : "0%";
              return (
                <div
                  key={i}
                  onClick={() => navigate(card.route)}
                  className={`bg-white rounded-xl border border-slate-200 border-t-2 ${card.accent} p-5 cursor-pointer hover:shadow-md transition-all`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                      <Icon size={18} className={card.iconColor} />
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${card.badgeBg}`}>
                      {badgeLabel}
                    </span>
                  </div>
                  <p className="text-3xl font-semibold text-slate-900">{card.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{card.label}</p>
                </div>
              );
            })}
          </div>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Upload</p>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDragLeave}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 mb-6 transition-all cursor-pointer
              ${isDragActive ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"}`}
          >
            <input type="file" accept="video/*" onChange={handleFileInput} className="absolute inset-0 opacity-0 cursor-pointer" />
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <Upload size={22} className="text-blue-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-900">{fileName ?? "Drop a video to analyze"}</p>
              <p className="text-xs text-slate-400 mt-1">{fileName ? "Click to change file" : "or click to browse your files"}</p>
            </div>
            {!fileName && (
              <div className="flex gap-2 mt-1">
                {["MP4", "WebM", "MKV", "AVI"].map(fmt => (
                  <span key={fmt} className="text-xs px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-500">{fmt}</span>
                ))}
              </div>
            )}
          </div>

          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center gap-3 mb-6">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-blue-700">Analyzing video with AI model...</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">

            {/* Recent Analysis */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-900">Recent analysis</p>
                <button onClick={() => navigate('/videos')} className="text-xs text-blue-500 hover:underline">View all →</button>
              </div>
              {videos.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                  No videos analyzed yet
                </div>
              ) : (
                <div className="space-y-1">
                  {videos.map((video) => (
                    <div key={video.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <Video size={14} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">{video.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${video.isAnomaly ? "bg-red-500" : "bg-green-500"}`}
                              style={{ width: `${video.confidence}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {typeof video.confidence === 'number' ? video.confidence.toFixed(1) : video.confidence}%
                          </span>
                        </div>
                        {video.isAnomaly && video.anomalyTime && (
                          <p className="text-[10px] text-slate-400 mt-0.5">Anomaly at {video.anomalyTime}</p>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${video.isAnomaly ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        {video.isAnomaly ? "Anomaly" : "Clean"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                {unreadCount > 0 && <span className="text-xs text-slate-400">{unreadCount} unread</span>}
              </div>
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                  No notifications
                </div>
              ) : (
                <div>
                  {notifications.slice(0, 5).map((item) => (
                    <div key={item._id} className="flex gap-3 py-3 border-b border-slate-100 last:border-0 group">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.type === "anomaly" ? "bg-red-500" : "bg-green-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.message}</p>
                        {item.confidence != null && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Confidence: {item.confidence.toFixed(2)}%
                            {item.anomalyTime ? ` · At ${item.anomalyTime}` : ""}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-300 mt-0.5">{formatTime(item.createdAt)}</p>
                      </div>
                      {/* ← Add this X button */}
                      <button
                        onClick={() => handleDeleteNotification(item._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100"
                      >
                        <X size={11} className="text-slate-400" />
                      </button>
                    </div>
                  ))}
                  {notifications.length > 5 && (
                    <p
                      className="text-[11px] text-blue-500 text-center pt-2 cursor-pointer hover:underline"
                      onClick={handleBellClick}
                    >
                      +{notifications.length - 5} more — open all
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Notification dropdown */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          <div className="fixed top-16 right-6 w-80 max-h-[480px] overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 z-50">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <p className="font-semibold text-sm text-slate-900">Notifications</p>
              <button onClick={() => setShowNotifications(false)}>
                <X size={16} className="text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No notifications</div>
            ) : (
              notifications.map((item) => (
                <div key={item._id} className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                  <div className="flex gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.type === "anomaly" ? "bg-red-500" : "bg-green-500"}`} />
                    <div className="flex-1">
                      <p className={`text-xs font-semibold ${item.type === "anomaly" ? "text-red-600" : "text-green-600"}`}>{item.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{item.message}</p>
                      {item.fileName && (
                        <p className="text-[11px] text-slate-400 mt-0.5">📹 {item.fileName}</p>
                      )}
                      {item.confidence != null && (
                        <p className="text-[11px] text-slate-400">
                          Confidence: {item.confidence.toFixed(2)}%{item.anomalyTime ? ` · ${item.anomalyTime}` : ""}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-300 mt-1">{formatTime(item.createdAt)}</p>
                    </div>
                    {/* ← Add this X button */}
                    <button
                      onClick={() => handleDeleteNotification(item._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-5 h-5 rounded flex items-center justify-center hover:bg-slate-200 self-start mt-0.5"
                    >
                      <X size={11} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;