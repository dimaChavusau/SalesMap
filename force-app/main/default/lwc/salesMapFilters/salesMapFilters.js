import { LightningElement, api, track } from 'lwc';

export default class SalesMapFilters extends LightningElement {
    @api userAffiliateCode;
    @api showMerchantStatusFilter = false;
    
    // Receive initial filter data from parent
    @api 
    get initialFilterData() {
        return this._initialFilterData;
    }
    set initialFilterData(value) {
        this._initialFilterData = value;
        if (value && value.distributionChannels) {
            this.distributionChannelOptions = value.distributionChannels;
        }
    }
    
    // Receive pre-selected filters from parent
    @api
    get preSelectedFilters() {
        return this._preSelectedFilters;
    }
    set preSelectedFilters(value) {
        this._preSelectedFilters = value;
        if (value) {
            if (value.selectedTerritories) {
                this.selectedTerritories = value.selectedTerritories;
            }
            if (value.selectedTrainers) {
                this.selectedTrainers = value.selectedTrainers;
            }
        }
    }
    
    @track searchTerm = '';
    @track location = '';
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
    @track selectedAccountStatus = ['Active Account']; // Changed default
    @track selectedMerchantStatus = ['All'];
    @track salesTargetFilter = '';
    
    _initialFilterData = {};
    _preSelectedFilters = {};
    
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
        return 'isActive__c = true';
    }
    
    get trainerConditions() {
        return "IsActive = true AND Sivantos_Department_del__c = 'Audiology Trainer'";
    }
    
    // Convert territories to options for dual listbox
    get territoryOptions() {
        if (!this._initialFilterData?.territories) return [];
        return this._initialFilterData.territories.map(t => ({
            label: t.Name,
            value: t.Id
        }));
    }
    
    // Convert trainers to options
    get trainerOptions() {
        if (!this._initialFilterData?.trainers) return [];
        return this._initialFilterData.trainers.map(t => ({
            label: t.Name,
            value: t.Id
        }));
    }
    
    // Convert campaigns to options
    get campaignOptions() {
        if (!this._initialFilterData?.campaigns) return [];
        return this._initialFilterData.campaigns.map(c => ({
            label: c.Name,
            value: c.Id
        }));
    }
    
    // Convert legal hierarchies to options
    get legalHierarchyOptions() {
        if (!this._initialFilterData?.legalHierarchies) return [];
        return this._initialFilterData.legalHierarchies.map(lh => ({
            label: lh.Name,
            value: lh.Id
        }));
    }
    
    // Convert business hierarchies to options
    get businessHierarchyOptions() {
        if (!this._initialFilterData?.businessHierarchies) return [];
        return this._initialFilterData.businessHierarchies.map(bh => ({
            label: bh.Name,
            value: bh.Id
        }));
    }
    
    // Get selected territory IDs
    get selectedTerritoryIds() {
        return this.selectedTerritories.map(t => t.Id || t);
    }
    
    // Get selected trainer IDs
    get selectedTrainerIds() {
        return this.selectedTrainers.map(t => t.Id || t);
    }
    
    // Get selected campaign IDs
    get selectedCampaignIds() {
        return this.selectedCampaigns.map(c => c.Id || c);
    }
    
    // Get selected legal hierarchy IDs
    get selectedLegalHierarchyIds() {
        return this.selectedLegalHierarchies.map(lh => lh.Id || lh);
    }
    
    // Get selected business hierarchy IDs
    get selectedBusinessHierarchyIds() {
        return this.selectedBusinessHierarchies.map(bh => bh.Id || bh);
    }
    
    handleSearchTermChange(event) {
        this.searchTerm = event.detail.value;
        this.fireFilterChange();
    }
    
    handleLocationSelect(event) {
        this.location = event.detail.value;
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
        this.reset();
        this.dispatchEvent(new CustomEvent('reset'));
    }
    
    @api
    reset() {
        // Reset all filters to defaults
        this.searchTerm = '';
        this.location = '';
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
        this.selectedAccountStatus = ['Active Account'];
        this.selectedMerchantStatus = ['All'];
        this.salesTargetFilter = '';
    }
}