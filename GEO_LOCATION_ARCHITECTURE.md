# Geo-Location Architecture in TangoTiempo

## 1. Vision - The Ideal User Experience

### For Regular Users
- Users should be automatically placed in their local region/city based on their physical location (IP address)
- Users can manually override this geo-detection and select any region/division/city to view events there
- Location selection persists across sessions for returning users
- Users can set favorite locations for quick access

### For Regional Organizers
- Regional Organizers should have permission to create events only in their assigned regions/cities
- Their geo-location determines what venues they can select for events
- They should be able to view a list of their authorized regions/divisions/cities
- The UI should clearly show their current geo-context when creating events

### Filtering and Navigation
- Events should be filterable by a hierarchical location structure: Region → Division → City
- Users should be able to explore neighboring regions easily
- Distance-based search should be available (e.g., "show events within 50 miles")
- Geographic context should be clear in the UI at all times

## 2. Current Implementation - Technical Architecture

### Data Models (Backend)

#### Hierarchical Location Model
```
Country → Region → Division → City
```

**Mastered Regions**
```javascript
const masteredRegionSchema = new Schema({
  appId: { type: String, required: true, default: "1" },
  regionName: { type: String, required: true },
  regionCode: { type: String, required: true },
  active: { type: Boolean, default: true },
  masteredCountryId: {
    type: Schema.Types.ObjectId,
    ref: "MasteredCountry",
    required: true,
  },
});
```

**Mastered Divisions**
```javascript
const masteredDivisionSchema = new Schema({
  appId: { type: String, required: true, default: "1" },
  divisionName: { type: String, required: true },
  divisionCode: { type: String, required: true },
  active: { type: Boolean, default: true },
  masteredRegionId: {
    type: Schema.Types.ObjectId,
    ref: "MasteredRegion",
    required: true,
  },
  states: { type: [String], required: true },
});
```

**Mastered Cities**
```javascript
const masteredCitySchema = new Schema({
  appId: { type: String, required: true, default: "1" },
  cityName: { type: String, required: true },
  cityCode: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  location: {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: { type: [Number], required: true },
  },
  isActive: { type: Boolean, default: true },
  masteredDivisionId: {
    type: Schema.Types.ObjectId,
    ref: "MasteredDivision",
    required: true,
  },
});
```

#### Event Geo-Location Fields
Events contain both legacy and new location fields:
```javascript
// Legacy field
regionName: { type: String, required: true },

// New mastered hierarchy fields
masteredRegionName: { type: String, required: false },
masteredDivisionName: { type: String, required: false },
masteredCityName: { type: String, required: false },

// Venue-specific fields
venueID: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: false },
venueGeolocation: {
  type: { type: String, default: "Point", enum: ["Point"] },
  coordinates: { type: [Number] },
},
```

### Context Management (Frontend)

The application uses two parallel context systems:

#### 1. RegionsContext
```javascript
export const RegionsContext = createContext();

export const RegionsProvider = ({ children }) => {
  const regionsData = useRegions(); // Custom hook to fetch regions
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedRegionID, setSelectedRegionID] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // ...

  return (
    <RegionsContext.Provider
      value={{
        regions,
        setRegions,
        selectedRegion,
        setSelectedRegion,
        selectedRegionID,
        setSelectedRegionID,
        selectedDivision,
        setSelectedDivision,
        selectedCity,
        setSelectedCity,
      }}
    >
      {children}
    </RegionsContext.Provider>
  );
};
```

#### 2. MasteredLocationContext
```javascript
export const MasteredLocationProvider = ({ children }) => {
  const [nearestCity, setNearestCity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNearestCity = async (latitude, longitude, maxDistance = 500000) => {
    // Fetch the nearest city from the backend based on coordinates
    // ...
  };

  // Initialize using IP geolocation
  const initializeContext = async () => {
    try {
      const ipapiResponse = await fetch('https://ipapi.co/json/');
      const { latitude, longitude } = await ipapiResponse.json();
      await fetchNearestCity(latitude, longitude);
    } catch (err) {
      // Default to Boston if geolocation fails
      console.log('Defaulting to Boston as fallback city');
      setNearestCity({
        cityID: '6751f58a5db435dd8005e479',
        cityName: 'Boston',
        regionID: '6751f58a5db435dd8005e45b',
        regionName: 'Northeast',
        // ...other fields
      });
    }
  };

  // ...

  return (
    <MasteredLocationContext.Provider value={{ nearestCity, loading, error, fetchNearestCity }}>
      {children}
    </MasteredLocationContext.Provider>
  );
};
```

