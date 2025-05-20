// --- START OF FILE js/map.js (Updated May 18, Final V3) ---

// --- Configuration ---
const DEFAULT_ZOOM = 15;
const LABEL_VISIBILITY_ZOOM = 17;
const APPS_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbwq322XUahzv5OhAQSdC2F6mvH2Z0GtqjRKdM99T8JwN_YqyEFVYNg9bv1M33nwmvH8mg/exec';
const USER_LOCATION_ID = 'user_location';
const WALKING_THRESHOLD_PATH = 200; // Max walking distance for implicit links
const MAX_DIST_AREAS = 150;
const CONTACT_HOTLINE = '02763823378';

// IDs for specific transport POIs (cần khớp với dữ liệu POI của bạn)
const COASTER_START_ID = '24'; // Ga Máng trượt
const COASTER_END_ID = '18';   // Điểm cuối máng trượt
const ROUNDABOUT_ID = '51';    // Bùng binh chân núi (điểm trung chuyển xe buggy sau máng trượt)
const CABLE_STATION_CHUA_HANG_ID = '23';  // Ga Chùa Hang (chùa bà)
const CABLE_STATION_HOA_DONG_ID = '33';   // Ga Hòa Đồng (chùa bà)
const CABLE_STATION_BA_DEN_ID = '6'; // Ga Bà Đen (chân núi)
const CABLE_STATION_VAN_SON_ID = '41'; // Ga Vân Sơn (đỉnh)
const CABLE_STATION_TAM_AN_ID = '43'; // Ga Tâm An (đỉnh)


// Cable Route Names (cần khớp với dữ liệu POI của bạn)
const CABLE_ROUTE_NAME_TAM_AN = 'Tuyến Tâm An';
const CABLE_ROUTE_NAME_VAN_SON = 'Tuyến Vân Sơn';
const CABLE_ROUTE_NAME_CHUA_HANG = 'Tuyến Chùa Hang';

// Dijkstra Cost Configuration
const COST_WALK_BASE = 10;
const COST_WALK_DISTANCE_FACTOR = 0.05;
const COST_CABLE_CAR_BASE = 20;
const COST_CABLE_CAR_PREFERRED_BONUS = -10;
const COST_CABLE_CAR_FALLBACK_PENALTY = 5;
const COST_TRANSFER_PENALTY_WALK_TO_CABLE = 5;
const COST_TRANSFER_PENALTY_CABLE_TO_WALK = 2;
const COST_TRANSFER_BETWEEN_CABLES = 10;

// --- Language Configuration ---
const translations = {
    vi: {
        mapTitle: "Bản đồ số du lịch Núi Bà Đen",
        searchPlaceholder: "Tìm địa điểm...",
        allCategories: 'Tất cả',
        loading: "Đang tải...",
        locating: "Đang định vị...",
        loadingError: "Lỗi tải dữ liệu.",
        yourLocation: "Vị trí của bạn",
        nearLocation: (name) => `Gần ${name}`,
        routeStartPlaceholder: "Điểm bắt đầu",
        routeEndPlaceholder: "Điểm kết thúc",
        findRouteButton: "Tìm đường",
        directions: "Chỉ đường",
        mapLayers: "Lớp bản đồ",
        locateMe: "Vị trí của tôi",
        close: "Đóng",
        operationalPrefix: "Hoạt động",
        closedPrefix: "Đóng cửa",
        statusOperational: (time) => `Hoạt động (đến ${time})`,
        statusNotOpenYet: (time) => `Mở lúc ${time}`,
        statusAlreadyClosed: (time) => `Đã đóng cửa (lúc ${time})`,
        statusClosedToday: "Đóng cửa hôm nay",
        statusClosedUntil: (date) => `Đóng đến hết ${date}`,
        statusMissingData: "Thiếu dữ liệu giờ",
        statusErrorFormat: "Lỗi định dạng giờ",
        statusErrorData: "Lỗi dữ liệu giờ",
        statusNoSchedule: "Không có lịch hôm nay",
        poiInfoArea: "Khu vực",
        audioNarrate: "Thuyết minh",
        routeFromHere: "Từ đây",
        routeToHere: "Đến đây",
        routeNotFound: "Không tìm thấy đường đi.",
        routeErrorStartNotFound: (name) => `Không tìm thấy điểm bắt đầu "${name}".`,
        routeErrorEndNotFound: (name) => `Không tìm thấy điểm kết thúc "${name}".`,
        routeErrorSelectStart: "Chọn điểm bắt đầu.",
        routeErrorSelectEnd: "Chọn điểm kết thúc.",
        routeErrorSamePoint: "Điểm đầu và cuối trùng nhau.",
        routeErrorPathTimeout: "Hết thời gian tìm đường.",
        routeErrorGeneric: "Lỗi tìm đường.",
        routeErrorBothClosed: "Không tìm thấy đường đi phù hợp do cả Cáp treo và Máng trượt xuống núi đều không hoạt động.",
        routeInstructionTitle: (start, end, choice) => `${start} <i class="fas fa-arrow-right text-xs mx-1"></i> ${end}${choice === 'alpine_coaster' ? ' (ưu tiên Máng trượt)' : ''}`,
        routeInstructionWalk: (start, end) => `🚶 Đi bộ từ <strong>${start}</strong> đến <strong>${end}</strong>`,
        routeInstructionCable: (route, start, end) => `🚠 Đi <strong>${route}</strong> từ <strong>${start}</strong> đến <strong>${end}</strong>`,
        routeInstructionCoaster: (start, end) => `🎢 Đi Máng trượt từ <strong>${start}</strong> xuống <strong>${end}</strong>`,
        routeErrorReasonStartClosed: (name, reason) => ` (Điểm đầu '${name}' đóng: ${reason})`,
        routeErrorReasonEndClosed: (name, reason) => ` (Điểm cuối '${name}' đóng: ${reason})`,
        noPOIFoundForSearch: (term) => `Không có kết quả cho "${term}".`,
        googleMapsFallbackPrompt: "Thử tìm đường bằng Google Maps?",
        errorLoadingPOIInfo: "Lỗi tải thông tin.",
        calculatingRoute: "Đang tìm đường...",
        tutorialTitle: "Hướng dẫn Bản đồ",
        tutorialSearch: "Dùng ô tìm kiếm để tìm địa điểm.",
        tutorialDirections: "Nhấn biểu tượng chỉ đường để nhập điểm và tìm lộ trình.",
        tutorialLocation: "Nhấn để xem vị trí hiện tại.",
        tutorialAudio: "Nhấn nút 'Thuyết minh' (nếu có) để nghe.",
        languageSwitcherLabel: "Ngôn ngữ:",
        contactTitle: "Thông tin liên hệ",
        contactDetails: `<strong>BQL Khu du lịch quốc gia Núi Bà Đen</strong><br>
<i class="fas fa-envelope"></i> <a href="mailto:bqlnuiba@gmail.com">bqlnuiba@gmail.com</a><br>
<i class="fab fa-facebook"></i> <a href="https://www.facebook.com/bqlkdlquocgianuibaden" target="_blank" rel="noopener noreferrer">Fanpage Facebook</a><br>
<i class="fab fa-tiktok"></i> <a href="https://www.tiktok.com/@nuibadenbql" target="_blank" rel="noopener noreferrer">nuibadenbql</a><br>
<i class="fas fa-globe"></i> <a href="http://khudulichnuibaden.tayninh.gov.vn" target="_blank" rel="noopener noreferrer">khudulichnuibaden.tayninh.gov.vn</a>`,
        callHotline: "Gọi Hotline",
        chooseDescentTitle: "Chọn phương tiện xuống núi",
        chooseDescentInfo: "Máng Trượt hoạt động theo lịch vận hành.",
        cableCar: "Cáp treo",
        alpineCoaster: "Máng trượt",
        cableRouteTamAn: "Tuyến Tâm An",
        cableRouteVanSon: "Tuyến Vân Sơn",
        cableRouteChuaHang: "Tuyến Chùa Hang",
        attraction: "Tham quan", viewpoint: "Ngắm cảnh", historical: "Di tích",
        religious: "Tâm linh", food: "Ẩm thực", transport: "Di chuyển",
        parking: "Bãi xe", amenities: "Tiện ích", service: "Dịch vụ",
        contactCloseAria: "Đóng liên hệ",
    },
    en: {
        mapTitle: "Ba Den Mountain Digital Map",
        searchPlaceholder: "Search places...",
        allCategories: 'All',
        loading: "Loading...",
        locating: "Locating...",
        loadingError: "Error loading data.",
        yourLocation: "Your Location",
        nearLocation: (name) => `Near ${name}`,
        routeStartPlaceholder: "Starting point",
        routeEndPlaceholder: "Destination",
        findRouteButton: "Find Route",
        directions: "Directions",
        mapLayers: "Map Layers",
        locateMe: "My Location",
        close: "Close",
        operationalPrefix: "Operational",
        closedPrefix: "Closed",
        statusOperational: (time) => `Operational (until ${time})`,
        statusNotOpenYet: (time) => `Opens at ${time}`,
        statusAlreadyClosed: (time) => `Closed (at ${time})`,
        statusClosedToday: "Closed today",
        statusClosedUntil: (date) => `Closed until ${date}`,
        statusMissingData: "Hours unavailable",
        statusErrorFormat: "Time format error",
        statusErrorData: "Hours data error",
        statusNoSchedule: "No schedule today",
        poiInfoArea: "Area",
        audioNarrate: "Audio Guide",
        routeFromHere: "From here",
        routeToHere: "To here",
        routeNotFound: "Route not found.",
        routeErrorStartNotFound: (name) => `Start point "${name}" not found.`,
        routeErrorEndNotFound: (name) => `End point "${name}" not found.`,
        routeErrorSelectStart: "Select start point.",
        routeErrorSelectEnd: "Select end point.",
        routeErrorSamePoint: "Start and end are same.",
        routeErrorPathTimeout: "Routing timed out.",
        routeErrorGeneric: "Routing error.",
        routeErrorBothClosed: "Cannot find a suitable route as both the Cable Car and Alpine Coaster for descent are closed.",
        routeInstructionTitle: (start, end, choice) => `${start} <i class="fas fa-arrow-right text-xs mx-1"></i> ${end}${choice === 'alpine_coaster' ? ' (prioritizing Alpine Coaster)' : ''}`,
        routeInstructionWalk: (start, end) => `🚶 Walk from <strong>${start}</strong> to <strong>${end}</strong>`,
        routeInstructionCable: (route, start, end) => `🚠 Take <strong>${route}</strong> from <strong>${start}</strong> to <strong>${end}</strong>`,
        routeInstructionCoaster: (start, end) => `🎢 Ride Coaster from <strong>${start}</strong> to <strong>${end}</strong>`,
        routeErrorReasonStartClosed: (name, reason) => ` (Start '${name}' closed: ${reason})`,
        routeErrorReasonEndClosed: (name, reason) => ` (End '${name}' closed: ${reason})`,
        noPOIFoundForSearch: (term) => `No results for "${term}".`,
        googleMapsFallbackPrompt: "Try Google Maps for directions?",
        errorLoadingPOIInfo: "Error loading info.",
        calculatingRoute: "Calculating route...",
        tutorialTitle: "Map Guide",
        tutorialSearch: "Use search bar to find places.",
        tutorialDirections: "Tap directions icon to input points and find route.",
        tutorialLocation: "Tap to see your current location.",
        tutorialAudio: "Tap 'Audio Guide' (if available) to listen.",
        languageSwitcherLabel: "Language:",
        contactTitle: "Contact Information",
        contactDetails: `<strong>Ba Den Mountain National Tourist Area Management Board</strong><br>
                         <i class="fas fa-envelope mr-2 opacity-75"></i> <a href="mailto:bqlnuiba@gmail.com" class="hover:underline">bqlnuiba@gmail.com</a><br>
                         <i class="fab fa-facebook mr-2 opacity-75"></i> <a href="https://www.facebook.com/bqlkdlquocgianuibaden" target="_blank" rel="noopener noreferrer" class="hover:underline">Facebook</a><br>
                         <i class="fas fa-phone mr-2 opacity-75"></i> <a href="tel:${CONTACT_HOTLINE}" class="hover:underline">${CONTACT_HOTLINE}</a>`,
        callHotline: "Call Hotline",
        chooseDescentTitle: "Choose descent vehicle",
        chooseDescentInfo: "Alpine Coaster operates according to schedule.",
        cableCar: "Cable Car",
        alpineCoaster: "Alpine Coaster",
        cableRouteTamAn: "Tam An Route",
        cableRouteVanSon: "Van Son Route",
        cableRouteChuaHang: "Chua Hang Route",
        attraction: "Attractions", viewpoint: "Viewpoints", historical: "Historical",
        religious: "Religious", food: "Food", transport: "Transport",
        parking: "Parking", amenities: "Amenities", service: "Services",
    }
};
// Tự động nhận diện ngôn ngữ trình duyệt
let savedLang = localStorage.getItem('preferredLang');
let browserLang = (navigator.language || navigator.userLanguage || 'vi').slice(0,2);
let currentLang = savedLang || (browserLang === 'en' ? 'en' : 'vi');

