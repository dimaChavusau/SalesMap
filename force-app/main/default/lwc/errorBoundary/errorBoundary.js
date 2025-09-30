// errorBoundary.js - Reusable error boundary
import { LightningElement, api } from 'lwc';

export default class ErrorBoundary extends LightningElement {
    @api friendlyMessage = 'Something went wrong';
    error;
    stack;
    errorInfo;

    errorCallback(error, stack) {
        this.error = error;
        this.stack = stack;
        this.errorInfo = {
            componentStack: stack
        };
        
        console.error('Error caught by boundary:', error);
        console.error('Stack:', stack);
        
        // Log to server (optional)
        this.logErrorToServer(error, stack);
    }

    logErrorToServer(error, stack) {
        // Implement server-side error logging
        // Example: call Apex method to log to custom object
        console.log('Would log to server:', { error, stack });
    }

    handleReload() {
        window.location.reload();
    }

    get hasError() {
        return !!this.error;
    }

    get errorMessage() {
        return this.error?.message || 'Unknown error';
    }
}