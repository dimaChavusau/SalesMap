import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';
import getUser from '@salesforce/apex/SalesMapController.getUser';
import init from '@salesforce/apex/SalesMapController.init';
import searchAccounts from '@salesforce/apex/SalesMapController.searchAccounts';
import getCoordinates from '@salesforce/apex/SalesMapController.getCoordinates';

// Configuration Constants
const FIELD_MAPPINGS = {
    'lastSalesVisit': 'Last_Sales_Visit_Icon__c',
    'lastTrainingEvent': 'Last_Training_Event_Icon__c',
    'segmentationPOS': 'Sales_Map_POS_Segment_Icon__c',
    'segmentationOwner': 'Sales_Map_Owner_Segment_Icon__c',
    'segmentationCG': 'Sales_Map_CG_Segment_Icon__c',
    'haendlerstatus': 'H_nderstatus__c',
    'distributionChannel': 'Distribution_Channel_Color__c',
    'territory': 'Territory__r.Name'
};

const COLOR_MAPS = {
    visit: {
        'green': '#4BCA81',
        'yellow': '#FFEB3B',
        'orange': '#FF9A3C',
        'red': '#FF6361',
        'rose': '#FF69B4',
        'blue': '#0070D2'
    },
    segmentation: {
        'green': '#4BCA81',
        'yellow': '#FFEB3B',
        'orange': '#FF9A3C',
        'red': '#FF6361',
        'blue': '#0070D2'
    },
    haendlerstatus: {
        'Bronze': '#8B4513',
        'Silber': '#C0C0C0',
        'Gold': '#FFD700',
        'blue': '#0070D2'
    },
    distributionChannel: {
        'blue': '#0070D2',
        'green': '#4BCA81',
        'yellow': '#FFEB3B',
        'orange': '#FF9A3C',
        'red': '#FF6361',
        'brown': '#8B4513',
        'purple': '#9B59B6',
        'pink': '#FF69B4'
    }
};

const LEGEND_DEFINITIONS = {
    visit: [
        { iconValue: 'green', label: '< 30 days', labelAlt: '< 30 days ago', priority: 0 },
        { iconValue: 'yellow', label: '30-90 days', labelAlt: '30-90 days ago', priority: 1 },
        { iconValue: 'orange', label: '90-180 days', labelAlt: '90-180 days ago', priority: 2 },
        { iconValue: 'red', label: '> 180 days', labelAlt: '> 180 days ago', priority: 3 },
        { iconValue: 'rose', labelVisit: 'Visit scheduled', labelTraining: 'Training scheduled', priority: 4 },
        { iconValue: 'blue', label: 'not set', priority: 5 }
    ],
    segmentation: [
        { iconValue: 'blue', label: 'not set', priority: 0 },
        { iconValue: 'red', label: 'Leaf', priority: 1 },
        { iconValue: 'orange', label: 'Heart', priority: 2 },
        { iconValue: 'yellow', label: 'Rising Star', priority: 3 },
        { iconValue: 'green', label: 'Diamond', priority: 4 }
    ],
    haendlerstatus: [
        { iconValue: 'blue', label: 'not set', priority: 0 },
        { iconValue: 'Bronze', label: 'Bronze', priority: 1 },
        { iconValue: 'Silber', label: 'Silber', priority: 2 },
        { iconValue: 'Gold', label: 'Gold', priority: 3 }
    ]
};

export default class SalesMapContainerLwc extends LightningElement {
    @api pageReference;
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
    @track hiddenByLegend = new Set();
    @track _allMapMarkers = [];
    
