/**
 * Created by z003d6ye on 13.03.2019.
 */
({
    doInit: function(component, event, helper) {


        helper.generatePageList(component, helper);
        helper.calculateMinMaxRec(component,helper);
    },

    handleMaxChange: function(component, event, helper) {
        helper.generatePageList(component, helper);
    },

    handleCurrentPageChange: function(component, event, helper) {
        helper.generatePageList(component, helper);
         helper.calculateMinMaxRec(component,helper);
    },


})