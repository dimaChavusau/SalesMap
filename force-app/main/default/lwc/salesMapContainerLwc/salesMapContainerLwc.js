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
        'yellow': '#FFB75D',
        'orange': '#FF9A3C',
        'red': '#FF6361',
        'rose': '#FF69B4',
        'blue': '#0070D2'
    },
    segmentation: {
        'green': '#4BCA81',
        'yellow': '#FFB75D',
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
        'yellow': '#FFB75D',
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
    }

    async initialize() {
        this.isLoading = true;
        try {
            const user = await getUser();
            this.currentUser = user;
            this.userAffiliateCode = user.Affiliate_Code_from_Affiliate__c;
            this.userFunction = user.Sivantos_Department_del__c;
            
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
                }
            } catch (error) {
                console.error('Error getting coordinates:', error);
            }
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
        this.buildMapMarkers();
    }

    buildMapMarkers() {
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
                        fillColor: this.getMarkerColor(acc),
                        fillOpacity: 1,
                        strokeWeight: 1,
                        scale: 1.5
                    },
                    account: acc
                };

                if (index === 0) {
                    this.mapCenter = { location: marker.location };
                    this.zoomLevel = 12;
                }

                return marker;
            });
        
        this.applyFilters();
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
            'blue': '#0070D2', 'green': '#4BCA81', 'yellow': '#FFB75D',
            'orange': '#FF9A3C', 'red': '#FF6361', 'brown': '#8B4513',
            'purple': '#9B59B6', 'pink': '#FF69B4'
        };
        return colorMap[colorValue] || '#0070D2';
    }

    applyFilters() {
        const accountField = FIELD_MAPPINGS[this.selectedView];
        
        this.mapMarkers = this._allMapMarkers.filter(marker => {
            if (accountField && this.hiddenByLegend.size > 0) {
                const fieldValue = this.getNestedFieldValue(marker.account, accountField);
                return !this.hiddenByLegend.has(fieldValue || 'blue');
            }
            return true;
        });
        
        this.updateDisplayedAccounts();
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
        this.performSearch();
        this.closeFilterPanel();
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
        
        if (crossed) {
            this.hiddenByLegend.add(iconValue);
        } else {
            this.hiddenByLegend.delete(iconValue);
        }
        
        this.applyFilters();
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

    // Getters
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

    get computedStyle() {
        return `top: ${this.position.top}; left: ${this.position.left}; right: auto; bottom: auto;`;
    }
}