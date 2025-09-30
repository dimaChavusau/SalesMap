import { LightningElement, api, track } from 'lwc';

export default class SalesMapLegend extends LightningElement {
    @api selectedView;
    @api showLegend = false;
    @api
    get legendItems() {
        return this._legendItems;
    }
    set legendItems(value) {
        this._legendItems = value.map(item => ({
            ...item,
            style: `background-color: ${item.color}`
        }));
    }
    
    @track isExpanded = true;
    _legendItems = [];
    
    toggleLegend() {
        this.isExpanded = !this.isExpanded;
    }
}