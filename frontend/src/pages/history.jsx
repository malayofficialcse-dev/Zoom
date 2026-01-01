import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([])
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch (err) {
                console.log(err);
            }
        }
        fetchHistory();
    }, [getHistoryOfUser])

    let formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-outfit transition-colors duration-300 relative overflow-hidden">
            
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-purple-600/5 dark:bg-purple-600/10 rounded-full blur-[128px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-orange-600/5 dark:bg-orange-600/5 rounded-full blur-[128px]"></div>
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 space-y-16">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-6">
                        <button 
                            onClick={() => navigate("/home")}
                            className="flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-white transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform border border-slate-200 dark:border-white/5">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest">Back to Dashboard</span>
                        </button>
                        <div className="space-y-2">
                            <h1 className="text-5xl md:text-6xl font-black tracking-tight">Your <span className="text-orange-500 italic">Timeline.</span></h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">A comprehensive history of your digital connections.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <ThemeToggle />
                        <div className="px-8 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl flex flex-col items-center md:items-start min-w-[200px]">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Sessions</div>
                            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-purple-500">{meetings.length}</div>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {meetings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-8 bg-white/50 dark:bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/5 backdrop-blur-sm">
                        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-black">No history yet.</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium tracking-wide">Your meeting logs will appear here once you start connecting.</p>
                        </div>
                        <button 
                            onClick={() => navigate("/home")}
                            className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
                        >
                            Start First Meeting
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {meetings.map((e, i) => (
                            <div key={i} className="group relative">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-orange-500 to-purple-600 rounded-[2.5rem] blur opacity-0 group-hover:opacity-10 transition duration-700"></div>
                                <div className="relative p-8 bg-white dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] flex flex-col gap-8 hover:border-orange-500/30 transition-all shadow-sm hover:shadow-2xl hover:shadow-orange-500/10">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-4">
                                            <div className="w-12 h-12 rounded-2xl bg-orange-500/5 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Access Code</p>
                                                <p className="text-3xl font-mono font-black text-slate-900 dark:text-white tracking-tighter uppercase">{e.meetingCode}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col gap-6">
                                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold text-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-400">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {formatDate(e.date)}
                                        </div>
                                        <button 
                                            onClick={() => navigate(`/${e.meetingCode}`)}
                                            className="w-full py-4 bg-slate-50 dark:bg-slate-800 hover:bg-orange-500 dark:hover:bg-orange-500 text-slate-900 dark:text-white hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 group/btn"
                                        >
                                            Rejoin Room
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    )
}
