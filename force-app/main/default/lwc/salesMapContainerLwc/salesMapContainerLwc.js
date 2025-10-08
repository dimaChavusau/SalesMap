import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';
import getUser from '@salesforce/apex/SalesMapController.getUser';
import init from '@salesforce/apex/SalesMapController.init';
import searchAccounts from '@salesforce/apex/SalesMapController.searchAccounts';
import getCoordinates from '@salesforce/apex/SalesMapController.getCoordinates';
import updateAccountGeoLocation from '@salesforce/apex/SalesMapController.updateAccountGeoLocation';

export default class SalesMapContainerLwc extends LightningElement {
    @track accounts = [];
    @track displayedAccounts = [];
    @track mapMarkers = [];
    @track isLoading = false;
    @track showEventModal = false;
    @track selectedAccountId;
    @track selectedAccount;
    @track showInfoPanel = false;
    @track infoPanelPosition = { top: '50%', left: '50%' };
    @track selectedView = '--None--';
    @track showLegend = false;
    @track legendItems = [];
    @track filters = {};
    @track filterPanelOpen = true;
    @track initialFilterData = {};
    @track hiddenMarkerGroups = new Set();
    @track hiddenByLegend = new Set(); // Markers hidden by legend toggle
    @track _allMapMarkers = []; // Store ALL markers
    @track onlyMainAccounts = false;
    
    selectedMarkerValue;
    zoomLevel = 10;
    mapCenter = { location: { Latitude: 37.7749, Longitude: -122.4194 }};
    currentUser;
    userAffiliateCode;
    showMerchantStatusFilter = false;
    userFunction;
    
    viewOptions = [
        { label: '--None--', value: '--None--' },
        { label: 'Last Sales Visit', value: 'lastSalesVisit' },
        { label: 'Last Training Event', value: 'lastTrainingEvent' },
        { label: 'Segmentation (POS)', value: 'segmentationPOS' },
        { label: 'Segmentation (Owner)', value: 'segmentationOwner' },
        { label: 'Segmentation (CG)', value: 'segmentationCG' },
        { label: 'Territory', value: 'territory' },
        { label: 'Distribution Channel', value: 'distributionChannel' }
    ];
    
    tableColumns = [
        { label: 'Customer Number', fieldName: 'Bill_to_Number__c', type: 'text', sortable: true },
        { label: 'Name', fieldName: 'Name', type: 'text', sortable: true },
        { label: 'Brand', fieldName: 'Brand_Logo__c', type: 'text' },
        { label: 'Address', fieldName: 'FormattedAddress', type: 'text' },
        { label: 'Territory', fieldName: 'TerritoryName', type: 'text' },
        { label: 'Segment (POS)', fieldName: 'Segment_Icon_POS__c', type: 'text' },
        { label: 'Distribution Channel', fieldName: 'Distribution_Channel__c', type: 'text' },
        { label: 'Account Status', fieldName: 'Account_Status__c', type: 'text' }
    ];

    @wire(CurrentPageReference)
    pageRef;

    connectedCallback() {
        this.initialize();
    }

    async initialize() {
        this.isLoading = true;
        try {
            console.log('Initializing Sales Map...');
            
            // Get current user
            const user = await getUser();
            console.log('User loaded:', user.Name);
            this.currentUser = user;
            this.userAffiliateCode = user.Affiliate_Code_from_Affiliate__c;
            this.userFunction = user.Sivantos_Department_del__c;
            
            // Check if should show merchant status filter
            const validCodes = ['AS-DE', 'S-DE-AD', 'S-DE-AVL', 'S-DE-CEWS', 'W-DE'];
            this.showMerchantStatusFilter = validCodes.includes(this.userAffiliateCode);
            
            // Initialize component data
            console.log('Loading init data...');
            const initData = await init();
            console.log('Init data loaded:', {
                territories: initData.territories?.length,
                trainers: initData.trainers?.length,
                campaigns: initData.campaigns?.length
            });
            
            this.processInitData(initData);
            
            // Update view options based on user
            this.updateViewOptions();
            
            // Set initial view based on user function
            this.setInitialView();
            
            // Auto-select filters and load accounts for certain user roles
            await this.loadInitialAccountsWithFilters(initData);
            
            console.log('Initialization complete');
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Initialization failed', error);
        } finally {
            this.isLoading = false;
        }
    }

    processInitData(data) {
        // Store init data for filter component
        this.initialFilterData = {
            territories: data.territories || [],
            trainers: data.trainers || [],
            campaigns: data.campaigns || [],
            legalHierarchies: data.legalHierarchies || [],
            businessHierarchies: data.businessHierarchies || [],
            distributionChannels: this.buildDistributionChannelOptions(data.disChannelOptions || {})
        };
    }