// --- Global Variables ---
let map; 
let markerCluster; 
let poiData = [];
let userMarker = null; 
let currentPOI = null; 
let startPOI = null; 
let endPOI = null;   
let currentRoutePolyline = null; 
let currentRouteHighlightLines = []; 
let activeCategory = null; 
let audioPlayer; 
let routeResultSessionId = 0; // For descent choice, if re-enabled
let descentChoiceMade = false; // For descent choice, if re-enabled
let currentRouteResult = null; // For descent choice, if re-enabled
let currentDescentChoice = 'cable_car'; // For descent choice, if re-enabled
let cableRoutePolylines = []; // Store cable route polylines


// DOM Elements
let searchInputMain, searchResultsDropdown, filterCategoriesContainer,
    poiPanel, poiPanelContent,
    routeInputsContainer, startInput, endInput, findRouteButton,
    startSuggestions, endSuggestions,
    locateBtnDesktop, mapLayersBtnDesktop, zoomInBtnDesktop, zoomOutBtnDesktop,
    showTutorialButton, showContactButton,
    fabLocate, fabSearch, fabDirections, fabTutorial,
    loadingIndicator, loadingText,
    directionsIconSearch, 
    tutorialPopup, contactPopup, popupBackdrop,
    tutorialCloseBtn, contactCloseBtn, callHotlineBtn,
    langViBtn, langEnBtn, routeInstructionsPanel,
    descentChoicePopup, choiceCableCarBtn, choiceAlpineCoasterBtn; // For descent choice popup


// --- Helper Functions ---
const getUIText = (key, ...args) => {
    const translationSet = translations[currentLang] || translations.vi;
    const textOrFn = translationSet[key] || key;
    return typeof textOrFn === 'function' ? textOrFn(...args) : textOrFn;
};


// --- DOM Element Caching ---
function cacheDOMElements() {
    searchInputMain = document.getElementById('search-input-main');
    searchResultsDropdown = document.getElementById('search-results-dropdown');
    filterCategoriesContainer = document.querySelector('.filter-categories');
    poiPanel = document.getElementById('info-panel'); 
    poiPanelContent = poiPanel?.querySelector('.poi-panel-content'); 

    routeInputsContainer = document.getElementById('route-inputs');
    startInput = document.getElementById('start-input');
    endInput = document.getElementById('end-input');
    findRouteButton = document.getElementById('find-route-button');
    startSuggestions = document.getElementById('start-suggestions');
    endSuggestions = document.getElementById('end-suggestions');

    locateBtnDesktop = document.getElementById('locate-btn'); 
    mapLayersBtnDesktop = document.getElementById('map-layers-desktop');
    zoomInBtnDesktop = document.querySelector('.zoom-controls-desktop .zoom-in');
    zoomOutBtnDesktop = document.querySelector('.zoom-controls-desktop .zoom-out');
    showTutorialButton = document.getElementById('show-tutorial-button');
    showContactButton = document.getElementById('show-contact-button');
    
    fabLocate = document.getElementById('fab-locate');
    fabSearch = document.getElementById('fab-search');
    fabDirections = document.getElementById('fab-directions');
    fabTutorial = document.getElementById('fab-tutorial');

    loadingIndicator = document.getElementById('loading-indicator');
    loadingText = document.getElementById('loading-text');
    audioPlayer = document.getElementById('poi-audio-player');

    directionsIconSearch = document.getElementById('directions-icon-search');

    tutorialPopup = document.getElementById('tutorial-popup');
    contactPopup = document.getElementById('contact-info-popup');
    popupBackdrop = document.getElementById('popup-backdrop');
    tutorialCloseBtn = document.getElementById('tutorial-close-btn');
    contactCloseBtn = document.getElementById('contact-close-btn');
    callHotlineBtn = document.getElementById('call-hotline-btn');
    langViBtn = document.getElementById('lang-vi');
    langEnBtn = document.getElementById('lang-en');
    routeInstructionsPanel = document.getElementById('route-instructions-panel');

    // Descent choice popup elements (will be null if HTML doesn't exist)
    descentChoicePopup = document.getElementById('descent-choice-popup'); 
    choiceCableCarBtn = document.getElementById('choice-cable-car');
    choiceAlpineCoasterBtn = document.getElementById('choice-alpine-coaster');
}

// --- Map Initialization ---
function initializeMap() {
    map = L.map('map', {
        zoomControl: false, 
        attributionControl: false 
    }).setView([11.370994909356133, 106.17721663114253], DEFAULT_ZOOM); 

    L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { 
        attribution: '© Google Maps', 
        maxZoom: 20, 
        subdomains:['mt0','mt1','mt2','mt3']
    }).addTo(map);
    
    L.control.attribution({position: 'bottomright', prefix: ''}).addTo(map);

    markerCluster = L.markerClusterGroup({
        maxClusterRadius: 50, spiderfyOnMaxZoom: true,
        showCoverageOnHover: false, zoomToBoundsOnClick: true,
    });
    map.addLayer(markerCluster);

    // Save map state on move/zoom
    map.on('moveend', debounce(saveMapState, 1000));
    map.on('zoomend', debounce(saveMapState, 1000));

    map.on('zoomend movend', debounce(updateMarkerLabelsVisibility, 150));
    map.on('click', (e) => { 
        if (poiPanel && poiPanel.style.display !== 'none' && !e.originalEvent.target.closest('#info-panel')) {
            hidePOIInfoPanel();
        }
        if (searchResultsDropdown && searchResultsDropdown.style.display !== 'none') {
            searchResultsDropdown.style.display = 'none';
        }
        if (startSuggestions && startSuggestions.style.display !== 'none') startSuggestions.style.display = 'none';
        if (endSuggestions && endSuggestions.style.display !== 'none') endSuggestions.style.display = 'none';
    });

    // Restore map state
    restoreMapState();

    // Initialize marker cluster
    markerCluster = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: LABEL_VISIBILITY_ZOOM
    }).addTo(map);

    // Load POI data and draw cable routes
    loadPoiData().then(() => {
        renderPoiMarkers();
        renderCategoryFilters();
        drawCableRoutes(); // Add this line
    });
}

// --- POI Data Handling ---
async function loadPoiData() {
    if(loadingIndicator) loadingIndicator.style.display = 'flex';
    if(loadingText) loadingText.textContent = getUIText('loading');

    try {
        // Check cache first
        const cachedData = getFromLocalStorage(STORAGE_KEYS.POI_DATA);
        const cacheTimestamp = getFromLocalStorage(STORAGE_KEYS.POI_DATA_TIMESTAMP);
        const now = Date.now();

        if (cachedData && cacheTimestamp && (now - cacheTimestamp < POI_CACHE_DURATION)) {
            poiData = cachedData;
            renderPoiMarkers();
            renderCategoryFilters();
            updateUITextElements();
            // Hiển thị tutorial nếu chưa từng xem
            if (!localStorage.getItem('tutorialDismissed_map')) {
                const tutorialPopup = document.getElementById('tutorial-popup');
                const popupBackdrop = document.getElementById('popup-backdrop');
                if (tutorialPopup) tutorialPopup.style.display = 'block';
                if (popupBackdrop) popupBackdrop.style.display = 'block';
            }
            return;
        }

        // If no cache or expired, fetch new data
        const response = await fetch(APPS_SCRIPT_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        poiData = data.poiData.map(poi => {
            let t = poi.type?.toLowerCase().trim();
            if (t === 'religion') t = 'religious';
            return {
                ...poi,
                id: String(poi.id),
                position: poi.position || [parseFloat(poi.latitude), parseFloat(poi.longitude)],
                type: POI_CATEGORIES[t] ? t : 'attraction'
            };
        }).filter(poi => poi.position && !isNaN(poi.position[0]) && !isNaN(poi.position[1]));

        // Save to cache
        saveToLocalStorage(STORAGE_KEYS.POI_DATA, poiData);
        saveToLocalStorage(STORAGE_KEYS.POI_DATA_TIMESTAMP, now);

        renderPoiMarkers();
        renderCategoryFilters();
        updateUITextElements();
        // Hiển thị tutorial sau khi load xong dữ liệu (nếu chưa từng xem)
        if (!localStorage.getItem('tutorialDismissed_map')) {
            const tutorialPopup = document.getElementById('tutorial-popup');
            const popupBackdrop = document.getElementById('popup-backdrop');
            if (tutorialPopup) tutorialPopup.style.display = 'block';
            if (popupBackdrop) popupBackdrop.style.display = 'block';
        }
        return;
    } catch (error) {
        console.error("Error loading POI data:", error);
        if(loadingText) loadingText.textContent = getUIText('loadingError');
    } finally {
        if(loadingIndicator) setTimeout(() => { loadingIndicator.style.display = 'none'; }, 500);
    }
}

// --- Marker and Label Functions ---
function createPOIMarker(poi) {
    if (!poi || !poi.position || !Array.isArray(poi.position) || poi.position.length !== 2) {
        console.warn('Invalid POI data for marker creation:', poi);
        return null;
    }

    try {
        const name = getPoiName(poi);
        const iconUrl = poi.iconurl || getDefaultIconUrl(poi.type);
        const markerHtml = `
            <div class="marker-container" style="background:white;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.12);padding:2px;display:flex;flex-direction:row;align-items:center;">
                <img src="${iconUrl}" class="marker-icon" alt="${name}" onerror="this.src='${getDefaultIconUrl('attraction')}'" style="width:28px;height:28px;object-fit:contain;border-radius:8px;">
                <div class="marker-label" style="display:none;margin-left:8px;background:white;padding:2px 10px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.10);font-size:13px;font-weight:500;color:#222;white-space:nowrap;">${name}</div>
            </div>`;

        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: markerHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -28]
        });

        const marker = L.marker(poi.position, { 
            icon: customIcon,
            title: name,
            alt: name
        });
        
        marker.poiData = poi;

        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (poi) {
                currentPOI = poi;
                showPOIInfoPanel(poi);
            }
        });

        return marker;
    } catch (error) {
        console.error('Error creating POI marker:', error, poi);
        return null;
    }
}

function renderPoiMarkers() {
    if (!markerCluster) {
        console.error('Marker cluster not initialized');
        return;
    }

    try {
        markerCluster.clearLayers();
        const poisToRender = activeCategory 
            ? poiData.filter(poi => poi && poi.type === activeCategory)
            : poiData;

        let validMarkers = 0;
        let invalidPois = 0;

        poisToRender.forEach(poi => {
            if (!poi || !poi.position || !Array.isArray(poi.position) || poi.position.length !== 2) {
                invalidPois++;
                return;
            }

            const marker = createPOIMarker(poi);
            if (marker) {
                markerCluster.addLayer(marker);
                validMarkers++;
            }
        });

        if (invalidPois > 0) {
            console.warn(`Skipped ${invalidPois} invalid POIs during rendering`);
        }

        updateMarkerLabelsVisibility();
    } catch (error) {
        console.error('Error rendering POI markers:', error);
    }
}

function updateMarkerLabelsVisibility() {
    const currentZoom = map.getZoom();
    const showLabelsGeneral = currentZoom >= LABEL_VISIBILITY_ZOOM;

    markerCluster.eachLayer(marker => {
        if (marker.getElement && marker.poiData) { 
            const element = marker.getElement();
            if (element) {
                const label = element.querySelector('.marker-label');
                if (label) {
                    const show = element.classList.contains('highlight-search-result') || showLabelsGeneral;
                    label.style.display = show ? 'block' : 'none';
                    label.style.opacity = show ? '1' : '0';
                    label.style.transform = show ? 'translateY(0)' : 'translateY(-10px)';
                }
            }
        }
    });
}

function getDefaultIconUrl(poiType) {
    const basePath = '../../assets/icons/'; // Adjust if your icon path is different
    const icons = {
        attraction: `${basePath}attraction.png`, 
        viewpoint: `${basePath}viewpoint.png`,
        historical: `${basePath}historical.png`,
        religious: `${basePath}religious.png`,
        food: `${basePath}food.png`,
        transport: `${basePath}transport.png`,
        parking: `${basePath}parking.png`,
        amenities: `${basePath}amenities.png`,
    };
    return icons[poiType] || 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'; // Generic fallback
}


// --- Search and Filter ---
const POI_CATEGORIES = { 
    'attraction': { icon: 'fa-binoculars', nameKey: 'attraction' },
    'viewpoint': { icon: 'fa-mountain', nameKey: 'viewpoint' },
    'historical': { icon: 'fa-flag', nameKey: 'historical' }, // căn cứ cách mạng
    'religious': { icon: 'fa-dharmachakra', nameKey: 'religious' }, // Phật giáo
    'food': { icon: 'fa-utensils', nameKey: 'food' },
    'transport': { icon: 'fa-bus', nameKey: 'transport' },
    'parking': { icon: 'fa-parking', nameKey: 'parking' },
    'amenities': { icon: 'fa-concierge-bell', nameKey: 'amenities' }
};

