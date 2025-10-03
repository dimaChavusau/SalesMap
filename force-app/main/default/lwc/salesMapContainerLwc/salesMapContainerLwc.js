// salesMapContainerLwc.js - COMPLETE WITH ALL NEW FEATURES
import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';
import searchNearbyPlaces from '@salesforce/apex/GooglePlacesService.searchNearbyPlaces';
import getUser from '@salesforce/apex/SalesMapController.getUser';
import init from '@salesforce/apex/SalesMapController.init';
import searchAccounts from '@salesforce/apex/SalesMapController.searchAccounts';
import getCoordinates from '@salesforce/apex/SalesMapController.getCoordinates';
import updateAccountGeoLocation from '@salesforce/apex/SalesMapController.updateAccountGeoLocation';
import { buildMarkerDescription, buildSimpleDescription, attachInfoWindowListeners } from 'c/infoWindowHelper';

export default class SalesMapContainerLwc extends LightningElement {
    @track accounts = [];
    @track displayedAccounts = [];
    @track mapMarkers = [];
    @track isLoading = false;
    @track showEventModal = false;
    @track selectedAccountId;
    @track selectedView = '--None--';
    @track showLegend = false;
    @track legendItems = [];
    @track onlyMainAccounts = false;
    @track filters = {};
    @track filterPanelOpen = true;
    
    // NEW: Geolocation drag features
    @track showGeolocationModal = false;
    @track draggedMarker = null;
    @track originalPosition = null;
    
    // NEW: Clustering features
    @track clusteringEnabled = false;
    @track markerClusters = [];
    
    // NEW: Heatmap features
    @track heatmapEnabled = false;
    @track heatmapIntensity = 50;
    @track heatmapData = [];
    
    // NEW: Nearby places features
    @track nearbyPlacesVisible = false;
    @track showHotels = false;
    @track showRestaurants = false;
    @track showParking = false;
    @track nearbyMarkers = [];

    @track showInfoPanel = false;
    @track selectedAccountName = '';
    @track selectedAccountNumber = '';
    @track selectedAccountBrandLogo = '';
    @track selectedAccountAddress = '';
    @track selectedAccount = null;
    @track selectedAccountData = {};
    
    selectedMarkerValue;
    zoomLevel = 10;
    mapCenter = { location: { Latitude: 37.7749, Longitude: -122.4194 }};
    currentUser;
    userAffiliateCode;
    showMerchantStatusFilter = false;
    
    // Error boundary state
    @track hasError = false;
    @track errorMessage = '';

    @track hiddenMarkerIds = new Set();
    