    buildDistributionChannelOptions(disChannelOptions) {
        const options = [{ label: 'All', value: 'All' }];
        for (const [value, label] of Object.entries(disChannelOptions)) {
            options.push({ label, value });
        }
        return options;
    }

    updateViewOptions() {
        const options = [
            { label: '--None--', value: '--None--' },
            { label: 'Last Sales Visit', value: 'lastSalesVisit' },
            { label: 'Last Training Event', value: 'lastTrainingEvent' },
            { label: 'Segmentation (POS)', value: 'segmentationPOS' },
            { label: 'Territory', value: 'territory' },
            { label: 'Distribution Channel', value: 'distributionChannel' }
        ];

        // Add conditional options based on affiliate
        if (!this.userAffiliateCode?.startsWith('S-FR') && !this.userAffiliateCode?.startsWith('W-FR')) {
            options.push({ label: 'Segmentation (Owner)', value: 'segmentationOwner' });
        }
        if (this.userAffiliateCode?.startsWith('S-FR') || this.userAffiliateCode?.startsWith('W-FR')) {
            options.push({ label: 'Segmentation (CG)', value: 'segmentationCG' });
        }
        if (this.userAffiliateCode?.startsWith('S-DE') || this.userAffiliateCode?.startsWith('AS-DE')) {
            options.push({ label: 'Händlerstatus', value: 'haendlerstatus' });
        }

        this.viewOptions = options;
    }

    setInitialView() {
        if (this.userFunction === 'Sales Rep') {
            this.selectedView = 'lastSalesVisit';
        } else if (this.userFunction === 'Audiology Trainer') {
            this.selectedView = 'lastTrainingEvent';
        } else if (this.initialFilterData.territories?.length > 0) {
            this.selectedView = 'territory';
        }
    }

    async loadInitialAccountsWithFilters(initData) {
        const isAdmin = this.currentUser?.Profile?.PermissionsModifyAllData;
        
        // Only auto-load for non-admin users with specific roles
        if (!isAdmin && 
            (this.userFunction === 'Inside Sales' || 
             this.userFunction === 'Sales Rep' || 
             this.userFunction === 'Audiology Trainer')) {
            
            const territories = initData.territories || [];
            const trainers = initData.trainers || [];
            
            // Pre-populate filters based on user role
            if (this.userFunction !== 'Audiology Trainer' && territories.length > 0) {
                this.filters.selectedTerritories = territories;
            }
            if (trainers.length > 0) {
                this.filters.selectedTrainers = trainers;
            }
            
            // Check if we have territories to search
            if (this.userFunction !== 'Audiology Trainer' && territories.length === 0) {
                this.showToast('Warning', 'No assigned territories for you were found.', 'warning');
                return;
            }
            
            // Only perform search if we have something to search for
            if (territories.length > 0 || trainers.length > 0) {
                // Perform initial search
                try {
                    await this.performSearch();
                } catch (error) {
                    console.error('Initial search error:', error);
                    // Error is already handled in performSearch
                }
            }
        }
    }

    async performSearch() {
        if (this.isLoading) {
            console.log('Search already in progress, skipping...');
            return;
        }
        
        this.isLoading = true;
        try {
            const searchParams = await this.buildSearchParams();
            console.log('Calling searchAccounts...');
            const results = await searchAccounts(searchParams);
            console.log('Search results:', results?.length);
            
            // Clear legend filters on new search
            this.hiddenByLegend.clear();
            
            // Reset legend
            const legendComponent = this.template.querySelector('c-sales-map-legend');
            if (legendComponent) {
                legendComponent.reset();
            }
            
            this.processSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            if (error.body?.message !== 'No accounts found') {
                this.showError('Search failed', error);
            } else {
                this.showToast('Warning', 'No accounts found. Please redefine your criteria.', 'warning');
            }
            this.accounts = [];
            this.displayedAccounts = [];
            this.mapMarkers = [];
            this._allMapMarkers = [];
        } finally {
            this.isLoading = false;
            console.log('Search complete, loading stopped');
        }
    }

