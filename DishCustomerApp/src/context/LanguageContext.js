import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageContext = createContext();

const translations = {
    en: {
        dashboard: "Dashboard",
        my_dashboard: "My Dashboard",
        notifications: "Notifications",
        plans_recharge: "Plans & Recharge",
        payment_ledger: "Payment Ledger",
        support: "Support",
        profile: "Profile",
        settings: "Settings",
        help_center: "Help Center",
        terms_service: "Terms of Service",
        privacy_policy: "Privacy Policy",
        sign_out: "Sign Out",
        command_center: "Command Center",
        days_left_label: "DAYS LEFT",
        days_remaining: "Days remaining",
        your_plan: "YOUR PLAN",
        subscription_info: "Subscription Info",
        subscription_details: "Subscription Details",
        expiry_date: "Expiry Date",
        box_id: "Box ID",
        box_identifier: "BOX IDENTIFIER",
        service_status: "Service Status",
        service_stability: "Service Stability",
        connection_quality: "Connection quality over 6 months",
        manage: "Manage",
        quick_actions: "Quick Actions",
        system_status: "System Status",
        welcome: "Welcome",
        hello: "Hello",
        good_morning: "Good Morning",
        good_afternoon: "Good Afternoon",
        good_evening: "Good Evening",
        active: "Active",
        inactive: "Inactive",
        expired: "Expired",
        pay_now: "Pay Now",
        recharge_now: "Recharge Now",
        view_details: "View Details",
        view_all: "View All",
        online: "ONLINE",
        offline: "OFFLINE",
        language: "Language",
        english: "English",
        telugu: "Telugu",
        notification_settings: "Notification Settings",
        payment_reminders: "Payment Reminders",
        support_updates: "Support Updates",
        broadcast_alerts: "Network Broadcasts",
        promotions: "Offers & Promotions",
        chat_support: "Chat Support",
        typing: "Typing...",
        send: "Send",
        history: "History",
        account: "Account",
        active_account: "ACTIVE ACCOUNT",
        phone_number: "PHONE NUMBER",
        personal_info: "Personal Information",
        personal_info_sub: "Name, email and location",
        notification_settings_sub: "App alerts and sound",
        security_privacy: "Security & Privacy",
        security_privacy_sub: "Password and access",
        my_current_plan: "My Current Plan",
        usage_details: "Usage and plan details",
        stb_management: "STB Management",
        stb_management_sub: "Box requests and history",
        payment_history_sub: "Invoices and credits",
        sign_out_p: "SIGN OUT",
        powered_by: "Powered by Dish Fiber Technical",
        interface_language: "Interface language",
        app_preferences: "App Preferences",
        app_preferences_sub: "Customize notification, theme, and region settings.",
        dark_interface: "Dark Interface",
        dark_interface_sub: "OLED-friendly dark mode",
        support_terms: "SUPPORT & TERMS",
        help_center_sub: "FAQs and direct support",
        privacy_security_sub: "Account protection",
        legal_documents: "Legal Documents",
        legal_documents_sub: "Terms of service",
        app_build: "App Build",
        cancel: "CANCEL",
        app_language: "App Language",
        no_notifications: "No notifications yet",
        days: "Days",
        cycle: "Cycle",
        detailed_info: "Detailed Info",
        start_date: "Start Date",
        view_payment_history: "View Payment History",
        recharge_warning: "Please plan your next recharge at least 2 days before expiry to avoid service interruption.",
        recharge_restricted: "Recharge Restricted",
        recharge_restricted_msg: "You already have a pending payment request. Please wait for the admin to verify it before initiating a new one.",
    },
    te: {
        dashboard: "డ్యాష్‌బోర్డ్",
        my_dashboard: "నా డ్యాష్‌బోర్డ్",
        notifications: "నోటిఫికేషన్లు",
        plans_recharge: "ప్లాన్స్ & రీఛార్జ్",
        payment_ledger: "చెల్లింపు సమాచారం",
        support: "సహాయం",
        profile: "ప్రొఫైల్",
        settings: "సెట్టింగ్స్",
        help_center: "సహాయ కేంద్రం",
        terms_service: "సేవా నిబంధనలు",
        privacy_policy: "గోప్యతా విధానం",
        sign_out: "లాగౌట్",
        command_center: "కమాండ్ సెంటర్",
        days_left_label: "రోజులు మిగిలి ఉన్నాయి",
        days_remaining: "రోజులు మిగిలి ఉన్నాయి",
        your_plan: "మీ ప్లాన్",
        subscription_info: "చందా వివరాలు",
        subscription_details: "చందా వివరాలు",
        expiry_date: "గడువు తేదీ",
        box_id: "బాక్స్ ఐడి",
        box_identifier: "బాక్స్ ఐడి",
        service_status: "సేవ స్థితి",
        service_stability: "సేవ స్థిరత్వం",
        connection_quality: "6 నెలలుగా కనెక్షన్ నాణ్యత",
        manage: "నిర్వహించు",
        quick_actions: "త్వరిత చర్యలు",
        system_status: "సిస్టమ్ స్థితి",
        welcome: "స్వాగతం",
        hello: "హలో",
        good_morning: "శుభోదయం",
        good_afternoon: "శుభ మధ్యాహ్నం",
        good_evening: "శుభ సాయంత్రం",
        active: "యాక్టివ్",
        inactive: "ఇన్-యాక్టివ్",
        expired: "గడువు ముగిసింది",
        pay_now: "ఇప్పుడే చెల్లించండి",
        recharge_now: "ఇప్పుడే రీఛార్జ్ చేయండి",
        view_details: "వివరాలు చూడండి",
        view_all: "అన్నీ చూడండి",
        online: "ఆన్‌లైన్",
        offline: "ఆఫ్‌లైన్",
        language: "భాష",
        english: "English",
        telugu: "తెలుగు",
        notification_settings: "నోటిఫికేషన్ సెట్టింగ్‌లు",
        payment_reminders: "చెల్లింపు రిమైండర్‌లు",
        support_updates: "సపోర్ట్ అప్‌డేట్‌లు",
        broadcast_alerts: "నెట్‌వర్క్ బ్రాడ్‌కాస్ట్‌లు",
        promotions: "ఆఫర్లు & ప్రమోషన్లు",
        chat_support: "చాట్ సపోర్ట్",
        typing: "టైపింగ్...",
        send: "పంపండి",
        history: "చరిత్ర",
        account: "ఖాతా",
        active_account: "యాక్టివ్ ఖాతా",
        phone_number: "ఫోన్ నంబర్",
        personal_info: "వ్యక్తిగత సమాచారం",
        personal_info_sub: "పేరు, ఇమెయిల్ మరియు లొకేషన్",
        notification_settings_sub: "యాప్ అలర్ట్‌లు మరియు సౌండ్",
        security_privacy: "భద్రత & గోప్యత",
        security_privacy_sub: "పాస్‌వర్డ్ మరియు యాక్సెస్",
        my_current_plan: "నా ప్రస్తుత ప్లాన్",
        usage_details: "వినియోగం మరియు ప్లాన్ వివరాలు",
        stb_management: "బాక్స్ మేనేజ్మెంట్",
        stb_management_sub: "బాక్స్ అభ్యర్థనలు మరియు చరిత్ర",
        payment_history_sub: "ఇన్‌వాయిస్‌లు మరియు క్రెడిట్‌లు",
        sign_out_p: "లాగౌట్",
        powered_by: "డిష్ ఫైబర్ టెక్నికల్ ద్వారా అందించబడింది",
        interface_language: "యూజర్ ఇంటర్ఫేస్ భాష",
        app_preferences: "యాప్ ప్రాధ్యాన్యతలు",
        app_preferences_sub: "నోటిఫికేషన్, థీమ్ మరియు రీజియన్ సెట్టింగ్‌లను అనుకూలీకరించండి.",
        dark_interface: "డార్క్ మోడ్",
        dark_interface_sub: "కళ్లకు హాయిగా ఉండే డార్క్ మోడ్",
        support_terms: "సహాయం & నిబంధనలు",
        help_center_sub: "ప్రశ్నలు మరియు ప్రత్యక్ష సహాయం",
        privacy_security_sub: "ఖాతా రక్షణ",
        legal_documents: "చట్టపరమైన పత్రాలు",
        legal_documents_sub: "సేవా నిబంధనలు",
        app_build: "యాప్ వెర్షన్",
        cancel: "రద్దు చేయండి",
        app_language: "యాప్ భాష",
        no_notifications: "ఇంకా నోటిఫికేషన్లు లేవు",
        days: "రోజులు",
        cycle: "సైకిల్",
        detailed_info: "వివరణాత్మక సమాచారం",
        start_date: "ప్రారంభ తేదీ",
        view_payment_history: "చెల్లింపు చరిత్రను చూడండి",
        recharge_warning: "సేవకు అంతరాయం కలగకుండా గడువుకు కనీసం 2 రోజుల ముందే రీఛార్జ్ చేసుకోండి.",
        recharge_restricted: "రీఛార్జ్ పరిమితం చేయబడింది",
        recharge_restricted_msg: "మీరు ఇప్పటికే పెండింగ్ పేమెంట్ కలిగి ఉన్నారు. దయచేసి అడ్మిన్ ఆమోదించే వరకు వేచి ఉండండి.",
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
