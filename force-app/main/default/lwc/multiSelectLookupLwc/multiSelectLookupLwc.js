import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import searchRecords from '@salesforce/apex/MultiSelectLookupController.searchRecords';

export default class MultiSelectLookupLwc extends LightningElement {
    @api objectApiName;
    @api label = 'Select Items';
    @api placeholder = 'Search...';
    @api iconName = 'standard:account';
    @api fields = '';
    @api conditions = '';
    
    @track searchTerm = '';
    @track searchResults = [];
    @track selectedItems = [];
    @track showDropdown = false;
    @track isLoading = false;
    @track error;
    
    searchTimeout;
    
    // Wire to get object info
    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    objectInfo;
    
    // FIX: Cleanup on component destroy
    disconnectedCallback() {
        this.clearSearchTimeout();
    }
    
    // FIX: Proper error handling
    connectedCallback() {
        try {
            // Initialize component
            this.validateProps();
        } catch (error) {
            this.handleError(error);
        }
    }
    
    validateProps() {
        if (!this.objectApiName) {
            throw new Error('objectApiName is required');
        }
    }
    
    clearSearchTimeout() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
    }
    
    get hasSelectedItems() {
        return this.selectedItems.length > 0;
    }
    
    get comboboxClass() {
        return `slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click ${
            this.showDropdown ? 'slds-is-open' : ''
        }`;
    }
    
    get filteredResults() {
        return this.searchResults.filter(result => 
            !this.selectedItems.find(item => item.Id === result.Id)
        );
    }
    
    get hasError() {
        return !!this.error;
    }
    
    handleSearchChange(event) {
        this.searchTerm = event.target.value;
        
        // Clear previous timeout
        this.clearSearchTimeout();
        
        if (this.searchTerm.length >= 2) {
            this.isLoading = true;
            this.showDropdown = true;
            this.error = null;
            
            // Debounce search
            this.searchTimeout = setTimeout(() => {
                this.performSearch();
            }, 300);
        } else {
            this.showDropdown = false;
            this.searchResults = [];
        }
    }
    
    async performSearch() {
        try {
            const results = await searchRecords({
                objectApiName: this.objectApiName,
                searchTerm: this.searchTerm,
                additionalFields: this.fields,
                whereConditions: this.conditions,
                selectedIds: this.selectedItems.map(item => item.Id)
            });
            
            this.searchResults = results;
            this.isLoading = false;
            this.error = null;
        } catch (error) {
            this.handleError(error);
            this.isLoading = false;
            this.searchResults = [];
        }
    }
    
    handleFocus() {
        if (this.searchTerm.length >= 2 && this.searchResults.length > 0) {
            this.showDropdown = true;
        }
    }
    
    handleBlur() {
        // Delay to allow click to register
        setTimeout(() => {
            this.showDropdown = false;
        }, 200);
    }
    
    handleResultClick(event) {
        try {
            const recordId = event.currentTarget.dataset.id;
            const selectedRecord = this.searchResults.find(r => r.Id === recordId);
            
            if (selectedRecord) {
                this.selectedItems = [...this.selectedItems, selectedRecord];
                this.searchTerm = '';
                this.searchResults = [];
                this.showDropdown = false;
                this.fireChangeEvent();
            }
        } catch (error) {
            this.handleError(error);
        }
    }
    
    handleRemove(event) {
        try {
            const recordId = event.detail.item.name;
            this.selectedItems = this.selectedItems.filter(item => item.Id !== recordId);
            this.fireChangeEvent();
        } catch (error) {
            this.handleError(error);
        }
    }
    
    fireChangeEvent() {
        this.dispatchEvent(new CustomEvent('selectchange', {
            detail: { selectedRecords: this.selectedItems }
        }));
    }
    
    handleError(error) {
        this.error = this.reduceErrors(error);
        console.error('MultiSelectLookup Error:', this.error);
        
        // Optionally show toast
        this.dispatchEvent(new CustomEvent('error', {
            detail: { error: this.error }
        }));
    }
    
    reduceErrors(error) {
        if (!error) return 'Unknown error';
        
        if (Array.isArray(error.body)) {
            return error.body.map(e => e.message).join(', ');
        } else if (error.body?.message) {
            return error.body.message;
        } else if (error.message) {
            return error.message;
        }
        
        return 'Unknown error occurred';
    }
    
    @api
    clear() {
        this.selectedItems = [];
        this.searchTerm = '';
        this.searchResults = [];
        this.showDropdown = false;
        this.error = null;
        this.clearSearchTimeout();
        this.fireChangeEvent();
    }
    
    @api
    getSelectedIds() {
        return this.selectedItems.map(item => item.Id);
    }
    
    @api
    setSelectedItems(items) {
        if (Array.isArray(items)) {
            this.selectedItems = items;
            this.fireChangeEvent();
        }
    }
}