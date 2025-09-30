// salesMapFilters.js - COMPLETE VERSION matching old Aura
import { LightningElement, api, track } from 'lwc';
import getUser from '@salesforce/apex/SalesMapController.getUser';

export default class SalesMapFilters extends LightningElement {
    @api userAffiliateCode;
    @api showMerchantStatusFilter = false;
    
    @track searchTerm = '';
    @track radius = 50;
    @track unit = 'km';
    @track location = '';
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
    
    @track isAdmin = false;
    @track userWSAAffiliates = '';
    
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
    
    connectedCallback() {
        this.loadUserInfo();
    }
    
    async loadUserInfo() {
        try {
            const user = await getUser();
            this.isAdmin = user.Profile.PermissionsModifyAllData;
            
            // Build WSA Affiliates condition
            if (user.WSA_Affiliates__c) {
                const affiliatesList = user.WSA_Affiliates__c.split(';');
                const formattedList = affiliatesList.map(aff => `'${aff}'`);
                this.userWSAAffiliates = `(${formattedList.join(',')})`;
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }
    
    // Dynamic conditions based on user permissions (matching old Aura)
    get territoryConditions() {
        if (this.isAdmin) {
            return 'isActive__c = true';
        }
        
        if (this.userWSAAffiliates) {
            return `Affiliate__r.Affiliate_Code__c IN ${this.userWSAAffiliates} AND isActive__c = true`;
        }
        
        return 'isActive__c = true';
    }
    
    get trainerConditions() {
        const baseCondition = "IsActive = true AND Sivantos_Department_del__c = 'Audiology Trainer'";
        
        if (this.isAdmin) {
            return baseCondition;
        }
        
        if (this.userWSAAffiliates) {
            return `Affiliate_Code_from_Affiliate__c IN ${this.userWSAAffiliates} AND ${baseCondition}`;
        }
        
        return baseCondition;
    }
    
    get showBrands() {
        return this.userAffiliateCode === 'W-US' || 
               this.userAffiliateCode === 'S-US';
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
            brands: this.selectedBrands.join(';'),
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
        this.selectedAccountStatus = ['All'];
        this.selectedMerchantStatus = ['All'];
        this.salesTargetFilter = '';
        
        // Clear the multi-select components
        const multiSelects = this.template.querySelectorAll('c-multi-select-lookup-lwc');
        multiSelects.forEach(comp => {
            if (comp.clear) {
                comp.clear();
            }
        });
        
        this.dispatchEvent(new CustomEvent('reset'));
    }
}