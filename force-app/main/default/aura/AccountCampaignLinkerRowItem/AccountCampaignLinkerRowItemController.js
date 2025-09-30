/**
 * Created by Z003D6YE on 11.01.2019.
 */
({
    doInit : function(component, helper) {
        var row = component.get('v.row');
        var FieldName = component.get('v.fieldName');
        var outputValue = "", outputFieldId = "";
        
        if (FieldName.indexOf(".") >= 0) {
            var ParentSobject = row[FieldName.split(".")[0]];
            if(ParentSobject != undefined){
                outputValue = ParentSobject[FieldName.split(".")[1]];
            }
        }
        else{
            outputValue = row[FieldName];
        }
        
        component.set("v.outputValue", outputValue);
        
    }
})