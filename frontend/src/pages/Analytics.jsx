import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import server from '../environment';
import { ThemeContext } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { useNavigate } from 'react-router-dom';

export default function Analytics() {
    const { darkMode } = useContext(ThemeContext);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get(`${server}/api/v1/users/get_analytics`, {
                    params: { token }
                });
                setAnalytics(response.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    const formatDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs > 0 ? hrs + 'h ' : ''}${mins > 0 ? mins + 'm ' : ''}${secs}s`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const summary = analytics?.summary || { totalMeetings: 0, totalDuration: 0, avgParticipantCount: 0 };
    const sessions = analytics?.analytics || [];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-outfit text-slate-900 dark:text-white transition-colors duration-300 pb-20">
            <div className="max-w-7xl mx-auto px-6 pt-12">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                    <div className="space-y-2">
                        <button 
                            onClick={() => navigate('/home')}
                            className="text-orange-500 font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:gap-3 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                            Back to Home
                        </button>
                        <h1 className="text-5xl font-black tracking-tight">Usage <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">Analytics</span></h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Detailed breakdown of your meeting performance and habits.</p>
                    </div>
                    <ThemeToggle />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-orange-500/10 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Total Sessions</p>
                        <h2 className="text-5xl font-black">{summary.totalMeetings}</h2>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-purple-500/10 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Time Spent</p>
                        <h2 className="text-4xl font-black">{formatDuration(summary.totalDuration)}</h2>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-indigo-500/10 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.998 5.998 0 00-3.033-5.188M12 15a3 3 0 110-6 3 3 0 010 6zm-7.944 1a3 3 0 00-4.682 2.72 9.094 9.094 0 003.741.479 3 3 0 00.94-3.197m5.19-9.003a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Avg. Participants</p>
                        <h2 className="text-5xl font-black">{summary.avgParticipantCount}</h2>
                    </div>
                </div>

                {/* Session Table */}
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                    <div className="p-8 border-b border-slate-100 dark:border-white/5">
                        <h3 className="text-xl font-black uppercase tracking-widest">Recent Sessions</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-white/5">
                                    <th className="px-8 py-6">Meeting Code</th>
                                    <th className="px-8 py-6">Date</th>
                                    <th className="px-8 py-6">Duration</th>
                                    <th className="px-8 py-6">Participants</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {sessions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20 text-center text-slate-500 font-bold italic">No meeting data recorded yet.</td>
                                    </tr>
                                ) : (
                                    sessions.map((session, idx) => (
                                        <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-8 py-6 font-mono font-bold text-orange-500 uppercase">{session.meetingCode.split('/').pop() || session.meetingCode}</td>
                                            <td className="px-8 py-6">
                                                <p className="font-bold">{new Date(session.startTime).toLocaleDateString()}</p>
                                                <p className="text-xs text-slate-400">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </td>
                                            <td className="px-8 py-6 font-bold">{formatDuration(session.duration)}</td>
                                            <td className="px-8 py-6">
                                                <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-black">
                                                    {session.participantCount} People
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