### Geo-Location Detection Hooks

#### useGeoLocations
```javascript
export function useGeoLocations() {
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  
  const fetchIPLocation = useCallback(async () => {
    try {
      const { data } = await axios.get('https://ipapi.co/json/');
      if (data && data.latitude && data.longitude) {
        setLatitude(data.latitude);
        setLongitude(data.longitude);
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  }, []);

  // ...
}
```

#### useMasteredLocations
```javascript
export function useMasteredLocations() {
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [cities, setCities] = useState([]);
  const [nearestCity, setNearestCity] = useState({/* ... */});
  
  // Functions to fetch each level of the hierarchy
  const fetchCountries = useCallback(async () => {/* ... */}, []);
  const fetchRegions = useCallback(async (countryId) => {/* ... */}, []);
  const fetchDivisions = useCallback(async (regionId) => {/* ... */}, []);
  const fetchCities = useCallback(async (divisionId) => {/* ... */}, []);
  
  // Function to find nearest city
  const fetchNearestMastered = useCallback(async ({ latitude, longitude }) => {/* ... */}, []);

  // ...
}
```

### Backend API Endpoints

```javascript
// GET nearestMastered
router.get("/nearestMastered", async (req, res) => {
  const { latitude, longitude, maxDistance, isActive } = req.query;
  
  // Find nearest city using MongoDB geospatial query
  const query = {
    appId,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        ...(maxDistance && { $maxDistance: parseFloat(maxDistance) }),
      },
    },
  };
  
  // Populate the full hierarchy
  const nearestCity = await masteredCity.findOne(query).populate({
    path: "masteredDivisionId",
    populate: {
      path: "masteredRegionId",
      populate: {
        path: "masteredCountryId",
      },
    },
  });
  
  // ...
});
```

### UI Components

**Region Selection Menu**
```javascript
const RegionMenu = ({ onClose }) => {
  const { regions, setSelectedRegion, setSelectedDivision, setSelectedCity } = useContext(RegionsContext);
  const [selectionLevel, setSelectionLevel] = useState(1);
  
  // Hierarchical navigation: Region → Division → City
  const handleRegionClick = (region) => {/* ... */};
  const handleDivisionClick = (division) => {/* ... */};
  const handleCityClick = (city) => {/* ... */};
  
  // ...
}
```

**Event Creation Modal**
```javascript
const CreateEventModal = ({ open, onClose, selectedDate }) => {
  const { selectedRegion, selectedRegionID, selectedDivision, selectedCity } = useContext(RegionsContext);
  const { nearestCity } = useMasteredLocation();
  
  const [eventData, setEventData] = useState({
    // ...
    masteredRegionName: selectedRegion || (nearestCity?.regionName || ''),
    masteredDivisionName: selectedDivision || (nearestCity?.divisionName || ''),
    masteredCityName: selectedCity || (nearestCity?.cityName || ''),
  });
  
  // ...
}
```

## 3. Gaps Between Vision and Current Implementation

### Technical Gaps

1. **Parallel Context Systems**: The application uses both `RegionsContext` and `MasteredLocationContext` which causes confusion and potential inconsistencies. These two systems don't always stay in sync.

2. **Incomplete Migration to Mastered Locations**: The event schema still has a required `regionName` field alongside the newer optional `masteredRegionName`, `masteredDivisionName`, and `masteredCityName` fields.

3. **Inconsistent State Management**: The location state is fragmented across multiple contexts and components rather than having a single source of truth.

4. **User Authorization Gaps**: There is no clear system to link a RegionalOrganizer's permissions to specific regions/cities in the current implementation.

5. **Inefficient Data Loading**: The hierarchical data is often loaded sequentially rather than in a more efficient manner.

