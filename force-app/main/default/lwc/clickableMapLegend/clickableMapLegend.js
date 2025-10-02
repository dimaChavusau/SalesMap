import { LightningElement, api, track } from 'lwc';

export default class ClickableMapLegend extends LightningElement {
    @api title = 'Legend';
    @api selectedView;
    
    @track legendItems = [];
    @track isExpanded = true;
    @track isVisible = false;
    
    _rawLegendItems = [];
    
    @api
    get items() {
        return this._rawLegendItems;
    }
    
    set items(value) {
        this._rawLegendItems = value || [];
        this.processLegendItems();
    }
    
    processLegendItems() {
        // Add state management to each legend item
        this.legendItems = this._rawLegendItems.map(item => ({
            ...item,
            isActive: true, // All items active by default
            cssClass: this.getLegendItemClass(true),
            iconClass: this.getIconClass(true),
            colorStyle: item.colorStyle || `background-color: ${item.color || '#0176d3'}`
        }));
        
        this.isVisible = this.legendItems.length > 0;
    }
    
    getLegendItemClass(isActive) {
        return `legend-item ${isActive ? '' : 'crossed'}`;
    }
    
    getIconClass(isActive) {
        return `legend-icon ${isActive ? '' : 'crossed'}`;
    }
    
    get showLegend() {
        return this.isVisible && this.legendItems.length > 0;
    }
    
    get legendContainerClass() {
        return `legend-container ${this.isExpanded ? 'expanded' : 'collapsed'}`;
    }
    
    get toggleIconName() {
        return this.isExpanded ? 'utility:chevronup' : 'utility:chevrondown';
    }
    
    handleToggleLegend() {
        this.isExpanded = !this.isExpanded;
    }
    
    handleLegendItemClick(event) {
        try {
            const itemId = event.currentTarget.dataset.id;
            const clickedItem = this.legendItems.find(item => item.id === itemId);
            
            if (!clickedItem) return;
            
            // Check if we can toggle (prevent disabling last active item)
            const activeCount = this.legendItems.filter(item => item.isActive).length;
            
            if (activeCount === 1 && clickedItem.isActive) {
                // Don't allow disabling the last active item
                this.showToast('Warning', 'At least one legend item must remain active', 'warning');
                return;
            }
            
            // Toggle the item
            clickedItem.isActive = !clickedItem.isActive;
            clickedItem.cssClass = this.getLegendItemClass(clickedItem.isActive);
            clickedItem.iconClass = this.getIconClass(clickedItem.isActive);
            
            // Force re-render
            this.legendItems = [...this.legendItems];
            
            // Fire event to parent component
            this.dispatchEvent(new CustomEvent('legenditemtoggle', {
                detail: {
                    itemId: clickedItem.id,
                    value: clickedItem.value,
                    icon: clickedItem.icon,
                    color: clickedItem.color,
                    isActive: clickedItem.isActive,
                    field: clickedItem.field,
                    activeItems: this.legendItems.filter(item => item.isActive)
                }
            }));
        } catch (error) {
            console.error('Error toggling legend item:', error);
        }
    }
    
    showToast(title, message, variant) {
        // Dispatch custom event to parent to show toast
        this.dispatchEvent(new CustomEvent('showtoast', {
            detail: { title, message, variant },
            bubbles: true,
            composed: true
        }));
    }
    
    /**
     * Public API to reset all items to active state
     */
    @api
    resetAllItems() {
        this.legendItems = this.legendItems.map(item => ({
            ...item,
            isActive: true,
            cssClass: this.getLegendItemClass(true),
            iconClass: this.getIconClass(true)
        }));
        
        // Notify parent
        this.dispatchEvent(new CustomEvent('legendreset', {
            detail: {
                activeItems: this.legendItems
            }
        }));
    }
    
    /**
     * Public API to get current active items
     */
    @api
    getActiveItems() {
        return this.legendItems.filter(item => item.isActive);
    }
    
    /**
     * Public API to set item state
     */
    @api
    setItemState(itemId, isActive) {
        const item = this.legendItems.find(i => i.id === itemId);
        if (item) {
            item.isActive = isActive;
            item.cssClass = this.getLegendItemClass(isActive);
            item.iconClass = this.getIconClass(isActive);
            this.legendItems = [...this.legendItems];
        }
    }
}