// salesMapLegend.js
import { LightningElement, api, track } from 'lwc';

export default class SalesMapLegend extends LightningElement {

    @api selectedView;
    @api showLegend = false;
    
    @track isExpanded = true;
    @track _legendItems = [];

    @api
    get legendItems() {
        return this._legendItems;
    }
    set legendItems(value) {
        this._legendItems = value.map(item => ({
            ...item,
            style: `background-color: ${item.color}`,
            iconValue: item.iconValue || item.color,
            field: this.selectedView,
            articleClass: item.crossed ? 'slds-hint-parent legend-item crossed' : 'slds-hint-parent legend-item',
            textClass: item.crossed ? 'slds-text-body_regular crossed-text' : 'slds-text-body_regular',
            crossed: item.crossed || false
        }));
    }
    
    get collapseIcon() {
        return this.isExpanded ? 'utility:chevronup' : 'utility:chevrondown';
    }
    
    toggleLegend() {
        this.isExpanded = !this.isExpanded;
    }
    
    handleLegendItemClick(event) {
        event.stopPropagation();
        
        const article = event.currentTarget;
        const itemId = article.dataset.id;
        const iconValue = article.dataset.icon;
        
        // Check if this is the last visible (non-crossed) item
        const nonCrossedItems = this._legendItems.filter(item => !item.crossed);
        const clickedItem = this._legendItems.find(item => item.id === itemId);
        
        // Don't allow crossing out the last visible item
        if (nonCrossedItems.length === 1 && !clickedItem.crossed) {
            return;
        }
        
        // Toggle the crossed state
        const updatedItems = this._legendItems.map(item => {
            if (item.id === itemId) {
                const newCrossed = !item.crossed;
                return {
                    ...item,
                    crossed: newCrossed,
                    articleClass: newCrossed ? 'slds-hint-parent legend-item crossed' : 'slds-hint-parent legend-item',
                    textClass: newCrossed ? 'slds-text-body_regular crossed-text' : 'slds-text-body_regular'
                };
            }
            return item;
        });
        
        this._legendItems = updatedItems;
        
        // Dispatch event to parent to toggle markers
        this.dispatchEvent(new CustomEvent('legenditemtoggle', {
            detail: {
                itemId,
                iconValue,
                field: this.selectedView,
                crossed: updatedItems.find(item => item.id === itemId).crossed
            }
        }));
    }
    
    @api
    reset() {
        this._legendItems = this._legendItems.map(item => ({
            ...item,
            crossed: false,
            articleClass: 'slds-hint-parent legend-item',
            textClass: 'slds-text-body_regular'
        }));
    }
}