import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageContext = createContext();

const translations = {
    en: {
        dashboard: "Dashboard",
        notifications: "Notifications",
        user_management: "User Management",
        payments: "Payments",
        support_tickets: "Support Tickets",
        broadcast: "Broadcast",
        reports: "Reports",
        settings: "Settings",
        profile: "Profile",
        sign_out: "Sign Out",
        active: "Active",
        pending: "Pending",
        expired: "Expired",
        all: "All",
        search: "Search...",
        approve: "Approve",
        reject: "Reject",
        admin_panel: "Admin Panel",
        welcome_admin: "Welcome, Administrator",
        language: "Language",
        english: "English",
        telugu: "Telugu",
        export_report: "Export Report",
        revenue_analytics: "Revenue Analytics",
        total_revenue: "Total Revenue",
        active_users: "Active Users",
        online_now: "Online Now",
        support_chat: "Support Chat",
        send_message: "Send Message"
    },
    te: {
        dashboard: "డ్యాష్‌బోర్డ్",
        notifications: "నోటిఫికేషన్లు",
        user_management: "వినియోగదారుల నిర్వహణ",
        payments: "చెల్లింపులు",
        support_tickets: "సహాయం టిక్కెట్లు",
        broadcast: "ప్రసారం",
        reports: "నివేదికలు",
        settings: "సెట్టింగులు",
        profile: "ప్రొఫైల్",
        sign_out: "లాగౌట్",
        active: "యాక్టివ్",
        pending: "పెండింగ్",
        expired: "గడువు ముగిసింది",
        all: "అన్నీ",
        search: "వెతకండి...",
        approve: "ఆమోదించు",
        reject: "తిరస్కరించు",
        admin_panel: "అడ్మిన్ ప్యానెల్",
        welcome_admin: "స్వాగతం, అడ్మినిస్ట్రేటర్",
        language: "భాష",
        english: "English",
        telugu: "తెలుగు",
        export_report: "నివేదిక ఎగుమతి",
        revenue_analytics: "ఆదాయ విశ్లేషణ",
        total_revenue: "మొత్తం ఆదాయం",
        active_users: "యాక్టివ్ యూజర్లు",
        online_now: "ప్రస్తుతం ఆన్‌లైన్",
        support_chat: "సపోర్ట్ చాట్",
        send_message: "సందేశం పంపండి"
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('en');

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const storedLang = await AsyncStorage.getItem('appLanguage');
            if (storedLang) {
                setLanguage(storedLang);
            }
        } catch (error) {
            console.log("Error loading language:", error);
        }
    };

    const changeLanguage = async (lang) => {
        try {
            await AsyncStorage.setItem('appLanguage', lang);
            setLanguage(lang);
        } catch (error) {
            console.log("Error saving language:", error);
        }
    };

    const t = (key) => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