    async buildSearchParams() {
        const params = {
            searchTerm: this.filters.searchTerm || '',
            radius: this.filters.radius || 50,
            unit: this.filters.unit || 'km',
            selectedTerritories: this.filters.selectedTerritories || [],
            selectedTrainers: this.filters.selectedTrainers || [],
            selectedCampaigns: this.filters.selectedCampaigns || [],
            selectedLegalHierarchies: this.filters.selectedLegalHierarchies || [],
            selectedBusinessHierarchies: this.filters.selectedBusinessHierarchies || [],
            onlyMainAccounts: this.onlyMainAccounts, // RESTORED
            excludeDoNotVisit: this.filters.excludeDoNotVisit || false,
            salesTargetFilterCode: this.filters.salesTargetFilterCode || null,
            selectedDisChannelFilter: this.filters.selectedDisChannelFilter || '',
            accStatusVal: this.filters.accountStatus || 'Active Account',
            merchantStatusVal: this.filters.merchantStatusFilter || 'All',
            brands: this.filters.brands || '',
            lat: null,
            lng: null
        };

        // Get coordinates if location is specified
        if (this.filters.location) {
            try {
                console.log('Getting coordinates for:', this.filters.location);
                const coordResponse = await getCoordinates({ commonAddress: this.filters.location });
                const coordData = JSON.parse(coordResponse);
                if (coordData.results?.[0]) {
                    params.lat = coordData.results[0].geometry.location.lat;
                    params.lng = coordData.results[0].geometry.location.lng;
                    console.log('Coordinates found:', params.lat, params.lng);
                }
            } catch (error) {
                console.error('Error getting coordinates:', error);
            }
        }

        console.log('Built search params:', JSON.stringify(params, null, 2));
        return params;
    }

    processSearchResults(accounts) {
        this.accounts = accounts;
        this.displayedAccounts = accounts.map(acc => ({
            ...acc,
            FormattedAddress: this.formatAddress(acc),
            TerritoryName: acc.Territory__r?.Name || ''
        }));
        this.buildMapMarkers();
    }

    buildMapMarkers() {
        // Store ALL markers (never filter here)
        this._allMapMarkers = this.accounts
            .filter(acc => acc.BillingLatitude && acc.BillingLongitude)
            .map((acc, index) => {
                const marker = {
                    location: {
                        Latitude: acc.BillingLatitude,
                        Longitude: acc.BillingLongitude
                    },
                    value: acc.Id,
                    icon: 'standard:account',
                    mapIcon: {
                        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                        fillColor: this.getMarkerColor(acc), // This now uses only legend colors
                        fillOpacity: 1,
                        strokeWeight: 1,
                        scale: 1.5
                    },
                    account: acc,
                    hiddenByLegend: false,
                    hiddenByMainToggle: false // This is now obsolete but keeping for compatibility
                };

                // Set map center to first marker
                if (index === 0) {
                    this.mapCenter = { location: marker.location };
                    this.zoomLevel = 12;
                }

                return marker;
            });
        
        // Apply filters
        this.applyAllFilters();
        
        this.updateLegend();
    }

    applyAllFilters() {
        const fieldMap = {
            'lastSalesVisit': 'Last_Sales_Visit_Icon__c',
            'lastTrainingEvent': 'Last_Training_Event_Icon__c',
            'segmentationPOS': 'Sales_Map_POS_Segment_Icon__c',
            'segmentationOwner': 'Sales_Map_Owner_Segment_Icon__c',
            'segmentationCG': 'Sales_Map_CG_Segment_Icon__c',
            'haendlerstatus': 'H_nderstatus__c',
            'distributionChannel': 'Distribution_Channel_Color__c',
            'territory': 'Territory__r.Name'
        };
        
        const accountField = fieldMap[this.selectedView];
        
        this.mapMarkers = this._allMapMarkers.filter(marker => {
            // Check legend filter
            let hiddenByLegend = false;
            if (accountField && this.hiddenByLegend.size > 0) {
                const fieldValue = this.getNestedFieldValue(marker.account, accountField);
                hiddenByLegend = this.hiddenByLegend.has(fieldValue || 'blue');
            }
            
            // Check main account toggle
            const hiddenByMainToggle = this.onlyMainAccounts && !marker.account.is_Main_Account__c;
            
            // Marker is visible only if BOTH filters pass
            return !hiddenByLegend && !hiddenByMainToggle;
        });
        
        console.log('Applied filters:', {
            totalMarkers: this._allMapMarkers.length,
            visibleMarkers: this.mapMarkers.length,
            hiddenByLegend: this.hiddenByLegend.size,
            onlyMainAccounts: this.onlyMainAccounts
        });
        
        // Also update displayed accounts in the table
        this.updateDisplayedAccounts();
    }

    applyLegendFilters() {
        // Filter markers based on hidden groups
        if (this.hiddenMarkerGroups.size === 0) {
            // Show all markers
            this.mapMarkers = this._allMapMarkers.map(m => ({...m, hidden: false}));
        } else {
            // Filter based on hidden groups
            const fieldMap = {
                'lastSalesVisit': 'Last_Sales_Visit_Icon__c',
                'lastTrainingEvent': 'Last_Training_Event_Icon__c',
                'segmentationPOS': 'Sales_Map_POS_Segment_Icon__c',
                'segmentationOwner': 'Sales_Map_Owner_Segment_Icon__c',
                'segmentationCG': 'Sales_Map_CG_Segment_Icon__c',
                'haendlerstatus': 'H_nderstatus__c',
                'distributionChannel': 'Distribution_Channel_Color__c',
                'territory': 'Territory__r.Name'
            };
            
            const accountField = fieldMap[this.selectedView];
            
            this.mapMarkers = this._allMapMarkers
                .filter(marker => {
                    if (!accountField) return true;
                    
                    const fieldValue = this.getNestedFieldValue(marker.account, accountField);
                    const isHidden = this.hiddenMarkerGroups.has(fieldValue);
                    
                    return !isHidden;
                })
                .map(m => ({...m, hidden: false}));
        }
    }