    filterDebounceTimeout;
    isFilteringInProgress = false;
    skipMapFitting = false;
    boundResizeHandler;
    isAdmin = false;
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
        { label: 'Distribution Channel', value: 'distributionChannel' },
        { label: 'Händlerstatus', value: 'haendlerstatus' }
    ];
    
    tableColumns = [
        { label: 'Customer Number', fieldName: 'Bill_to_Number__c' },
        { label: 'Name', fieldName: 'Name' },
        { label: 'Brand', fieldName: 'Brand_Logo__c' },
        { label: 'Address', fieldName: 'FormattedAddress' },
        { label: 'Territory', fieldName: 'TerritoryName' },
        { label: 'Segment (POS)', fieldName: 'Segment_Icon_POS__c' },
        { label: 'Distribution Channel', fieldName: 'Distribution_Channel__c' },
        { label: 'Account Status', fieldName: 'Account_Status__c' }
    ];

    @wire(CurrentPageReference)
    pageRef;

    connectedCallback() {
        this.initialize();
        
        // Create bound handler once
        this.boundResizeHandler = () => {
            if (window.innerWidth < 900 && this.filterPanelOpen) {
                console.log('Viewport too narrow, auto-closing filter panel');
                this.filterPanelOpen = false;
            }
        };
        
        // Add listener
        window.addEventListener('resize', this.boundResizeHandler);
    }

    disconnectedCallback() {
        // Proper cleanup
        if (this.boundResizeHandler) {
            window.removeEventListener('resize', this.boundResizeHandler);
            this.boundResizeHandler = null;
        }
    }

    handleResize() {
        // Auto-close panel on very narrow viewports
        if (window.innerWidth < 900 && this.filterPanelOpen) {
            console.log('Viewport too narrow, closing filter panel');
            this.filterPanelOpen = false;
        }
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
        this.selectedDistributionChannels = [];
        this.selectedAccountStatus = ['Active Account'];
        this.selectedMerchantStatus = ['All'];
        this.salesTargetFilter = '';
        
        // Clear the location input component
        const locationInput = this.template.querySelector('c-location-search-input-lwc');
        if (locationInput) {
            locationInput.clear();
        }
    }

    async initialize() {
        this.isLoading = true;
        try {
            const user = await getUser();
            this.currentUser = user;
            this.userAffiliateCode = user.Affiliate_Code_from_Affiliate__c;
            this.userFunction = user.Sivantos_Department_del__c;
            this.isAdmin = user.Profile.PermissionsModifyAllData; // Add this line
            
            const validCodes = ['AS-DE', 'S-DE-AD', 'S-DE-AVL', 'S-DE-CEWS', 'W-DE'];
            this.showMerchantStatusFilter = validCodes.includes(this.userAffiliateCode);
            
            const initData = await init();
            this.processInitData(initData);
            this.updateViewOptions();
            this.setInitialView();
            await this.loadInitialAccountsWithFilters(initData);
        } catch (error) {
            this.showError('Initialization failed', error);
        } finally {
            this.isLoading = false;
        }
    }

    processInitData(data) {
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
        const baseOptions = [
            { label: '--None--', value: '--None--' },
            { label: 'Last Sales Visit', value: 'lastSalesVisit' },
            { label: 'Last Training Event', value: 'lastTrainingEvent' },
            { label: 'Segmentation (POS)', value: 'segmentationPOS' },
            { label: 'Territory', value: 'territory' },
            { label: 'Distribution Channel', value: 'distributionChannel' }
        ];

        const isAdmin = this.currentUser?.Profile?.PermissionsModifyAllData;
        const isFR = this.userAffiliateCode?.startsWith('S-FR') || this.userAffiliateCode?.startsWith('W-FR');
        const isDE = this.userAffiliateCode?.startsWith('S-DE') || this.userAffiliateCode?.startsWith('AS-DE');

        // Segmentation (Owner) - for non-FR affiliates OR admins
        if (!isFR || isAdmin) {
            baseOptions.push({ label: 'Segmentation (Owner)', value: 'segmentationOwner' });
        }
        
        // Segmentation (CG) - for FR affiliates OR admins
        if (isFR || isAdmin) {
            baseOptions.push({ label: 'Segmentation (CG)', value: 'segmentationCG' });
        }
        
        // Händlerstatus - for DE affiliates OR admins
        if (isDE || isAdmin) {
            baseOptions.push({ label: 'Händlerstatus', value: 'haendlerstatus' });
        }

        this.viewOptions = baseOptions;
    }

    setInitialView() {
        const viewMap = {
            'Sales Rep': 'lastSalesVisit',
            'Audiology Trainer': 'lastTrainingEvent'
        };
        this.selectedView = viewMap[this.userFunction] || 
            (this.initialFilterData.territories?.length > 0 ? 'territory' : '--None--');
    }

    async loadInitialAccountsWithFilters(initData) {
        const isAdmin = this.currentUser?.Profile?.PermissionsModifyAllData;
        
        if (!isAdmin && ['Inside Sales', 'Sales Rep', 'Audiology Trainer'].includes(this.userFunction)) {
            const territories = initData.territories || [];
            const trainers = initData.trainers || [];
            
            if (this.userFunction !== 'Audiology Trainer' && territories.length > 0) {
                this.filters.selectedTerritories = territories;
            }
            if (trainers.length > 0) {
                this.filters.selectedTrainers = trainers;
            }
            
            if (territories.length === 0 && this.userFunction !== 'Audiology Trainer') {
                this.showToast('Warning', 'No assigned territories found.', 'warning');
                return;
            }
            
            if (territories.length > 0 || trainers.length > 0) {
                await this.performSearch();
            }
        }
    }

    async performSearch() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        try {
            const searchParams = await this.buildSearchParams();
            const results = await searchAccounts(searchParams);
            
            this.hiddenByLegend.clear();
            const legendComponent = this.template.querySelector('c-sales-map-legend');
            if (legendComponent) legendComponent.reset();
            
            this.processSearchResults(results);
        } catch (error) {
            if (error.body?.message !== 'No accounts found') {
                this.showError('Search failed', error);
            } else {
                this.showToast('Warning', 'No accounts found. Please redefine criteria.', 'warning');
            }
            this.clearResults();
        } finally {
            this.isLoading = false;
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
            onlyMainAccounts: false,
            excludeDoNotVisit: this.filters.excludeDoNotVisit || false,
            salesTargetFilterCode: this.filters.salesTargetFilterCode || null,
            selectedDisChannelFilter: this.filters.selectedDisChannelFilter || '',
            accStatusVal: this.filters.accountStatus || 'Active Account',
            merchantStatusVal: this.filters.merchantStatusFilter || 'All',
            brands: this.filters.brands || '',
            lat: null,
            lng: null
        };

        if (this.filters.location) {
            try {
                const coordResponse = await getCoordinates({ commonAddress: this.filters.location });
                const coordData = JSON.parse(coordResponse);
                if (coordData.results?.[0]) {
                    params.lat = coordData.results[0].geometry.location.lat;
                    params.lng = coordData.results[0].geometry.location.lng;
                    
                    // Store searched location for map centering
                    this.searchedLocation = {
                        Latitude: params.lat,
                        Longitude: params.lng
                    };
                }
            } catch (error) {
                console.error('Error getting coordinates:', error);
            }
        } else {
            this.searchedLocation = null;
        }

        return params;
    }

    processSearchResults(accounts) {
        this.accounts = accounts;
        this.displayedAccounts = accounts.map(acc => ({
            ...acc,
            FormattedAddress: this.formatAddress(acc),
            TerritoryName: acc.Territory__r?.Name || ''
        }));
        
        // Build markers (this will call fitMapToMarkers internally)
        this.buildMapMarkers();
        
        // SPECIAL CASE: If user searched by location with radius
        // Center on searched location instead of markers
        if (this.searchedLocation && this.filters.radius) {
            this.mapCenter = { location: this.searchedLocation };
            
            // Calculate zoom based on radius to show search area
            const radius = parseFloat(this.filters.radius);
            const unit = this.filters.unit || 'km';
            const radiusInKm = unit === 'mi' ? radius * 1.60934 : radius;
            
            // Approximate degrees per km at equator: ~0.009
            // We want the radius to fit comfortably in viewport
            const degreesRadius = (radiusInKm * 0.009) * 2; // diameter
            
            // Calculate zoom for this coverage
            if (degreesRadius >= 180) this.zoomLevel = 1;
            else if (degreesRadius >= 90) this.zoomLevel = 2;
            else if (degreesRadius >= 45) this.zoomLevel = 3;
            else if (degreesRadius >= 22.5) this.zoomLevel = 4;
            else if (degreesRadius >= 11.25) this.zoomLevel = 5;
            else if (degreesRadius >= 5.625) this.zoomLevel = 6;
            else if (degreesRadius >= 2.813) this.zoomLevel = 7;
            else if (degreesRadius >= 1.406) this.zoomLevel = 8;
            else if (degreesRadius >= 0.703) this.zoomLevel = 9;
            else if (degreesRadius >= 0.352) this.zoomLevel = 10;
            else if (degreesRadius >= 0.176) this.zoomLevel = 11;
            else if (degreesRadius >= 0.088) this.zoomLevel = 12;
            else if (degreesRadius >= 0.044) this.zoomLevel = 13;
            else this.zoomLevel = 14;
        }
        // Otherwise, fitMapToMarkers was already called in buildMapMarkers
    }

    buildMapMarkers() {
        this._allMapMarkers = this.accounts
            .filter(acc => acc.BillingLatitude && acc.BillingLongitude)
            .map((acc) => {
                const marker = {
                    location: {
                        Latitude: acc.BillingLatitude,
                        Longitude: acc.BillingLongitude
                    },
                    value: acc.Id,
                    icon: 'standard:account',
                    mapIcon: {
                        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                        fillColor: this.getMarkerColor(acc),
                        fillOpacity: 1,
                        strokeWeight: 1,
                        scale: 1.5
                    },
                    account: acc
                };
                return marker;
            });
        
        // Apply filters
        this.applyFiltersOptimized();
        
        // Only fit map on initial load or search
        if (!this.skipMapFitting && this.mapMarkers.length > 0) {
            this.fitMapToMarkers(this.mapMarkers);
        }
        
        // Update legend
        this.updateLegend();
    }

    // Unified color getter
    getMarkerColor(account) {
        const colorGetters = {
            'lastSalesVisit': () => this.getColorFromMap(COLOR_MAPS.visit, account.Last_Sales_Visit_Icon__c),
            'lastTrainingEvent': () => this.getColorFromMap(COLOR_MAPS.visit, account.Last_Training_Event_Icon__c),
            'segmentationPOS': () => this.getColorFromMap(COLOR_MAPS.segmentation, account.Sales_Map_POS_Segment_Icon__c),
            'segmentationOwner': () => this.getColorFromMap(COLOR_MAPS.segmentation, account.Sales_Map_Owner_Segment_Icon__c),
            'segmentationCG': () => this.getColorFromMap(COLOR_MAPS.segmentation, account.Sales_Map_CG_Segment_Icon__c),
            'haendlerstatus': () => this.getColorFromMap(COLOR_MAPS.haendlerstatus, account.H_nderstatus__c),
            'territory': () => this.getTerritoryColor(account.Territory__r?.Name),
            'distributionChannel': () => this.getColorFromMap(COLOR_MAPS.distributionChannel, account.Distribution_Channel_Color__c)
        };

        return colorGetters[this.selectedView]?.() || '#0070D2';
    }

    getColorFromMap(colorMap, value) {
        return colorMap[value] || colorMap['blue'] || '#0070D2';
    }

    getTerritoryColor(territoryName) {
        if (!territoryName) return '#0070D2';
        let hash = 0;
        for (let i = 0; i < territoryName.length; i++) {
            hash = territoryName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return `hsl(${hash % 360}, 70%, 50%)`;
    }

    getDistributionChannelColor(colorValue) {
        const colorMap = {
            'blue': '#0070D2', 'green': '#4BCA81', 'yellow': '#FFEB3B',
            'orange': '#FF9A3C', 'red': '#FF6361', 'brown': '#8B4513',
            'purple': '#9B59B6', 'pink': '#FF69B4'
        };
        return colorMap[colorValue] || '#0070D2';
    }

    applyFilters() {
        // Redirect to optimized version
        this.applyFiltersOptimized();
    }

    // Unified legend builder
    updateLegend() {
        this.showLegend = false;
        this.legendItems = [];

        if (!this.accounts?.length) return;

        const accountField = FIELD_MAPPINGS[this.selectedView];
        if (!accountField) return;

        const legendBuilders = {
            'lastSalesVisit': () => this.buildDefinedLegend('visit', LEGEND_DEFINITIONS.visit, accountField, 'visit'),
            'lastTrainingEvent': () => this.buildDefinedLegend('visit', LEGEND_DEFINITIONS.visit, accountField, 'training'),
            'segmentationPOS': () => this.buildDefinedLegend('segmentation', LEGEND_DEFINITIONS.segmentation, accountField),
            'segmentationOwner': () => this.buildDefinedLegend('segmentation', LEGEND_DEFINITIONS.segmentation, accountField),
            'segmentationCG': () => this.buildDefinedLegend('segmentation', LEGEND_DEFINITIONS.segmentation, accountField),
            'haendlerstatus': () => this.buildDefinedLegend('haendlerstatus', LEGEND_DEFINITIONS.haendlerstatus, accountField),
            'territory': () => this.buildDynamicLegend(accountField, (name) => this.getTerritoryColor(name)),
            'distributionChannel': () => this.buildDistributionChannelLegend()
        };

        legendBuilders[this.selectedView]?.();
        this.showLegend = this.legendItems.length > 0;
    }

    buildDefinedLegend(colorMapKey, definitions, accountField, labelType = null) {
        const iconCounts = this.countIconValues(accountField);
        const colorMap = COLOR_MAPS[colorMapKey];
        
        const items = definitions
            .filter(def => iconCounts.has(def.iconValue))
            .map(def => {
                let label = def.label;
                
                // Handle special label cases for visits
                if (labelType === 'visit' && def.labelVisit) {
                    label = def.labelVisit;
                } else if (labelType === 'training' && def.labelTraining) {
                    label = def.labelTraining;
                } else if (def.labelAlt && (labelType === 'visit' || labelType === 'training')) {
                    label = def.labelAlt;
                }
                
                return {
                    id: def.priority.toString(),
                    label: label,
                    color: colorMap[def.iconValue],
                    iconValue: def.iconValue,
                    priority: def.priority,
                    count: iconCounts.get(def.iconValue)
                };
            });
        
        // ALL legends sort ascending by priority (matching VF implementation)
        this.legendItems = items.sort((a, b) => a.priority - b.priority);
    }

    buildDynamicLegend(fieldName, colorGetter) {
        const valueMap = new Map();
        
        this.accounts.forEach(account => {
            const value = this.getNestedFieldValue(account, fieldName) || 'not set';
            if (!valueMap.has(value)) {
                valueMap.set(value, {
                    label: value,
                    color: colorGetter(value, account),
                    iconValue: value,
                    count: 0
                });
            }
            valueMap.get(value).count++;
        });
        
        // Sort alphabetically (ascending) - matches VF sortJSON behavior
        this.legendItems = Array.from(valueMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, data], index) => ({
                id: index.toString(),
                ...data
            }));
    }

    buildDistributionChannelLegend() {
        const valueMap = new Map();
        
        this.accounts.forEach(account => {
            const channel = account.Distribution_Channel__c || 'not set';
            const colorValue = account.Distribution_Channel_Color__c || 'blue';
            
            if (!valueMap.has(channel)) {
                valueMap.set(channel, {
                    label: channel,
                    color: this.getColorFromMap(COLOR_MAPS.distributionChannel, colorValue),
                    iconValue: colorValue,
                    count: 0
                });
            }
            valueMap.get(channel).count++;
        });
        
        // Sort alphabetically (ascending) - matches VF implementation
        this.legendItems = Array.from(valueMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([channel, data], index) => ({
                id: index.toString(),
                ...data
            }));
    }

    countIconValues(accountField) {
        const iconCounts = new Map();
        this.accounts.forEach(account => {
            const iconValue = this.getNestedFieldValue(account, accountField) || 'blue';
            iconCounts.set(iconValue, (iconCounts.get(iconValue) || 0) + 1);
        });
        return iconCounts;
    }

    updateDisplayedAccounts() {
        const accountField = FIELD_MAPPINGS[this.selectedView];
        
        const filteredAccounts = this.accounts.filter(account => {
            if (accountField && this.hiddenByLegend.size > 0) {
                const fieldValue = this.getNestedFieldValue(account, accountField);
                return !this.hiddenByLegend.has(fieldValue || 'blue');
            }
            return true;
        });
        
        this.displayedAccounts = filteredAccounts.map(acc => ({
            ...acc,
            FormattedAddress: this.formatAddress(acc),
            TerritoryName: acc.Territory__r?.Name || ''
        }));
    }

    formatAddress(account) {
        if (!account.BillingAddress) return '';
        const addr = account.BillingAddress;
        return `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}`.replace(/^,\s*/, '');
    }

    getNestedFieldValue(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }

    clearResults() {
        this.accounts = [];
        this.displayedAccounts = [];
        this.mapMarkers = [];
        this._allMapMarkers = [];
    }

    // Event Handlers
    handleFiltersChange(event) {
        this.filters = { ...this.filters, ...event.detail };
    }

    handleSearch() {
        console.log('handleSearch called');
        this.performSearch();
        
        // Auto-close filter panel after search on desktop
        this.autoCloseFilterPanel();
    }

    autoCloseFilterPanel() {
        // Close filter panel on desktop (> 1024px)
        // Keep open on mobile for better UX
        if (window.innerWidth > 1024) {
            this.filterPanelOpen = false;
        }
    }

    handleReset() {
        this.filters = {};
        this.clearResults();
        this.selectedView = '--None--';
        this.hiddenByLegend.clear();
        
        const legendComponent = this.template.querySelector('c-sales-map-legend');
        if (legendComponent) legendComponent.reset();
        
        const filterComponent = this.template.querySelector('c-sales-map-filters');
        if (filterComponent) filterComponent.reset();
    }

    handleViewChange(event) {
        this.selectedView = event.detail.value;
        this.hiddenByLegend.clear();
        
        const legendComponent = this.template.querySelector('c-sales-map-legend');
        if (legendComponent) legendComponent.reset();
        
        this.buildMapMarkers();
    }

    handleMarkerSelect(event) {
        this.selectedMarkerValue = event.target.selectedMarkerValue;
        const account = this.accounts.find(acc => acc.Id === this.selectedMarkerValue);
        
        if (account) {
            this.selectedAccount = account;
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
        const mapCenterX = mapRect.left + (mapRect.width / 2);
        
        let left, top;
        
        if (mapCenterX < screenWidth / 2) {
            left = Math.min(mapCenterX + 100, screenWidth - panelWidth - 20);
        } else {
            left = Math.max(mapCenterX - panelWidth - 100, 20);
        }
        
        top = Math.max(80, 100);
        
        this.infoPanelPosition = {
            top: `${top}px`,
            left: `${left}px`
        };
    }

    calculateFixedPanelPosition() {
        const screenWidth = window.innerWidth;
        
        if (screenWidth > 1200) {
            return { top: '100px', left: 'calc(100% - 620px)' };
        } else if (screenWidth > 768) {
            return { top: '80px', left: 'calc(100% - 620px)' };
        } else {
            return { top: '50%', left: '50%' };
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

    handleLegendItemToggle(event) {
        const { iconValue, crossed } = event.detail;
        
        // Update hidden set immediately for responsive UI
        if (crossed) {
            this.hiddenByLegend.add(iconValue);
        } else {
            this.hiddenByLegend.delete(iconValue);
        }
        
        // Skip map fitting for legend toggles (keep current view)
        this.skipMapFitting = true;
        
        // Debounce the heavy filtering operation
        if (this.filterDebounceTimeout) {
            clearTimeout(this.filterDebounceTimeout);
        }
        
        this.filterDebounceTimeout = setTimeout(() => {
            this.applyFiltersOptimized();
            this.skipMapFitting = false;
        }, 100); // 100ms debounce
    }

    applyFiltersOptimized() {
        if (this.isFilteringInProgress) return;
        
        const accountField = FIELD_MAPPINGS[this.selectedView];
        
        if (!accountField || this.hiddenByLegend.size === 0) {
            // No filtering needed - show all
            this.mapMarkers = [...this._allMapMarkers];
            this.updateDisplayedAccountsOptimized();
            return;
        }
        
        this.isFilteringInProgress = true;
        
        // Use requestAnimationFrame for non-blocking filtering
        requestAnimationFrame(() => {
            this.batchFilterMarkers(accountField);
        });
    }

    batchFilterMarkers(accountField) {
        const BATCH_SIZE = 100; // Process 100 markers at a time
        const allMarkers = this._allMapMarkers;
        const filtered = [];
        let index = 0;
        
        const processBatch = () => {
            const endIndex = Math.min(index + BATCH_SIZE, allMarkers.length);
            
            for (let i = index; i < endIndex; i++) {
                const marker = allMarkers[i];
                if (marker) {
                    const fieldValue = this.getNestedFieldValue(marker.account, accountField);
                    if (!this.hiddenByLegend.has(fieldValue || 'blue')) {
                        filtered.push(marker);
                    }
                }
            }
            
            index = endIndex;
            
            if (index < allMarkers.length) {
                // More batches to process
                requestAnimationFrame(processBatch);
            } else {
                // All done - update in one go
                this.mapMarkers = filtered;
                this.updateDisplayedAccountsOptimized();
                this.isFilteringInProgress = false;
            }
        };
        
        processBatch();
    }

    updateDisplayedAccountsOptimized() {
        const accountField = FIELD_MAPPINGS[this.selectedView];
        
        if (!accountField || this.hiddenByLegend.size === 0) {
            // No filtering - show all accounts
            this.displayedAccounts = this.accounts.map(acc => ({
                ...acc,
                FormattedAddress: this.formatAddress(acc),
                TerritoryName: acc.Territory__r?.Name || ''
            }));
            return;
        }
        
        // Create Set of visible account IDs for O(1) lookup
        const visibleAccountIds = new Set(
            this.mapMarkers.map(m => m.account.Id)
        );
        
        // Filter accounts using Set lookup (much faster)
        this.displayedAccounts = this.accounts
            .filter(acc => visibleAccountIds.has(acc.Id))
            .map(acc => ({
                ...acc,
                FormattedAddress: this.formatAddress(acc),
                TerritoryName: acc.Territory__r?.Name || ''
            }));
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
            window.open(`/lightning/r/Account/${accountId}/view`, '_blank');
        } else if (action === 'createEvent') {
            this.openEventModal(accountId);
        }
    }

    fitMapToMarkers(markers) {
        // Skip if flag is set (e.g., during legend toggle)
        if (this.skipMapFitting) {
            return;
        }
        
        if (!markers || markers.length === 0) {
            return;
        }
        
        // Single marker - center on it with high zoom
        if (markers.length === 1) {
            this.mapCenter = { location: markers[0].location };
            this.zoomLevel = 15;
            return;
        }
        
        // Multiple markers - calculate bounds
        const bounds = this.calculateBounds(markers);
        this.mapCenter = this.getCenterFromBounds(bounds);
        this.zoomLevel = this.getZoomForBounds(bounds);
        
        // Add small padding to zoom out slightly
        if (this.zoomLevel > 1) {
            this.zoomLevel = this.zoomLevel - 1;
        }
    }

    closeFilterPanel() {
        if (window.innerWidth > 1080) {
            this.filterPanelOpen = false;
        }
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

    /**
 * Calculate appropriate zoom level based on marker spread
 * Mimics Google Maps fitBounds behavior
 */
    calculateZoomLevel(markers) {
        if (markers.length === 0) return 10;
        if (markers.length === 1) return 15;
        
        const lats = markers.map(m => m.location.Latitude);
        const lngs = markers.map(m => m.location.Longitude);
        
        const latSpread = Math.max(...lats) - Math.min(...lats);
        const lngSpread = Math.max(...lngs) - Math.min(...lngs);
        const maxSpread = Math.max(latSpread, lngSpread);
        
        // Zoom level calculation (approximate Google Maps fitBounds)
        if (maxSpread >= 10) return 5;
        if (maxSpread >= 5) return 6;
        if (maxSpread >= 2) return 7;
        if (maxSpread >= 1) return 8;
        if (maxSpread >= 0.5) return 9;
        if (maxSpread >= 0.25) return 10;
        if (maxSpread >= 0.125) return 11;
        if (maxSpread >= 0.06) return 12;
        if (maxSpread >= 0.03) return 13;
        if (maxSpread >= 0.015) return 14;
        return 15;
    }

    /**
     * Calculate center point of all markers
     */
    calculateCenter(markers) {
        if (markers.length === 0) return this.mapCenter;
        
        const lats = markers.map(m => m.location.Latitude);
        const lngs = markers.map(m => m.location.Longitude);
        
        return {
            location: {
                Latitude: (Math.max(...lats) + Math.min(...lats)) / 2,
                Longitude: (Math.max(...lngs) + Math.min(...lngs)) / 2
            }
        };
    }

    /**
     * Calculate bounds that contain all markers
     * Returns {north, south, east, west}
     */
    calculateBounds(markers) {
        if (!markers || markers.length === 0) {
            return null;
        }
        
        const lats = markers.map(m => m.location.Latitude);
        const lngs = markers.map(m => m.location.Longitude);
        
        return {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lngs),
            west: Math.min(...lngs)
        };
    }

    /**
     * Calculate center from bounds
     */
    getCenterFromBounds(bounds) {
        return {
            location: {
                Latitude: (bounds.north + bounds.south) / 2,
                Longitude: (bounds.east + bounds.west) / 2
            }
        };
    }

    /**
     * Calculate zoom level to fit bounds
     * Based on viewport size and marker spread
     */
    getZoomForBounds(bounds) {
        if (!bounds) return 10;
        
        const latDiff = bounds.north - bounds.south;
        const lngDiff = bounds.east - bounds.west;
        
        // Use the larger of the two differences
        const maxDiff = Math.max(latDiff, lngDiff);
        
        // These values are approximations for a standard map viewport
        // Adjust based on typical viewport size (roughly 1000px)
        if (maxDiff >= 180) return 1;
        if (maxDiff >= 90) return 2;
        if (maxDiff >= 45) return 3;
        if (maxDiff >= 22.5) return 4;
        if (maxDiff >= 11.25) return 5;
        if (maxDiff >= 5.625) return 6;
        if (maxDiff >= 2.813) return 7;
        if (maxDiff >= 1.406) return 8;
        if (maxDiff >= 0.703) return 9;
        if (maxDiff >= 0.352) return 10;
        if (maxDiff >= 0.176) return 11;
        if (maxDiff >= 0.088) return 12;
        if (maxDiff >= 0.044) return 13;
        if (maxDiff >= 0.022) return 14;
        if (maxDiff >= 0.011) return 15;
        if (maxDiff >= 0.005) return 16;
        if (maxDiff >= 0.0025) return 17;
        if (maxDiff >= 0.00125) return 18;
        return 19;
    }

    handleFitMapToMarkers() {
        this.skipMapFitting = false; // Explicitly allow fitting
        if (this.mapMarkers && this.mapMarkers.length > 0) {
            this.fitMapToMarkers(this.mapMarkers);
        }
    }

    /**
     * Fit map to show all markers (mimics Google Maps fitBounds)
     */
    fitMapToMarkers(markers) {
        if (!markers || markers.length === 0) {
            return;
        }
        
        // Single marker - center on it with high zoom
        if (markers.length === 1) {
            this.mapCenter = { location: markers[0].location };
            this.zoomLevel = 15;
            return;
        }
        
        // Multiple markers - calculate bounds
        const bounds = this.calculateBounds(markers);
        this.mapCenter = this.getCenterFromBounds(bounds);
        this.zoomLevel = this.getZoomForBounds(bounds);
        
        // Add small padding to zoom out slightly (so markers aren't on edge)
        // Reduce zoom by 1 to give some breathing room
        if (this.zoomLevel > 1) {
            this.zoomLevel = this.zoomLevel - 1;
        }
    }

    // Getters
    get hamburgerClass() {
        return `hamburger hamburger--arrow ${this.filterPanelOpen ? 'is-active' : ''}`;
    }

    get filterContainerClass() {
        return `filter-container ${this.filterPanelOpen ? '' : 'hide'}`;
    }

    get mapContentClass() {
        const baseClass = 'map-content';
        return this.filterPanelOpen ? baseClass : `${baseClass} map-content-full`;
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

    get computedStyle() {
        return `top: ${this.position.top}; left: ${this.position.left}; right: auto; bottom: auto;`;
    }
    get filterPanelClass() {
        const baseClass = 'filter-panel';
        return this.filterPanelOpen ? baseClass : `${baseClass} filter-panel-hidden`;
    }

    get mapContentGridClass() {
        if (this.filterPanelOpen) {
            return 'slds-col slds-size_1-of-1 slds-medium-size_9-of-12 slds-large-size_9-of-12';
        }
        return 'slds-col slds-size_1-of-1';
    }
    
    
    toggleFilterPanel() {
        this.filterPanelOpen = !this.filterPanelOpen;
    }
}