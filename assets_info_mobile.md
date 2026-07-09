# Hospital AI / POS Mobile - Assets, Tech Stack & Requirements Documentation

This file contains documentation and configuration details for all assets found in the `d:\pos-web-fe\assets` folder as well as an analysis of the technology stack, screen structures, and configuration requirements for the **Hospital AI / POS Mobile** frontend.

---

## 1. Assets List

| No | Asset Name | File Path | Size | Description | Usage in POS Mobile |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **cardiogram.png** | `assets/cardiogram.png` | 18.9 KB | An illustration/icon of a cardiogram heartbeat pattern inside a circular badge. | Imported as `HealthLogo` in [LoginScreen.js](file:///d:/pos-web-fe/screens/LoginScreen.js#L11). Displayed inside the login card as the main logo of the POS application. |
| 2 | **gdsk_logo.png** | `assets/gdsk_logo.png` | 37.8 KB | Official logo badge/branding for the health services provider (GDSK). | Imported as `GdskLogo` in [LoginScreen.js](file:///d:/pos-web-fe/screens/LoginScreen.js#L12) and [Navbar.js](file:///d:/pos-web-fe/components/composite/Navbar.js#L8). Displayed on the login screen header and in the top navigation bar. |
| 3 | **health_metrics.svg**| `assets/health_metrics.svg`| 430 B | SVG code describing generic health metrics graphics. | *Unused / Not referenced* in the source code. |
| 4 | **order-confirmed.png**| `assets/order-confirmed.png`| 194.0 KB | Vector art illustration depicting a successful order completion screen with a package box and checkmark. | Referenced dynamically in [SuccessNotification.js](file:///d:/pos-web-fe/screens/SuccessNotification.js#L38) using `require()`. Displayed as the core confirmation image on the order success screen. |
| 5 | **switchoff.png** | `assets/switchoff.png` | 20.5 KB | Red/blue logout/shutdown switch button icon. | *Unused / Not referenced* in the source code. |

### Detailed Asset Code Reference

#### `cardiogram.png`
* **Path:** `d:\pos-web-fe\assets\cardiogram.png`
* **Import & Rendering:**
  ```javascript
  import HealthLogo from '../assets/cardiogram.png';
  
  // Rendered inside the login box container:
  <View style={styles.logoBox}>
    <Image source={HealthLogo} style={styles.Image}/>
  </View>
  ```

#### `gdsk_logo.png`
* **Path:** `d:\pos-web-fe\assets\gdsk_logo.png`
* **Import & Rendering in Login:**
  ```javascript
  import GdskLogo from '../assets/gdsk_logo.png';
  
  <SafeAreaView style={styles.container}>
    <View style={styles.logoBox}>
      <Image source={GdskLogo} style={styles.Image}/>
    </View>
    ...
  </SafeAreaView>
  ```
* **Import & Rendering in Navbar:**
  ```javascript
  import GdskLogo from '../../assets/gdsk_logo.png';
  
  <View style={styles.container}>
    ...
    <Image source={GdskLogo} style={styles.Image}/>
  </View>
  ```

#### `order-confirmed.png`
* **Path:** `d:\pos-web-fe\assets\order-confirmed.png`
* **Rendering in SuccessNotification:**
  ```javascript
  <Image
    source={require('../assets/order-confirmed.png')}
    style={styles.image}
    resizeMode="contain"
  />
  ```

---

## 2. Technology Stack & Key Dependencies

Based on [package.json](file:///d:/pos-web-fe/package.json), the mobile frontend application is built using the following core ecosystem:

* **Core Framework:**
  * **React Native (v0.73.8)**: Framework for building native mobile apps using React.
  * **React (v18.2.0)**: Underlying component and hooks engine.
* **Navigation Management:**
  * **`@react-navigation/native` (v6.1.7)**: Core routing & navigation container for state flow.
  * **`@react-navigation/native-stack` (v6.9.12)**: Provides native OS transition animations and stack-based screen structures.
* **Layout, Gesture, & Animation Support:**
  * **`react-native-gesture-handler` (v2.14.0)**: Declarative touch gestures framework.
  * **`react-native-reanimated` (v3.6.2)**: Smooth, high-performance UI animations.
  * **`react-native-safe-area-context` (v4.8.2)**: Safely handles notches, taskbars, and status bars on modern screens.
  * **`react-native-screens` (v3.29.0)**: Native primitives representation for react-navigation to optimize memory.
* **Icons:**
  * **`react-native-vector-icons` (v10.3.0)**: SVG-based icon sets (Ionicons, etc.).
* **Technical Environment Requirements:**
  * **Node.js**: Requires version `>=18` (defined in the `engines` field).
  * **Language**: Supports TypeScript/ESNext, compiled via Babel (`@react-native/babel-preset`).

---

## 3. Core Application Architecture & Screen Flow

The application routing is defined in [App.js](file:///d:/pos-web-fe/App.js), implementing the following stack navigation hierarchy:

1. **`LoginScreen` ([screens/LoginScreen.js](file:///d:/pos-web-fe/screens/LoginScreen.js))**
   * **Purpose:** Initial entry point. Allows entering a username, password, and the server's API URL (default: `https://gopos.pdsk.co.id/api`).
2. **`HomeScreen` ([screens/HomeScreen.js](file:///d:/pos-web-fe/screens/HomeScreen.js))**
   * **Purpose:** Dashboard navigation for staff. Displays quick links to Patient Meal Order systems and Meal Validations.
3. **`FloorListPatientScreen` ([screens/FloorListPatientScreen.js](file:///d:/pos-web-fe/screens/FloorListPatientScreen.js))**
   * **Purpose:** Displays hospital floors (e.g., Ward/Floor 1, Ward/Floor 2) to filter patients.
4. **`PatientListScreen` ([screens/PatientListScreen.js](file:///d:/pos-web-fe/screens/PatientListScreen.js))**
   * **Purpose:** Lists patients in a specific ward/room filtered by meal sessions (Breakfast, Lunch, Dinner).
5. **`PatientOrderScreen` ([screens/PatientOrderScreen.js](file:///d:/pos-web-fe/screens/PatientOrderScreen.js))**
   * **Purpose:** Displays patient menu items (e.g., Soup Ayam, Nasi Goreng). Users can select and customize portions/restrictions.
6. **`PatientOrderSummaryScreen` ([screens/PatientOrderSummaryScreen.js](file:///d:/pos-web-fe/screens/PatientOrderSummaryScreen.js))**
   * **Purpose:** Summary screen of the patient order before submitting.
7. **`SuccessNotification` ([screens/SuccessNotification.js](file:///d:/pos-web-fe/screens/SuccessNotification.js))**
   * **Purpose:** Final confirmation overlay displaying the successful placement of an order.
8. **`MealCheckPatientScreen` ([screens/MealCheckPatientScreen.js](file:///d:/pos-web-fe/screens/MealCheckPatientScreen.js)) & `MealCheckPatientDetailScreen` ([screens/MealCheckPatientDetailScreen.js](file:///d:/pos-web-fe/screens/MealCheckPatientDetailScreen.js))**
   * **Purpose:** Flow to check specific patient dietary requirements and match/verify their served meals.
9. **`MealValidationScreen` ([screens/MealValidationScreen.js](file:///d:/pos-web-fe/screens/MealValidationScreen.js))**
   * **Purpose:** Panel where nurses/caterers validate the status of prepared meals.
10. **`SettingsScreen` ([screens/SettingsScreen.js](file:///d:/pos-web-fe/screens/SettingsScreen.js))**
    * **Purpose:** Displays user profile info and technical configs like the API endpoint configuration.

---

## 4. Integration Requirements for Hospital AI Backend

To successfully configure and run this mobile application against the **Hospital AI Backend**, the following integration items must be addressed:

### API Endpoints & Base URL
* Currently, the hardcoded API base URL is specified as `https://gopos.gdsk.co.id/api` (in [ApiEndpointSection.js](file:///d:/pos-web-fe/components/composite/ApiEndpointSection.js#L64)) and `https://gopos.pdsk.co.id/api` (as placeholder in [LoginScreen.js](file:///d:/pos-web-fe/screens/LoginScreen.js#L117)).
* **Integration Task**: Set up a dynamic network configuration using Axios/Fetch interceptors connected to local storage (e.g., React Native AsyncStorage) so changing the endpoint in `SettingsScreen` or `LoginScreen` persists globally.

### Data Fetching Integration
* The mobile application currently utilizes static mock data array constants for:
  * Wards & Rooms (`FloorListPatientScreen` mock arrays)
  * Patient Records (`PatientListScreen` mock arrays)
  * Menu Foods, Calories, and Prices (`PatientOrderScreen` mock array)
* **Integration Task**: Replace local arrays with REST API requests from the backend. The backend must expose corresponding endpoints:
  * `GET /api/floors` / `GET /api/wards`
  * `GET /api/patients?ward={ward_id}&meal_time={meal_time}`
  * `GET /api/menus?category={category}`
  * `POST /api/orders` (to submit patient meal selection)
  * `PUT /api/orders/validate` (for meal check and validation screens)

### Authentication
* The login screen features text input boxes for Username, Password, and API URL.
* **Integration Task**: Wire this to a secure authentication endpoint (e.g., JWT Auth `POST /api/auth/login`) and store the returned authorization tokens securely using keychains or secure storage on mobile.
