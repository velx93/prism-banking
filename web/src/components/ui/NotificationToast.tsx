import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from './Notificationcontext';

interface ToastNotification {
    id: string;
    title: string;
    message: string;
    count?: number;
}

const NotificationToast: React.FC<{ primaryColor: string }> = ({ primaryColor }) => {
    const [activeToasts, setActiveToasts] = useState<ToastNotification[]>([]);
    const { notifications } = useNotifications();
    const displayedIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Get the latest notification
        if (notifications.length > 0) {
            const latestNotification = notifications[notifications.length - 1];


            if (!displayedIds.current.has(latestNotification.id)) {

                displayedIds.current.add(latestNotification.id);

                const audio = new Audio('/essential/pop.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => {
                    // Ignore errors if audio playback fails
                });
                setActiveToasts(prev => [...prev, latestNotification]);
                setTimeout(() => {
                    setActiveToasts(prev => prev.filter(toast => toast.id !== latestNotification.id));
                }, 3000);
            }
        }
    }, [notifications]);

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-none">
            <AnimatePresence>
                {activeToasts.map((toast, index) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: -100, scale: 0.3 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20
                        }}
                        className="mb-4 pointer-events-auto"
                        style={{ marginTop: index * 80 }}
                    >
                        <div className="bg-[#1A1A1A] border border-[#FFFFFF29] rounded-lg  p-4 min-w-[20rem] max-w-[24rem]">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 14 16"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="animate-ring"
                                        style={{
                                            animation: 'ring 0.5s ease-in-out 2'
                                        }}
                                    >
                                        <path d="M13.8411 11.6882C13.4364 10.9528 12.8347 8.87192 12.8347 6.15411C12.8347 4.52194 12.22 2.95662 11.1259 1.8025C10.0317 0.648378 8.54773 0 7.00036 0C5.453 0 3.96901 0.648378 2.87486 1.8025C1.78071 2.95662 1.16602 4.52194 1.16602 6.15411C1.16602 8.87269 0.563627 10.9528 0.15887 11.6882C0.0555075 11.8752 0.000711275 12.0876 6.87793e-06 12.304C-0.00069752 12.5204 0.052715 12.7332 0.154858 12.9209C0.257001 13.1086 0.404262 13.2646 0.58179 13.3731C0.759319 13.4817 0.960838 13.5389 1.16602 13.539H4.14227C4.27687 14.2338 4.63485 14.8582 5.15564 15.3066C5.67644 15.7551 6.32808 16 7.00036 16C7.67264 16 8.32429 15.7551 8.84509 15.3066C9.36588 14.8582 9.72386 14.2338 9.85846 13.539H12.8347C13.0398 13.5388 13.2413 13.4814 13.4187 13.3729C13.5961 13.2643 13.7433 13.1083 13.8453 12.9206C13.9474 12.7329 14.0007 12.5202 14 12.3038C13.9993 12.0874 13.9445 11.8751 13.8411 11.6882ZM7.00036 14.7699C6.6385 14.7698 6.28557 14.6513 5.99015 14.4309C5.69472 14.2105 5.47132 13.8989 5.3507 13.539H8.65002C8.5294 13.8989 8.30601 14.2105 8.01058 14.4309C7.71516 14.6513 7.36223 14.7698 7.00036 14.7699Z"
                                        fill={primaryColor}
                                        />
                                    </svg>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div
                                        className="text-white text-base font-medium mb-1"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 500,
                                            lineHeight: '140%',
                                        }}
                                    >
                                        {toast.title}
                                    </div>
                                    <div
                                        className="text-[#FFFFFFA6] text-sm"
                                        style={{
                                            fontFamily: 'Roboto, sans-serif',
                                            fontWeight: 400,
                                            lineHeight: '140%',
                                        }}
                                    >
                                        {toast.message}
                                        {toast.count && toast.count > 1 && (
                                            <span className=" ml-1" style={{ color: primaryColor }}>
                                                x{toast.count}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-shrink-0">
                                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default NotificationToast;
