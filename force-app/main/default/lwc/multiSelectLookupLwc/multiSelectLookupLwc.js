// multiSelectLookupLwc.js - DYNAMIC VERSION (like old Aura)
import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import searchRecords from '@salesforce/apex/MultiSelectLookupController.searchRecords';

export default class MultiSelectLookupLwc extends LightningElement {
    @api objectApiName;
    @api label = 'Select Items';
    @api placeholder = 'Search...';
    @api iconName = 'standard:account';
    @api fields = ''; // Additional fields to display
    @api conditions = ''; // SOQL WHERE conditions
    
    @track searchTerm = '';
    @track searchResults = [];
    @track selectedItems = [];
    @track showDropdown = false;
    @track isLoading = false;
    
    searchTimeout;
    
    // Wire to get object info for label
    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    objectInfo;
    
    get hasSelectedItems() {
        return this.selectedItems.length > 0;
    }
    
    get comboboxClass() {
        return `slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click ${
            this.showDropdown ? 'slds-is-open' : ''
        }`;
    }
    
    get filteredResults() {
        // Filter out already selected items
        return this.searchResults.filter(result => 
            !this.selectedItems.find(item => item.Id === result.Id)
        );
    }
    
    handleSearchChange(event) {
        this.searchTerm = event.target.value;
        
        // Clear previous timeout
        clearTimeout(this.searchTimeout);
        
        if (this.searchTerm.length >= 2) {
            this.isLoading = true;
            this.showDropdown = true;
            
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
        } catch (error) {
            console.error('Search error:', error);
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
        const recordId = event.currentTarget.dataset.id;
        const selectedRecord = this.searchResults.find(r => r.Id === recordId);
        
        if (selectedRecord) {
            this.selectedItems = [...this.selectedItems, selectedRecord];
            this.searchTerm = '';
            this.searchResults = [];
            this.showDropdown = false;
            this.fireChangeEvent();
        }
    }
    
    handleRemove(event) {
        const recordId = event.detail.item.name;
        this.selectedItems = this.selectedItems.filter(item => item.Id !== recordId);
        this.fireChangeEvent();
    }
    
    fireChangeEvent() {
        this.dispatchEvent(new CustomEvent('selectchange', {
            detail: { selectedRecords: this.selectedItems }
        }));
    }
    
    @api
    clear() {
        this.selectedItems = [];
        this.searchTerm = '';
        this.searchResults = [];
        this.fireChangeEvent();
    }
    
    @api
    getSelectedIds() {
        return this.selectedItems.map(item => item.Id);
    }
}