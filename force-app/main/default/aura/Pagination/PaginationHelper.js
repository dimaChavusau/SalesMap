/**
 * Created by z003d6ye on 13.03.2019.
 */
({
    generatePageList : function(component, helper) {
        var max = component.get("v.max");
        var recordsPerPage = component.get("v.recordsPerPage");
        var pageList = [];
        var length = Math.ceil((max/recordsPerPage));

        for(var i = 1; i <= length; i++) {
            pageList.push(i);
        }

        component.set("v.pageList", pageList);
    },

    calculateMinMaxRec : function(component, helper) {
        let minRec = 1;
        let currentPageIndex = component.get("v.currentPage") -1;
        let max = component.get("v.max");
        let recordsPerPage = component.get("v.recordsPerPage");
        let maxRec = currentPageIndex * recordsPerPage + recordsPerPage;

        if(currentPageIndex > 0) {
            minRec = currentPageIndex * recordsPerPage;
        }

        if(maxRec > max) {
            maxRec = max;
        }

        component.set("v.minRec", minRec);
        component.set("v.maxRec", maxRec);
    }

})