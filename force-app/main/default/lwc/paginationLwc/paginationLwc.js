// paginationLwc.js - FIXED with safety checks
import { LightningElement, api } from 'lwc';

export default class PaginationLwc extends LightningElement {
    @api currentPage = 1;
    @api recordsPerPage = 20;
    @api max = 0;
    
    get pageList() {
        // FIX: Prevent division by zero
        if (this.max === 0 || this.recordsPerPage === 0) {
            return [];
        }
        
        const totalPages = Math.ceil(this.max / this.recordsPerPage);
        const pages = [];
        
        // Limit to reasonable number of page buttons
        const maxButtons = 10;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        // Adjust if we're near the end
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        // Add "First" button if not on first page
        if (startPage > 1) {
            pages.push({
                label: '« First',
                value: '1',
                class: 'page-button first-button'
            });
            
            if (startPage > 2) {
                pages.push({
                    label: '...',
                    value: String(startPage - 1),
                    class: 'page-button ellipsis'
                });
            }
        }
        
        // Add page number buttons
        for (let i = startPage; i <= endPage; i++) {
            pages.push({
                label: String(i),
                value: String(i),
                class: `page-button ${i === this.currentPage ? 'active' : ''}`
            });
        }
        
        // Add "Last" button if not on last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push({
                    label: '...',
                    value: String(endPage + 1),
                    class: 'page-button ellipsis'
                });
            }
            
            pages.push({
                label: 'Last »',
                value: String(totalPages),
                class: 'page-button last-button'
            });
        }
        
        return pages;
    }
    
    get minRec() {
        if (this.max === 0 || this.recordsPerPage === 0) return 0;
        return ((this.currentPage - 1) * this.recordsPerPage) + 1;
    }
    
    get maxRec() {
        if (this.max === 0 || this.recordsPerPage === 0) return 0;
        const max = this.currentPage * this.recordsPerPage;
        return max > this.max ? this.max : max;
    }
    
    get totalPages() {
        if (this.max === 0 || this.recordsPerPage === 0) return 0;
        return Math.ceil(this.max / this.recordsPerPage);
    }
    
    get hasPrevious() {
        return this.currentPage > 1;
    }
    
    get hasNext() {
        return this.currentPage < this.totalPages;
    }
    
    handlePageClick(event) {
        const selectedPage = parseInt(event.target.dataset.page, 10);
        if (selectedPage !== this.currentPage && selectedPage > 0 && selectedPage <= this.totalPages) {
            this.dispatchEvent(new CustomEvent('pagechange', {
                detail: { currentPage: selectedPage }
            }));
        }
    }
    
    handlePrevious() {
        if (this.hasPrevious) {
            this.dispatchEvent(new CustomEvent('pagechange', {
                detail: { currentPage: this.currentPage - 1 }
            }));
        }
    }
    
    handleNext() {
        if (this.hasNext) {
            this.dispatchEvent(new CustomEvent('pagechange', {
                detail: { currentPage: this.currentPage + 1 }
            }));
        }
    }
}