    viewOptions = [
        { label: '--None--', value: '--None--' },
        { label: 'Last Sales Visit', value: 'lastSalesVisit' },
        { label: 'Last Training Event', value: 'lastTrainingEvent' },
        { label: 'Segmentation (POS)', value: 'segmentationPOS' },
        { label: 'Territory', value: 'territory' },
        { label: 'Distribution Channel', value: 'distributionChannel' },
        { label: 'Heatmap', value: 'heatmap' }, // NEW
        { label: 'Clusters', value: 'clusters' } // NEW
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

    // Error boundary
    errorCallback(error, stack) {
        this.hasError = true;
        this.errorMessage = this.reduceErrors(error);
        console.error('Error:', error, stack);
    }

    connectedCallback() {
        try {
            this.initialize();
        } catch (error) {
            this.handleError('Initialization Error', error);
        }
    }

    disconnectedCallback() {
        // Cleanup
        this.clearAllTimers();
    }

    clearAllTimers() {
        // Clear any pending timers
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
    }

    async initialize() {
        this.isLoading = true;
        try {
            const user = await getUser();
            this.currentUser = user;
            this.userAffiliateCode = user.Affiliate_Code_from_Affiliate__c;
            
            const validCodes = ['AS-DE', 'S-DE-AD', 'S-DE-AVL', 'S-DE-CEWS', 'W-DE'];
            this.showMerchantStatusFilter = validCodes.includes(this.userAffiliateCode);
            
            const initData = await init();
            this.processInitData(initData);
            
            this.setInitialView();
            
            await this.loadInitialAccounts();
        } catch (error) {
            this.handleError('Initialization failed', error);
        } finally {
            this.isLoading = false;
        }
    }

    processInitData(data) {
        this.filters.territories = data.territories || [];
        this.filters.trainers = data.trainers || [];
        this.filters.campaigns = data.campaigns || [];
        this.filters.legalHierarchies = data.legalHierarchies || [];
        this.filters.businessHierarchies = data.businessHierarchies || [];
        this.filters.distributionChannels = data.disChannelOptions || {};
        
        this.updateViewOptions();
    }

    updateViewOptions() {
        const options = [
            { label: '--None--', value: '--None--' },
            { label: 'Last Sales Visit', value: 'lastSalesVisit' },
            { label: 'Last Training Event', value: 'lastTrainingEvent' },
            { label: 'Segmentation (POS)', value: 'segmentationPOS' },
            { label: 'Territory', value: 'territory' },
            { label: 'Distribution Channel', value: 'distributionChannel' },
            { label: 'Heatmap', value: 'heatmap' },
            { label: 'Clusters', value: 'clusters' }
        ];

        if (!this.userAffiliateCode?.startsWith('S-FR') && !this.userAffiliateCode?.startsWith('W-FR')) {
            options.splice(4, 0, { label: 'Segmentation (Owner)', value: 'segmentationOwner' });
        }
        if (this.userAffiliateCode?.startsWith('S-FR') || this.userAffiliateCode?.startsWith('W-FR')) {
            options.splice(4, 0, { label: 'Segmentation (CG)', value: 'segmentationCG' });
        }

        this.viewOptions = options;
    }

    setInitialView() {
        const userFunction = this.currentUser?.Sivantos_Department_del__c;
        
        if (userFunction === 'Sales Rep') {
            this.selectedView = 'lastSalesVisit';
        } else if (userFunction === 'Audiology Trainer') {
            this.selectedView = 'lastTrainingEvent';
        } else if (this.filters.territories?.length > 0) {
            this.selectedView = 'territory';
        }
    }

    async loadInitialAccounts() {
        const userFunction = this.currentUser?.Sivantos_Department_del__c;
        if (userFunction === 'Sales Rep' || userFunction === 'Audiology Trainer') {
            if (this.filters.territories?.length > 0) {
                await this.performSearch();
            }
        }
    }

    async performSearch() {
        this.isLoading = true;
        
        // Clear hidden markers on new search
        this.hiddenMarkerIds.clear();
        this.hiddenMarkerIds = new Set();
        
        try {
            const searchParams = await this.buildSearchParams();
            const results = await searchAccounts(searchParams);
            this.processSearchResults(results);
        } catch (error) {
            if (error.body?.message !== 'No accounts found') {
                this.handleError('Search failed', error);
            } else {
                this.accounts = [];
                this.displayedAccounts = [];
                this.mapMarkers = [];
            }
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
            onlyMainAccounts: this.onlyMainAccounts,
            excludeDoNotVisit: this.filters.excludeDoNotVisit || false,
            salesTargetFilterCode: this.filters.salesTargetFilterCode,
            selectedDisChannelFilter: this.filters.selectedDisChannelFilter || '',
            accStatusVal: this.filters.accountStatus || 'All',
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
                console.error('Error getting coordinates', error);
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
        
        // Choose description type based on screen size or user preference
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            this.buildSimpleMapMarkers();
        } else {
            this.buildMapMarkers();
        }
        
        // Build heatmap data if enabled
        if (this.heatmapEnabled) {
            this.buildHeatmapData();
        }
    }

    // NEW: Build heatmap data
    buildHeatmapData() {
        this.heatmapData = this.accounts
            .filter(acc => acc.BillingLatitude && acc.BillingLongitude)
            .map(acc => ({
                location: {
                    Latitude: acc.BillingLatitude,
                    Longitude: acc.BillingLongitude
                },
                intensity: this.getHeatmapIntensity(acc)
            }));
    }

    getHeatmapIntensity(account) {
        // Calculate intensity based on various factors
        let intensity = 1;
        
        // Factor in account size/importance
        if (account.is_Main_Account__c) intensity *= 2;
        
        // Factor in sales visits
        if (account.Actual_Visits_Total__c) {
            intensity *= (1 + account.Actual_Visits_Total__c / 10);
        }
        
        // Factor in segmentation
        if (account.Segment_Text_POS1__c === 'Diamond') intensity *= 1.5;
        
        return Math.min(intensity, 10); // Cap at 10
    }

    buildMapMarkers() {
        const newMarkers = this.accounts
            .filter(acc => acc.BillingLatitude && acc.BillingLongitude)
            .map((acc, index) => {
                // FIXED: Use only account name as description (no HTML)
                const description = `${acc.Name} - ${acc.Bill_to_Number__c || 'N/A'}`;
                
                const marker = {
                    location: {
                        Latitude: acc.BillingLatitude,
                        Longitude: acc.BillingLongitude
                    },
                    value: acc.Id,
                    title: acc.Name,
                    // FIXED: Simple text description only
                    description: description,
                    icon: 'standard:account',
                    mapIcon: {
                        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                        fillColor: this.getMarkerColor(acc),
                        fillOpacity: 1,
                        strokeWeight: 1,
                        scale: 1.5
                    },
                    draggable: true
                };

                if (index === 0) {
                    this.mapCenter = { location: marker.location };
                    this.zoomLevel = 12;
                }

                return marker;
            });

        if (this.clusteringEnabled) {
            this.mapMarkers = this.applyMarkerClustering(newMarkers);
        } else {
            this.mapMarkers = newMarkers;
        }

        this.updateLegend();
    }

    handleMarkerSelect(event) {
        try {
            const selectedValue = event.target.selectedMarkerValue;
            this.selectedMarkerValue = selectedValue;
            
            // Find the selected account
            const account = this.accounts.find(acc => acc.Id === selectedValue);
            
            if (account) {
                this.selectedAccount = account;
                this.selectedAccountName = account.Name;
                this.selectedAccountNumber = `Customer #: ${account.Bill_to_Number__c || 'N/A'}`;
                this.selectedAccountBrandLogo = account.Brand_Logo__c || '';
                this.selectedAccountAddress = this.formatAddress(account);
                
                // FIXED: Build structured data object for display
                this.selectedAccountData = {
                    // Sales Visit data
                    nextSalesVisit: account.Planned_Next_Sales_Visit_URL__c || 'n/a',
                    lastSalesVisit: account.Last_Sales_Visit_URL__c || 'n/a',
                    targetVisits: account.Planned_Visits__c || 'n/a',
                    actualVisits: account.Actual_Visits_Total__c || 'n/a',
                    
                    // Training Event data
                    nextTrainingEvent: account.Next_Planned_Training_Event_URL__c || 'n/a',
                    lastTrainingEvent: account.Last_Training_Event_URL__c || 'n/a',
                    targetTrainings: account.Planned_Trainings__c || 'n/a',
                    actualTrainings: account.Actual_Trainings_Total__c || 'n/a',
                    
                    // Contact Info
                    phone: account.Phone || 'n/a',
                    
                    // Business Info
                    legalHierarchy: this.getLegalHierarchyDisplay(account),
                    businessHierarchy: this.getBusinessHierarchyDisplay(account),
                    territory: account.Territory__r?.Name || 'n/a',
                    brand: account.Own_Brand_formula__c || 'n/a',
                    segmentationPOS: account.Segment_Text_POS1__c || 'n/a',
                    segmentationCG: account.Segment_Text_CG__c || 'n/a',
                    segmentationOwner: account.Segment_Text_Owner__c || 'n/a',
                    distributionChannel: account.Distribution_Channel__c || 'n/a'
                };
                
                // FIXED: Show custom info panel
                this.showInfoPanel = true;
            }
        } catch (error) {
            console.error('Error handling marker selection:', error);
            this.handleError('Failed to display account info', error);
        }
    }

    // FIXED: Helper to format legal hierarchy
    getLegalHierarchyDisplay(account) {
        if (!account.Customer_Hierarchy_2_Description__r) return 'n/a';
        
        let display = account.Customer_Hierarchy_2_Description__r.Name;
        const sumOfPOS = account.Customer_Hierarchy_2_Description__r.Sum_of_POS__c;
        
        if (sumOfPOS !== undefined && sumOfPOS !== null) {
            display += ` (${sumOfPOS})`;
        } else {
            display += ' (n/a)';
        }
        
        return display;
    }

    getBusinessHierarchyDisplay(account) {
        if (!account.Pricing_Terms_Descripton__r) return 'n/a';
        
        let display = account.Pricing_Terms_Descripton__r.Name;
        const sumOfPOS = account.Pricing_Terms_Descripton__r.Sum_of_POS__c;
        
        if (sumOfPOS !== undefined && sumOfPOS !== null) {
            display += ` (${sumOfPOS})`;
        } else {
            display += ' (n/a)';
        }
        
        return display;
    }

    // NEW: Close info panel
    handleCloseInfoPanel() {
        this.showInfoPanel = false;
        this.selectedMarkerValue = null;
        this.selectedAccount = null;
        this.selectedAccountData = {};
    }

    // NEW: Handle edit account action
    handleNavigate() {
        if (this.selectedAccountAddress) {
            const url = `https://maps.google.com/maps?daddr=${encodeURIComponent(this.selectedAccountAddress)}`;
            window.open(url, '_blank');
        }
    }

    // FIXED: Handle edit account action
    handleEditAccount() {
        if (this.selectedAccount) {
            const url = `/${this.selectedAccount.Id}/e?retURL=${this.selectedAccount.Id}`;
            window.open(url, '_blank');
        }
    }

    // FIXED: Handle schedule event action
    handleScheduleEvent() {
        if (this.selectedAccount) {
            this.selectedAccountId = this.selectedAccount.Id;
            this.showEventModal = true;
            // Keep info panel open in background
        }
    }

    attachMarkerEventListeners() {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
            const mapContainer = this.template.querySelector('lightning-map');
            if (mapContainer) {
                // Find all info windows
                const infoWindows = mapContainer.querySelectorAll('.info-window-custom');
                
                infoWindows.forEach(infoWindow => {
                    // Attach listeners using helper
                    attachInfoWindowListeners(infoWindow, (accountId) => {
                        this.handleCreateEventFromMap(accountId);
                    });
                });
            }
        }, 100);
    }
    
    /**
     * NEW: Handle create event action from map info window
     */
    handleCreateEventFromMap(accountId) {
        this.selectedAccountId = accountId;
        this.showEventModal = true;
    }
    // NEW: Marker clustering algorithm
    applyMarkerClustering(markers) {
        if (!this.clusteringEnabled || markers.length < 50) {
            return markers;
        }

        const clusters = [];
        const gridSize = 60; // pixels
        const processed = new Set();

        markers.forEach((marker, index) => {
            if (processed.has(index)) return;

            const cluster = {
                ...marker,
                clustered: true,
                clusterSize: 1,
                clusterMembers: [marker]
            };

            // Find nearby markers
            markers.forEach((otherMarker, otherIndex) => {
                if (index === otherIndex || processed.has(otherIndex)) return;

                const distance = this.calculateDistance(
                    marker.location.Latitude,
                    marker.location.Longitude,
                    otherMarker.location.Latitude,
                    otherMarker.location.Longitude
                );

                // If within clustering distance (adjust as needed)
                if (distance < 0.01) { // ~1km
                    cluster.clusterSize++;
                    cluster.clusterMembers.push(otherMarker);
                    processed.add(otherIndex);
                }
            });

            processed.add(index);

            // Update marker appearance for clusters
            if (cluster.clusterSize > 1) {
                cluster.title = `${cluster.clusterSize} accounts`;
                cluster.mapIcon.scale = 1.5 + (cluster.clusterSize / 10);
                cluster.description = this.buildClusterDescription(cluster.clusterMembers);
            }

            clusters.push(cluster);
        });

        return clusters;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    buildClusterDescription(members) {
        const accounts = members.map(member => 
            this.accounts.find(a => a.Id === member.value)
        ).filter(Boolean);
        
        return buildClusterDescription(accounts);
    }

    buildMarkerDescription(account) {
        const html = [];
        html.push(`<strong>${account.Name}</strong>`);
        html.push(`Customer #: ${account.Bill_to_Number__c || 'N/A'}`);
        html.push(`Address: ${this.formatAddress(account)}`);
        html.push(`Territory: ${account.Territory__r?.Name || 'N/A'}`);
        html.push(`Phone: ${account.Phone || 'N/A'}`);
        
        if (account.Last_Sales_Visit__c) {
            html.push(`Last Sales Visit: ${this.formatDate(account.Last_Sales_Visit__c)}`);
        }
        if (account.Planned_next_Sales_Visit__c) {
            html.push(`Next Sales Visit: ${this.formatDate(account.Planned_next_Sales_Visit__c)}`);
        }
        
        return html.join('<br>');
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
        if (account.is_Main_Account__c) return '#FFD700';

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
            default:
                return '#0070D2';
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
        return colorMap[iconValue] || '#0070D2';
    }

    getSegmentationColor(iconValue) {
        const colorMap = {
            'green': '#4BCA81',
            'yellow': '#FFB75D',
            'orange': '#FF9A3C',
            'red': '#FF6361'
        };
        return colorMap[iconValue] || '#0070D2';
    }

    getTerritoryColor(territoryName) {
        if (!territoryName) return '#0070D2';
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
        return colorMap[colorValue] || '#0070D2';
    }

    get nearbyButtonHotelsClass() {
        return this.showHotels ? 'nearby-button active' : 'nearby-button';
    }

    get nearbyButtonRestaurantsClass() {
        return this.showRestaurants ? 'nearby-button active' : 'nearby-button';
    }

    get nearbyButtonParkingClass() {
        return this.showParking ? 'nearby-button active' : 'nearby-button';
    }

    updateLegend() {
        this.showLegend = false;
        this.legendItems = [];

        switch (this.selectedView) {
            case 'lastSalesVisit':
            case 'lastTrainingEvent':
                this.legendItems = [
                    { 
                        id: '1', 
                        label: '< 30 days ago', 
                        color: '#4BCA81',
                        colorStyle: 'background-color: #4BCA81',
                        icon: 'green',
                        value: 'green',
                        field: this.selectedView === 'lastSalesVisit' ? 
                            'Last_Sales_Visit_Icon__c' : 'Last_Training_Event_Icon__c',
                        count: this.getMarkerCountByIcon('green')
                    },
                    { 
                        id: '2', 
                        label: '30-90 days ago', 
                        color: '#FFB75D',
                        colorStyle: 'background-color: #FFB75D',
                        icon: 'yellow',
                        value: 'yellow',
                        field: this.selectedView === 'lastSalesVisit' ? 
                            'Last_Sales_Visit_Icon__c' : 'Last_Training_Event_Icon__c',
                        count: this.getMarkerCountByIcon('yellow')
                    },
                    { 
                        id: '3', 
                        label: '90-180 days ago', 
                        color: '#FF9A3C',
                        colorStyle: 'background-color: #FF9A3C',
                        icon: 'orange',
                        value: 'orange',
                        field: this.selectedView === 'lastSalesVisit' ? 
                            'Last_Sales_Visit_Icon__c' : 'Last_Training_Event_Icon__c',
                        count: this.getMarkerCountByIcon('orange')
                    },
                    { 
                        id: '4', 
                        label: '> 180 days ago', 
                        color: '#FF6361',
                        colorStyle: 'background-color: #FF6361',
                        icon: 'red',
                        value: 'red',
                        field: this.selectedView === 'lastSalesVisit' ? 
                            'Last_Sales_Visit_Icon__c' : 'Last_Training_Event_Icon__c',
                        count: this.getMarkerCountByIcon('red')
                    },
                    { 
                        id: '5', 
                        label: this.selectedView === 'lastSalesVisit' ? 
                            'Visit scheduled' : 'Training scheduled',
                        color: '#FF69B4',
                        colorStyle: 'background-color: #FF69B4',
                        icon: 'rose',
                        value: 'rose',
                        field: this.selectedView === 'lastSalesVisit' ? 
                            'Last_Sales_Visit_Icon__c' : 'Last_Training_Event_Icon__c',
                        count: this.getMarkerCountByIcon('rose')
                    }
                ];
                this.showLegend = true;
                break;
            
            case 'segmentationPOS':
            case 'segmentationOwner':
            case 'segmentationCG':
                const fieldMap = {
                    'segmentationPOS': 'Sales_Map_POS_Segment_Icon__c',
                    'segmentationOwner': 'Sales_Map_Owner_Segment_Icon__c',
                    'segmentationCG': 'Sales_Map_CG_Segment_Icon__c'
                };
                const field = fieldMap[this.selectedView];
                
                this.legendItems = [
                    { 
                        id: '1', 
                        label: 'Diamond', 
                        color: '#4BCA81',
                        colorStyle: 'background-color: #4BCA81',
                        icon: 'green',
                        value: 'green',
                        field: field,
                        count: this.getMarkerCountByIcon('green')
                    },
                    { 
                        id: '2', 
                        label: 'Rising Star', 
                        color: '#FFB75D',
                        colorStyle: 'background-color: #FFB75D',
                        icon: 'yellow',
                        value: 'yellow',
                        field: field,
                        count: this.getMarkerCountByIcon('yellow')
                    },
                    { 
                        id: '3', 
                        label: 'Heart', 
                        color: '#FF9A3C',
                        colorStyle: 'background-color: #FF9A3C',
                        icon: 'orange',
                        value: 'orange',
                        field: field,
                        count: this.getMarkerCountByIcon('orange')
                    },
                    { 
                        id: '4', 
                        label: 'Leaf', 
                        color: '#FF6361',
                        colorStyle: 'background-color: #FF6361',
                        icon: 'red',
                        value: 'red',
                        field: field,
                        count: this.getMarkerCountByIcon('red')
                    }
                ];
                this.showLegend = true;
                break;
                
            case 'territory':
                this.buildTerritoryLegend();
                break;
                
            case 'distributionChannel':
                this.buildDistributionChannelLegend();
                break;
                
            case 'Händlerstatus':
                this.buildMerchantStatusLegend();
                break;
        }
    }
    
    /**
     * NEW: Get count of markers by icon color
     */
    getMarkerCountByIcon(iconColor) {
        if (!this.accounts || !this.selectedView) return 0;
        
        const fieldMap = {
            'lastSalesVisit': 'Last_Sales_Visit_Icon__c',
            'lastTrainingEvent': 'Last_Training_Event_Icon__c',
            'segmentationPOS': 'Sales_Map_POS_Segment_Icon__c',
            'segmentationOwner': 'Sales_Map_Owner_Segment_Icon__c',
            'segmentationCG': 'Sales_Map_CG_Segment_Icon__c'
        };
        
        const field = fieldMap[this.selectedView];
        if (!field) return 0;
        
        return this.accounts.filter(acc => 
            acc[field] === iconColor &&
            acc.BillingLatitude && 
            acc.BillingLongitude
        ).length;
    }
    
    /**
     * NEW: Handle legend item toggle
     */
    handleLegendItemToggle(event) {
        const { icon, field, isActive } = event.detail;
        
        // Update mapMarkers visibility
        this.mapMarkers = this.mapMarkers.map(marker => {
            const account = this.accounts.find(acc => acc.Id === marker.value);
            if (!account) return marker;
            
            // Check if this marker matches the toggled legend item
            const markerIcon = account[field];
            
            if (markerIcon === icon) {
                // Hide or show marker
                if (isActive) {
                    this.hiddenMarkerIds.delete(marker.value);
                    return { ...marker, hidden: false };
                } else {
                    this.hiddenMarkerIds.add(marker.value);
                    return { ...marker, hidden: true };
                }
            }
            
            return marker;
        });
        
        // Filter out hidden markers for lightning-map
        this.updateVisibleMarkers();
    }
    
    /**
     * NEW: Update visible markers on map
     */
    updateVisibleMarkers() {
        // Lightning-map doesn't support hiding markers directly
        // So we need to filter the array
        const visibleMarkers = this.mapMarkers.filter(
            marker => !this.hiddenMarkerIds.has(marker.value)
        );
        
        // Update the markers array
        // Note: We need to keep the original array intact for toggling back
        this.displayedMapMarkers = visibleMarkers;
    }
    
    /**
     * NEW: Handle legend reset
     */
    handleLegendReset(event) {
        // Clear hidden markers
        this.hiddenMarkerIds.clear();
        
        // Show all markers
        this.mapMarkers = this.mapMarkers.map(marker => ({
            ...marker,
            hidden: false
        }));
        
        this.updateVisibleMarkers();
    }
    
    /**
     * NEW: Build territory legend
     */
    buildTerritoryLegend() {
        const territories = new Map();
        
        this.accounts.forEach(acc => {
            if (acc.Territory__r?.Name) {
                const territoryName = acc.Territory__r.Name;
                const territoryId = acc.Territory__c;
                
                if (!territories.has(territoryId)) {
                    territories.set(territoryId, {
                        id: territoryId,
                        label: territoryName,
                        color: this.getTerritoryColor(territoryName),
                        value: territoryId,
                        field: 'Territory__c',
                        count: 0
                    });
                }
                
                territories.get(territoryId).count++;
            }
        });
        
        // Convert to array and sort by name
        this.legendItems = Array.from(territories.values())
            .sort((a, b) => a.label.localeCompare(b.label))
            .map(item => ({
                ...item,
                colorStyle: `background-color: ${item.color}`
            }));
        
        this.showLegend = this.legendItems.length > 0;
    }
    
    /**
     * NEW: Build distribution channel legend
     */
    buildDistributionChannelLegend() {
        const channels = new Map();
        
        this.accounts.forEach(acc => {
            if (acc.Distribution_Channel__c && acc.Distribution_Channel_Color__c) {
                const channel = acc.Distribution_Channel__c;
                const color = this.getDistributionChannelColor(acc.Distribution_Channel_Color__c);
                
                if (!channels.has(channel)) {
                    channels.set(channel, {
                        id: channel.replace(/\s/g, '_'),
                        label: channel,
                        color: color,
                        icon: acc.Distribution_Channel_Color__c,
                        value: acc.Distribution_Channel_Color__c,
                        field: 'Distribution_Channel_Color__c',
                        count: 0
                    });
                }
                
                channels.get(channel).count++;
            }
        });
        
        // Convert to array and sort
        this.legendItems = Array.from(channels.values())
            .sort((a, b) => a.label.localeCompare(b.label))
            .map(item => ({
                ...item,
                colorStyle: `background-color: ${item.color}`
            }));
        
        this.showLegend = this.legendItems.length > 0;
    }
    
    /**
     * NEW: Build merchant status legend (for Germany)
     */
    buildMerchantStatusLegend() {
        const statusMap = new Map();
        
        const colorMapping = {
            'Bronze': '#8B4513',
            'Silber': '#C0C0C0',
            'Gold': '#FFD700'
        };
        
        this.accounts.forEach(acc => {
            if (acc.H_nderstatus__c) {
                const status = acc.H_nderstatus__c;
                
                if (!statusMap.has(status)) {
                    statusMap.set(status, {
                        id: status.replace(/\s/g, '_'),
                        label: status,
                        color: colorMapping[status] || '#0176d3',
                        icon: status,
                        value: status,
                        field: 'H_nderstatus__c',
                        count: 0
                    });
                }
                
                statusMap.get(status).count++;
            }
        });
        
        // Convert and sort
        this.legendItems = Array.from(statusMap.values())
            .sort((a, b) => {
                const order = ['Gold', 'Silber', 'Bronze'];
                return order.indexOf(a.label) - order.indexOf(b.label);
            })
            .map(item => ({
                ...item,
                colorStyle: `background-color: ${item.color}`
            }));
        
        this.showLegend = this.legendItems.length > 0;
    }
    
    /**
     * NEW: Handle toast from legend
     */
    handleShowToast(event) {
        const { title, message, variant } = event.detail;
        this.showToast(title, message, variant);
    }

    // Event Handlers
    toggleFilterPanel() {
        this.filterPanelOpen = !this.filterPanelOpen;
    }

    handleFiltersChange(event) {
        this.filters = { ...this.filters, ...event.detail };
    }

    handleSearch() {
        this.performSearch();
        if (window.innerWidth < 1080) {
            this.filterPanelOpen = false;
        }
    }

    handleReset() {
        this.filters = {};
        this.accounts = [];
        this.displayedAccounts = [];
        this.mapMarkers = [];
        this.selectedView = '--None--';
        this.onlyMainAccounts = false;
        this.clusteringEnabled = false;
        this.heatmapEnabled = false;
        this.showHotels = false;
        this.showRestaurants = false;
        this.showParking = false;
        this.nearbyMarkers = [];
    }

    handleViewChange(event) {
        this.selectedView = event.detail.value;
        
        // Reset hidden markers when changing views
        this.hiddenMarkerIds.clear();
        this.hiddenMarkerIds = new Set();
        
        // Handle special views
        if (this.selectedView === 'heatmap') {
            this.enableHeatmap();
        } else if (this.selectedView === 'clusters') {
            this.enableClustering();
        } else {
            this.heatmapEnabled = false;
            this.clusteringEnabled = false;
            this.buildMapMarkers();
        }
    }

    // NEW: Enable heatmap view
    enableHeatmap() {
        this.heatmapEnabled = true;
        this.clusteringEnabled = false;
        this.buildHeatmapData();
    }

    // NEW: Enable clustering view
    enableClustering() {
        this.clusteringEnabled = true;
        this.heatmapEnabled = false;
        this.buildMapMarkers();
    }

    // NEW: Handle heatmap intensity change
    handleHeatmapIntensityChange(event) {
        this.heatmapIntensity = event.detail.value;
        this.buildHeatmapData();
    }

    // NEW: Handle marker drag start
    handleMarkerDragStart(event) {
        const markerValue = event.target.selectedMarkerValue;
        const marker = this.mapMarkers.find(m => m.value === markerValue);
        
        if (marker) {
            this.draggedMarker = marker;
            this.originalPosition = { ...marker.location };
        }
    }

    // NEW: Handle marker drag end
    handleMarkerDragEnd(event) {
        if (!this.draggedMarker) return;

        const newPosition = event.detail;
        this.draggedMarker.location = newPosition;
        
        // Show confirmation modal
        this.showGeolocationModal = true;
    }

    // NEW: Confirm geolocation update
    async handleConfirmGeolocationUpdate() {
        try {
            const account = this.accounts.find(a => a.Id === this.draggedMarker.value);
            
            const result = await updateAccountGeoLocation({
                accountId: this.draggedMarker.value,
                lat: this.draggedMarker.location.Latitude,
                lng: this.draggedMarker.location.Longitude
            });

            if (result.state === 'true') {
                this.showToast('Success', result.message, 'success');
                
                // Update account data
                account.GeoLocation__Latitude__s = this.draggedMarker.location.Latitude;
                account.GeoLocation__Longitude__s = this.draggedMarker.location.Longitude;
                
            } else {
                this.showToast('Error', result.message, 'error');
                // Revert position
                this.draggedMarker.location = this.originalPosition;
            }
        } catch (error) {
            this.handleError('Failed to update geolocation', error);
            // Revert position
            this.draggedMarker.location = this.originalPosition;
        } finally {
            this.closeGeolocationModal();
        }
    }

    // NEW: Cancel geolocation update
    handleCancelGeolocationUpdate() {
        if (this.draggedMarker && this.originalPosition) {
            // Revert to original position
            this.draggedMarker.location = this.originalPosition;
            this.buildMapMarkers(); // Refresh markers
        }
        this.closeGeolocationModal();
    }

    closeGeolocationModal() {
        this.showGeolocationModal = false;
        this.draggedMarker = null;
        this.originalPosition = null;
    }

    handleMarkerSelect(event) {
        this.selectedMarkerValue = event.target.selectedMarkerValue;
        
        // Attach event listeners when a marker is selected (info window opens)
        this.attachMarkerEventListeners();
    }

    handleMainAccountToggle(event) {
        this.onlyMainAccounts = event.target.checked;
        this.performSearch();
    }

    buildSimpleMapMarkers() {
        const newMarkers = this.accounts
            .filter(acc => acc.BillingLatitude && acc.BillingLongitude)
            .map((acc, index) => {
                // Use simple description for mobile/performance
                const description = buildSimpleDescription(acc);
                
                const marker = {
                    location: {
                        Latitude: acc.BillingLatitude,
                        Longitude: acc.BillingLongitude
                    },
                    value: acc.Id,
                    title: acc.Name,
                    description: description,
                    icon: 'standard:account',
                    mapIcon: {
                        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                        fillColor: this.getMarkerColor(acc),
                        fillOpacity: 1,
                        strokeWeight: 1,
                        scale: 1.5
                    }
                };

                if (index === 0) {
                    this.mapCenter = { location: marker.location };
                }

                return marker;
            });

        this.mapMarkers = newMarkers;
        this.updateLegend();
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
            
            const latDiff = Math.max(...lats) - Math.min(...lats);
            const lngDiff = Math.max(...lngs) - Math.min(...lngs);
            const maxDiff = Math.max(latDiff, lngDiff);
            
            if (maxDiff > 10) this.zoomLevel = 4;
            else if (maxDiff > 5) this.zoomLevel = 6;
            else if (maxDiff > 2) this.zoomLevel = 8;
            else if (maxDiff > 1) this.zoomLevel = 10;
            else if (maxDiff > 0.5) this.zoomLevel = 12;
            else this.zoomLevel = 14;
        }
    }

    // NEW: Toggle nearby places panel
    toggleNearbyPlaces() {
        this.nearbyPlacesVisible = !this.nearbyPlacesVisible;
    }

    // NEW: Toggle hotels
    handleToggleHotels() {
        this.showHotels = !this.showHotels;
        if (this.showHotels) {
            this.searchNearbyPlaces('lodging', 'Hotels');
        } else {
            this.removeNearbyMarkers('Hotels');
        }
    }

    // NEW: Toggle restaurants
    handleToggleRestaurants() {
        this.showRestaurants = !this.showRestaurants;
        if (this.showRestaurants) {
            this.searchNearbyPlaces('restaurant', 'Restaurants');
        } else {
            this.removeNearbyMarkers('Restaurants');
        }
    }

    // NEW: Toggle parking
    handleToggleParking() {
        this.showParking = !this.showParking;
        if (this.showParking) {
            this.searchNearbyPlaces('parking', 'Parking');
        } else {
            this.removeNearbyMarkers('Parking');
        }
    }

    // NEW: Search nearby places using Google Places API
    async searchNearbyPlaces(type, category) {
        try {
            // Get map bounds
            const bounds = this.calculateMapBounds();
            
            // Create nearby markers (simplified - would need Google Places API)
            const nearbyMarkers = await this.fetchNearbyPlaces(bounds, type);
            
            // Add category to markers
            nearbyMarkers.forEach(marker => {
                marker.category = category;
            });
            
            // Add to nearby markers array
            this.nearbyMarkers = [...this.nearbyMarkers, ...nearbyMarkers];
            
        } catch (error) {
            this.handleError(`Failed to search ${category}`, error);
        }
    }

    // NEW: Calculate map bounds
    calculateMapBounds() {
        if (this.mapMarkers.length === 0) {
            return {
                north: this.mapCenter.location.Latitude + 0.1,
                south: this.mapCenter.location.Latitude - 0.1,
                east: this.mapCenter.location.Longitude + 0.1,
                west: this.mapCenter.location.Longitude - 0.1
            };
        }

        const lats = this.mapMarkers.map(m => m.location.Latitude);
        const lngs = this.mapMarkers.map(m => m.location.Longitude);

        return {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lngs),
            west: Math.min(...lngs)
        };
    }

    async fetchNearbyPlaces(bounds, type) {
        try {
            const places = await searchNearbyPlaces({
                boundsJson: JSON.stringify(bounds),
                placeType: type,
                radius: 5000
            });
            
            return places.map(place => ({
                location: {
                    Latitude: place.latitude,
                    Longitude: place.longitude
                },
                value: place.placeId,
                title: place.name,
                description: this.buildPlaceDescription(place),
                icon: this.getPlaceIcon(type),
                mapIcon: {
                    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                    fillColor: this.getPlaceColor(type),
                    fillOpacity: 1,
                    strokeWeight: 1,
                    scale: 1.2
                },
                category: type
            }));
        } catch (error) {
            console.error('Error fetching nearby places:', error);
            return [];
        }
    }

    buildPlaceDescription(place) {
        const html = [];
        html.push(`<strong>${place.name}</strong>`);
        
        if (place.vicinity) {
            html.push(place.vicinity);
        }
        
        if (place.rating) {
            html.push(`Rating: ${place.rating} ⭐`);
        }
        
        if (place.openNow !== null && place.openNow !== undefined) {
            html.push(`Open now: ${place.openNow ? 'Yes' : 'No'}`);
        }
        
        return html.join('<br>');
    }

    // NEW: Remove nearby markers by category
    removeNearbyMarkers(category) {
        this.nearbyMarkers = this.nearbyMarkers.filter(m => m.category !== category);
    }

    // NEW: Get place icon based on type
    getPlaceIcon(type) {
        const iconMap = {
            'lodging': 'custom:custom19',
            'restaurant': 'custom:custom24',
            'parking': 'custom:custom76'
        };
        return iconMap[type] || 'standard:location';
    }

    // NEW: Get place color based on type
    getPlaceColor(type) {
        const colorMap = {
            'lodging': '#FF6B6B',
            'restaurant': '#4ECDC4',
            'parking': '#95E1D3'
        };
        return colorMap[type] || '#0070D2';
    }

    // NEW: Build place description
    buildPlaceDescription(place) {
        const html = [];
        html.push(`<strong>${place.name}</strong>`);
        html.push(place.vicinity || '');
        
        if (place.rating) {
            html.push(`Rating: ${place.rating} ⭐`);
        }
        
        if (place.opening_hours) {
            html.push(`Open: ${place.opening_hours.open_now ? 'Yes' : 'No'}`);
        }
        
        return html.join('<br>');
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
        // Optionally close info panel
        // this.showInfoPanel = false;
    }

    handleEventClose() {
        this.showEventModal = false;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleError(title, error) {
        const message = this.reduceErrors(error);
        this.showToast(title, message, 'error');
        console.error(title, error);
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

    get hasAccounts() {
        return this.accounts && this.accounts.length > 0;
    }

    get tableTitle() {
        return `${this.displayedAccounts.length} accounts found`;
    }

    get allMapMarkers() {
        // Combine account markers and nearby markers
        return [...this.mapMarkers, ...this.nearbyMarkers];
    }

    get draggedAccountName() {
        if (!this.draggedMarker) return '';
        const account = this.accounts.find(a => a.Id === this.draggedMarker.value);
        return account ? account.Name : '';
    }

    get displayedMapMarkers() {
        return this.mapMarkers.filter(
            marker => !this.hiddenMarkerIds.has(marker.value)
        );
    }
}