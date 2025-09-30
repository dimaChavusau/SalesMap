public with sharing class MultiSelectLookupController {
    
    @AuraEnabled(cacheable=true)
    public static List<SObject> searchRecords(
        String objectApiName, 
        String searchTerm,
        String additionalFields,
        String whereConditions,
        List<String> selectedIds
    ) {
        try {
            // Build field list
            String fields = 'Id, Name';
            if (String.isNotBlank(additionalFields)) {
                fields += ', ' + additionalFields;
            }
            
            // Build WHERE clause
            String whereClause = '';
            
            // Add search term filter
            if (String.isNotBlank(searchTerm)) {
                String searchPattern = '%' + String.escapeSingleQuotes(searchTerm) + '%';
                whereClause = 'Name LIKE :searchPattern';
            }
            
            // Add custom conditions
            if (String.isNotBlank(whereConditions)) {
                if (String.isNotBlank(whereClause)) {
                    whereClause += ' AND ';
                }
                whereClause += '(' + whereConditions + ')';
            }
            
            // Exclude already selected items
            if (selectedIds != null && !selectedIds.isEmpty()) {
                if (String.isNotBlank(whereClause)) {
                    whereClause += ' AND ';
                }
                whereClause += 'Id NOT IN :selectedIds';
            }
            
            // Build and execute query
            String query = 'SELECT ' + fields + ' FROM ' + objectApiName;
            if (String.isNotBlank(whereClause)) {
                query += ' WHERE ' + whereClause;
            }
            query += ' ORDER BY Name LIMIT 50';
            
            System.debug('Multi-select query: ' + query);
            
            return Database.query(query);
            
        } catch (Exception e) {
            throw new AuraHandledException('Error searching records: ' + e.getMessage());
        }
    }
}