function renderCategoryFilters() {
    if (!filterCategoriesContainer) return;
    filterCategoriesContainer.innerHTML = '';

    // Định nghĩa thứ tự ưu tiên
    const orderedKeys = [
        'religious', // Tâm linh
        'attraction', // Tham quan
        'historical', // Di tích
        'viewpoint', // Ngắm cảnh
        'food' // Ẩm thực
    ];
    // Các loại còn lại
    const otherKeys = Object.keys(POI_CATEGORIES).filter(k => !orderedKeys.includes(k));
    const finalOrder = [...orderedKeys, ...otherKeys];

    // Nút Tất cả
    const allBtn = document.createElement('button');
    allBtn.innerHTML = `<i class="fas fa-th-large mr-1.5 text-xs"></i> ${getUIText('allCategories')}`;
    allBtn.className = `flex items-center px-2.5 py-1.5 text-xs sm:text-sm rounded-full transition-colors duration-200 whitespace-nowrap ${!activeCategory ? 'bg-primary-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`;
    allBtn.onclick = () => { activeCategory = null; renderPoiMarkers(); renderCategoryFilters(); };
    filterCategoriesContainer.appendChild(allBtn);

    // Theo thứ tự mong muốn
    finalOrder.forEach(categoryKey => {
        const categoryInfo = POI_CATEGORIES[categoryKey];
        if (!categoryInfo) return;
        const btn = document.createElement('button');
        btn.innerHTML = `<i class="fas ${categoryInfo.icon} mr-1.5 text-xs"></i> ${getUIText(categoryInfo.nameKey)}`;
        btn.className = `flex items-center px-2.5 py-1.5 text-xs sm:text-sm rounded-full transition-colors duration-200 whitespace-nowrap ${activeCategory === categoryKey ? 'bg-primary-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`;
        btn.onclick = () => { activeCategory = categoryKey; renderPoiMarkers(); renderCategoryFilters(); };
        filterCategoriesContainer.appendChild(btn);
    });
}

function handleSearchInput() {
    if (!searchInputMain || !searchResultsDropdown) return;
    const searchTerm = searchInputMain.value.toLowerCase().trim();
    searchResultsDropdown.innerHTML = '';

    markerCluster.eachLayer(marker => {
        const element = marker.getElement();
        if (element) {
            element.classList.remove('highlight-search-result');
        }
    });

    if (!searchTerm) {
        // Show search history when input is empty
        const history = getSearchHistory();
        if (history.length > 0) {
            const historyHeader = document.createElement('div');
            historyHeader.className = 'p-2 bg-gray-50 text-xs font-medium text-gray-500 border-b';
            historyHeader.textContent = 'Lịch sử tìm kiếm';
            searchResultsDropdown.appendChild(historyHeader);

            history.forEach(term => {
                const item = document.createElement('div');
                item.className = 'p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800 flex items-center gap-2 border-b last:border-b-0';
                item.innerHTML = `<i class="fas fa-history text-gray-400"></i> <span class="truncate">${term}</span>`;
                item.onclick = () => {
                    searchInputMain.value = term;
                    handleSearchInput();
                };
                searchResultsDropdown.appendChild(item);
            });
        }
        searchResultsDropdown.style.display = 'block';
        return;
    }

    // Add to search history when user types
    addToSearchHistory(searchTerm);

    const matchedPOIs = poiData.filter(poi => {
        const nameVi = (poi.name || '').toLowerCase();
        const nameEn = (poi.name_en || '').toLowerCase();
        return nameVi.includes(searchTerm) || nameEn.includes(searchTerm);
    });

    if (matchedPOIs.length > 0) {
        matchedPOIs.slice(0, 7).forEach(poi => { 
            const item = document.createElement('div');
            item.className = 'p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800 flex items-center gap-2 border-b last:border-b-0';
            const iconUrl = poi.iconurl || getDefaultIconUrl(poi.type);
            item.innerHTML = `<img src="${iconUrl}" class="w-5 h-5 object-contain rounded-sm flex-shrink-0"> <span class="truncate">${getPoiName(poi)}</span>`;
            item.onclick = () => {
                currentPOI = poi;
                map.setView(poi.position, Math.max(map.getZoom(), LABEL_VISIBILITY_ZOOM + 1));
                showPOIInfoPanel(poi);
                searchResultsDropdown.style.display = 'none';
                searchInputMain.value = getPoiName(poi);
                markerCluster.eachLayer(marker => {
                    if (marker.poiData && marker.poiData.id === poi.id) {
                        const element = marker.getElement();
                        if (element) {
                            element.classList.add('highlight-search-result');
                        }
                    }
                });
                updateMarkerLabelsVisibility(); 
            };
            searchResultsDropdown.appendChild(item);
        });
        searchResultsDropdown.style.display = 'block';
    } else {
        const noResultsItem = document.createElement('div');
        noResultsItem.className = 'p-2 text-sm text-gray-500 text-center italic';
        noResultsItem.textContent = getUIText('noPOIFoundForSearch', searchInputMain.value);
        searchResultsDropdown.appendChild(noResultsItem);
        searchResultsDropdown.style.display = 'block';
    }
}

function showFeaturedPOIs() {
    if (!searchInputMain || !searchResultsDropdown) return;
    searchResultsDropdown.innerHTML = '';

    const featuredPOIs = poiData.filter(poi => poi.featured === true);
    
    if (featuredPOIs.length > 0) {
        const featuredHeader = document.createElement('div');
        featuredHeader.className = 'p-2 bg-gray-50 text-xs font-medium text-gray-500 border-b';
        featuredHeader.textContent = 'Điểm nổi bật';
        searchResultsDropdown.appendChild(featuredHeader);

        featuredPOIs.slice(0, 5).forEach(poi => {
            const item = document.createElement('div');
            item.className = 'p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800 flex items-center gap-2 border-b last:border-b-0';
            const iconUrl = poi.iconurl || getDefaultIconUrl(poi.type);
            item.innerHTML = `<img src="${iconUrl}" class="w-5 h-5 object-contain rounded-sm flex-shrink-0"> <span class="truncate">${getPoiName(poi)}</span>`;
            item.onclick = () => {
                currentPOI = poi;
                map.setView(poi.position, Math.max(map.getZoom(), LABEL_VISIBILITY_ZOOM + 1));
                showPOIInfoPanel(poi);
                searchResultsDropdown.style.display = 'none';
                searchInputMain.value = getPoiName(poi);
                markerCluster.eachLayer(marker => {
                    if (marker.poiData && marker.poiData.id === poi.id) {
                        const element = marker.getElement();
                        if (element) {
                            element.classList.add('highlight-search-result');
                        }
                    }
                });
                updateMarkerLabelsVisibility();
            };
            searchResultsDropdown.appendChild(item);
        });
        searchResultsDropdown.style.display = 'block';
    }
}


// --- POI Info Panel ---
function showPOIInfoPanel(poi) {
    if (!poiPanel || !poiPanelContent) return;
    const name = getPoiName(poi);
    const description = getPoiDescription(poi);
    const area = poi.area || 'N/A';
    const status = checkOperationalStatus(poi.id);
    const audioSrc = (currentLang === 'en' && poi.audio_url_en) ? poi.audio_url_en : poi.audio_url;

    let contentHTML = `
        <button id="close-poi-panel-btn" class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 z-10 rounded" aria-label="${getUIText('close')}">
            <i class="fas fa-times text-lg"></i>
        </button>
        <div class="relative max-h-[inherit] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">`;

    // Chỉ render phần khung ảnh nếu có poi.imageurl
    if (poi.imageurl) {
      contentHTML += `
        <div class="w-full h-[200px] sm:h-[280px] bg-gray-100 rounded-t-lg overflow-hidden flex items-center justify-center">
          <img src="${poi.imageurl}" alt="${name}" class="w-full h-full object-cover" />
        </div>
      `;
    }
    contentHTML += `
            <div class="p-3 sm:p-4">
                <h3 class="text-lg sm:text-xl font-bold mb-1 text-primary-600">${name}</h3>
                <p class="text-xs text-black mb-2">${getUIText('poiInfoArea')}: ${area}</p>`;
    if (status.message) {
        contentHTML += `<p class="poi-status text-xs sm:text-sm font-semibold mb-2 ${status.operational ? 'open text-green-600' : 'closed text-red-600'}">
                            <i class="fas ${status.operational ? 'fa-check-circle' : 'fa-times-circle'} mr-1"></i>
                            ${status.message}
                         </p>`;
    }
    contentHTML += `<p class="text-xs sm:text-sm text-black mb-3 leading-relaxed">${description || '&nbsp;'}</p>`;

    if (audioSrc && audioPlayer) {
        const isPlayingThisSrc = (!audioPlayer.paused && audioPlayer.currentSrc === audioSrc);
        const initialIconClass = isPlayingThisSrc ? 'fa-pause' : 'fa-play';
        contentHTML += `
            <button id="poi-info-audio-btn" data-src="${audioSrc}" class="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-3 rounded-md text-xs sm:text-sm transition duration-150 mb-3">
                <i class="fas ${initialIconClass} mr-1"></i> ${getUIText('audioNarrate')}
            </button>`;
    }

    contentHTML += `
                <div class="flex gap-2 text-xs sm:text-sm">
                    <button id="poi-info-route-from" class="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-md transition duration-150">
                        <i class="fas fa-map-marker-alt mr-1"></i> ${getUIText('routeFromHere')}
                    </button>
                    <button id="poi-info-route-to" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-md transition duration-150">
                        <i class="fas fa-flag-checkered mr-1"></i> ${getUIText('routeToHere')}
                    </button>
                </div>
            </div>
        </div>`;

    // Thêm min-height cho poiPanelContent
    poiPanelContent.innerHTML = `<div style="min-height:260px;">${contentHTML}</div>`;
    poiPanel.style.display = 'block';
    requestAnimationFrame(() => {
        poiPanel.classList.remove('translate-y-full', 'md:translate-x-full');
        poiPanel.classList.add('translate-y-0', 'md:translate-x-0');
    });

    document.getElementById('close-poi-panel-btn')?.addEventListener('click', hidePOIInfoPanel);
    document.getElementById('poi-info-audio-btn')?.addEventListener('click', handlePOIAudioPlay);
    document.getElementById('poi-info-route-from')?.addEventListener('click', () => handleRouteFromPOI(poi));
    document.getElementById('poi-info-route-to')?.addEventListener('click', () => handleRouteToPOI(poi));
}

function hidePOIInfoPanel() {
    if (!poiPanel) return;
    if (audioPlayer && !audioPlayer.paused) { 
        audioPlayer.pause();
        const audioBtn = document.getElementById('poi-info-audio-btn');
        if (audioBtn) audioBtn.querySelector('i')?.classList.replace('fa-pause', 'fa-play');
    }
    poiPanel.classList.add('translate-y-full', 'md:translate-x-full');
    poiPanel.classList.remove('translate-y-0', 'md:translate-x-0');
    setTimeout(() => {
        if (poiPanel.classList.contains('translate-y-full') || poiPanel.classList.contains('md:translate-x-full')) {
             poiPanel.style.display = 'none';
        }
    }, 300); 
    currentPOI = null;
}

function handlePOIAudioPlay(event) {
    const button = event.currentTarget;
    const audioSrc = button.dataset.src;
    const icon = button.querySelector('i');
    if (!audioPlayer || !audioSrc || !icon) return;

    if (audioPlayer.paused || audioPlayer.currentSrc !== audioSrc) {
        const currentlyPlayingBtn = document.querySelector('#info-panel button .fa-pause')?.closest('button[data-src]');
        if (currentlyPlayingBtn && currentlyPlayingBtn !== button) {
            currentlyPlayingBtn.querySelector('i')?.classList.replace('fa-pause', 'fa-play');
        }
        audioPlayer.src = audioSrc;
        audioPlayer.play().then(() => icon.classList.replace('fa-play', 'fa-pause')).catch(err => console.error("Audio play error:", err));
    } else {
        audioPlayer.pause();
    }
}
if (audioPlayer) {
    audioPlayer.addEventListener('pause', () => {
        const audioBtn = document.querySelector(`#info-panel button[data-src="${audioPlayer.currentSrc}"]`);
        audioBtn?.querySelector('i')?.classList.replace('fa-pause', 'fa-play');
    });
    audioPlayer.addEventListener('ended', () => {
        const audioBtn = document.querySelector(`#info-panel button[data-src="${audioPlayer.currentSrc}"]`);
        audioBtn?.querySelector('i')?.classList.replace('fa-pause', 'fa-play');
    });
}

