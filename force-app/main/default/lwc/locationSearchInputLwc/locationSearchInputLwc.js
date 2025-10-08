import { LightningElement, api, track } from 'lwc';
import getLocation from '@salesforce/apex/SalesMapController.getLocation';

export default class LocationSearchInputLwc extends LightningElement {
    @api searchValue = '';
    
    @track suggestions = [];
    @track showSuggestions = false;
    @track isLoading = false;
    
    searchTimeout;
    
    handleInputChange(event) {
        const inputValue = event.target.value;
        this.searchValue = inputValue;
        
        console.log('Location input changed:', inputValue);
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        if (!this.searchValue || this.searchValue.length < 3) {
            this.showSuggestions = false;
            this.suggestions = [];
            return;
        }
        
        this.isLoading = true;
        this.showSuggestions = true;
        
        this.searchTimeout = setTimeout(() => {
            this.searchLocation();
        }, 300);
    }
    
    async searchLocation() {
        console.log('Searching for location:', this.searchValue);
        
        try {
            const result = await getLocation({ searchTerm: this.searchValue });
            console.log('Apex result:', result);
            
            const parsedResult = JSON.parse(result);
            
            if (Array.isArray(parsedResult)) {
                this.suggestions = parsedResult;
            } else {
                this.suggestions = [];
            }
            
            this.isLoading = false;
            
        } catch (error) {
            console.error('Location search error:', error);
            this.suggestions = [];
            this.isLoading = false;
        }
    }
    
    handleSuggestionClick(event) {
        // Get the selected location
        const location = event.currentTarget.dataset.value;
        console.log('Location selected:', location);
        
        // Update local state
        this.searchValue = location;
        this.showSuggestions = false;
        
        // Simple event dispatch without bubbles/composed
        try {
            this.dispatchEvent(new CustomEvent('selectlocation', {
                detail: { location }
            }));
            console.log('Event dispatched successfully');
        } catch (error) {
            console.error('Dispatch error:', error);
            // Fallback: try to communicate with parent directly
            this.notifyParent(location);
        }
    }
    
    // Fallback method if event dispatch fails
    notifyParent(location) {
        console.log('Using fallback notification method');
        // The parent should handle oninput or onchange on the component itself
    }
    
    handleFocus() {
        console.log('Input focused');
        if (this.suggestions.length > 0 && this.searchValue.length >= 3) {
            this.showSuggestions = true;
        }
    }
    
    handleBlur() {
        console.log('Input blurred');
        setTimeout(() => {
            this.showSuggestions = false;
        }, 200);
    }
    
    get noResults() {
        return !this.isLoading && 
               this.suggestions.length === 0 && 
               this.searchValue.length >= 3;
    }
    
    @api
    clear() {
        this.searchValue = '';
        this.suggestions = [];
        this.showSuggestions = false;
    }
    
    @api
    getValue() {
        return this.searchValue;
    }
}