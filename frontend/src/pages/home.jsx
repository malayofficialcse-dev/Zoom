import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import server from '../environment';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

function HomeComponent() {
    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const { addToUserHistory } = useContext(AuthContext);
    const [scheduledMeetings, setScheduledMeetings] = useState([]);
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [newMeeting, setNewMeeting] = useState({ title: "", startTime: "", description: "" });

    useEffect(() => {
        fetchScheduledMeetings();
    }, []);

    const fetchScheduledMeetings = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${server}/api/v1/users/get_scheduled`, { params: { token } });
            setScheduledMeetings(response.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleScheduleMeeting = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const meetingCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            await axios.post(`${server}/api/v1/users/schedule`, {
                token,
                meetingCode,
                ...newMeeting
            });
            setShowScheduleForm(false);
            setNewMeeting({ title: "", startTime: "", description: "" });
            fetchScheduledMeetings();
        } catch (err) {
            console.error(err);
        }
    };

    let handleJoinVideoCall = async () => {
        if (meetingCode.trim()) {
            await addToUserHistory(meetingCode);
            navigate(`/${meetingCode}`);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-outfit selection:bg-orange-500 selection:text-white overflow-hidden relative transition-colors duration-300">
            
             {/* Background Effects */}
             <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] w-[30rem] h-[30rem] bg-purple-600/10 dark:bg-purple-600/20 rounded-full blur-[128px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-orange-600/10 dark:bg-orange-600/10 rounded-full blur-[128px]"></div>
            </div>

            {/* Navbar */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 backdrop-blur-md bg-white/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-orange-500/20">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                            <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.94-.94 2.56-.27 2.56 1.06v11.38c0 1.33-1.62 2-2.56 1.06z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                        Apna Video Call
                    </h2>
                </div>

                <div className="flex items-center gap-4 md:gap-8">
                    <button 
                        onClick={() => navigate("/history")}
                        className="flex items-center gap-2 text-slate-500 dark:text-slate-300 hover:text-orange-500 dark:hover:text-white transition-colors group"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-1 transition-transform">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-bold text-sm">History</span>
                    </button>

                    <button 
                        onClick={() => navigate("/analytics")}
                        className="flex items-center gap-2 text-slate-500 dark:text-slate-300 hover:text-purple-500 dark:hover:text-white transition-colors group"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:-translate-y-1 transition-transform">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                        </svg>
                        <span className="font-bold text-sm">Analytics</span>
                    </button>
                    
                    <ThemeToggle />

                    <button 
                        onClick={() => {
                            localStorage.removeItem("token");
                            navigate("/auth");
                        }}
                        className="px-6 py-2.5 rounded-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-sm transition-all shadow-xl"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <div className="relative z-10 container mx-auto px-6 h-[calc(100vh-88px)] flex items-center justify-center">
                <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center w-full max-w-6xl">
                    
                    <div className="space-y-10 text-center md:text-left">
                        <div className="space-y-4">
                            <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
                                Premium Video Calls <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-purple-500">
                                    Simplified.
                                </span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-medium max-w-xl mx-auto md:mx-0">
                                Connect with your team, family, and colleagues instantly with zero latency and high-definition clarity.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 max-w-lg mx-auto md:mx-0">
                            <div className="relative flex-1 w-full">
                                <input 
                                    value={meetingCode}
                                    onChange={e => setMeetingCode(e.target.value)}
                                    type="text" 
                                    placeholder="Enter Meeting Code" 
                                    className="w-full pl-6 pr-4 py-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all font-mono text-xl font-bold shadow-inner"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                </div>
                            </div>
                            <button 
                                onClick={handleJoinVideoCall}
                                className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-2xl font-black text-white shadow-2xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all whitespace-nowrap text-lg tracking-wide group"
                            >
                                JOIN ROOM
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 inline-block ml-2 group-hover:translate-x-1 transition-transform">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="relative hidden md:block group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/30 to-purple-600/30 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                        <img 
                            src="/logo3.png" 
                            alt="Illustration" 
                            className="relative z-10 w-full max-w-md mx-auto drop-shadow-[0_35px_35px_rgba(0,0,0,0.25)] dark:drop-shadow-[0_35px_35px_rgba(255,165,0,0.1)] transition-transform duration-700 group-hover:scale-110"
                            style={{ animation: 'float 6s ease-in-out infinite' }}
                        />
                         <style>{`
                            @keyframes float {
                                0% { transform: translateY(0px) rotate(0deg); }
                                50% { transform: translateY(-30px) rotate(2deg); }
                                100% { transform: translateY(0px) rotate(0deg); }
                            }
                        `}</style>
                    </div>

                </div>
            </div>

            {/* Scheduling Section */}
            <div className="max-w-7xl mx-auto px-6 pb-24 mt-12">
                <div className="flex items-center justify-between mb-12">
                    <h3 className="text-3xl font-black tracking-tight">Scheduled <span className="text-purple-500">Meetings</span></h3>
                    <button 
                        onClick={() => setShowScheduleForm(true)}
                        className="px-8 py-3 bg-purple-600/10 hover:bg-purple-600 text-purple-600 hover:text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all border border-purple-600/20"
                    >
                        Schedule Meeting
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {scheduledMeetings.length === 0 ? (
                        <div className="col-span-full py-20 bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/10 flex flex-col items-center justify-center text-slate-400">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-4 opacity-50">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
                            </svg>
                            <p className="font-black uppercase tracking-widest text-xs">No meetings scheduled</p>
                        </div>
                    ) : (
                        scheduledMeetings.map((meeting) => (
                            <div key={meeting._id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-white/10 group transition-all hover:scale-[1.02]">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="px-4 py-1.5 bg-orange-100 dark:bg-orange-600/20 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        Scheduled
                                    </span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        {new Date(meeting.startTime).toLocaleDateString()}
                                    </p>
                                </div>
                                <h4 className="text-xl font-black mb-2 group-hover:text-orange-500 transition-colors">{meeting.title}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 line-clamp-2">{meeting.description || "No description provided."}</p>
                                
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => navigate(`/${meeting.meetingCode}`)}
                                        className="flex-1 py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest group-hover:bg-orange-600 transition-all shadow-lg"
                                    >
                                        Start Session
                                    </button>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/${meeting.meetingCode}`);
                                            alert("Invite link copied!");
                                        }}
                                        className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M15.75 4.5a3 3 0 1 1 .825 2.066l-8.421 4.679a3.002 3.002 0 0 1 0 1.51l8.421 4.679a3 3 0 1 1-.729 1.31l-8.421-4.678a3 3 0 1 1 0-4.132l8.421-4.679a3 3 0 0 1-.096-.755Z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Schedule Form Modal */}
            {showScheduleForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-900/40">
                    <form 
                        onSubmit={handleScheduleMeeting}
                        className="bg-white dark:bg-slate-900 w-full max-w-xl p-10 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-white/10 space-y-8 animate-in zoom-in duration-300"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black tracking-tight">Schedule <span className="text-orange-500">Meeting</span></h3>
                            <button type="button" onClick={() => setShowScheduleForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Meeting Title</label>
                                <input 
                                    required
                                    type="text" 
                                    value={newMeeting.title}
                                    onChange={e => setNewMeeting({...newMeeting, title: e.target.value})}
                                    placeholder="e.g. Weekly Sync"
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-orange-500 transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Start Time</label>
                                <input 
                                    required
                                    type="datetime-local" 
                                    value={newMeeting.startTime}
                                    onChange={e => setNewMeeting({...newMeeting, startTime: e.target.value})}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-orange-500 transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Description (Optional)</label>
                                <textarea 
                                    value={newMeeting.description}
                                    onChange={e => setNewMeeting({...newMeeting, description: e.target.value})}
                                    placeholder="What's this meeting about?"
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-orange-500 transition-all font-medium h-32 resize-none"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            className="w-full py-5 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Confirm Schedule
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}

export default withAuth(HomeComponent);