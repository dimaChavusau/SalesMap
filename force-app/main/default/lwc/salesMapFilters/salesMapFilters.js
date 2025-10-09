// salesMapFilters.js (same as before, no changes needed)
import { LightningElement, api, track } from 'lwc';

export default class SalesMapFilters extends LightningElement {
    @api userAffiliateCode;
    @api showMerchantStatusFilter = false;
    
    @api 
    get initialFilterData() {
        return this._initialFilterData;
    }
    set initialFilterData(value) {
        this._initialFilterData = value;
        if (value && value.distributionChannels) {
            this.distributionChannelOptions = value.distributionChannels;
        }
        if (value && value.legalHierarchies) {
            this.legalHierarchyOptions = value.legalHierarchies.map(h => ({
                label: h.Name,
                value: h.Id
            }));
        }
        if (value && value.businessHierarchies) {
            this.businessHierarchyOptions = value.businessHierarchies.map(h => ({
                label: h.Name,
                value: h.Id
            }));
        }
    }
    
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
    @track selectedLegalHierarchyIds = [];
    @track selectedBusinessHierarchyIds = [];
    @track selectedDistributionChannels = [];
    @track selectedAccountStatus = ['Active Account'];
    @track selectedMerchantStatus = ['All'];
    @track salesTargetFilter = '';
    @track activeSections = ['search', 'location', 'territories'];
    
    _initialFilterData = {};
    _preSelectedFilters = {};
    
    legalHierarchyOptions = [];
    businessHierarchyOptions = [];
    
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
    
    handleSearchTermInput(event) {
        this.searchTerm = event.target.value;
    }
    
    handleLocationSelect(event) {
        if (event && event.detail && event.detail.location) {
            this.location = event.detail.location;
        }
    }
    
    handleRadiusInput(event) {
        this.radius = event.target.value;
    }
    
    handleUnitChange(event) {
        this.unit = event.detail.value;
    }
    
    handleMainAccountChange(event) {
        this.onlyMainAccounts = event.detail.checked;
    }
    
    handleExcludeDoNotVisitChange(event) {
        this.excludeDoNotVisit = event.detail.checked;
    }
    
    handleTerritoryChange(event) {
        this.selectedTerritories = event.detail.selectedRecords;
    }
    
    handleTrainerChange(event) {
        this.selectedTrainers = event.detail.selectedRecords;
    }
    
    handleCampaignChange(event) {
        this.selectedCampaigns = event.detail.selectedRecords;
    }
    
    handleBrandChange(event) {
        this.selectedBrands = event.detail.value;
    }
    
    handleLegalHierarchyChange(event) {
        this.selectedLegalHierarchyIds = event.detail.value;
        this.selectedLegalHierarchies = this._initialFilterData.legalHierarchies.filter(
            h => this.selectedLegalHierarchyIds.includes(h.Id)
        );
    }
    
    handleBusinessHierarchyChange(event) {
        this.selectedBusinessHierarchyIds = event.detail.value;
        this.selectedBusinessHierarchies = this._initialFilterData.businessHierarchies.filter(
            h => this.selectedBusinessHierarchyIds.includes(h.Id)
        );
    }
    
    handleDistributionChannelChange(event) {
        this.selectedDistributionChannels = event.detail.value;
    }
    
    handleAccountStatusChange(event) {
        this.selectedAccountStatus = event.detail.value;
    }
    
    handleMerchantStatusChange(event) {
        this.selectedMerchantStatus = event.detail.value;
    }
    
    handleSalesTargetChange(event) {
        this.salesTargetFilter = event.detail.value;
    }
    
    handleSearch() {
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
        
        this.dispatchEvent(new CustomEvent('filterschange', { detail: filters }));
        this.dispatchEvent(new CustomEvent('search'));
    }
    
    handleReset() {
        this.reset();
        this.dispatchEvent(new CustomEvent('reset'));
    }
    
    @api
    reset() {
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
        this.selectedLegalHierarchyIds = [];
        this.selectedBusinessHierarchyIds = [];
        this.selectedDistributionChannels = [];
        this.selectedAccountStatus = ['Active Account'];
        this.selectedMerchantStatus = ['All'];
        this.salesTargetFilter = '';
        
        // Clear lookup components
        const lookupComponents = this.template.querySelectorAll('c-multi-select-lookup-lwc');
        lookupComponents.forEach(component => {
            if (component.clearSelection) {
                component.clearSelection();
            }
        });
    }
}