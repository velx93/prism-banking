import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from './Notificationcontext';

interface NotificationBellProps {
    primaryColor?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ primaryColor }) => {
    const { notifications, removeNotification } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const hasNotifications = notifications.length > 0;

    return (
        <div className="relative" ref={dropdownRef}>
            <div 
                className="flex flex-row cursor-pointer group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <svg 
                    width="14" 
                    height="16" 
                    viewBox="0 0 14 16" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`mt-1 transition-transform ${isOpen ? '' : 'group-hover:animate-ring'} origin-top`}
                >
                    <path d="M13.8411 11.6882C13.4364 10.9528 12.8347 8.87192 12.8347 6.15411C12.8347 4.52194 12.22 2.95662 11.1259 1.8025C10.0317 0.648378 8.54773 0 7.00036 0C5.453 0 3.96901 0.648378 2.87486 1.8025C1.78071 2.95662 1.16602 4.52194 1.16602 6.15411C1.16602 8.87269 0.563627 10.9528 0.15887 11.6882C0.0555075 11.8752 0.000711275 12.0876 6.87793e-06 12.304C-0.00069752 12.5204 0.052715 12.7332 0.154858 12.9209C0.257001 13.1086 0.404262 13.2646 0.58179 13.3731C0.759319 13.4817 0.960838 13.5389 1.16602 13.539H4.14227C4.27687 14.2338 4.63485 14.8582 5.15564 15.3066C5.67644 15.7551 6.32808 16 7.00036 16C7.67264 16 8.32429 15.7551 8.84509 15.3066C9.36588 14.8582 9.72386 14.2338 9.85846 13.539H12.8347C13.0398 13.5388 13.2413 13.4814 13.4187 13.3729C13.5961 13.2643 13.7433 13.1083 13.8453 12.9206C13.9474 12.7329 14.0007 12.5202 14 12.3038C13.9993 12.0874 13.9445 11.8751 13.8411 11.6882ZM7.00036 14.7699C6.6385 14.7698 6.28557 14.6513 5.99015 14.4309C5.69472 14.2105 5.47132 13.8989 5.3507 13.539H8.65002C8.5294 13.8989 8.30601 14.2105 8.01058 14.4309C7.71516 14.6513 7.36223 14.7698 7.00036 14.7699Z" 
                    fill="white" 
                    fillOpacity={0.65}
                    />
                </svg>
                {hasNotifications && (
                    <div className="w-[0.375rem] h-[0.375rem] bg-[#EE4C11] rounded-full"></div>
                )}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-8 left-0 w-[20.271rem]  border border-[#FFFFFF0A] rounded-[0.625rem] overflow-hidden z-50"
                        style={{
                            background: '#FFFFFF14',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center">
                                <div className="text-[#FFFFFFA6] text-sm"
                                    style={{
                                        fontFamily: 'Roboto, sans-serif',
                                        fontWeight: 400,
                                        lineHeight: '140%',
                                    }}
                                >
                                    No notifications
                                </div>
                            </div>
                        ) : (
                            <div className="max-h-[24rem] overflow-y-auto">
                                {notifications.map((notification, index) => (
                                    <motion.div
                                        key={notification.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="relative bg-[#FFFFFF14] p-4 hover:bg-[#FFFFFF26] transition-colors"
                                    >
                                        {index !== notifications.length - 1 && (
                                            <span className="absolute left-1/2 bottom-0 w-[80%] h-[1px] bg-[#FFFFFF29] -translate-x-1/2"></span>
                                        )}

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeNotification(notification.id);
                                            }}
                                            className="absolute top-7 right-3 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#FFFFFF14] transition-colors group"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M10.9993 6.25852L9.25926 8L11.0015 9.74148C11.1685 9.90847 11.2623 10.135 11.2623 10.3711C11.2623 10.6073 11.1685 10.8337 11.0015 11.0007C10.8345 11.1677 10.608 11.2615 10.3719 11.2615C10.1357 11.2615 9.90921 11.1677 9.74222 11.0007L8 9.25926L6.25852 11.0015C6.09153 11.1685 5.86505 11.2623 5.62889 11.2623C5.39273 11.2623 5.16625 11.1685 4.99926 11.0015C4.83227 10.8345 4.73846 10.608 4.73846 10.3719C4.73846 10.1357 4.83227 9.90921 4.99926 9.74222L6.74074 8L5.00074 6.25852C4.91806 6.17583 4.85247 6.07767 4.80772 5.96964C4.76297 5.86161 4.73994 5.74582 4.73994 5.62889C4.73994 5.39273 4.83376 5.16625 5.00074 4.99926C5.16773 4.83227 5.39422 4.73846 5.63037 4.73846C5.86653 4.73846 6.09301 4.83227 6.26 4.99926L8 6.74074L9.74148 4.99852C9.90847 4.83153 10.135 4.73772 10.3711 4.73772C10.6073 4.73772 10.8338 4.83153 11.0007 4.99852C11.1677 5.16551 11.2615 5.39199 11.2615 5.62815C11.2615 5.8643 11.1677 6.09079 11.0007 6.25778L10.9993 6.25852ZM16 8C16 9.58225 15.5308 11.129 14.6518 12.4446C13.7727 13.7602 12.5233 14.7855 11.0615 15.391C9.59966 15.9965 7.99113 16.155 6.43928 15.8463C4.88743 15.5376 3.46197 14.7757 2.34315 13.6569C1.22433 12.538 0.462403 11.1126 0.153721 9.56072C-0.15496 8.00887 0.00346629 6.40034 0.608967 4.93853C1.21447 3.47672 2.23985 2.22729 3.55544 1.34824C4.87103 0.469192 6.41775 0 8 0C10.121 0.00235276 12.1545 0.845963 13.6543 2.34574C15.154 3.84553 15.9976 5.87899 16 8ZM14.2222 8C14.2222 6.76936 13.8573 5.56636 13.1736 4.54312C12.4899 3.51988 11.5181 2.72236 10.3811 2.25142C9.24418 1.78047 7.9931 1.65725 6.78611 1.89734C5.57911 2.13742 4.47042 2.73003 3.60023 3.60022C2.73003 4.47042 2.13743 5.57911 1.89734 6.7861C1.65725 7.9931 1.78047 9.24418 2.25142 10.3811C2.72236 11.5181 3.51988 12.4899 4.54312 13.1736C5.56636 13.8573 6.76936 14.2222 8 14.2222C9.6497 14.2205 11.2313 13.5643 12.3978 12.3978C13.5643 11.2313 14.2205 9.64969 14.2222 8Z" fill="white" fillOpacity="0.4"/>
                                            </svg>
                                        </button>

                                        <div className="pr-8">
                                            <div 
                                                className="text-white text-[0.875rem] mb-1"
                                                style={{
                                                    fontFamily: 'Roboto, sans-serif',
                                                    fontWeight: 600,
                                                    lineHeight: '140%',
                                                    letterSpacing: '0.5px'
                                                }}
                                            >
                                                {notification.title}
                                            </div>
                                            <div 
                                                className="text-[#FFFFFF66] text-[0.875rem]"
                                                style={{
                                                    fontFamily: 'Roboto, sans-serif',
                                                    fontWeight: 400,
                                                    lineHeight: '140%',
                                                }}
                                            >
                                                {notification.message}
                                                {notification.count && notification.count > 1 && (
                                                    <span className=" ml-1" style={{ color: primaryColor }}>
                                                        {notification.count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
