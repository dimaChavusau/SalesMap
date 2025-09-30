import { LightningElement, track } from 'lwc';
import getLocation from '@salesforce/apex/SalesMapController.getLocation';

export default class LocationSearchInputLwc extends LightningElement {
    @track searchValue = '';
    @track suggestions = [];
    @track showSuggestions = false;
    @track isLoading = false;
    
    searchTimeout;
    
    handleInputChange(event) {
        this.searchValue = event.target.value;
        
        clearTimeout(this.searchTimeout);
        
        if (this.searchValue.length >= 3) {
            this.isLoading = true;
            this.showSuggestions = true;
            
            this.searchTimeout = setTimeout(() => {
                this.searchLocation();
            }, 300);
        } else {
            this.showSuggestions = false;
        }
    }
    
    async searchLocation() {
        try {
            const result = await getLocation({ searchTerm: this.searchValue });
            this.suggestions = JSON.parse(result);
            this.isLoading = false;
        } catch (error) {
            console.error('Location search error:', error);
            this.isLoading = false;
        }
    }
    
    handleSuggestionClick(event) {
        const location = event.currentTarget.dataset.value;
        this.searchValue = location;
        this.showSuggestions = false;
        
        this.dispatchEvent(new CustomEvent('selectlocation', {
            detail: { location }
        }));
    }
    
    handleFocus() {
        if (this.suggestions.length > 0) {
            this.showSuggestions = true;
        }
    }
    
    handleBlur() {
        // Delay to allow click event to fire
        setTimeout(() => {
            this.showSuggestions = false;
        }, 200);
    }
    
    get noResults() {
        return !this.isLoading && this.suggestions.length === 0 && this.searchValue.length >= 3;
    }
}