import { useState, useCallback } from 'react';

/**
 * useAlert hook — drop-in replacement for Alert.alert with CustomAlert.
 *
 * Usage:
 *   const { alertState, showAlert, hideAlert } = useAlert();
 *   // In JSX: <CustomAlert {...alertState} onDismiss={hideAlert} />
 *   // To show: showAlert({ title, message, type, buttons })
 */
const useAlert = () => {
    const [alertState, setAlertState] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        buttons: [],
    });

    const showAlert = useCallback(({ title, message, type = 'info', buttons = [] }) => {
        setAlertState({ visible: true, title, message, type, buttons });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertState(prev => ({ ...prev, visible: false }));
    }, []);

    return { alertState, showAlert, hideAlert };
};

export default useAlert;