    buildMarkerDescription(account) {
        // Return minimal description (just account name) since we use custom panel
        return account.Name;
    }

    formatAddress(account) {
        if (!account.BillingAddress) return '';
        const addr = account.BillingAddress;
        return `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}`.replace(/^,\s*/, '');
    }

    formatDate(dateValue) {
        if (!dateValue) return 'N/A';
        return new Date(dateValue).toLocaleDateString();
    }

    getMarkerColor(account) {
        // REMOVED: if (account.is_Main_Account__c) return '#FFD700';

        switch (this.selectedView) {
            case 'lastSalesVisit':
                return this.getVisitColor(account.Last_Sales_Visit_Icon__c);
            case 'lastTrainingEvent':
                return this.getVisitColor(account.Last_Training_Event_Icon__c);
            case 'segmentationPOS':
                return this.getSegmentationColor(account.Sales_Map_POS_Segment_Icon__c);
            case 'segmentationOwner':
                return this.getSegmentationColor(account.Sales_Map_Owner_Segment_Icon__c);
            case 'segmentationCG':
                return this.getSegmentationColor(account.Sales_Map_CG_Segment_Icon__c);
            case 'territory':
                return this.getTerritoryColor(account.Territory__r?.Name);
            case 'distributionChannel':
                return this.getDistributionChannelColor(account.Distribution_Channel_Color__c);
            case 'haendlerstatus':
                return this.getHaendlerstatusColor(account.H_nderstatus__c);
            default:
                return '#0070D2'; // Default blue
        }
    }

    getVisitColor(iconValue) {
        const colorMap = {
            'green': '#4BCA81',
            'yellow': '#FFB75D',
            'orange': '#FF9A3C',
            'red': '#FF6361',
            'rose': '#FF69B4'
        };
        return colorMap[iconValue] || '#0070D2'; // Default blue if not set
    }

    getSegmentationColor(iconValue) {
        const colorMap = {
            'green': '#4BCA81',
            'yellow': '#FFB75D',
            'orange': '#FF9A3C',
            'red': '#FF6361'
        };
        return colorMap[iconValue] || '#0070D2'; // Default blue if not set
    }

    getHaendlerstatusColor(status) {
        const colorMap = {
            'Bronze': '#8B4513',
            'Silber': '#C0C0C0',
            'Gold': '#FFD700'
        };
        return colorMap[status] || '#0070D2'; // Default blue if not set
    }

