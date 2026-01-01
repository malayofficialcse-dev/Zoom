import * as React from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar } from '@mui/material';
import ThemeToggle from '../components/ThemeToggle';

export default function Authentication() {
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");

    const [formState, setFormState] = React.useState(0);
    const [open, setOpen] = React.useState(false);

    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    let handleAuth = async () => {
        try {
            if (formState === 0) {
                await handleLogin(username, password);
            }
            if (formState === 1) {
                let result = await handleRegister(name, username, password);
                setUsername("");
                setMessage(result);
                setOpen(true);
                setError("");
                setFormState(0);
                setPassword("");
            }
        } catch (err) {
            let message = (err.response?.data?.message || "An error occurred");
            setError(message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-outfit text-slate-900 dark:text-white p-4 transition-colors duration-300">
            {/* Theme Toggle Positioned Top Right */}
            <div className="absolute top-8 right-8 z-50">
                <ThemeToggle />
            </div>

            {/* Background Gradients */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-purple-600/10 dark:bg-purple-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[40rem] h-[40rem] bg-orange-600/10 dark:bg-orange-600/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-4xl grid md:grid-cols-2 bg-white dark:bg-slate-900/50 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden relative z-10 transition-colors">
                
                {/* Left Side - Visual */}
                <div className="hidden md:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-950 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-white/[0.02] bg-[length:24px_24px]"></div>
                    <div className="relative z-10 text-center space-y-8">
                        <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-orange-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-orange-500/20 transform group-hover:rotate-6 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-white">
                                <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.94-.94 2.56-.27 2.56 1.06v11.38c0 1.33-1.62 2-2.56 1.06z" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                             <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Welcome Back</h2>
                             <p className="text-slate-500 dark:text-slate-400 font-medium">Connect with your world instantly.</p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="p-10 md:p-14 flex flex-col justify-center">
                    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl mb-10 border border-slate-200 dark:border-white/5">
                        <button 
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${formState === 0 ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                            onClick={() => { setFormState(0); setError(""); }}
                        >
                            Sign In
                        </button>
                        <button 
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${formState === 1 ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                            onClick={() => { setFormState(1); setError(""); }}
                        >
                            Sign Up
                        </button>
                    </div>

                    <div className="space-y-6">
                        {formState === 1 && (
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Full Name</label>
                                <input 
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium"
                                    placeholder="John Doe"
                                />
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Username</label>
                            <input 
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium"
                                placeholder="john_doe"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Password</label>
                            <input 
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-sm font-bold text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <button 
                        onClick={handleAuth}
                        className="w-full mt-10 py-5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-[1.5rem] font-black text-white shadow-2xl shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        {formState === 0 ? "LOGIN TO APNA" : "CREATE ACCOUNT"}
                    </button>
                    
                </div>
            </div>

            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
                message={message}
            />
        </div>
    );
}