/**
 * Test class for GooglePlacesService
 */
@IsTest
private class GooglePlacesServiceTest {
    
    @IsTest
    static void testSearchNearbyPlaces_Success() {
        // Create mock response
        String mockResponse = '{"results": [' +
            '{"place_id": "test123", "name": "Test Hotel", "vicinity": "123 Main St",' +
            '"rating": 4.5, "geometry": {"location": {"lat": 37.7749, "lng": -122.4194}},' +
            '"opening_hours": {"open_now": true},' +
            '"photos": [{"photo_reference": "photo123"}]}' +
            '], "status": "OK"}';
        
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator(200, mockResponse));
        
        // Create test bounds
        Map<String, Object> bounds = new Map<String, Object>{
            'north' => 37.8,
            'south' => 37.7,
            'east' => -122.3,
            'west' => -122.5
        };
        
        Test.startTest();
        List<GooglePlacesService.PlaceResult> results = GooglePlacesService.searchNearbyPlaces(
            JSON.serialize(bounds),
            'lodging',
            5000
        );
        Test.stopTest();
        
        // Assertions
        System.assertNotEquals(null, results, 'Results should not be null');
        System.assertEquals(1, results.size(), 'Should return 1 result');
        System.assertEquals('test123', results[0].placeId, 'Place ID should match');
        System.assertEquals('Test Hotel', results[0].name, 'Name should match');
        System.assertEquals(4.5, results[0].rating, 'Rating should match');
    }
    
    @IsTest
    static void testSearchNearbyPlaces_Error() {
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator(500, 'Server Error'));
        
        Map<String, Object> bounds = new Map<String, Object>{
            'north' => 37.8,
            'south' => 37.7,
            'east' => -122.3,
            'west' => -122.5
        };
        
        Test.startTest();
        try {
            GooglePlacesService.searchNearbyPlaces(
                JSON.serialize(bounds),
                'lodging',
                5000
            );
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('error'), 'Should contain error message');
        }
        Test.stopTest();
    }
    
    @IsTest
    static void testSearchNearbyPlaces_EmptyResults() {
        String mockResponse = '{"results": [], "status": "ZERO_RESULTS"}';
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator(200, mockResponse));
        
        Map<String, Object> bounds = new Map<String, Object>{
            'north' => 37.8,
            'south' => 37.7,
            'east' => -122.3,
            'west' => -122.5
        };
        
        Test.startTest();
        List<GooglePlacesService.PlaceResult> results = GooglePlacesService.searchNearbyPlaces(
            JSON.serialize(bounds),
            'lodging',
            5000
        );
        Test.stopTest();
        
        System.assertEquals(0, results.size(), 'Should return empty list');
    }
    
    /**
     * Mock HTTP callout class
     */
    private class MockHttpResponseGenerator implements HttpCalloutMock {
        private Integer statusCode;
        private String responseBody;
        
        public MockHttpResponseGenerator(Integer statusCode, String responseBody) {
            this.statusCode = statusCode;
            this.responseBody = responseBody;
        }
        
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setBody(responseBody);
            res.setStatusCode(statusCode);
            return res;
        }
    }
}