    getTerritoryColor(territoryName) {
        if (!territoryName) return '#0070D2'; // Default blue
        let hash = 0;
        for (let i = 0; i < territoryName.length; i++) {
            hash = territoryName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }

    getDistributionChannelColor(colorValue) {
        const colorMap = {
            'blue': '#0070D2',
            'green': '#4BCA81',
            'yellow': '#FFB75D',
            'orange': '#FF9A3C',
            'red': '#FF6361',
            'brown': '#8B4513',
            'purple': '#9B59B6',
            'pink': '#FF69B4'
        };
        return colorMap[colorValue] || '#0070D2'; // Default blue if not set
    }

    updateLegend() {
        this.showLegend = false;
        this.legendItems = [];

        if (!this.accounts || this.accounts.length === 0) {
            return;
        }

        const fieldMap = {
            'lastSalesVisit': 'Last_Sales_Visit_Icon__c',
            'lastTrainingEvent': 'Last_Training_Event_Icon__c',
            'segmentationPOS': 'Sales_Map_POS_Segment_Icon__c',
            'segmentationOwner': 'Sales_Map_Owner_Segment_Icon__c',
            'segmentationCG': 'Sales_Map_CG_Segment_Icon__c',
            'haendlerstatus': 'H_nderstatus__c',
            'distributionChannel': 'Distribution_Channel_Color__c',
            'territory': 'Territory__r.Name'
        };

        const iconField = fieldMap[this.selectedView];
        if (!iconField) {
            return;
        }

        switch (this.selectedView) {
            case 'lastSalesVisit':
            case 'lastTrainingEvent':
                this.buildVisitLegend(iconField);
                break;
            
            case 'segmentationPOS':
            case 'segmentationOwner':
            case 'segmentationCG':
                this.buildSegmentationLegend(iconField);
                break;

            case 'territory':
                this.buildTerritoryLegend();
                break;

            case 'distributionChannel':
                this.buildDistributionChannelLegend();
                break;

            case 'haendlerstatus':
                this.buildHaendlerstatusLegend();
                break;
        }

        this.showLegend = this.legendItems.length > 0;
    }

    buildVisitLegend(iconField) {
        // Collect all unique icon values from actual data
        const iconCounts = new Map();
        
        this.accounts.forEach(account => {
            const iconValue = this.getNestedFieldValue(account, iconField);
            if (iconValue) {
                iconCounts.set(iconValue, (iconCounts.get(iconValue) || 0) + 1);
            } else {
                iconCounts.set('blue', (iconCounts.get('blue') || 0) + 1);
            }
        });
        
        // Define all possible legend items with priority - "not set" is now priority 0 (first)
        const legendDefinitions = [
            { iconValue: 'blue', label: 'not set', color: '#0070D2', priority: 0 },
            { iconValue: 'green', label: '< 30 days', color: '#4BCA81', priority: 1 },
            { iconValue: 'yellow', label: '30-90 days', color: '#FFB75D', priority: 2 },
            { iconValue: 'orange', label: '90-180 days', color: '#FF9A3C', priority: 3 },
            { iconValue: 'red', label: '> 180 days', color: '#FF6361', priority: 4 },
            { iconValue: 'rose', label: this.selectedView === 'lastSalesVisit' ? 'Visit scheduled' : 'Training scheduled', color: '#FF69B4', priority: 5 }
        ];
        
        // Build legend items only for icons that exist in the data
        const items = [];
        legendDefinitions.forEach(def => {
            if (iconCounts.has(def.iconValue)) {
                items.push({
                    id: def.priority.toString(),
                    label: def.label,
                    color: def.color,
                    iconValue: def.iconValue,
                    priority: def.priority,
                    count: iconCounts.get(def.iconValue)
                });
            }
        });
        
        // Sort by priority (ascending - not set will be first)
        this.legendItems = items.sort((a, b) => a.priority - b.priority);
    }

    buildSegmentationLegend(iconField) {
        // Collect all unique icon values from actual data
        const iconCounts = new Map();
        
        this.accounts.forEach(account => {
            const iconValue = this.getNestedFieldValue(account, iconField);
            if (iconValue) {
                iconCounts.set(iconValue, (iconCounts.get(iconValue) || 0) + 1);
            } else {
                // Accounts without segmentation should be counted as 'blue'
                iconCounts.set('blue', (iconCounts.get('blue') || 0) + 1);
            }
        });
        
        console.log('Segmentation icon counts:', Object.fromEntries(iconCounts));
        
        // Define all possible legend items - "not set" is now priority 0 (first)
        const legendDefinitions = [
            { iconValue: 'blue', label: 'not set', color: '#0070D2', priority: 0 },
            { iconValue: 'red', label: 'Leaf', color: '#FF6361', priority: 1 },
            { iconValue: 'orange', label: 'Heart', color: '#FF9A3C', priority: 2 },
            { iconValue: 'yellow', label: 'Rising Star', color: '#FFB75D', priority: 3 },
            { iconValue: 'green', label: 'Diamond', color: '#4BCA81', priority: 4 }
        ];
        
        // Build legend items only for icons that exist in the data
        const items = [];
        legendDefinitions.forEach(def => {
            if (iconCounts.has(def.iconValue)) {
                items.push({
                    id: def.priority.toString(),
                    label: def.label,
                    color: def.color,
                    iconValue: def.iconValue,
                    priority: def.priority,
                    count: iconCounts.get(def.iconValue)
                });
            }
        });
        
        // Sort by priority (ascending - not set will be first)
        this.legendItems = items.sort((a, b) => a.priority - b.priority);
        
        console.log('Built legend items:', this.legendItems);
    }

    buildTerritoryLegend() {
        const territoryMap = new Map();
        
        this.accounts.forEach(account => {
            const territory = account.Territory__r?.Name;
            if (territory) {
                if (!territoryMap.has(territory)) {
                    territoryMap.set(territory, {
                        label: territory,
                        color: this.getTerritoryColor(territory),
                        iconValue: territory,
                        count: 0
                    });
                }
                territoryMap.get(territory).count++;
            } else {
                // Handle accounts without territory
                if (!territoryMap.has('not set')) {
                    territoryMap.set('not set', {
                        label: 'not set',
                        color: '#0070D2',
                        iconValue: 'not set',
                        count: 0
                    });
                }
                territoryMap.get('not set').count++;
            }
        });
        
        // Sort alphabetically
        const sortedTerritories = Array.from(territoryMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));
        
        this.legendItems = sortedTerritories.map(([territory, data], index) => ({
            id: index.toString(),
            label: data.label,
            color: data.color,
            iconValue: data.iconValue,
            count: data.count
        }));
        
        console.log('Territory legend items:', this.legendItems);
    }

