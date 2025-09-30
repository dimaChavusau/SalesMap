/**
 * Created by z003d6ye on 22.01.2019.
 */
({
    doInit : function(component, event, helper) {
//        helper.logAsJSON("rows", component.get("v.rowData"));
//        helper.logAsJSON("colData", component.get("v.colData"));
        console.log("colData", component.get("v.colData"));
        component.set("v.rowDataDisplayed", component.get("v.rowData"));
    },
    toggleTableVisibility : function(component, event, helper) {
        component.set("v.showTable", !component.get("v.showTable"));
    },
    handleExport : function(component, event, helper) {
        let accounts = component.get("v.rowDataDisplayed");
        console.log("accounts to download", accounts);
        helper.downloadCSV(
            component, helper,
            helper.convertArrayOfObjectsToCSV(
                component, helper, 
                accounts
            )
        );
    },
    // Client-side controller called by the onsort event handler
    updateColumnSorting: function (component, event, helper) {
        var fieldName = event.getParam('fieldName');
        var sortDirection = event.getParam('sortDirection');

        // assign the latest attribute with the sorted column fieldName and sorted direction
        component.set("v.sortedBy", fieldName);
        component.set("v.sortedDirection", sortDirection);
        helper.sortData(component, fieldName, sortDirection);
    },

    handleKeyUpSearch : function(component, event, helper) {
        component.set("v.currentPage", 1);
        if(component.get("v.handleSearch")) {
            component.set("v.rowDataDisplayed", helper.filterRowData(component, helper, component.get("v.rowData"), component.get("v.colData"), component.get("v.searchTerm")));
        }
    },


})