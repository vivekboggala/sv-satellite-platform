import { useState, useCallback } from 'react';

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