    buildDistributionChannelLegend() {
        const channelMap = new Map();
        
        this.accounts.forEach(account => {
            const channel = account.Distribution_Channel__c;
            const colorValue = account.Distribution_Channel_Color__c;
            
            if (channel) {
                if (!channelMap.has(channel)) {
                    const color = this.getDistributionChannelColor(colorValue);
                    channelMap.set(channel, {
                        label: channel,
                        color: color,
                        iconValue: colorValue || 'blue',
                        count: 0
                    });
                }
                channelMap.get(channel).count++;
            } else {
                // Handle accounts without distribution channel
                if (!channelMap.has('not set')) {
                    channelMap.set('not set', {
                        label: 'not set',
                        color: '#0070D2',
                        iconValue: 'blue',
                        count: 0
                    });
                }
                channelMap.get('not set').count++;
            }
        });
        
        // Sort alphabetically
        const sortedChannels = Array.from(channelMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));
        
        this.legendItems = sortedChannels.map(([channel, data], index) => ({
            id: index.toString(),
            label: data.label,
            color: data.color,
            iconValue: data.iconValue,
            count: data.count
        }));
        
        console.log('Distribution channel legend items:', this.legendItems);
    }

    buildHaendlerstatusLegend() {
        const statusCounts = new Map();
        
        // First, collect all unique status values
        this.accounts.forEach(account => {
            const status = account.H_nderstatus__c;
            if (status) {
                statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
            } else {
                statusCounts.set('not set', (statusCounts.get('not set') || 0) + 1);
            }
        });
        
        console.log('Händlerstatus counts:', Object.fromEntries(statusCounts));
        
        // Define legend with priority - "not set" is now priority 0 (first)
        const legendDefinitions = [
            { iconValue: 'not set', label: 'not set', color: '#0070D2', priority: 0 },
            { iconValue: 'Bronze', label: 'Bronze', color: '#8B4513', priority: 1 },
            { iconValue: 'Silber', label: 'Silber', color: '#C0C0C0', priority: 2 },
            { iconValue: 'Gold', label: 'Gold', color: '#FFD700', priority: 3 }
        ];
        
        // Build legend only for existing statuses
        const items = [];
        legendDefinitions.forEach(def => {
            if (statusCounts.has(def.iconValue)) {
                items.push({
                    id: def.priority.toString(),
                    label: def.label,
                    color: def.color,
                    iconValue: def.iconValue,
                    priority: def.priority,
                    count: statusCounts.get(def.iconValue)
                });
            }
        });
        
        // Sort by priority (ascending - not set will be first)
        this.legendItems = items.sort((a, b) => a.priority - b.priority);
        
        console.log('Händlerstatus legend items:', this.legendItems);
    }

    handleFiltersChange(event) {
        // Just update the filters, don't search automatically
        this.filters = { ...this.filters, ...event.detail };
        console.log('Filters updated:', this.filters);
    }

    handleSearch() {
        console.log('Search button clicked');
        this.performSearch();
        this.closeFilterPanel();
    }

    handleReset() {
        this.filters = {};
        this.accounts = [];
        this.displayedAccounts = [];
        this.mapMarkers = [];
        this._allMapMarkers = [];
        this.selectedView = '--None--';
        this.onlyMainAccounts = false; // RESTORED
        this.hiddenByLegend.clear();
        
        const legendComponent = this.template.querySelector('c-sales-map-legend');
        if (legendComponent) {
            legendComponent.reset();
        }
        
        const filterComponent = this.template.querySelector('c-sales-map-filters');
        if (filterComponent) {
            filterComponent.reset();
        }
    }

    handleViewChange(event) {
        this.selectedView = event.detail.value;
        
        // Clear legend filters when changing view
        this.hiddenByLegend.clear();
        
        // Reset legend component
        const legendComponent = this.template.querySelector('c-sales-map-legend');
        if (legendComponent) {
            legendComponent.reset();
        }
        
        // Rebuild markers with new colors
        this.buildMapMarkers();
    }

    handleMarkerSelect(event) {
        this.selectedMarkerValue = event.target.selectedMarkerValue;
        
        // Find the account for this marker
        const accountId = this.selectedMarkerValue;
        const account = this.accounts.find(acc => acc.Id === accountId);
        
        if (account) {
            this.selectedAccount = account;
            
            // Calculate position based on marker location
            // Wait a tick for the map to update
            setTimeout(() => {
                this.positionPanelNearMarker(account);
            }, 100);
            
            this.showInfoPanel = true;
        }
    }

    positionPanelNearMarker(account) {
        const mapElement = this.template.querySelector('lightning-map');
        if (!mapElement) {
            this.infoPanelPosition = this.calculateFixedPanelPosition();
            return;
        }
        
        const mapRect = mapElement.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const panelWidth = 600;
        const panelHeight = 600;
        
        // Simple quadrant-based positioning
        const mapCenterX = mapRect.left + (mapRect.width / 2);
        const mapCenterY = mapRect.top + (mapRect.height / 2);
        
        // Assume marker is roughly in the center of current view
        // Position panel to the side with more space
        let left, top;
        
        if (mapCenterX < screenWidth / 2) {
            // Marker on left side, show panel on right
            left = Math.min(mapCenterX + 100, screenWidth - panelWidth - 20);
        } else {
            // Marker on right side, show panel on left
            left = Math.max(mapCenterX - panelWidth - 100, 20);
        }
        
        // Center vertically around map center
        top = Math.max(80, Math.min(mapCenterY - panelHeight/2, screenHeight - panelHeight - 20));
        
        this.infoPanelPosition = {
            top: `${top}px`,
            left: `${left}px`
        };
    }

    calculateMarkerScreenPosition(lat, lng, mapRect) {
        try {
            // Get map center and bounds from the current map state
            const mapCenter = this.mapCenter.location;
            
            // Approximate conversion from lat/lng to screen coordinates
            // This is simplified and works best for smaller zoom levels
            const latRange = 0.1 / Math.pow(2, this.zoomLevel - 10); // Approximate visible range
            const lngRange = 0.1 / Math.pow(2, this.zoomLevel - 10);
            
            // Calculate relative position (0 to 1)
            const relativeX = (lng - mapCenter.Longitude + lngRange/2) / lngRange;
            const relativeY = (mapCenter.Latitude - lat + latRange/2) / latRange;
            
            // Convert to screen coordinates
            const x = mapRect.left + (relativeX * mapRect.width);
            const y = mapRect.top + (relativeY * mapRect.height);
            
            // Validate the position is within reasonable bounds
            if (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) {
                return null;
            }
            
            return { x, y };
        } catch (error) {
            console.error('Error calculating marker position:', error);
            return null;
        }
    }

    calculateFixedPanelPosition() {
        // Fallback to fixed position
        const screenWidth = window.innerWidth;
        
        if (screenWidth > 1200) {
            return { 
                top: '100px', 
                left: 'calc(100% - 620px)'
            };
        } else if (screenWidth > 768) {
            return { 
                top: '80px', 
                left: 'calc(100% - 620px)'
            };
        } else {
            return { 
                top: '50%', 
                left: '50%'
            };
        }
    }

    calculateFixedPanelPosition() {
        const screenWidth = window.innerWidth;
        
        // Position the panel in a fixed location that works well
        if (screenWidth > 1200) {
            // Large screen - position on right side with margin
            return { 
                top: '100px', 
                left: 'calc(100% - 620px)' // 600px panel + 20px margin
            };
        } else if (screenWidth > 768) {
            // Medium screen - position top-right
            return { 
                top: '80px', 
                left: 'calc(100% - 620px)'
            };
        } else {
            // Small screen - center it
            return { 
                top: '50%', 
                left: '50%'
            };
        }
    }
    
    
    handleInfoPanelClose() {
        this.showInfoPanel = false;
        this.selectedAccount = null;
    }
    
    handleInfoPanelCreateEvent(event) {
        const accountId = event.detail.accountId;
        this.showInfoPanel = false;
        this.openEventModal(accountId);
    }

    fitMapToMarkers() {
        if (this.mapMarkers.length > 0) {
            const lats = this.mapMarkers.map(m => m.location.Latitude);
            const lngs = this.mapMarkers.map(m => m.location.Longitude);
            const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
            const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
            
            this.mapCenter = {
                location: { Latitude: centerLat, Longitude: centerLng }
            };
            this.zoomLevel = 10;
        }
    }

    toggleFilterPanel() {
        this.filterPanelOpen = !this.filterPanelOpen;
    }

    closeFilterPanel() {
        this.filterPanelOpen = false;
    }

    handleTableSearch(event) {
        const searchKey = event.detail.searchKey?.toLowerCase() || '';
        if (searchKey) {
            this.displayedAccounts = this.accounts.filter(acc => 
                acc.Name?.toLowerCase().includes(searchKey) ||
                acc.Bill_to_Number__c?.toLowerCase().includes(searchKey) ||
                acc.BillingCity?.toLowerCase().includes(searchKey)
            );
        } else {
            this.displayedAccounts = [...this.accounts];
        }
    }

    handleRowAction(event) {
        const action = event.detail.action;
        const accountId = event.detail.row.Id;

        if (action === 'openAccount') {
            this.navigateToAccount(accountId);
        } else if (action === 'createEvent') {
            this.openEventModal(accountId);
        }
    }

    navigateToAccount(accountId) {
        window.open(`/lightning/r/Account/${accountId}/view`, '_blank');
    }

    openEventModal(accountId) {
        this.selectedAccountId = accountId;
        this.showEventModal = true;
    }

    handleEventCreated() {
        this.showEventModal = false;
        this.showToast('Success', 'Event created successfully', 'success');
    }

    handleEventClose() {
        this.showEventModal = false;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    showError(title, error) {
        const message = error?.body?.message || error?.message || 'Unknown error';
        this.showToast(title, message, 'error');
    }

    updateLegend() {
        console.log('updateLegend called for view:', this.selectedView);
        console.log('Number of accounts:', this.accounts?.length);
        
        this.showLegend = false;
        this.legendItems = [];

        if (!this.accounts || this.accounts.length === 0) {
            console.log('No accounts to build legend');
            return;
        }

        const fieldMap = {
            'lastSalesVisit': 'Last_Sales_Visit_Icon__c',
            'lastTrainingEvent': 'Last_Training_Event_Icon__c',
            'segmentationPOS': 'Sales_Map_POS_Segment_Icon__c',
            'segmentationOwner': 'Sales_Map_Owner_Segment_Icon__c',
            'segmentationCG': 'Sales_Map_CG_Segment_Icon__c',
            'haendlerstatus': 'H_nderstatus__c',
            'distributionChannel': 'Distribution_Channel_Color__c',
            'territory': 'Territory__r.Name'
        };

        const iconField = fieldMap[this.selectedView];
        console.log('Icon field:', iconField);
        
        if (!iconField) {
            console.log('No icon field for view:', this.selectedView);
            return;
        }

        switch (this.selectedView) {
            case 'lastSalesVisit':
            case 'lastTrainingEvent':
                this.buildVisitLegend(iconField);
                break;
            
            case 'segmentationPOS':
            case 'segmentationOwner':
            case 'segmentationCG':
                this.buildSegmentationLegend(iconField);
                break;

            case 'territory':
                this.buildTerritoryLegend();
                break;

            case 'distributionChannel':
                this.buildDistributionChannelLegend();
                break;

            case 'haendlerstatus':
                this.buildHaendlerstatusLegend();
                break;
        }

        this.showLegend = this.legendItems.length > 0;
        console.log('Legend items built:', this.legendItems.length);
    }

    handleLegendItemToggle(event) {
        const { iconValue, field, crossed } = event.detail;
        
        console.log('Legend toggle:', { iconValue, field, crossed });
        
        // Update the hidden marker groups set
        if (crossed) {
            // Add to hidden set
            this.hiddenByLegend.add(iconValue);
        } else {
            // Remove from hidden set
            this.hiddenByLegend.delete(iconValue);
        }
        
        console.log('Hidden by legend:', Array.from(this.hiddenByLegend));
        
        // Reapply BOTH filters
        this.applyAllFilters();
    }

    updateDisplayedAccounts() {
        const fieldMap = {
            'lastSalesVisit': 'Last_Sales_Visit_Icon__c',
            'lastTrainingEvent': 'Last_Training_Event_Icon__c',
            'segmentationPOS': 'Sales_Map_POS_Segment_Icon__c',
            'segmentationOwner': 'Sales_Map_Owner_Segment_Icon__c',
            'segmentationCG': 'Sales_Map_CG_Segment_Icon__c',
            'haendlerstatus': 'H_nderstatus__c',
            'distributionChannel': 'Distribution_Channel_Color__c',
            'territory': 'Territory__r.Name'
        };
        
        const accountField = fieldMap[this.selectedView];
        
        // Filter accounts based on BOTH filters
        const filteredAccounts = this.accounts.filter(account => {
            // Check legend filter
            let hiddenByLegend = false;
            if (accountField && this.hiddenByLegend.size > 0) {
                const fieldValue = this.getNestedFieldValue(account, accountField);
                hiddenByLegend = this.hiddenByLegend.has(fieldValue || 'blue');
            }
            
            // Check main account toggle
            const hiddenByMainToggle = this.onlyMainAccounts && !account.is_Main_Account__c;
            
            return !hiddenByLegend && !hiddenByMainToggle;
        });
        
        this.displayedAccounts = filteredAccounts.map(acc => ({
            ...acc,
            FormattedAddress: this.formatAddress(acc),
            TerritoryName: acc.Territory__r?.Name || ''
        }));
    }

    getNestedFieldValue(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }

    get hamburgerClass() {
        return `hamburger hamburger--arrow ${this.filterPanelOpen ? 'is-active' : ''}`;
    }

    get filterContainerClass() {
        return `filter-container ${this.filterPanelOpen ? '' : 'hide'}`;
    }

    get mapContentClass() {
        return `affiliate-map-content ${this.filterPanelOpen ? '' : 'fullWidth'}`;
    }

    get mapContentStyle() {
        return this.hasAccounts ? 'display: block;' : 'display: none;';
    }

    get hasAccounts() {
        return this.accounts && this.accounts.length > 0;
    }

    get tableTitle() {
        return `${this.displayedAccounts.length} accounts found`;
    }
}