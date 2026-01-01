import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function LandingPage() {
    const router = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-outfit overflow-hidden selection:bg-orange-500 selection:text-white transition-colors duration-300">
            
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-purple-600/10 dark:bg-purple-600/30 rounded-full blur-[128px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-orange-600/10 dark:bg-orange-600/20 rounded-full blur-[128px]"></div>
            </div>

            {/* Navbar */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 backdrop-blur-md bg-white/70 dark:bg-slate-900/50 sticky top-0 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-purple-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                            <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.94-.94 2.56-.27 2.56 1.06v11.38c0 1.33-1.62 2-2.56 1.06z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                        Apna Video Call
                    </h2>
                </div>

                <div className="flex items-center gap-4 md:gap-8">
                    <button 
                        onClick={() => router("/aljk23")}
                        className="hidden md:block text-slate-600 dark:text-slate-300 hover:text-orange-500 dark:hover:text-white transition-colors text-sm font-medium"
                    >
                        Join as Guest
                    </button>
                    <button 
                        onClick={() => router("/auth")}
                        className="hidden md:block text-slate-600 dark:text-slate-300 hover:text-orange-500 dark:hover:text-white transition-colors text-sm font-medium"
                    >
                        Login
                    </button>
                    
                    <ThemeToggle />

                    <button 
                         onClick={() => router("/auth")}
                         className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white font-medium text-sm hover:shadow-xl hover:shadow-orange-500/25 transition-all hover:scale-105 active:scale-95"
                    >
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <div className="relative z-10 container mx-auto px-6 pt-12 md:pt-24 pb-12 flex flex-col md:flex-row items-center gap-12 md:gap-20">
                
                {/* Left Content */}
                <div className="flex-1 text-center md:text-left space-y-8">
                    <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
                        <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Connect</span>
                        <br />
                        <span className="text-slate-900 dark:text-slate-100 italic">with your loved Ones</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-lg mx-auto md:mx-0 leading-relaxed font-medium">
                         Experience crystal clear video calls, low latency, and seamless connection. Distance is just a number with Apna Video Call.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                        <Link 
                            to="/auth" 
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:shadow-2xl transition-all flex items-center justify-center gap-2 hover:-translate-y-1"
                        >
                            Start Calling
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                        <button 
                             onClick={() => router("/aljk23")}
                             className="w-full sm:w-auto px-8 py-4 rounded-full border-2 border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300 hover:text-orange-500 dark:hover:text-white transition-all font-bold"
                        >
                            Join Meeting
                        </button>
                    </div>

                    <div className="pt-8 flex items-center justify-center md:justify-start gap-8 text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-2 group cursor-help">
                             <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
                             <span className="text-sm font-bold group-hover:text-green-500 transition-colors">End-to-End Secure</span>
                        </div>
                        <div className="flex items-center gap-2 group cursor-help">
                             <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
                             <span className="text-sm font-bold group-hover:text-blue-500 transition-colors">Ultra Low Latency</span>
                        </div>
                    </div>
                </div>

                {/* Right Image */}
                <div className="flex-1 relative group perspective-1000">
                    <div className="absolute -inset-4 bg-gradient-to-tr from-orange-500/20 to-purple-600/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-700"></div>
                    <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 transition-transform duration-700 hover:rotate-y-12 hover:scale-[1.05] group-hover:shadow-orange-500/10">
                        <img 
                            src="/hero.png" 
                            alt="Video Call Illustration" 
                            className="w-full aspect-[4/3] object-cover"
                            onError={(e) => {
                                e.target.src = "/mobile.png";
                                e.target.onerror = null;
                            }}
                        />
                         {/* Floating Stats Badge */}
                        <div className="absolute bottom-6 left-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-100 dark:border-white/10 p-5 rounded-[1.5rem] shadow-2xl animate-bounce-slow transform hover:scale-110 transition-transform">
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`w-10 h-10 rounded-full border-4 border-white dark:border-slate-800 bg-slate-${2+i}00 shadow-sm`} />
                                    ))}
                                </div>
                                <div>
                                    <p className="font-black text-slate-900 dark:text-white text-lg leading-none">1.2k+</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Online Guests</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
