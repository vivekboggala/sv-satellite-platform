import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('isDark');
            if (savedTheme !== null) {
                setIsDark(JSON.parse(savedTheme));
            }
        } catch (e) {
            console.error('Failed to load theme:', e);
        }
    };

    const toggleTheme = async () => {
        try {
            const newIsDark = !isDark;
            setIsDark(newIsDark);
            await AsyncStorage.setItem('isDark', JSON.stringify(newIsDark));
        } catch (e) {
            console.error('Failed to save theme:', e);
        }
    };

    const themeColors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, themeColors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        return { isDark: false, toggleTheme: () => { }, themeColors: lightColors };
    }
    return context;
};

export { lightColors, darkColors };
