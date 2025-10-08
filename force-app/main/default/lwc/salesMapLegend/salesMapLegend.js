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
            rowClass: item.crossed ? 'legend-row crossed' : 'legend-row',
            colorClass: item.crossed ? 'color-cell crossed' : 'color-cell',
            labelClass: item.crossed ? 'label-cell crossed' : 'label-cell',
            crossed: item.crossed || false
        }));
    }
    
    get expandIcon() {
        return this.isExpanded ? 'utility:chevronup' : 'utility:chevrondown';
    }
    
    toggleLegend() {
        this.isExpanded = !this.isExpanded;
    }
    
    handleLegendItemClick(event) {
        event.stopPropagation();
        
        const row = event.currentTarget;
        const itemId = row.dataset.id;
        const iconValue = row.dataset.icon;
        const field = row.dataset.field;
        
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
                    rowClass: newCrossed ? 'legend-row crossed' : 'legend-row',
                    colorClass: newCrossed ? 'color-cell crossed' : 'color-cell',
                    labelClass: newCrossed ? 'label-cell crossed' : 'label-cell'
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
                field,
                crossed: updatedItems.find(item => item.id === itemId).crossed
            }
        }));
    }
    
    @api
    reset() {
        this._legendItems = this._legendItems.map(item => ({
            ...item,
            crossed: false,
            rowClass: 'legend-row',
            colorClass: 'color-cell',
            labelClass: 'label-cell'
        }));
    }
}