import React, {useCallback, useEffect, useRef, useState } from 'react';

export default function Whiteboard({ socket }) {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ff9839');
    const [width, setWidth] = useState(3);

    const drawOnCanvas = useCallback((x0, y0, x1, y1, strokeColor, strokeWidth, emit = true) => {
        const context = contextRef.current;
        if (!context) return;

        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.strokeStyle = strokeColor;
        context.lineWidth = strokeWidth;
        context.stroke();
        context.closePath();

        if (emit && socket) {
            socket.emit('whiteboard-data', { x0, y0, x1, y1, color: strokeColor, width: strokeWidth });
        }
    }, [socket]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const parent = canvas.parentElement;
        canvas.width = parent.offsetWidth * 2;
        canvas.height = parent.offsetHeight * 2;
        canvas.style.width = `${parent.offsetWidth}px`;
        canvas.style.height = `${parent.offsetHeight}px`;

        const context = canvas.getContext('2d');
        context.scale(2, 2);
        context.lineCap = 'round';
        context.strokeStyle = color;
        context.lineWidth = width;
        contextRef.current = context;

        const handleResize = () => {
             const canvas = canvasRef.current;
             if (!canvas) return;
             const parent = canvas.parentElement;
             canvas.width = parent.offsetWidth * 2;
             canvas.height = parent.offsetHeight * 2;
             canvas.style.width = `${parent.offsetWidth}px`;
             canvas.style.height = `${parent.offsetHeight}px`;
             const context = canvas.getContext('2d');
             context.scale(2, 2);
             context.lineCap = 'round';
             context.strokeStyle = color;
             context.lineWidth = width;
             contextRef.current = context;
        };

        window.addEventListener('resize', handleResize);

        if (socket) {
            socket.on('whiteboard-data', (data) => {
                const { x0, y0, x1, y1, color: remoteColor, width: remoteWidth } = data;
                drawOnCanvas(x0, y0, x1, y1, remoteColor, remoteWidth, false);
            });
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if (socket) socket.off('whiteboard-data');
        };
    }, [color, width, socket, drawOnCanvas]);

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        const prevPos = contextRef.current.prevPos || { x: offsetX, y: offsetY };
        
        drawOnCanvas(prevPos.x, prevPos.y, offsetX, offsetY, color, width);
        contextRef.current.prevPos = { x: offsetX, y: offsetY };
    };

    const finishDrawing = () => {
        if (!contextRef.current) return;
        contextRef.current.closePath();
        contextRef.current.prevPos = null;
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-4 border-white dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl transition-colors duration-300">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        {['#ff9839', '#e11d48', '#8b5cf6', '#3b82f6', '#10b981', '#0f172a'].map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-xl border-4 transition-all hover:scale-110 active:scale-95 ${color === c ? 'border-orange-500 shadow-lg shadow-orange-500/20' : 'border-white dark:border-slate-800 shadow-sm'}`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden md:block" />
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Brush Size</span>
                        <input 
                            type="range" 
                            min="1" 
                            max="20" 
                            value={width} 
                            onChange={(e) => setWidth(parseInt(e.target.value))}
                            className="w-32 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                     <button 
                        onClick={clearCanvas}
                        className="px-6 py-3 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 active:scale-95 transition-all shadow-lg shadow-rose-500/20"
                    >
                        Clear All
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative bg-white cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={finishDrawing}
                    onMouseLeave={finishDrawing}
                    className="w-full h-full block"
                />
            </div>
        </div>
    );
}