function handleRouteFromPOI(poi) {
    if (!startInput || !routeInputsContainer) return;
    startPOI = poi;
    startInput.value = getPoiName(poi);
    if (startSuggestions) startSuggestions.style.display = 'none';
    if (userMarker && !endInput.value) {
        const userLocPoi = getPoi(USER_LOCATION_ID);
        if (userLocPoi) { endPOI = userLocPoi; endInput.value = getPoiName(userLocPoi); if(endSuggestions) endSuggestions.style.display = 'none';}
    }
    routeInputsContainer.classList.remove('hidden');
    routeInputsContainer.style.display = 'grid';
    endInput.focus();
    hidePOIInfoPanel();
    const topBar = document.querySelector('.top-bar');
    if (topBar) topBar.style.display = 'none';
}

function handleRouteToPOI(poi) {
    if (!endInput || !routeInputsContainer) return;
    endPOI = poi;
    endInput.value = getPoiName(poi);
    if (endSuggestions) endSuggestions.style.display = 'none';
    if (userMarker && !startInput.value) {
        const userLocPoi = getPoi(USER_LOCATION_ID);
        if (userLocPoi) { startPOI = userLocPoi; startInput.value = getPoiName(userLocPoi); if(startSuggestions) startSuggestions.style.display = 'none';}
    }
    routeInputsContainer.classList.remove('hidden');
    routeInputsContainer.style.display = 'grid';
    startInput.focus();
    hidePOIInfoPanel();
    const topBar = document.querySelector('.top-bar');
    if (topBar) topBar.style.display = 'none';
}

// --- Geolocation ---
function locateUser(setAsStart = false) {
    const lc = map.locateControl; // Access the locate control instance  
    if (lc) {
        if (setAsStart) {
            // Temporarily add a one-time event listener for location found
            const onLocationFound = (e) => {
                if (startInput) {
                    const userLatLng = e.latlng;
                    const userLocationPoi = {
                        id: USER_LOCATION_ID, name: getUIText('yourLocation'),
                        position: [userLatLng.lat, userLatLng.lng], type: 'user_location',
                        area: findAreaForLocation(userLatLng) || 'user_area'
                    };
                    startPOI = userLocationPoi;
                    startInput.value = getPoiName(userLocationPoi);
                    if (startSuggestions) startSuggestions.style.display = 'none';
                    endInput?.focus();

                    // Update or create userMarker
                    if (userMarker) {
                        userMarker.setLatLng(userLatLng).setPopupContent(getPoiName(userLocationPoi));
                    } else {
                        userMarker = L.marker(userLatLng, {
                            icon: L.divIcon({
                                className: 'user-location-marker',
                                html: '<div style="background:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.10);"><img src="../../assets/images/location.png" style="width:28px;height:28px;object-fit:contain;display:block;"></div>',
                                iconSize: [32, 32],
                                iconAnchor: [16, 32],
                                popupAnchor: [0, -28]
                            })
                        }).addTo(map).bindPopup(getPoiName(userLocationPoi));
                    }
                    if (userMarker) userMarker.openPopup();
                    // Thêm zoom/focus vào marker user
                    map.setView(userLatLng, 17, { animate: true });
                }
                map.off('locationfound', onLocationFound);
            };
            map.on('locationfound', onLocationFound);
        } else {
            const onLocationFound = (e) => {
                const userLatLng = e.latlng;
                const userLocationPoi = {
                    id: USER_LOCATION_ID, name: getUIText('yourLocation'),
                    position: [userLatLng.lat, userLatLng.lng], type: 'user_location',
                    area: findAreaForLocation(userLatLng) || 'user_area'
                };
                if (userMarker) {
                    userMarker.setLatLng(userLatLng).setPopupContent(getPoiName(userLocationPoi));
                } else {
                    userMarker = L.marker(userLatLng, {
                        icon: L.divIcon({
                            className: 'user-location-marker',
                            html: '<div style="background:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.10);"><img src="../../assets/images/location.png" style="width:28px;height:28px;object-fit:contain;display:block;"></div>',
                            iconSize: [32, 32],
                            iconAnchor: [16, 32],
                            popupAnchor: [0, -28]
                        })
                    }).addTo(map).bindPopup(getPoiName(userLocationPoi));
                }
                if (userMarker) userMarker.openPopup();
                // Thêm zoom/focus vào marker user
                map.setView(userLatLng, 17, { animate: true });
                map.off('locationfound', onLocationFound);
            };
            map.on('locationfound', onLocationFound);
        }
        lc.start();
    } else {
        map.locate({setView: true, maxZoom: 17});
        map.once('locationfound', (e) => {
            const userLatLng = e.latlng;
            const userLocationPoi = {
                id: USER_LOCATION_ID, name: getUIText('yourLocation'),
                position: [userLatLng.lat, userLatLng.lng], type: 'user_location',
                area: findAreaForLocation(userLatLng) || 'user_area'
            };
            if (userMarker) {
                userMarker.setLatLng(userLatLng).setPopupContent(getPoiName(userLocationPoi));
            } else {
                userMarker = L.marker(userLatLng, {
                    icon: L.divIcon({
                        className: 'user-location-marker',
                        html: '<div style="background:transparent;width:32px;height:32px;display:flex;align-items:center;justify-content:center;"><img src="../../assets/images/location.png" style="width:30px;height:30px;object-fit:contain;display:block;"></div>',
                        iconSize: [32, 32],
                        iconAnchor: [16, 32],
                        popupAnchor: [0, -28]
                    })
                }).addTo(map).bindPopup(getPoiName(userLocationPoi));
            }
            if (userMarker) userMarker.openPopup();
            // Thêm zoom/focus vào marker user
            map.setView(userLatLng, 17, { animate: true });
        });
    }
}

// --- Routing ---
function toggleRouteInputs() {
    if (!routeInputsContainer) return;
    const topBar = document.querySelector('.top-bar');
    const isRouteInputsHidden = routeInputsContainer.style.display === 'none' || routeInputsContainer.style.display === '';

    if (isRouteInputsHidden) {
        // Mở thanh tìm đường, ẩn top-bar
        routeInputsContainer.style.display = 'grid';
        if (topBar) topBar.classList.add('hidden');
        startInput?.focus();
    } else {
        // Đóng thanh tìm đường, hiện lại top-bar
        routeInputsContainer.style.display = 'none';
        if (topBar) {
           
            topBar.classList.remove('hidden');
            topBar.style.display = '';
        }
    }
}

function showRouteSuggestions(inputEl, suggestionsEl, term) {
    if (!suggestionsEl) return;
    suggestionsEl.innerHTML = '';
    if (!term) { suggestionsEl.style.display = 'none'; return; }
    const lowerTerm = term.toLowerCase();
    let suggestionCount = 0;

    if (userMarker && getUIText('yourLocation').toLowerCase().includes(lowerTerm)) {
        const item = document.createElement('div');
        item.className = 'p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800';
        item.textContent = getUIText('yourLocation');
        item.onclick = () => {
            inputEl.value = getUIText('yourLocation');
            suggestionsEl.style.display = 'none';
            const userLocPoi = getPoi(USER_LOCATION_ID); 
            if (inputEl === startInput) startPOI = userLocPoi; else if (inputEl === endInput) endPOI = userLocPoi;
        };
        suggestionsEl.appendChild(item);
        suggestionCount++;
    }

    // Ưu tiên POI có tên bắt đầu bằng từ khóa, sau đó mới đến các POI chứa từ khóa ở vị trí khác
    const matchedPOIs = poiData
        .filter(p => getPoiName(p).toLowerCase().includes(lowerTerm))
        .sort((a, b) => {
            const aName = getPoiName(a).toLowerCase();
            const bName = getPoiName(b).toLowerCase();
            const aStarts = aName.startsWith(lowerTerm);
            const bStarts = bName.startsWith(lowerTerm);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return aName.localeCompare(bName, 'vi');
        })
        .slice(0, 20 - suggestionCount); // Tối đa 20 gợi ý

    matchedPOIs.forEach(p => {
        const item = document.createElement('div');
        item.className = 'p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800';
        item.textContent = getPoiName(p);
        item.onclick = () => {
            inputEl.value = getPoiName(p);
            suggestionsEl.style.display = 'none';
            if (inputEl === startInput) startPOI = p; else if (inputEl === endInput) endPOI = p;
        };
        suggestionsEl.appendChild(item);
        suggestionCount++;
    });
    suggestionsEl.style.display = (suggestionCount > 0) ? 'block' : 'none';
}

function handleRouteInputBlur(inputEl, suggestionsEl, poiVarSetter) {
    setTimeout(() => { 
        if (suggestionsEl) suggestionsEl.style.display = 'none';
        const currentVal = inputEl.value;
        if (currentVal === getUIText('yourLocation')) {
            if (userMarker) poiVarSetter(getPoi(USER_LOCATION_ID)); else poiVarSetter(null);
        } else {
            const matchedPoi = poiData.find(p => getPoiName(p) === currentVal);
            poiVarSetter(matchedPoi || null);
        }
    }, 150);
}

function getPoiName(poi) {
    if (!poi) return '';
    
    if (poi.id === USER_LOCATION_ID) {
        return getUIText('yourLocation');
    }

    const name = currentLang === 'en' && poi.name_en 
        ? poi.name_en 
        : poi.name;

    return name || `POI ${poi.id}`;
}

function getPoiDescription(poi) {
    if (!poi) return '';
    
    const description = currentLang === 'en' && poi.description_en 
        ? poi.description_en 
        : poi.description;

    return description || '';
}

function getPoi(id) {
    if (!id) return null;
    
    const idStr = String(id);
    
    if (idStr === USER_LOCATION_ID) {
        // Try to get from startPOI or endPOI if they are user_location
        if (startPOI && startPOI.id === USER_LOCATION_ID) return startPOI;
        if (endPOI && endPOI.id === USER_LOCATION_ID) return endPOI;
        
        // If Leaflet Locate Control has found a location
        if (map && map.locateControl && map.locateControl._lastLocation) {
            const userLatLng = map.locateControl._lastLocation.latlng;
            return {
                id: USER_LOCATION_ID,
                name: getUIText('yourLocation'),
                position: [userLatLng.lat, userLatLng.lng],
                type: 'user_location',
                area: findAreaForLocation(userLatLng) || 'user_area',
                walkable_to: '',
                force_walkable_to: ''
            };
        }
        
        // Fallback if Leaflet control hasn't provided location yet, but we have a generic userMarker
        if (userMarker) {
            const userLatLng = userMarker.getLatLng();
            return {
                id: USER_LOCATION_ID,
                name: getUIText('yourLocation'),
                position: [userLatLng.lat, userLatLng.lng],
                type: 'user_location',
                area: findAreaForLocation(userLatLng) || 'user_area',
                walkable_to: '',
                force_walkable_to: ''
            };
        }
        return null;
    }

    const poi = poiData.find(p => String(p.id) === idStr);
    if (!poi) {
        console.warn(`POI with ID ${idStr} not found`);
        return null;
    }
    return poi;
}

function findAreaForLocation(latlng) { 
    let closestArea = null; let minDistance = MAX_DIST_AREAS + 1; 
    if (!poiData || poiData.length === 0) return 'unknown_area';
    for (const poi of poiData) {
        if (poi.area && poi.position) {
            const distance = L.latLng(latlng).distanceTo(L.latLng(poi.position[0], poi.position[1]));
            if (distance < MAX_DIST_AREAS && distance < minDistance) {
                minDistance = distance; closestArea = poi.area;
            }
        }
    }
    return closestArea || 'unknown_area';
}

// --- Language Switching ---
function switchLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('preferredLang', lang);
        updateUITextElements();
        renderPoiMarkers(); 
        renderCategoryFilters(); 
        if (currentPOI && poiPanel?.style.display !== 'none') { 
            showPOIInfoPanel(currentPOI);
        }
        if (routeInstructionsPanel && routeInstructionsPanel.style.display !== 'none' && currentRoutePolyline && startPOI && endPOI) {
            // Attempt to re-generate instructions with new language
            const pathIds = currentRoutePolyline.getLatLngs().map(latlng => {
                // This is a simplified way to get path IDs, might not be perfectly accurate
                // if POIs are very close. A better way is to store the path IDs from Dijkstra result.
                const foundPoi = poiData.find(p => p.position && p.position[0] === latlng.lat && p.position[1] === latlng.lng);
                return foundPoi ? foundPoi.id : null;
            }).filter(Boolean);

            if(pathIds.length > 1) {
                // Assuming currentDescentChoice is still relevant or default to 'cable_car'
                displayRouteInstructions(pathIds, currentDescentChoice);
            } else {
                 if(routeInstructionsPanel) routeInstructionsPanel.style.display = 'none';
            }
        } else if (routeInstructionsPanel) {
            routeInstructionsPanel.style.display = 'none';
        }
        // Update Leaflet Locate Control title
        const locateControl = map.locateControl; // Access the control if available
        if (locateControl && locateControl.setStrings) {
            locateControl.setStrings({ title: getUIText('locateMe') });
        }
    }
}

