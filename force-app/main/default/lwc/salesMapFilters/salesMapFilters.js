import { LightningElement, api, track } from 'lwc';

export default class SalesMapFilters extends LightningElement {
    @api userAffiliateCode;
    @api showMerchantStatusFilter = false;
    
    @track searchTerm = '';
    @track radius = 50;
    @track unit = 'km';
    @track onlyMainAccounts = false;
    @track excludeDoNotVisit = false;
    @track selectedTerritories = [];
    @track selectedTrainers = [];
    @track selectedCampaigns = [];
    @track selectedBrands = [];
    @track selectedLegalHierarchies = [];
    @track selectedBusinessHierarchies = [];
    @track selectedDistributionChannels = [];
    @track selectedAccountStatus = ['All'];
    @track selectedMerchantStatus = ['All'];
    @track salesTargetFilter = '';
    
    unitOptions = [
        { label: 'km', value: 'km' },
        { label: 'mi', value: 'mi' }
    ];
    
    brandOptions = [
        { label: 'Signia', value: 'Signia' },
        { label: 'Signia US', value: 'Signia US' },
        { label: 'Widex', value: 'Widex' },
        { label: 'Rexton US', value: 'Rexton US' }
    ];
    
    distributionChannelOptions = [
        { label: 'All', value: 'All' }
        // Will be populated from Apex
    ];
    
    accountStatusOptions = [
        { label: 'All', value: 'All' },
        { label: 'Active Account', value: 'Active Account' },
        { label: 'Inactive Account', value: 'Inactive Account' },
        { label: 'Dormant Account', value: 'Dormant Account' },
        { label: 'Migrated', value: 'Migrated' },
        { label: 'Prospect Account', value: 'Prospect Account' }
    ];
    
    merchantStatusOptions = [
        { label: 'All', value: 'All' },
        { label: 'Bronze', value: 'Bronze' },
        { label: 'Silber', value: 'Silber' },
        { label: 'Gold', value: 'Gold' },
        { label: 'Question Mark', value: 'Question Mark' },
        { label: 'Poor Dogs', value: 'Poor Dogs' },
        { label: 'Stars', value: 'Stars' },
        { label: 'New customer', value: 'New customer' },
        { label: 'Cash Cow', value: 'Cash Cow' }
    ];
    
    salesTargetOptions = [
        { label: 'All accounts', value: '' },
        { label: 'Visit Target reached', value: '1' },
        { label: 'Visit Target not reached', value: '2' },
        { label: 'Training Target reached', value: '3' },
        { label: 'Training Target not reached', value: '4' }
    ];
    
    get showBrands() {
        return this.userAffiliateCode === 'W-US' || 
               this.userAffiliateCode === 'S-US';
    }
    
    get territoryConditions() {
        // Build conditions based on user permissions
        return 'isActive__c = true';
    }
    
    get trainerConditions() {
        return "IsActive = true AND Sivantos_Department_del__c = 'Audiology Trainer'";
    }
    
    handleSearchTermChange(event) {
        this.searchTerm = event.detail.value;
        this.fireFilterChange();
    }
    
    handleLocationSelect(event) {
        this.location = event.detail.location;
        this.fireFilterChange();
    }
    
    handleRadiusChange(event) {
        this.radius = event.detail.value;
        this.fireFilterChange();
    }
    
    handleUnitChange(event) {
        this.unit = event.detail.value;
        this.fireFilterChange();
    }
    
    handleMainAccountChange(event) {
        this.onlyMainAccounts = event.detail.checked;
        this.fireFilterChange();
    }
    
    handleExcludeDoNotVisitChange(event) {
        this.excludeDoNotVisit = event.detail.checked;
        this.fireFilterChange();
    }
    
    handleTerritoryChange(event) {
        this.selectedTerritories = event.detail.selectedRecords;
        this.fireFilterChange();
    }
    
    handleTrainerChange(event) {
        this.selectedTrainers = event.detail.selectedRecords;
        this.fireFilterChange();
    }
    
    handleCampaignChange(event) {
        this.selectedCampaigns = event.detail.selectedRecords;
        this.fireFilterChange();
    }
    
    handleBrandChange(event) {
        this.selectedBrands = event.detail.value;
        this.fireFilterChange();
    }
    
    handleLegalHierarchyChange(event) {
        this.selectedLegalHierarchies = event.detail.selectedRecords;
        this.fireFilterChange();
    }
    
    handleBusinessHierarchyChange(event) {
        this.selectedBusinessHierarchies = event.detail.selectedRecords;
        this.fireFilterChange();
    }
    
    handleDistributionChannelChange(event) {
        this.selectedDistributionChannels = event.detail.value;
        this.fireFilterChange();
    }
    
    handleAccountStatusChange(event) {
        this.selectedAccountStatus = event.detail.value;
        this.fireFilterChange();
    }
    
    handleMerchantStatusChange(event) {
        this.selectedMerchantStatus = event.detail.value;
        this.fireFilterChange();
    }
    
    handleSalesTargetChange(event) {
        this.salesTargetFilter = event.detail.value;
        this.fireFilterChange();
    }
    
    fireFilterChange() {
        const filters = {
            searchTerm: this.searchTerm,
            location: this.location,
            radius: this.radius,
            unit: this.unit,
            onlyMainAccounts: this.onlyMainAccounts,
            excludeDoNotVisit: this.excludeDoNotVisit,
            selectedTerritories: this.selectedTerritories,
            selectedTrainers: this.selectedTrainers,
            selectedCampaigns: this.selectedCampaigns,
            selectedBrands: this.selectedBrands.join(';'),
            selectedLegalHierarchies: this.selectedLegalHierarchies,
            selectedBusinessHierarchies: this.selectedBusinessHierarchies,
            selectedDisChannelFilter: this.selectedDistributionChannels.join(';'),
            accountStatus: this.selectedAccountStatus.join(';'),
            merchantStatusFilter: this.selectedMerchantStatus.join(';'),
            salesTargetFilterCode: this.salesTargetFilter ? parseInt(this.salesTargetFilter) : null
        };
        
        this.dispatchEvent(new CustomEvent('filterschange', {
            detail: filters
        }));
    }
    
    handleSearch() {
        this.dispatchEvent(new CustomEvent('search'));
    }
    
    handleReset() {
        // Reset all filters
        this.searchTerm = '';
        this.radius = 50;
        this.unit = 'km';
        this.onlyMainAccounts = false;
        this.excludeDoNotVisit = false;
        this.selectedTerritories = [];
        this.selectedTrainers = [];
        this.selectedCampaigns = [];
        this.selectedBrands = [];
        this.selectedLegalHierarchies = [];
        this.selectedBusinessHierarchies = [];
        this.selectedDistributionChannels = [];
        this.selectedAccountStatus = ['All'];
        this.selectedMerchantStatus = ['All'];
        this.salesTargetFilter = '';
        
        this.dispatchEvent(new CustomEvent('reset'));
    }
}