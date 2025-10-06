import { LightningElement, api, track, wire } from 'lwc';
import search from '@salesforce/apex/LookupController.search';
import getRecentRecords from '@salesforce/apex/LookupController.getRecentRecords';

export default class MultiSelectLookupLwc extends LightningElement {
    @api objectApiName = 'Account';
    @api label = '';
    @api placeholder = 'Search...';
    @api iconName = 'standard:account';
    @api fields = '';
    @api conditions = '';
    @api recordLimit = 10;
    
    @api
    get selectedRecords() {
        return this._selectedRecords;
    }
    set selectedRecords(value) {
        this._selectedRecords = value || [];
    }
    
    @track _selectedRecords = [];
    @track searchTerm = '';
    @track searchResults = [];
    @track showDropdown = false;
    @track isLoading = false;
    
    searchTimeout;
    blurTimeout;
    
    get hasSelectedItems() {
        return this._selectedRecords && this._selectedRecords.length > 0;
    }
    
    get hasResults() {
        return this.searchResults && this.searchResults.length > 0;
    }
    
    handleSearchTermChange(event) {
        this.searchTerm = event.target.value;
        
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // If search term is empty or too short, hide dropdown
        if (!this.searchTerm || this.searchTerm.length < 2) {
            this.showDropdown = false;
            this.searchResults = [];
            return;
        }
        
        // Debounce search
        this.searchTimeout = setTimeout(() => {
            this.performSearch();
        }, 300);
    }
    
    async performSearch() {
        this.isLoading = true;
        this.showDropdown = true;
        
        try {
            const results = await search({
                searchTerm: this.searchTerm,
                objectName: this.objectApiName,
                fields: this.fields,
                conditions: this.conditions,
                recordLimit: this.recordLimit
            });
            
            // Filter out already selected items
            const selectedIds = this._selectedRecords.map(r => r.Id);
            this.searchResults = results.filter(r => !selectedIds.includes(r.Id));
            
        } catch (error) {
            console.error('Search error:', error);
            this.searchResults = [];
        } finally {
            this.isLoading = false;
        }
    }
    
    handleFocus() {
        // Show recent items if no search term
        if (!this.searchTerm && this._selectedRecords.length === 0) {
            this.loadRecentRecords();
        } else if (this.searchTerm && this.searchTerm.length >= 2) {
            this.showDropdown = true;
        }
    }
    
    async loadRecentRecords() {
        this.isLoading = true;
        this.showDropdown = true;
        
        try {
            const results = await getRecentRecords({
                objectName: this.objectApiName,
                recordLimit: 5
            });
            
            const selectedIds = this._selectedRecords.map(r => r.Id);
            this.searchResults = results.filter(r => !selectedIds.includes(r.Id));
            
        } catch (error) {
            console.error('Recent records error:', error);
            this.searchResults = [];
        } finally {
            this.isLoading = false;
        }
    }
    
    handleBlur() {
        // Delay hiding dropdown to allow click events to fire
        this.blurTimeout = setTimeout(() => {
            this.showDropdown = false;
        }, 300);
    }
    
    handleSelectItem(event) {
        const recordId = event.currentTarget.dataset.id;
        const selectedResult = this.searchResults.find(r => r.Id === recordId);
        
        if (selectedResult) {
            // Add to selected records
            this._selectedRecords = [...this._selectedRecords, selectedResult];
            
            // Clear search
            this.searchTerm = '';
            this.searchResults = [];
            this.showDropdown = false;
            
            // Notify parent component
            this.dispatchSelectionChange();
        }
    }
    
    handleRemoveItem(event) {
        const recordId = event.detail.name;
        this._selectedRecords = this._selectedRecords.filter(r => r.Id !== recordId);
        
        // Notify parent component
        this.dispatchSelectionChange();
    }
    
    dispatchSelectionChange() {
        this.dispatchEvent(new CustomEvent('selectionchange', {
            detail: {
                selectedRecords: this._selectedRecords
            }
        }));
    }
    
    @api
    clearSelection() {
        this._selectedRecords = [];
        this.searchTerm = '';
        this.searchResults = [];
        this.showDropdown = false;
    }
}