function updateUITextElements() {
    document.title = getUIText('mapTitle'); 
    const headerTitle = document.querySelector('header h1');
    if(headerTitle) headerTitle.textContent = getUIText('mapTitle');
    if(searchInputMain) searchInputMain.placeholder = getUIText('searchPlaceholder');
    if(startInput) startInput.placeholder = getUIText('routeStartPlaceholder');
    if(endInput) endInput.placeholder = getUIText('routeEndPlaceholder');
    if(findRouteButton) findRouteButton.innerHTML = `<i class="fas fa-directions mr-1.5"></i> ${getUIText('findRouteButton')}`;
    
    if(locateBtnDesktop) locateBtnDesktop.title = getUIText('locateMe');
    if(mapLayersBtnDesktop) mapLayersBtnDesktop.title = getUIText('mapLayers');
    if(fabLocate) fabLocate.title = getUIText('locateMe');
    if(fabSearch) fabSearch.title = getUIText('searchPlaceholder');
    if(fabDirections) fabDirections.title = getUIText('directions');
    if(directionsIconSearch) directionsIconSearch.setAttribute('aria-label', getUIText('directions'));

    if(tutorialPopup) tutorialPopup.querySelector('h4').textContent = getUIText('tutorialTitle');
    if(contactPopup) contactPopup.querySelector('h4').textContent = getUIText('contactTitle');
    const contactDetailsEl = document.getElementById('contact-details');
    if(contactDetailsEl) contactDetailsEl.innerHTML = getUIText('contactDetails');
    const callHotlineTextEl = document.getElementById('call-hotline-text');
    if(callHotlineTextEl) callHotlineTextEl.textContent = getUIText('callHotline');
    if(callHotlineBtn) callHotlineBtn.href = `tel:${CONTACT_HOTLINE}`; 

    const tutorialTexts = {
        'tutorial-text-search': 'tutorialSearch',
        'tutorial-text-directions': 'tutorialDirections',
        'tutorial-text-location': 'tutorialLocation',
        'tutorial-text-audio': 'tutorialAudio',
    };
    const tutorialIcons = {
        'tutorial-text-search': '<span class="icon-example mr-2 bg-gray-200 p-1 rounded"><i class="fas fa-search text-primary-500"></i></span>',
        'tutorial-text-directions': '<span class="icon-example mr-2 bg-gray-200 p-1 rounded"><i class="fas fa-route text-primary-500"></i></span>',
        'tutorial-text-location': '<span class="icon-example mr-2 bg-gray-200 p-1 rounded"><i class="fas fa-location-arrow text-primary-500"></i></span>',
        'tutorial-text-audio': '<span class="icon-example mr-2 bg-gray-200 p-1 rounded"><i class="fas fa-play text-yellow-500"></i></span>',
    };
    for (const id in tutorialTexts) {
        const el = document.getElementById(id);
        if (el) {
            const textContent = getUIText(tutorialTexts[id]);
            el.innerHTML = `${tutorialIcons[id] || ''} ${textContent}`;
        }
    }
    const langLabel = document.getElementById('language-switcher-label');
    if(langLabel) langLabel.textContent = getUIText('languageSwitcherLabel');

    if(langViBtn) { langViBtn.classList.toggle('bg-primary-500', currentLang === 'vi'); langViBtn.classList.toggle('text-white', currentLang === 'vi');}
    if(langEnBtn) { langEnBtn.classList.toggle('bg-primary-500', currentLang === 'en'); langEnBtn.classList.toggle('text-white', currentLang === 'en');}

    // Cập nhật popup descent-choice (chọn phương tiện xuống núi)
    const descentChoiceTitle = document.getElementById('descent-choice-title');
    if (descentChoiceTitle) descentChoiceTitle.textContent = getUIText('chooseDescentTitle');
    const cableBtn = document.getElementById('choice-cable-car');
    if (cableBtn) {
        const textSpan = cableBtn.querySelector('.descent-choice-cable-text');
        if (textSpan) textSpan.textContent = getUIText('cableCar');
    }
    const coasterBtn = document.getElementById('choice-alpine-coaster');
    if (coasterBtn) {
        const textSpan = coasterBtn.querySelector('.descent-choice-coaster-text');
        if (textSpan) textSpan.textContent = getUIText('alpineCoaster');
    }
}


// --- Event Listeners Setup ---
function setupEventListeners() {
    searchInputMain?.addEventListener('input', debounce(handleSearchInput, 300));
    searchInputMain?.addEventListener('focus', () => { 
        if (!searchInputMain.value.trim()) {
            showFeaturedPOIs();
        } else if (searchResultsDropdown) {
            searchResultsDropdown.style.display = 'block';
        }
    });

    // Desktop controls
    locateBtnDesktop?.addEventListener('click', () => {
        locateUser(false);
    }); 
    // mapLayersBtnDesktop?.addEventListener('click', () => alert(getUIText('mapLayers') + ' (chưa triển khai)'));
    zoomInBtnDesktop?.addEventListener('click', () => map.zoomIn());
    zoomOutBtnDesktop?.addEventListener('click', () => map.zoomOut());
    showTutorialButton?.addEventListener('click', () => { if(tutorialPopup) tutorialPopup.style.display = 'block'; if(popupBackdrop) popupBackdrop.style.display = 'block';});
    showContactButton?.addEventListener('click', () => { if(contactPopup) contactPopup.style.display = 'block'; if(popupBackdrop) popupBackdrop.style.display = 'block';});

    // Mobile FABs
    fabLocate?.addEventListener('click', () => locateUser(false));
    fabSearch?.addEventListener('click', function() {
        const searchInput = document.getElementById('search-input-main');
        const topBar = document.querySelector('.top-bar');
        const routeInputsContainer = document.getElementById('route-inputs');
        if (topBar) {
            topBar.classList.remove('hidden');
            topBar.style.display = '';
        }
        if (routeInputsContainer) {
            routeInputsContainer.style.display = 'none';
        }
        if (searchInput) {
            searchInput.focus();
        }
    });
    // fabLayers?.addEventListener('click', () => alert(getUIText('mapLayers') + ' (chưa triển khai)'));
    fabDirections?.addEventListener('click', toggleRouteInputs);
    directionsIconSearch?.addEventListener('click', toggleRouteInputs);
    fabTutorial?.addEventListener('click', () => { if(tutorialPopup) tutorialPopup.style.display = 'block'; if(popupBackdrop) popupBackdrop.style.display = 'block'; });

    // Route inputs
    startInput?.addEventListener('input', () => showRouteSuggestions(startInput, startSuggestions, startInput.value));
    endInput?.addEventListener('input', () => showRouteSuggestions(endInput, endSuggestions, endInput.value));
    startInput?.addEventListener('blur', () => handleRouteInputBlur(startInput, startSuggestions, (poi) => startPOI = poi));
    endInput?.addEventListener('blur', () => handleRouteInputBlur(endInput, endSuggestions, (poi) => endPOI = poi));
    findRouteButton?.addEventListener('click', findAndDisplayRoute);
    document.getElementById('close-route-inputs-btn')?.addEventListener('click', toggleRouteInputs);

    tutorialCloseBtn?.addEventListener('click', () => { if(tutorialPopup) tutorialPopup.style.display = 'none'; if(popupBackdrop) popupBackdrop.style.display = 'none'; localStorage.setItem('tutorialDismissed_map', 'true'); });
    contactCloseBtn?.addEventListener('click', () => { if(contactPopup) contactPopup.style.display = 'none'; if(popupBackdrop) popupBackdrop.style.display = 'none'; });
    popupBackdrop?.addEventListener('click', () => {
        if(tutorialPopup) tutorialPopup.style.display = 'none'; 
        if(contactPopup) contactPopup.style.display = 'none'; 
        if(descentChoicePopup) descentChoicePopup.style.display = 'none'; // Also hide descent popup
        if(popupBackdrop) popupBackdrop.style.display = 'none';
    });

    langViBtn?.addEventListener('click', () => switchLanguage('vi'));
    langEnBtn?.addEventListener('click', () => switchLanguage('en'));

    // Descent choice buttons (if they exist in HTML)
    if (choiceCableCarBtn) {
        choiceCableCarBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (descentChoicePopup) descentChoicePopup.style.display = 'none';
            if (popupBackdrop) popupBackdrop.style.display = 'none';
            findAndDisplayRouteWithChoice('cable_car');
        });
    }
    if (choiceAlpineCoasterBtn) {
        choiceAlpineCoasterBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (descentChoicePopup) descentChoicePopup.style.display = 'none';
            if (popupBackdrop) popupBackdrop.style.display = 'none';
            findAndDisplayRouteWithChoice('alpine_coaster');
        });
    }
}

// --- Operational Status Check (from user's code) ---
function checkOperationalStatus(poiId, currentTime = new Date()) {
    const poi = getPoi(poiId);
    const t = getUIText; // Use as a function

    if (!poi || (!['transport', 'attraction', 'food', 'amenities'].includes(poi.type) && String(poi.id) !== '4')) {
        return { operational: true, message: '' };
    }
    if (!poi.operatingHours && !poi.closedDates) {
        if (poi.type === 'transport') return { operational: false, message: t('statusMissingData') };
        return { operational: true, message: '' };
    }

    const currentYear = currentTime.getFullYear(), currentMonth = currentTime.getMonth(), currentDate = currentTime.getDate();
    const currentDayOfWeek = currentTime.getDay(), currentHour = currentTime.getHours(), currentMinute = currentTime.getMinutes();
    const currentDayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;

    if (poi.closedDates) {
        const closedPeriods = String(poi.closedDates).split(',').map(d => d.trim()).filter(d => d);
        for (const period of closedPeriods) {
            if (period.includes('/')) {
                const [startStr, endStr] = period.split('/');
                if (startStr && endStr && /^\d{4}-\d{2}-\d{2}$/.test(startStr) && /^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
                    if (currentDayStr >= startStr && currentDayStr <= endStr) {
                        const msgKey = poi.statusMessage?.[currentLang] || poi.statusMessage?.vi || 'statusClosedUntil';
                        return { operational: false, message: t(msgKey, endStr) };
                    }
                }
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(period) && period === currentDayStr) {
                const msgKey = poi.statusMessage?.[currentLang] || poi.statusMessage?.vi || 'statusClosedToday';
                return { operational: false, message: t(msgKey) };
            }
        }
    }

    if (poi.operatingHours) {
        try {
            let hoursData = poi.operatingHours;
            if (typeof hoursData === 'string') hoursData = JSON.parse(hoursData);
            if (typeof hoursData !== 'object' || hoursData === null) return { operational: false, message: t('statusErrorData') };

            const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
            let timeString = hoursData[dayKeys[currentDayOfWeek]] ?? hoursData['default'] ?? hoursData['monfri']; // Added monfri as potential key

            if (timeString === undefined) return { operational: false, message: t('statusNoSchedule') };
            if (String(timeString).toLowerCase() === "closed") {
                 const msgKey = poi.statusMessage?.[currentLang] || poi.statusMessage?.vi || 'statusClosedToday';
                 return { operational: false, message: t(msgKey) };
            }

            const timeParts = String(timeString).match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
            if (timeParts) {
                const startHour = parseInt(timeParts[1]), startMinute = parseInt(timeParts[2]);
                const endHour = parseInt(timeParts[3]), endMinute = parseInt(timeParts[4]);
                const currentTimeInMinutes = currentHour * 60 + currentMinute;
                const startTimeInMinutes = startHour * 60 + startMinute;
                const endTimeInMinutes = endHour * 60 + endMinute;
                const endFormatted = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
                const startFormatted = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

                if (endTimeInMinutes < startTimeInMinutes) { // Overnight
                    if (currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes) return { operational: true, message: t('statusOperational', endFormatted) };
                    return { operational: false, message: t('statusNotOpenYet', startFormatted) };
                } else { // Same day
                    if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes) return { operational: true, message: t('statusOperational', endFormatted) };
                    return { operational: false, message: (currentTimeInMinutes < startTimeInMinutes ? t('statusNotOpenYet', startFormatted) : t('statusAlreadyClosed', endFormatted)) };
                }
            } else { return { operational: false, message: t('statusErrorFormat') }; }
        } catch (e) { console.error("Error parsing operatingHours:", e, poi.operatingHours); return { operational: false, message: t('statusErrorData') }; }
    }
    return { operational: true, message: '' };
}


// --- Route Finding Functions ---

// Helper function to check if two POIs are in the same area
function areInSameArea(poi1, poi2) {
    if (!poi1?.position || !poi2?.position) return false;
    // Check if both POIs have a defined area and they are the same
    if (poi1.area && poi2.area && poi1.area === poi2.area && String(poi1.area).trim() !== '') return true;
    
    // If one POI is user location and the other has an area, check distance
    const dist = calculateDistance(poi1.position, poi2.position);
    if (poi1.id === USER_LOCATION_ID && poi2.area && String(poi2.area).trim() !== '' && dist < MAX_DIST_AREAS) return true;
    if (poi2.id === USER_LOCATION_ID && poi1.area && String(poi1.area).trim() !== '' && dist < MAX_DIST_AREAS) return true;
    
    // Fallback: if areas are not defined but they are very close, consider them in the same "implicit" area for walking
    if (!poi1.area && !poi2.area && dist < MAX_DIST_AREAS / 2) return true;

    return false;
}

