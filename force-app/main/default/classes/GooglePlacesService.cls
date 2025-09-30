/**
 * Service class for Google Places API integration
 */
public with sharing class GooglePlacesService {
    
    private static final String GOOGLE_PLACES_API_KEY = 'AIzaSyDG63zPtAxOOxs93mfYuWiQx7k-adtH5Ks';
    private static final String NEARBY_SEARCH_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    
    /**
     * Search for nearby places within map bounds
     */
    @AuraEnabled(cacheable=false)
    public static List<PlaceResult> searchNearbyPlaces(
        String boundsJson, 
        String placeType, 
        Integer radius
    ) {
        try {
            Map<String, Object> bounds = (Map<String, Object>) JSON.deserializeUntyped(boundsJson);
            
            // Calculate center point from bounds
            Decimal centerLat = ((Decimal)bounds.get('north') + (Decimal)bounds.get('south')) / 2;
            Decimal centerLng = ((Decimal)bounds.get('east') + (Decimal)bounds.get('west')) / 2;
            
            // Build API request
            String endpoint = NEARBY_SEARCH_ENDPOINT;
            endpoint += '?location=' + centerLat + ',' + centerLng;
            endpoint += '&radius=' + (radius != null ? radius : 5000);
            endpoint += '&type=' + placeType;
            endpoint += '&key=' + GOOGLE_PLACES_API_KEY;
            
            HttpRequest req = new HttpRequest();
            req.setEndpoint(endpoint);
            req.setMethod('GET');
            req.setTimeout(120000);
            
            Http http = new Http();
            HttpResponse res = http.send(req);
            
            if (res.getStatusCode() == 200) {
                return parsePlacesResponse(res.getBody());
            } else {
                throw new AuraHandledException('Google Places API error: ' + res.getStatus());
            }
            
        } catch (Exception e) {
            throw new AuraHandledException('Error searching nearby places: ' + e.getMessage());
        }
    }
    
    /**
     * Parse Google Places API response
     */
    private static List<PlaceResult> parsePlacesResponse(String responseBody) {
        List<PlaceResult> results = new List<PlaceResult>();
        
        try {
            Map<String, Object> response = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
            List<Object> places = (List<Object>) response.get('results');
            
            if (places != null) {
                for (Object placeObj : places) {
                    Map<String, Object> place = (Map<String, Object>) placeObj;
                    
                    PlaceResult result = new PlaceResult();
                    result.placeId = (String) place.get('place_id');
                    result.name = (String) place.get('name');
                    result.vicinity = (String) place.get('vicinity');
                    result.rating = place.get('rating') != null ? Decimal.valueOf(String.valueOf(place.get('rating'))) : null;
                    
                    // Parse geometry
                    Map<String, Object> geometry = (Map<String, Object>) place.get('geometry');
                    if (geometry != null) {
                        Map<String, Object> location = (Map<String, Object>) geometry.get('location');
                        result.latitude = Decimal.valueOf(String.valueOf(location.get('lat')));
                        result.longitude = Decimal.valueOf(String.valueOf(location.get('lng')));
                    }
                    
                    // Parse opening hours
                    Map<String, Object> openingHours = (Map<String, Object>) place.get('opening_hours');
                    if (openingHours != null) {
                        result.openNow = (Boolean) openingHours.get('open_now');
                    }
                    
                    // Parse photos
                    List<Object> photos = (List<Object>) place.get('photos');
                    if (photos != null && !photos.isEmpty()) {
                        Map<String, Object> firstPhoto = (Map<String, Object>) photos[0];
                        result.photoReference = (String) firstPhoto.get('photo_reference');
                    }
                    
                    results.add(result);
                }
            }
            
        } catch (Exception e) {
            System.debug('Error parsing places response: ' + e.getMessage());
        }
        
        return results;
    }
    
    /**
     * Inner class for place results
     */
    public class PlaceResult {
        @AuraEnabled public String placeId;
        @AuraEnabled public String name;
        @AuraEnabled public String vicinity;
        @AuraEnabled public Decimal rating;
        @AuraEnabled public Decimal latitude;
        @AuraEnabled public Decimal longitude;
        @AuraEnabled public Boolean openNow;
        @AuraEnabled public String photoReference;
    }
}