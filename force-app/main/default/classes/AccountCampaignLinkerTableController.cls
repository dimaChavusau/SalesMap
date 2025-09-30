public class AccountCampaignLinkerTableController {

    @AuraEnabled
    public static Id uploadCSVFile(String csvContent, String fileName) {
        // Convert the CSV content string to a Blob
        Blob csvBlob = Blob.valueOf(csvContent);

        // Create a new ContentVersion record
        ContentVersion contentVersion = new ContentVersion();
        contentVersion.Title = fileName;
        contentVersion.VersionData = csvBlob;
        contentVersion.PathOnClient = fileName;

        // Insert the ContentVersion record
        insert contentVersion;

        // Return the Id of the inserted ContentVersion record
        return [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :contentVersion.Id].ContentDocumentId;
    }
}