// Helper function to check if two stations are on the same cable route
function areOnSameCableRoute(station1, station2) {
    if (!station1?.cable_route || !station2?.cable_route || station1.type !== 'transport' || station2.type !== 'transport') return false;
    const routes1 = String(station1.cable_route).split(',').map(r => r.trim()).filter(r => r);
    const routes2 = String(station2.cable_route).split(',').map(r => r.trim()).filter(r => r);
    return routes1.length > 0 && routes2.length > 0 && routes1.some(route => routes2.includes(route));
}

// Helper function to check if a station is on a specific route
function isStationOnSpecificRoute(station1, station2, targetRouteName) {
    if (!station1 || !station2 || !targetRouteName) return false;
    if (station1.type !== 'transport' || station2.type !== 'transport') return false;

    const routes1 = String(station1.cable_route || '').split(',').map(r => r.trim()).filter(r => r);
    const routes2 = String(station2.cable_route || '').split(',').map(r => r.trim()).filter(r => r);

    return routes1.includes(targetRouteName) && routes2.includes(targetRouteName);
}

// MinPriorityQueue implementation for Dijkstra's algorithm
class MinPriorityQueue {
    constructor() {
        this.elements = [];
    }
    enqueue(element, priority) {
        this.elements.push({ element, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }
    dequeue() {
        if (this.isEmpty()) return null;
        return this.elements.shift();
    }
    isEmpty() {
        return this.elements.length === 0;
    }
}

// Cost function for Dijkstra's algorithm
function getSegmentCost(poi1, poi2, segmentType, pathSoFar, options = {}) {
    let cost = 0;
    const previousPoiId = pathSoFar.length > 1 ? pathSoFar[pathSoFar.length - 2] : null;
    const previousPoi = previousPoiId ? getPoi(previousPoiId) : null;

    switch (segmentType) {
        case 'walk_explicit':
        case 'walk_implicit':
            cost = COST_WALK_BASE;
            const dist = calculateDistance(poi1.position, poi2.position);
            if (isFinite(dist)) {
                cost += dist * COST_WALK_DISTANCE_FACTOR;
            }
            if (previousPoi && previousPoi.type === 'transport' && poi1.type !== 'transport') {
                cost += COST_TRANSFER_PENALTY_CABLE_TO_WALK;
            } else if (previousPoi && previousPoi.type === 'transport' && poi1.type === 'transport' && !areOnSameCableRoute(previousPoi, poi1)) {
                cost += COST_TRANSFER_BETWEEN_CABLES;
            }
            break;
        case 'transport_preferred':
            cost = COST_CABLE_CAR_BASE + COST_CABLE_CAR_PREFERRED_BONUS;
            if (previousPoi && previousPoi.type !== 'transport') {
                cost += COST_TRANSFER_PENALTY_WALK_TO_CABLE;
            }
            break;
        case 'transport_fallback':
            cost = COST_CABLE_CAR_BASE + COST_CABLE_CAR_FALLBACK_PENALTY;
            if (previousPoi && previousPoi.type !== 'transport') {
                cost += COST_TRANSFER_PENALTY_WALK_TO_CABLE;
            }
            break;
        case 'transport_standard':
        default:
            cost = COST_CABLE_CAR_BASE;
            if (previousPoi && previousPoi.type !== 'transport') {
                cost += COST_TRANSFER_PENALTY_WALK_TO_CABLE;
            }
            break;
    }
    return Math.max(0.1, cost);
}

// Main Dijkstra pathfinding implementation
function findPathDijkstraInternal(startId, endId, allPoiData, options) {
    const distances = {};
    const previousNodes = {};
    const pq = new MinPriorityQueue();

    allPoiData.forEach(poi => {
        distances[String(poi.id)] = Infinity;
        previousNodes[String(poi.id)] = null;
    });
    distances[String(startId)] = 0;
    pq.enqueue(String(startId), 0);

    const startTime = performance.now();
    const now = new Date();

    while (!pq.isEmpty()) {
        const { element: currentIdStr, priority: currentDistance } = pq.dequeue();

        if (currentDistance > distances[currentIdStr]) {
            continue;
        }
        
        let pathSoFarToCurrent = [];
        let tempPrev = currentIdStr;
        while(tempPrev && previousNodes[tempPrev]) {
            pathSoFarToCurrent.unshift(tempPrev);
            tempPrev = previousNodes[tempPrev];
        }
        if(tempPrev || currentIdStr === String(startId)) {
            pathSoFarToCurrent.unshift(tempPrev || currentIdStr);
        }

        if (currentIdStr === String(endId)) {
            const path = [];
            let curr = String(endId);
            while (curr) {
                path.unshift(curr);
                curr = previousNodes[curr];
                if (path.length > allPoiData.length + 5) {
                    console.error("Error reconstructing path for Dijkstra, possible cycle or error in previousNodes.");
                    return null;
                }
            }
            const finalCableRoutes = calculateCableRoutesForPath(path, allPoiData);
            return { path: path, cableRoutes: finalCableRoutes, cost: distances[String(endId)] };
        }

        let currentPOIObject = getPoi(currentIdStr);
        if (!currentPOIObject?.position) continue;
        if (currentIdStr === USER_LOCATION_ID && !currentPOIObject.area && currentPOIObject.position) {
            currentPOIObject = { ...currentPOIObject, area: findAreaForLocation(currentPOIObject.position) || `${USER_LOCATION_ID}_area_internal` };
        }

        const potentialNeighborsWithType = [];
        const walkableToString = String(currentPOIObject.walkable_to || '').trim();
        const forceWalkableToString = String(currentPOIObject.force_walkable_to || '').trim();
        let hasExplicitWalkLinks = false;

        if (walkableToString || forceWalkableToString) {
            hasExplicitWalkLinks = true;
            (walkableToString + "," + forceWalkableToString).split(',').map(id => String(id).trim()).filter(id => id)
                .forEach(neighborId => {
                    const nPoi = getPoi(neighborId);
                    if (nPoi?.position) {
                        if (options.mode === 'stay_in_area' && nPoi.area !== options.areaConstraint) return;
                        potentialNeighborsWithType.push({ id: neighborId, type: 'walk_explicit', fromPoi: currentPOIObject, toPoi: nPoi });
                    }
                });
        }

        if (!hasExplicitWalkLinks) {
            for (const p of allPoiData) {
                const pId = String(p.id);
                if (pId !== currentIdStr && p.position) {
                    const dist = calculateDistance(currentPOIObject.position, p.position);
                    if (dist < WALKING_THRESHOLD_PATH && areInSameArea(currentPOIObject, p)) {
                        let pActualArea = p.area || (String(p.id) === USER_LOCATION_ID && p.position ? findAreaForLocation(p.position) : null);
                        if (options.mode === 'stay_in_area' && pActualArea !== options.areaConstraint) continue;
                        potentialNeighborsWithType.push({ id: pId, type: 'walk_implicit', fromPoi: currentPOIObject, toPoi: p });
                    }
                }
            }
        }

        if (currentPOIObject.type === 'transport') {
            const currentStatus = checkOperationalStatus(currentIdStr, now);
            if (currentStatus.operational) {
                let transportNeighborsOnPreferred = [];
                let transportNeighborsOnFallback = [];
                let transportNeighborsStandard = [];
                for (const otherTransportPOI of allPoiData) {
                    const otherTransportId = String(otherTransportPOI.id);
                    if (otherTransportPOI.type === 'transport' && otherTransportId !== currentIdStr) {
                        // Lấy các tuyến chung
                        const routes1 = String(currentPOIObject.cable_route || '').split(',').map(r => r.trim()).filter(r => r);
                        const routes2 = String(otherTransportPOI.cable_route || '').split(',').map(r => r.trim()).filter(r => r);
                        const commonRoutes = routes1.filter(r => routes2.includes(r));
                        for (const route of commonRoutes) {
                            // Chỉ thêm nếu tuyến này còn hoạt động
                            if (isCableRouteOperational(route, currentPOIObject, otherTransportPOI)) {
                                if (options.mode === 'standard') {
                                    if (options.preferredCableRouteName && route === options.preferredCableRouteName) {
                                        transportNeighborsOnPreferred.push({ id: otherTransportId, type: 'transport_preferred', fromPoi: currentPOIObject, toPoi: otherTransportPOI });
                                    } else if (options.fallbackCableRouteName && route === options.fallbackCableRouteName) {
                                        transportNeighborsOnFallback.push({ id: otherTransportId, type: 'transport_fallback', fromPoi: currentPOIObject, toPoi: otherTransportPOI });
                                    } else {
                                        transportNeighborsStandard.push({ id: otherTransportId, type: 'transport_standard', fromPoi: currentPOIObject, toPoi: otherTransportPOI });
                                    }
                                } else {
                                    let destStationArea = otherTransportPOI.area || (String(otherTransportPOI.id) === USER_LOCATION_ID && otherTransportPOI.position ? findAreaForLocation(otherTransportPOI.position) : null);
                                    if (currentPOIObject.area === options.areaConstraint && destStationArea === options.areaConstraint) {
                                        transportNeighborsStandard.push({ id: otherTransportId, type: 'transport_standard', fromPoi: currentPOIObject, toPoi: otherTransportPOI });
                                    }
                                }
                            }
                        }
                    }
                }
                if (transportNeighborsOnPreferred.length > 0) potentialNeighborsWithType.push(...transportNeighborsOnPreferred);
                else if (transportNeighborsOnFallback.length > 0) potentialNeighborsWithType.push(...transportNeighborsOnFallback);
                else potentialNeighborsWithType.push(...transportNeighborsStandard);
            }
        }

        potentialNeighborsWithType.sort((a,b) => {
            const priority = {'walk_explicit': 1, 'transport_preferred': 2, 'transport_fallback': 3, 'walk_implicit': 4, 'transport_standard': 5 };
            return (priority[a.type] || 99) - (priority[b.type] || 99);
        });

        for (const neighborDetail of potentialNeighborsWithType) {
            const neighborId = neighborDetail.id;
            const segmentCost = getSegmentCost(neighborDetail.fromPoi, neighborDetail.toPoi, neighborDetail.type, pathSoFarToCurrent, options);
            const newDistToNeighbor = distances[currentIdStr] + segmentCost;

            if (newDistToNeighbor < distances[neighborId]) {
                distances[neighborId] = newDistToNeighbor;
                previousNodes[neighborId] = currentIdStr;
                pq.enqueue(neighborId, newDistToNeighbor);
            }
        }

        if (performance.now() - startTime > 15000) {
            console.error(`Dijkstra timeout (mode: ${options.mode}, start: ${startId}, end: ${endId}, current: ${currentIdStr})`);
            return { timedOut: true };
        }
    }
    return null;
}

// Main pathfinding wrapper function
function findPath(startId, endId, allPoiData) {
    const t = translations[currentLang];
    const startNodeObject = getPoi(startId);
    const endNodeObject = getPoi(endId);

    if (!startNodeObject || !startNodeObject.position) {
        console.error(`Start POI ${startId} not found or has no position.`);
        alert(t.routeErrorStartNotFound(getPoiName(startNodeObject)));
        return null;
    }
    if (!endNodeObject || !endNodeObject.position) {
        console.error(`End POI ${endId} not found or has no position.`);
        alert(t.routeErrorEndNotFound(getPoiName(endNodeObject)));
        return null;
    }

    const startArea = startNodeObject.area;
    const endArea = endNodeObject.area;

    if (startArea && endArea && startArea === endArea && String(startArea).trim() !== '') {
        let resultStayInArea = findPathDijkstraInternal(startId, endId, allPoiData, {
            mode: 'stay_in_area',
            areaConstraint: startArea
        });
        if (resultStayInArea) {
            if (resultStayInArea.timedOut) {
                alert(t.routeErrorPathTimeout);
                return null;
            }
            return resultStayInArea;
        }
    }

    let pathOptionsStandard = { mode: 'standard' };

    if (startArea === 'Đỉnh núi' && endArea === 'Chùa Bà') {
        pathOptionsStandard.preferredCableRouteName = CABLE_ROUTE_NAME_TAM_AN;
        pathOptionsStandard.fallbackCableRouteName = CABLE_ROUTE_NAME_VAN_SON;
    } else if (startArea === 'Chùa Bà' && endArea === 'Chân núi') {
        pathOptionsStandard.preferredCableRouteName = CABLE_ROUTE_NAME_CHUA_HANG;
        pathOptionsStandard.fallbackCableRouteName = CABLE_ROUTE_NAME_TAM_AN;
    } else if (startArea === 'Chùa Bà' && endArea === 'Đỉnh núi') {
        pathOptionsStandard.preferredCableRouteName = CABLE_ROUTE_NAME_TAM_AN;
        pathOptionsStandard.fallbackCableRouteName = CABLE_ROUTE_NAME_CHUA_HANG;
    } else if (startArea === 'Chân núi' && endArea === 'Chùa Bà') {
        pathOptionsStandard.preferredCableRouteName = CABLE_ROUTE_NAME_CHUA_HANG;
        pathOptionsStandard.fallbackCableRouteName = CABLE_ROUTE_NAME_VAN_SON;
    } else if (startArea === 'Chân núi' && endArea === 'Đỉnh núi') {
        pathOptionsStandard.preferredCableRouteName = CABLE_ROUTE_NAME_VAN_SON;
        pathOptionsStandard.fallbackCableRouteName = CABLE_ROUTE_NAME_CHUA_HANG;
    } else if (startArea === 'Đỉnh núi' && endArea === 'Chân núi') {
        pathOptionsStandard.preferredCableRouteName = CABLE_ROUTE_NAME_VAN_SON;
        pathOptionsStandard.fallbackCableRouteName = CABLE_ROUTE_NAME_TAM_AN;
    }
    
    let resultStandard = findPathDijkstraInternal(startId, endId, allPoiData, pathOptionsStandard);
    if (resultStandard) {
        if (resultStandard.timedOut) {
            alert(t.routeErrorPathTimeout);
            return null;
        }
        return resultStandard;
    }
    
    return null;
}

// Function to calculate cable routes used in a path
function calculateCableRoutesForPath(path, allPoiData) {
    const cableRoutesUsed = new Set();
    if (!path || path.length < 2) return [];
    
    for (let i = 0; i < path.length - 1; i++) {
        const startP = getPoi(String(path[i]));
        const endP = getPoi(String(path[i + 1]));
        if (startP?.type === 'transport' && endP?.type === 'transport' && areOnSameCableRoute(startP, endP)) {
            const startRoutes = String(startP.cable_route || '').split(',').map(r => r.trim()).filter(r => r);
            const endRoutes = String(endP.cable_route || '').split(',').map(r => r.trim()).filter(r => r);
            const commonRoute = startRoutes.find(r => endRoutes.includes(r));
            if (commonRoute) cableRoutesUsed.add(commonRoute);
        }
    }
    return Array.from(cableRoutesUsed);
}

// --- Initial Setup ---
function initializeMapApplication() {
    cacheDOMElements();
    initializeMap();
    loadPoiData();
    setupEventListeners();
    // Apply saved language
    const savedLang = localStorage.getItem('preferredLang');
    if (savedLang && translations[savedLang]) {
        currentLang = savedLang;
        updateUITextElements();
    }
    // Đảm bảo KHÔNG hiển thị tutorial ở đây!
}

document.addEventListener('DOMContentLoaded', () => {
    // Hiển thị tutorial nếu chưa từng xem, ngay khi vào trang
    if (!localStorage.getItem('tutorialDismissed_map')) {
        const tutorialPopup = document.getElementById('tutorial-popup');
        const popupBackdrop = document.getElementById('popup-backdrop');
        if (tutorialPopup) tutorialPopup.style.display = 'block';
        if (popupBackdrop) popupBackdrop.style.display = 'block';
    }
    initializeMapApplication();
    // Xử lý nút đóng popup hướng dẫn
    const tutorialCloseBtn = document.getElementById('tutorial-close-btn');
    if (tutorialCloseBtn) {
        tutorialCloseBtn.addEventListener('click', () => {
            localStorage.setItem('tutorialDismissed_map', 'true');
            const tutorialPopup = document.getElementById('tutorial-popup');
            const popupBackdrop = document.getElementById('popup-backdrop');
            if (tutorialPopup) tutorialPopup.style.display = 'none';
            if (popupBackdrop) popupBackdrop.style.display = 'none';
        });
    }
});

// --- Cable Station Operational Check (from user's code) ---
function checkCableStationsOperational() {
    const now = new Date();
    const chuaHangStatus = checkOperationalStatus(CABLE_STATION_CHUA_HANG_ID, now); // Use defined const
    const hoaDongStatus = checkOperationalStatus(CABLE_STATION_HOA_DONG_ID, now);   // Use defined const
    const coasterStatus = checkOperationalStatus(COASTER_START_ID, now);       // Use defined const

    return {
        chuaHangOperational: chuaHangStatus.operational,
        hoaDongOperational: hoaDongStatus.operational,
        coasterOperational: coasterStatus.operational,
        chuaHangMessage: chuaHangStatus.message,
        hoaDongMessage: hoaDongStatus.message,
        coasterMessage: coasterStatus.message
    };
}

// Function to handle descent choice selection
function handleDescentChoice(choice, routeResult, source) {
    
    if (!routeResult) {
        console.warn('No route result provided to handleDescentChoice');
        return;
    }
    
    currentDescentChoice = choice;
    currentRouteResult = routeResult;
    descentChoiceMade = true;
     // Clear previous route
    if (currentRoutePolyline) {
        map.removeLayer(currentRoutePolyline);
        currentRoutePolyline = null;
    }
    currentRouteHighlightLines.forEach(line => map.removeLayer(line));
    currentRouteHighlightLines = [];

    // Convert path to coordinates
    const coordinates = routeResult.path.map(id => {
        const poi = getPoi(id);
        return poi ? L.latLng(poi.position[0], poi.position[1]) : null;
    }).filter(Boolean);
    if (coordinates.length < 2) {
        console.error('Invalid route coordinates - less than 2 points');
        alert(getUIText('routeNotFound'));
        return;
    }

    // Draw route
    currentRoutePolyline = L.polyline(coordinates, {
        color: '#22c55e', // xanh lá cây nổi bật
        weight: 4,
        opacity: 0.8,
        lineJoin: 'round'
    }).addTo(map);

    // Fit map to show entire route
    const bounds = currentRoutePolyline.getBounds();
    map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 17
    });