6. **Missing Persistence**: User location preferences aren't persistently stored between sessions.

### User Experience Gaps

1. **Unclear Location Context**: The UI doesn't consistently communicate which region/division/city the user is currently viewing.

2. **No Distance-Based Search**: While the backend supports geospatial queries, the frontend doesn't offer a distance-based search option.

3. **Missing Regional Organizer UI**: The UI doesn't clearly indicate to Regional Organizers which regions they have permission to create events in.

4. **No Favorites System**: Users can't save their favorite locations for quick access.

5. **Inconsistent Navigation**: The region selection flow is separate from the rest of the UI rather than being integrated.

6. **Limited Default Location Logic**: The system defaults to Boston when geolocation fails instead of using a more nuanced approach.

## 4. Recommendations

### Technical Recommendations

1. **Unified Location Context**:
   ```javascript
   // Create a single comprehensive location context
   export const GeoLocationProvider = ({ children }) => {
     const [locationHierarchy, setLocationHierarchy] = useState({
       country: { id: null, name: null },
       region: { id: null, name: null },
       division: { id: null, name: null },
       city: { id: null, name: null, coordinates: null }
     });
     const [userCoordinates, setUserCoordinates] = useState(null);
     const [userPermissions, setUserPermissions] = useState({
       allowedRegions: [],
       allowedCities: [],
       maxDistance: null
     });
     
     // Methods to update the hierarchy while maintaining consistency
     // Geolocation detection with better fallbacks
     // Permission checking methods
     
     // ...
   }
   ```

2. **Complete the Data Model Migration**:
   - Make the mastered location fields required in the Event schema
   - Add a data migration script to populate any missing fields
   - Deprecate the legacy `regionName` field

3. **Implement Proper User-Region Authorization**:
   - Add a direct relationship between UserLogin and allowed regions/cities
   - Create an API endpoint to fetch a user's allowed locations
   - Add permission checking to event creation/editing

4. **Optimize Data Loading**:
   - Implement a combined API endpoint that returns the full hierarchy in one request
   - Use caching for frequently accessed location data
   - Implement lazy loading for deeper parts of the hierarchy

5. **Add Location Persistence**:
   - Store user's location preferences in localStorage or in the database
   - Implement a user preferences API for authenticated users

### User Experience Recommendations

1. **Enhanced Location UI**:
   - Add a persistent location breadcrumb showing the current Region → Division → City
   - Highlight the current location in the site header
   - Add a map visualization for spatial context

2. **Regional Organizer Experience**:
   - Add a "My Regions" section in the user dashboard
   - Clearly indicate which regions the user can create events in
   - Show a warning when trying to create events outside permitted regions

3. **Implement Distance-Based Search**:
   - Add UI controls for "Events within X miles of me"
   - Allow users to search around any point, not just their current location
   - Add radius visualization on a map

4. **Favorites System**:
   - Allow users to star/favorite regions and cities
   - Implement a quick-access dropdown for favorite locations
   - Add a "Remember my location" toggle

5. **Integrated Navigation**:
   - Redesign the region selector to be more integrated with the main UI
   - Add a hierarchical breadcrumb navigation
   - Use a map-based selector as an alternative navigation method

6. **Smarter Defaults**:
   - Implement a more sophisticated fallback system (user's last location → popular regions → default)
   - Add a "popular regions" quick-access section
   - Use browser geolocation API as a backup to IP geolocation

### Implementation Priorities

1. **Phase 1: Consolidate the Architecture**
   - Merge the two context systems into a unified GeoLocationContext
   - Complete the data model migration
   - Fix inconsistencies in the existing code

2. **Phase 2: Improve the User Experience**
   - Enhance the location UI and navigation
   - Add clear location indicators throughout the application
   - Implement location persistence

3. **Phase 3: Add Advanced Features**
   - Implement distance-based search
   - Add the favorites system
   - Enhance the regional organizer experience

4. **Phase 4: Optimize Performance**
   - Implement caching and data optimization
   - Add prefetching for commonly accessed data
   - Improve loading states and transitions

By following these recommendations, the TangoTiempo application can achieve a more cohesive, intuitive, and powerful geo-location system that better serves both regular users and regional organizers.