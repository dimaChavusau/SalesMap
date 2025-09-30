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
    @track selectedView = '--None--';
    @track showLegend = false;
    @track legendItems = [];
    @track onlyMainAccounts = false;
    @track filters = {};
    @track filterPanelOpen = true;
    
    selectedMarkerValue;
    zoomLevel = 10;
    mapCenter = { location: { Latitude: 37.7749, Longitude: -122.4194 }};
    currentUser;
    userAffiliateCode;
    showMerchantStatusFilter = false;
    
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
            // Get current user
            const user = await getUser();
            this.currentUser = user;
            this.userAffiliateCode = user.Affiliate_Code_from_Affiliate__c;
            
            // Check if should show merchant status filter
            const validCodes = ['AS-DE', 'S-DE-AD', 'S-DE-AVL', 'S-DE-CEWS', 'W-DE'];
            this.showMerchantStatusFilter = validCodes.includes(this.userAffiliateCode);
            
            // Initialize component data
            const initData = await init();
            this.processInitData(initData);
            
            // Set initial view based on user function
            this.setInitialView();
            
            // Load initial accounts if applicable
            await this.loadInitialAccounts();
        } catch (error) {
            this.showError('Initialization failed', error);
        } finally {
            this.isLoading = false;
        }
    }

    processInitData(data) {
        // Process and prepare filter data
        this.filters.territories = data.territories || [];
        this.filters.trainers = data.trainers || [];
        this.filters.campaigns = data.campaigns || [];
        this.filters.legalHierarchies = data.legalHierarchies || [];
        this.filters.businessHierarchies = data.businessHierarchies || [];
        this.filters.distributionChannels = data.disChannelOptions || {};
        
        // Update view options based on user
        this.updateViewOptions();
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
        try {
            const searchParams = await this.buildSearchParams();
            const results = await searchAccounts(searchParams);
            this.processSearchResults(results);
        } catch (error) {
            if (error.body?.message !== 'No accounts found') {
                this.showError('Search failed', error);
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

        // Get coordinates if location is specified
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
        this.buildMapMarkers();
    }

    buildMapMarkers() {
        this.mapMarkers = this.accounts
            .filter(acc => acc.BillingLatitude && acc.BillingLongitude)
            .map((acc, index) => {
                const marker = {
                    location: {
                        Latitude: acc.BillingLatitude,
                        Longitude: acc.BillingLongitude
                    },
                    value: acc.Id,
                    title: acc.Name,
                    description: this.buildMarkerDescription(acc),
                    icon: 'standard:account',
                    mapIcon: {
                        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                        fillColor: this.getMarkerColor(acc),
                        fillOpacity: 1,
                        strokeWeight: 1,
                        scale: 1.5
                    }
                };

                // Set map center to first marker
                if (index === 0) {
                    this.mapCenter = { location: marker.location };
                    this.zoomLevel = 12;
                }

                return marker;
            });

        this.updateLegend();
    }

    buildMarkerDescription(account) {
        const html = [];
        html.push(`<strong>${account.Name}</strong>`);
        html.push(`Customer #: ${account.Bill_to_Number__c || 'N/A'}`);
        html.push(`Address: ${this.formatAddress(account)}`);
        html.push(`Territory: ${account.Territory__r?.Name || 'N/A'}`);
        html.push(`Phone: ${account.Phone || 'N/A'}`);
        
        // Add visit information
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
        // Main account always gold
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
                return '#0070D2'; // Salesforce blue
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
        // Generate consistent color from territory name
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

    updateLegend() {
        this.showLegend = false;
        this.legendItems = [];

        switch (this.selectedView) {
            case 'lastSalesVisit':
            case 'lastTrainingEvent':
                this.legendItems = [
                    { id: '1', label: '< 30 days', color: '#4BCA81' },
                    { id: '2', label: '30-90 days', color: '#FFB75D' },
                    { id: '3', label: '90-180 days', color: '#FF9A3C' },
                    { id: '4', label: '> 180 days', color: '#FF6361' },
                    { id: '5', label: 'Visit scheduled', color: '#FF69B4' }
                ];
                this.showLegend = true;
                break;
            
            case 'segmentationPOS':
            case 'segmentationOwner':
            case 'segmentationCG':
                this.legendItems = [
                    { id: '1', label: 'Diamond', color: '#4BCA81' },
                    { id: '2', label: 'Rising Star', color: '#FFB75D' },
                    { id: '3', label: 'Heart', color: '#FF9A3C' },
                    { id: '4', label: 'Leaf', color: '#FF6361' }
                ];
                this.showLegend = true;
                break;

            case 'territory':
                // Build territory legend from current data
                const territories = [...new Set(this.accounts.map(a => a.Territory__r?.Name).filter(t => t))];
                this.legendItems = territories.map((territory, index) => ({
                    id: String(index),
                    label: territory,
                    color: this.getTerritoryColor(territory)
                }));
                this.showLegend = true;
                break;

            case 'distributionChannel':
                // Build distribution channel legend
                const channels = [...new Set(this.accounts.map(a => a.Distribution_Channel__c).filter(c => c))];
                this.legendItems = channels.map((channel, index) => ({
                    id: String(index),
                    label: channel,
                    color: this.getDistributionChannelColor(this.accounts.find(a => a.Distribution_Channel__c === channel)?.Distribution_Channel_Color__c)
                }));
                this.showLegend = true;
                break;
        }
    }

    handleFiltersChange(event) {
        this.filters = { ...this.filters, ...event.detail };
    }

    handleSearch(event) {
        this.performSearch();
        this.closeFilterPanel();
    }

    handleReset(event) {
        this.filters = {};
        this.accounts = [];
        this.displayedAccounts = [];
        this.mapMarkers = [];
        this.selectedView = '--None--';
        this.onlyMainAccounts = false;
    }

    handleViewChange(event) {
        this.selectedView = event.detail.value;
        this.buildMapMarkers();
    }

    handleMarkerSelect(event) {
        this.selectedMarkerValue = event.target.selectedMarkerValue;
    }

    handleMainAccountToggle(event) {
        this.onlyMainAccounts = event.target.checked;
        this.performSearch();
    }

    fitMapToMarkers() {
        // Reset zoom to fit all markers
        if (this.mapMarkers.length > 0) {
            // Calculate bounds
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

    // Getters for conditional classes
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