    // Display route instructions
    displayRouteInstructions(routeResult.path, choice);
}

// Thêm hàm helper gom logic kiểm tra trạng thái các tuyến khi xuống núi từ Chùa Bà
function checkDescentOptionsFromChuaBa() {
    const cableStatus = checkCableStationsOperational();
    const chuaHangActive = cableStatus.chuaHangOperational;
    const hoaDongActive = cableStatus.hoaDongOperational;
    const coasterActive = cableStatus.coasterOperational;
    const anyCableOperational = chuaHangActive || hoaDongActive;
    return {
        allClosed: !chuaHangActive && !hoaDongActive && !coasterActive,
        bothCableAndCoaster: anyCableOperational && coasterActive,
        onlyCoaster: !anyCableOperational && coasterActive,
        onlyCable: anyCableOperational && !coasterActive,
        popupAvailable: anyCableOperational && coasterActive,
        chuaHangActive,
        hoaDongActive,
        coasterActive
    };
}

// Sửa lại findAndDisplayRoute
async function findAndDisplayRoute() {
    if (!startPOI || !endPOI) {
        if (!startPOI) alert(getUIText('routeErrorSelectStart'));
        if (!endPOI) alert(getUIText('routeErrorSelectEnd'));
        return;
    }
    if (startPOI.id === endPOI.id) {
        alert(getUIText('routeErrorSamePoint'));
        return;
    }
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    if (loadingText) loadingText.textContent = getUIText('calculatingRoute');
    try {
        if (startPOI.area === 'Chùa Bà' && endPOI.area === 'Chân núi') {
            const descentOptions = checkDescentOptionsFromChuaBa();
            if (descentOptions.allClosed) {
                alert(getUIText('routeErrorBothClosed'));
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                return;
            }
            if (descentOptions.popupAvailable && descentChoicePopup && choiceCableCarBtn && choiceAlpineCoasterBtn) {
                descentChoicePopup.style.display = 'block';
                if (popupBackdrop) popupBackdrop.style.display = 'block';
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                return;
            }
            if (descentOptions.onlyCoaster) {
                findAndDisplayRouteWithChoice('alpine_coaster', descentOptions);
                return;
            }
            if (descentOptions.onlyCable) {
                findAndDisplayRouteWithChoice('cable_car', descentOptions);
                return;
            }
        }
        // ... existing code tìm đường thông thường ...
        if (currentRoutePolyline) {
            map.removeLayer(currentRoutePolyline);
            currentRoutePolyline = null;
        }
        currentRouteHighlightLines.forEach(line => map.removeLayer(line));
        currentRouteHighlightLines = [];
        const pathResult = findPath(startPOI.id, endPOI.id, poiData);
        if (!pathResult || !pathResult.path || pathResult.path.length < 2) {
            suggestGoogleMapsDirections(startPOI, endPOI);
            return;
        }
        const coordinates = pathResult.path.map(id => {
            const poi = getPoi(id);
            return poi ? L.latLng(poi.position[0], poi.position[1]) : null;
        }).filter(Boolean);
        if (coordinates.length < 2) {
            alert(getUIText('routeNotFound'));
            return;
        }
        currentRoutePolyline = L.polyline(coordinates, {
            color: '#22c55e',
            weight: 4,
            opacity: 0.8,
            lineJoin: 'round'
        }).addTo(map);
        map.fitBounds(currentRoutePolyline.getBounds(), {
            padding: [50, 50],
            maxZoom: 17
        });
        displayRouteInstructions(pathResult.path, currentDescentChoice);
    } catch (error) {
        console.error('Error finding route:', error);
        alert(getUIText('routeErrorGeneric'));
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

// Sửa lại findAndDisplayRouteWithChoice để nhận descentOptions (nếu có)
async function findAndDisplayRouteWithChoice(choice, descentOptions) {
    let pathOptionsStandard = { mode: 'standard' };
    // Nếu không truyền descentOptions thì tự kiểm tra lại
    if (!descentOptions && startPOI.area === 'Chùa Bà' && endPOI.area === 'Chân núi') {
        descentOptions = checkDescentOptionsFromChuaBa();
    }
    if (startPOI.area === 'Chùa Bà' && endPOI.area === 'Chân núi') {
        if (choice === 'cable_car') {
            if (descentOptions && descentOptions.chuaHangActive) {
                const pathToChuaHang = findPathDijkstraInternal(startPOI.id, CABLE_STATION_CHUA_HANG_ID, poiData, { ...pathOptionsStandard, forbidCable: true });
                const pathFromChuaHang = findPathDijkstraInternal(CABLE_STATION_CHUA_HANG_ID, endPOI.id, poiData, { ...pathOptionsStandard, preferredCableRouteName: CABLE_ROUTE_NAME_CHUA_HANG });
                if (pathToChuaHang && pathFromChuaHang && pathToChuaHang.path && pathFromChuaHang.path) {
                    const fullPath = [
                        ...pathToChuaHang.path,
                        ...(pathToChuaHang.path[pathToChuaHang.path.length - 1] === CABLE_STATION_CHUA_HANG_ID ? [] : [CABLE_STATION_CHUA_HANG_ID]),
                        ...pathFromChuaHang.path.slice(1)
                    ];
                    handleDescentChoice(choice, { path: fullPath }, 'findAndDisplayRouteWithChoice');
                    return;
                } else {
                    pathOptionsStandard.preferredCableRouteName = CABLE_ROUTE_NAME_CHUA_HANG;
                }
            } else if (descentOptions && descentOptions.hoaDongActive) {
                pathOptionsStandard.preferredCableRouteName = CABLE_ROUTE_NAME_VAN_SON;
            }
        }
    }
    if (choice === 'alpine_coaster') {
        const pathToCoaster = findPathDijkstraInternal(startPOI.id, COASTER_START_ID, poiData, { ...pathOptionsStandard, forbidCable: true });
        const pathFromCoaster = findPathDijkstraInternal(COASTER_END_ID, endPOI.id, poiData, { ...pathOptionsStandard, forbidCable: true });
        if (!pathToCoaster || !pathToCoaster.path || pathToCoaster.path.length < 2 ||
            !pathFromCoaster || !pathFromCoaster.path || pathFromCoaster.path.length < 2) {
            suggestGoogleMapsDirections(startPOI, endPOI);
            return;
        }
        const fullPath = [
            ...pathToCoaster.path,
            ...(pathToCoaster.path[pathToCoaster.path.length - 1] === COASTER_START_ID ? [] : [COASTER_START_ID]),
            COASTER_END_ID,
            ...pathFromCoaster.path.slice(1)
        ];
        handleDescentChoice(choice, { path: fullPath }, 'findAndDisplayRouteWithChoice');
        return;
    }
    if (currentRoutePolyline) {
        map.removeLayer(currentRoutePolyline);
        currentRoutePolyline = null;
    }
    currentRouteHighlightLines.forEach(line => map.removeLayer(line));
    currentRouteHighlightLines = [];
    const pathResult = findPathDijkstraInternal(startPOI.id, endPOI.id, poiData, pathOptionsStandard);
    if (!pathResult || !pathResult.path || pathResult.path.length < 2) {
        suggestGoogleMapsDirections(startPOI, endPOI);
        return;
    }
    handleDescentChoice(choice, pathResult, 'findAndDisplayRouteWithChoice');
}

function displayRouteInstructions(path, descentChoice) {
    if (!routeInstructionsPanel) return;
    const instructions = [];
    let currentTransport = null;
    let currentRoute = null;
    let lastPOI = null;
    let walkingStart = null;
    let walkingEnd = null;

    for (let i = 0; i < path.length - 1; i++) {
        const currentPOI = getPoi(path[i]);
        const nextPOI = getPoi(path[i + 1]);
        if (!currentPOI || !nextPOI) continue;

        // Kiểm tra chuyển tuyến cáp cùng khu vực
        const isTransferWalk = currentPOI.type === 'transport' && nextPOI.type === 'transport' && areInSameArea(currentPOI, nextPOI);
        const isCableCar = currentPOI.type === 'transport' && nextPOI.type === 'transport' && !areInSameArea(currentPOI, nextPOI);
        const isCoaster = currentPOI.id === COASTER_START_ID && nextPOI.id === COASTER_END_ID;

        // Xử lý đoạn đi bộ trước khi chuyển phương tiện
        if (walkingStart && (isCableCar || isCoaster || isTransferWalk)) {
            if (walkingStart.id !== currentPOI.id) {
                instructions.push(getUIText('routeInstructionWalk', getPoiName(walkingStart), getPoiName(currentPOI)));
            }
            walkingStart = null;
            walkingEnd = null;
        }

        // Nếu là chuyển tuyến cáp cùng khu vực => đi bộ
        if (isTransferWalk) {
            instructions.push(getUIText('routeInstructionWalk', getPoiName(currentPOI), getPoiName(nextPOI)));
            walkingStart = nextPOI; // Bắt đầu đi bộ từ điểm tiếp theo
            continue;
        }

        // Xử lý đoạn máng trượt
        if (isCoaster) {
            instructions.push(getUIText('routeInstructionCoaster', getPoiName(currentPOI), getPoiName(nextPOI)));
            currentTransport = 'coaster';
            walkingStart = nextPOI; // Bắt đầu đi bộ từ điểm tiếp theo
            continue;
        }

        // Xử lý đoạn cáp treo
        if (isCableCar) {
            // Lấy đúng tên tuyến chung giữa 2 ga
            const routes1 = String(currentPOI.cable_route || '').split(',').map(r => r.trim()).filter(r => r);
            const routes2 = String(nextPOI.cable_route || '').split(',').map(r => r.trim()).filter(r => r);
            const commonRoutes = routes1.filter(r => routes2.includes(r));
            
            // Nếu không có tuyến chung, kiểm tra xem có phải chuyển tuyến không
            if (commonRoutes.length === 0) {
                // Nếu đang đi bộ, thêm chỉ dẫn đi bộ
                if (walkingStart && walkingStart.id !== currentPOI.id) {
                    instructions.push(getUIText('routeInstructionWalk', getPoiName(walkingStart), getPoiName(currentPOI)));
                }
                // Thêm chỉ dẫn đi bộ giữa hai ga
                instructions.push(getUIText('routeInstructionWalk', getPoiName(currentPOI), getPoiName(nextPOI)));
                walkingStart = nextPOI;
                continue;
            }

            let routeName = commonRoutes[0];
            instructions.push(getUIText('routeInstructionCable', routeName, getPoiName(currentPOI), getPoiName(nextPOI)));
            currentTransport = 'cable_car';
            currentRoute = routeName;
            walkingStart = nextPOI;
        } else if (!isCableCar && !isCoaster) {
            // Nếu đang đi bộ
            if (!walkingStart) {
                walkingStart = currentPOI;
            }
            walkingEnd = nextPOI;
        }

        lastPOI = nextPOI;
    }

    // Xử lý đoạn đi bộ cuối cùng nếu còn
    if (walkingStart && walkingEnd && walkingStart.id !== walkingEnd.id) {
        instructions.push(getUIText('routeInstructionWalk', getPoiName(walkingStart), getPoiName(walkingEnd)));
    }

    let instructionsHTML = `
      <h3><i class="fas fa-route"></i> ${getUIText('routeInstructionTitle', getPoiName(getPoi(path[0])), getPoiName(getPoi(path[path.length - 1])), descentChoice)}</h3>
      <div>
        ${instructions.map(instruction => {
            let icon = '';
            if (instruction.includes('🚶')) icon = '🚶';
            else if (instruction.includes('🚠')) icon = '🚠';
            else if (instruction.includes('🎢')) icon = '🎢';
            const cleanInstruction = instruction.replace(/^([🚶🚠🎢\s]+)?/, '').replace(/\\/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
            return `<div class="route-step">${icon ? `<span class="route-icon">${icon}</span>` : ''}<span>${cleanInstruction}</span></div>`;
        }).join('')}
      </div>
    `;

    const content = document.getElementById('route-instructions-content');
    if (content) content.innerHTML = instructionsHTML;
    
    routeInstructionsPanel.style.display = 'block';
    routeInstructionsPanel.classList.remove('translate-y-full', 'md:-translate-x-full');
    routeInstructionsPanel.classList.add('translate-y-0', 'md:translate-x-0');
}


// Helper function to calculate distance between two points
function calculateDistance(pos1, pos2) {
    if (!pos1 || !pos2 || !Array.isArray(pos1) || !Array.isArray(pos2)) {
        return Infinity;
    }
    return L.latLng(pos1[0], pos1[1]).distanceTo(L.latLng(pos2[0], pos2[1]));
}

// Đề xuất Google Maps khi không tìm thấy đường
function suggestGoogleMapsDirections(startPOI, endPOI) {
    if (!startPOI?.position || !endPOI?.position) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${startPOI.position[0]},${startPOI.position[1]}&destination=${endPOI.position[0]},${endPOI.position[1]}`;
    if (confirm(getUIText('googleMapsFallbackPrompt'))) {
        window.open(url, '_blank');
    }
}

// ... existing code ...
function closeRouteInstructionsPanel() {
    if (!routeInstructionsPanel) return;
    
    // Hide panel with animation
    routeInstructionsPanel.classList.remove('translate-y-0', 'md:translate-x-0');
    routeInstructionsPanel.classList.add('translate-y-full', 'md:-translate-x-full');
    
    // Hide panel after animation completes
    setTimeout(() => {
        routeInstructionsPanel.style.display = 'none';
    }, 300); // Match transition duration
}

// Add event listener for close button
document.addEventListener('DOMContentLoaded', function() {
    const closeButton = document.querySelector('.close-route-panel-btn');
    if (closeButton) {
        closeButton.addEventListener('click', closeRouteInstructionsPanel);
    }
});
// ... existing code ...

// --- Local Storage Keys ---
const STORAGE_KEYS = {
    POI_DATA: 'ba_den_poi_data',
    POI_DATA_TIMESTAMP: 'ba_den_poi_data_timestamp',
    MAP_STATE: 'ba_den_map_state',
    SEARCH_HISTORY: 'ba_den_search_history',
    PREFERRED_LANG: 'preferredLang',
    TUTORIAL_DISMISSED: 'tutorialDismissed_map'
};

// Cache duration for POI data (30 minutes in milliseconds)
const POI_CACHE_DURATION = 30 * 60 * 1000;

// --- Local Storage Functions ---
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.warn(`Error saving to localStorage (${key}):`, error);
    }
}

function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn(`Error reading from localStorage (${key}):`, error);
        return null;
    }
}

function clearLocalStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn(`Error clearing localStorage (${key}):`, error);
    }
}

// --- POI Data Caching ---
async function loadPoiData() {
    if(loadingIndicator) loadingIndicator.style.display = 'flex';
    if(loadingText) loadingText.textContent = getUIText('loading');

    try {
        // Check cache first
        const cachedData = getFromLocalStorage(STORAGE_KEYS.POI_DATA);
        const cacheTimestamp = getFromLocalStorage(STORAGE_KEYS.POI_DATA_TIMESTAMP);
        const now = Date.now();

        if (cachedData && cacheTimestamp && (now - cacheTimestamp < POI_CACHE_DURATION)) {
            poiData = cachedData;
            renderPoiMarkers();
            renderCategoryFilters();
            updateUITextElements();
            // Hiển thị tutorial nếu chưa từng xem
            if (!localStorage.getItem('tutorialDismissed_map')) {
                const tutorialPopup = document.getElementById('tutorial-popup');
                const popupBackdrop = document.getElementById('popup-backdrop');
                if (tutorialPopup) tutorialPopup.style.display = 'block';
                if (popupBackdrop) popupBackdrop.style.display = 'block';
            }
            return;
        }

        // If no cache or expired, fetch new data
        const response = await fetch(APPS_SCRIPT_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        poiData = data.poiData.map(poi => {
            let t = poi.type?.toLowerCase().trim();
            if (t === 'religion') t = 'religious';
            return {
                ...poi,
                id: String(poi.id),
                position: poi.position || [parseFloat(poi.latitude), parseFloat(poi.longitude)],
                type: POI_CATEGORIES[t] ? t : 'attraction'
            };
        }).filter(poi => poi.position && !isNaN(poi.position[0]) && !isNaN(poi.position[1]));

        // Save to cache
        saveToLocalStorage(STORAGE_KEYS.POI_DATA, poiData);
        saveToLocalStorage(STORAGE_KEYS.POI_DATA_TIMESTAMP, now);

        renderPoiMarkers();
        renderCategoryFilters();
        updateUITextElements();
    } catch (error) {
        console.error("Error loading POI data:", error);
        if(loadingText) loadingText.textContent = getUIText('loadingError');
    } finally {
        if(loadingIndicator) setTimeout(() => { loadingIndicator.style.display = 'none'; }, 500);
    }
}

// --- Map State Management ---
function saveMapState() {
    if (!map) return;
    
    const mapState = {
        center: map.getCenter(),
        zoom: map.getZoom(),
        timestamp: Date.now()
    };
    
    saveToLocalStorage(STORAGE_KEYS.MAP_STATE, mapState);
}

function restoreMapState() {
    const mapState = getFromLocalStorage(STORAGE_KEYS.MAP_STATE);
    if (mapState && map) {
        map.setView(mapState.center, mapState.zoom);
    }
}

// --- Search History Management ---
function addToSearchHistory(searchTerm) {
    if (!searchTerm) return;
    
    const history = getFromLocalStorage(STORAGE_KEYS.SEARCH_HISTORY) || [];
    const newHistory = [searchTerm, ...history.filter(term => term !== searchTerm)].slice(0, 10);
    saveToLocalStorage(STORAGE_KEYS.SEARCH_HISTORY, newHistory);
}

// Helper function to check nếu một tuyến cáp giữa hai ga còn hoạt động
function isCableRouteOperational(routeName, station1, station2) {
    const s1 = getPoi(station1.id || station1);
    const s2 = getPoi(station2.id || station2);
    if (!s1 || !s2) return false;
    const s1HasRoute = String(s1.cable_route || '').split(',').map(r => r.trim()).includes(routeName);
    const s2HasRoute = String(s2.cable_route || '').split(',').map(r => r.trim()).includes(routeName);
    if (!s1HasRoute || !s2HasRoute) return false;
    const s1Status = checkOperationalStatus(s1.id);
    const s2Status = checkOperationalStatus(s2.id);
    return s1Status.operational && s2Status.operational;
}

// Function to draw cable routes on the map
function drawCableRoutes() {
    // Clear existing cable route polylines
    cableRoutePolylines.forEach(polyline => map.removeLayer(polyline));
    cableRoutePolylines = [];

    // Define cable route colors
    const cableRouteColors = {
        [CABLE_ROUTE_NAME_TAM_AN]: '#FFA500', // Orange
        [CABLE_ROUTE_NAME_VAN_SON]: '#FF0000', // Red
        [CABLE_ROUTE_NAME_CHUA_HANG]: '#FFD700' // Yellow
    };

    // Get all transport POIs
    const transportPOIs = poiData.filter(poi => poi.type === 'transport');

    // Draw each cable route
    Object.keys(cableRouteColors).forEach(routeName => {
        // Find stations on this route
        const stations = transportPOIs.filter(poi => 
            poi.cable_route && poi.cable_route.split(',').map(r => r.trim()).includes(routeName)
        );

        // Sort stations by elevation (if available) or by ID
        stations.sort((a, b) => {
            if (a.elevation && b.elevation) {
                return b.elevation - a.elevation; // Higher elevation first
            }
            return a.id.localeCompare(b.id);
        });

        // Create polyline for this route
        if (stations.length >= 2) {
            const coordinates = stations.map(station => 
                L.latLng(station.position[0], station.position[1])
            );

            const polyline = L.polyline(coordinates, {
                color: cableRouteColors[routeName],
                weight: 4,
                opacity: 0.8,
                dashArray: '5, 10',
                lineJoin: 'round'
            }).addTo(map);

            // Add popup with route name
            polyline.bindPopup(routeName);

            cableRoutePolylines.push(polyline);
        }
    });
}
