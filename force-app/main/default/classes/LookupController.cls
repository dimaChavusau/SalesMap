public with sharing class LookupController {
    
    @AuraEnabled(cacheable=true)
    public static List<LookupResult> search(String searchTerm, String objectName, String fields, String conditions, Integer recordLimit) {
        List<LookupResult> results = new List<LookupResult>();
        
        if (String.isBlank(searchTerm) || searchTerm.length() < 2) {
            return results;
        }
        
        searchTerm = String.escapeSingleQuotes(searchTerm);
        String fieldsToQuery = String.isNotBlank(fields) ? fields : '';
        String whereClause = String.isNotBlank(conditions) ? ' AND ' + conditions : '';
        
        // Build the SOQL query
        String query = 'SELECT Id, Name';
        if (String.isNotBlank(fieldsToQuery)) {
            query += ', ' + fieldsToQuery;
        }
        query += ' FROM ' + objectName;
        query += ' WHERE Name LIKE \'%' + searchTerm + '%\'';
        query += whereClause;
        query += ' ORDER BY Name LIMIT ' + (recordLimit != null ? recordLimit : 10);
        
        try {
            List<SObject> records = Database.query(query);
            
            for (SObject record : records) {
                LookupResult result = new LookupResult();
                result.Id = (String)record.get('Id');
                result.Name = (String)record.get('Name');
                result.sObjectType = objectName;
                
                // Add additional fields to subtitle if specified
                if (String.isNotBlank(fieldsToQuery)) {
                    List<String> fieldList = fieldsToQuery.split(',');
                    List<String> subtitleParts = new List<String>();
                    for (String field : fieldList) {
                        field = field.trim();
                        Object fieldValue = record.get(field);
                        if (fieldValue != null) {
                            subtitleParts.add(String.valueOf(fieldValue));
                        }
                    }
                    if (!subtitleParts.isEmpty()) {
                        result.subtitle = String.join(subtitleParts, ' • ');
                    }
                }
                
                results.add(result);
            }
        } catch (Exception e) {
            System.debug('Error searching ' + objectName + ': ' + e.getMessage());
        }
        
        return results;
    }
    
    @AuraEnabled(cacheable=true)
    public static List<LookupResult> getRecentRecords(String objectName, Integer recordLimit) {
        List<LookupResult> results = new List<LookupResult>();
        
        String query = 'SELECT Id, Name FROM ' + objectName + 
                      ' ORDER BY LastViewedDate DESC NULLS LAST LIMIT ' + 
                      (recordLimit != null ? recordLimit : 5);
        
        try {
            List<SObject> records = Database.query(query);
            
            for (SObject record : records) {
                LookupResult result = new LookupResult();
                result.Id = (String)record.get('Id');
                result.Name = (String)record.get('Name');
                result.sObjectType = objectName;
                results.add(result);
            }
        } catch (Exception e) {
            System.debug('Error getting recent ' + objectName + ': ' + e.getMessage());
        }
        
        return results;
    }
    
    public class LookupResult {
        @AuraEnabled public String Id;
        @AuraEnabled public String Name;
        @AuraEnabled public String subtitle;
        @AuraEnabled public String sObjectType;
    }
}