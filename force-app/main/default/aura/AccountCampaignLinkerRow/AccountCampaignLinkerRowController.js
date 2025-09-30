/**
 * Created by Z003D6YE on 11.01.2019.
 */
({
    handleRowAction: function(component, event, helper) {
        helper.fireRowAction(component, helper);
    },

    handleDblClick : function(component, event, helper) {
        if(component.get("v.showActionButton")) {
            helper.fireRowAction(component, helper);
        }
    }
})