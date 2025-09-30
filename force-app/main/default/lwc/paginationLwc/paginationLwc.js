import { LightningElement, api, track } from 'lwc';

export default class PaginationLwc extends LightningElement {
    @api currentPage = 1;
    @api recordsPerPage = 20;
    @api max = 0;
    
    get pageList() {
        const totalPages = Math.ceil(this.max / this.recordsPerPage);
        const pages = [];
        
        for (let i = 1; i <= totalPages; i++) {
            pages.push({
                label: i,
                value: i,
                class: `page-button ${i === this.currentPage ? 'active' : ''}`
            });
        }
        
        return pages;
    }
    
    get minRec() {
        return this.max === 0 ? 0 : ((this.currentPage - 1) * this.recordsPerPage) + 1;
    }
    
    get maxRec() {
        const max = this.currentPage * this.recordsPerPage;
        return max > this.max ? this.max : max;
    }
    
    handlePageClick(event) {
        const selectedPage = parseInt(event.target.dataset.page);
        if (selectedPage !== this.currentPage) {
            this.dispatchEvent(new CustomEvent('pagechange', {
                detail: { currentPage: selectedPage }
            }));
        }
    }
}