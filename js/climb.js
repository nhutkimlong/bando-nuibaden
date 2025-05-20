// --- Configuration ---
const SUMMIT_LATITUDE = 11.382464700026322;
const SUMMIT_LONGITUDE = 106.171167224167451;
const ALLOWED_RADIUS_METERS = 150; // Tăng khoảng cách cho phép lên 150m
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymY15w6A3V2t04Sj190THYP86o8q4bGbBS1qDpMxYTbABP5I1DSDI5eFdhXVHoBDJCnA/exec'; // Ensure this is your latest script URL
const CROP_ASPECT_RATIO = 11.89 / 16.73; // Defined aspect ratio

// --- DOM Elements ---
// Registration Form
const registrationForm = document.getElementById('registrationForm');
const registerBtn = document.getElementById('registerBtn');
const registerSpinner = document.getElementById('registerSpinner');
const groupSizeInput = document.getElementById('groupSize');
const memberListInput = document.getElementById('memberList');
const safetyCommitCheckbox = document.getElementById('safetyCommit');
const safetyCommitError = document.getElementById('safetyCommitError');

// Certification Flow
const phoneVerificationArea = document.getElementById('phoneVerificationArea');
const verifyPhoneNumberInput = document.getElementById('verifyPhoneNumber');
const verifyPhoneBtn = document.getElementById('verifyPhoneBtn');
const certSpinner = document.getElementById('certSpinner');
const memberSelectionArea = document.getElementById('memberSelectionArea');
const memberListContainer = document.getElementById('memberListContainer');
const generateSelectedBtn = document.getElementById('generateSelectedBtn');
const generateSpinner = document.getElementById('generateSpinner');
const resetVerificationBtn = document.getElementById('resetVerificationBtn');

// Results Area
const certificateResult = document.getElementById('certificateResult');
const certificateResultTitle = document.getElementById('certificateResultTitle')?.querySelector('span');
const certificateResultMessage = document.getElementById('certificateResultMessage');
const downloadLinks = document.getElementById('downloadLinks');

// General Elements
const messageBox = document.getElementById('messageBox');
const currentYearSpan = document.getElementById('currentYear');
const mapCanvas = document.getElementById('mapCanvas');

// Cropper Modal Elements
const cropModal = document.getElementById('cropModal');
const imageToCrop = document.getElementById('imageToCrop');
const cancelCropBtn = document.getElementById('cancelCropBtn');
const confirmCropBtn = document.getElementById('confirmCropBtn');

// --- State Variables ---
let messageTimeout;
let verifiedPhoneNumber = null;
let uploadedPhotos = {}; // Stores { 'Member Name': 'croppedBase64string' }
let cropperInstance = null; // Holds the Cropper.js instance
let currentCropContext = null; // Holds {name, previewId, removeId, fileInput} during cropping

// --- Trekking Route Data (Unchanged) ---
const powerPoleTrailGeoJSON = { /* ... GeoJSON data ... */
    "type": "Feature", "properties": { "name": "Đường cột điện", "highway": "footway", "surface": "wood" }, "geometry": { "type": "LineString", "coordinates": [ [106.1664847, 11.3636370], [106.1662692, 11.3638531], [106.1660653, 11.3641397], [106.1658347, 11.3646262], [106.1656858, 11.3648313], [106.1656147, 11.3649273], [106.1655959, 11.3650180], [106.1655664, 11.3650864], [106.1655718, 11.3651890], [106.1655557, 11.3652626], [106.1655128, 11.3652941], [106.1655182, 11.3653730], [106.1655772, 11.3654467], [106.1656845, 11.3655229], [106.1657301, 11.3656255], [106.1657944, 11.3657175], [106.1658615, 11.3657780], [106.1659151, 11.3658595], [106.1659715, 11.3659647], [106.1659929, 11.3660725], [106.1659634, 11.3661593], [106.1659634, 11.3662671], [106.1659634, 11.3663775], [106.1659205, 11.3664696], [106.1658347, 11.3666615], [106.1658695, 11.3667825], [106.1659151, 11.3668772], [106.1659701, 11.3670507], [106.1659902, 11.3671165], [106.1660090, 11.3672335], [106.1660399, 11.3672861], [106.1660747, 11.3673558], [106.1660935, 11.3674346], [106.1661042, 11.3675780], [106.1661163, 11.3676674], [106.1661592, 11.3677370], [106.1661579, 11.3678370], [106.1661525, 11.3678777], [106.1661941, 11.3679869], [106.1661954, 11.3680855], [106.1661726, 11.3681289], [106.1661418, 11.3681972], [106.1661606, 11.3682879], [106.1661887, 11.3683432], [106.1662021, 11.3684786], [106.1661726, 11.3685312], [106.1661056, 11.3685917], [106.1660586, 11.3686574], [106.1660466, 11.3687231], [106.1660814, 11.3687915], [106.1661230, 11.3689559], [106.1661538, 11.3690058], [106.1661860, 11.3691057], [106.1662196, 11.3692214], [106.1662732, 11.3695580], [106.1663081, 11.3697092], [106.1663108, 11.3697645], [106.1663550, 11.3698407], [106.1663537, 11.3699038], [106.1663376, 11.3699301], [106.1662826, 11.3699538], [106.1662665, 11.3699801], [106.1662786, 11.3700274], [106.1662893, 11.3701339], [106.1662839, 11.3702273], [106.1662330, 11.3702733], [106.1661673, 11.3703285], [106.1661109, 11.3703798], [106.1660801, 11.3704679], [106.1661029, 11.3705034], [106.1661150, 11.3706085], [106.1660747, 11.3706546], [106.1660036, 11.3706940], [106.1659460, 11.3707663], [106.1659540, 11.3708215], [106.1659607, 11.3708597], [106.1659768, 11.3709504], [106.1659648, 11.3710266], [106.1659326, 11.3710635], [106.1658950, 11.3711029], [106.1658816, 11.3711516], [106.1658803, 11.3712055], [106.1658937, 11.3712765], [106.1659648, 11.3713317], [106.1660358, 11.3713856], [106.1661109, 11.3714355], [106.1661914, 11.3715013], [106.1662450, 11.3715512], [106.1662531, 11.3715999], [106.1662692, 11.3716696], [106.1663349, 11.3717222], [106.1663859, 11.3717458], [106.1663993, 11.3717682], [106.1663912, 11.3718458], [106.1663778, 11.3718878], [106.1663872, 11.3720088], [106.1664677, 11.3721468], [106.1664797, 11.3722165], [106.1665106, 11.3722770], [106.1665481, 11.3723007], [106.1666380, 11.3723493], [106.1666822, 11.3724137], [106.1667533, 11.3724913], [106.1668164, 11.3725492], [106.1668579, 11.3726202], [106.1668982, 11.3727451], [106.1669223, 11.3728371], [106.1669451, 11.3730028], [106.1669759, 11.3731014], [106.1670202, 11.3731526], [106.1670819, 11.3732802], [106.1670685, 11.3732933], [106.1670698, 11.3733393], [106.1671248, 11.3734537], [106.1671382, 11.3736062], [106.1671101, 11.3736628], [106.1670497, 11.3737377], [106.1670524, 11.3738311], [106.1670765, 11.3739481], [106.1670832, 11.3740519], [106.1670698, 11.3741558], [106.1671020, 11.3741847], [106.1671449, 11.3742307], [106.1671972, 11.3742768], [106.1672334, 11.3743359], [106.1672455, 11.3744122], [106.1672187, 11.3744753], [106.1672133, 11.3745410], [106.1672737, 11.3745778], [106.1672965, 11.3746396], [106.1672629, 11.3746935], [106.1672388, 11.3747593], [106.1672576, 11.3747803], [106.1673193, 11.3748855], [106.1674038, 11.3749933], [106.1675017, 11.3750472], [106.1675969, 11.3751669], [106.1676760, 11.3752589], [106.1677310, 11.3753049], [106.1677793, 11.3753575], [106.1678115, 11.3754061], [106.1678651, 11.3754811], [106.1679067, 11.3755034], [106.1679764, 11.3755521], [106.1680703, 11.3756428], [106.1680904, 11.3757256], [106.1681360, 11.3757703], [106.1682138, 11.3758624], [106.1682741, 11.3759518], [106.1682996, 11.3760307], [106.1683251, 11.3761385], [106.1683425, 11.3762305], [106.1683492, 11.3762897], [106.1683801, 11.3763436], [106.1684230, 11.3763817], [106.1684659, 11.3764027], [106.1686094, 11.3764856], [106.1686765, 11.3765395], [106.1687408, 11.3766013], [106.1688025, 11.3766736], [106.1688253, 11.3767314], [106.1688428, 11.3768629], [106.1688401, 11.3770088], [106.1688602, 11.3770601], [106.1688924, 11.3771837], [106.1688910, 11.3772560], [106.1688857, 11.3773323], [106.1688937, 11.3774335], [106.1689031, 11.3775807], [106.1689259, 11.3776794], [106.1689407, 11.3777293], [106.1689661, 11.3778161], [106.1689970, 11.3779055], [106.1690345, 11.3779699], [106.1690949, 11.3780725], [106.1691257, 11.3781619], [106.1691847, 11.3782487], [106.1692277, 11.3783025], [106.1692920, 11.3784051], [106.1692934, 11.3784695], [106.1693148, 11.3785537], [106.1693121, 11.3786786], [106.1693242, 11.3787180], [106.1693484, 11.3787732], [106.1693470, 11.3788390], [106.1693417, 11.3788666], [106.1693470, 11.3789823], [106.1693457, 11.3791032], [106.1693497, 11.3792255], [106.1693538, 11.3793057], [106.1693591, 11.3793649], [106.1693524, 11.3794135], [106.1693644, 11.3795068], [106.1693604, 11.3796199], [106.1693510, 11.3796541], [106.1692840, 11.3797409], [106.1692679, 11.3798710], [106.1692384, 11.3800091], [106.1692277, 11.3801642], [106.1692317, 11.3802891], [106.1692518, 11.3803496], [106.1692800, 11.3804443], [106.1692558, 11.3805521], [106.1693001, 11.3806993], [106.1692947, 11.3808347], [106.1692491, 11.3809715], [106.1691834, 11.3810970], [106.1691532, 11.3812423], [106.1692143, 11.3813435], [106.1693477, 11.3814671], [106.1694603, 11.3815263], [106.1695898, 11.3815881], [106.1696689, 11.3817189], [106.1697579, 11.3818330] ] } };

const downloadGpxBtn = document.getElementById('downloadGpxBtn');

// --- Utility Functions ---
function showMessage(message, type = 'info', duration = 6000) {
    clearTimeout(messageTimeout);
    const iconClass = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle';
    const span = document.createElement('span');
    span.textContent = message;
    messageBox.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    messageBox.appendChild(span);
    messageBox.className = 'message-box z-[150]'; // Reset classes, keep high z-index
    messageBox.classList.add(type);
    void messageBox.offsetWidth;
    messageBox.classList.add('show');
    if (duration > 0) messageTimeout = setTimeout(hideMessage, duration);
}
function hideMessage() { clearTimeout(messageTimeout); messageBox.classList.remove('show'); }
function deg2rad(deg) { return deg * (Math.PI / 180); }
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; const dLat = deg2rad(lat2 - lat1); const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c;
}
function setLoadingState(button, spinner, isLoading) {
    if (!button || !spinner) return; button.disabled = isLoading; spinner.classList.toggle('hidden', !isLoading);
}

// --- Helper function to escape HTML (RESTORED and used by GPX) ---
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        try {
            unsafe = String(unsafe);
        } catch (e) {
            console.warn("Cannot convert value to string for escaping:", unsafe);
            return '';
        }
    }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function createGpxContent(trailName, coordinates, creator = "NuiBaDenWebsite") {
    let gpx = `<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1" creator="${escapeHtml(creator)}">`;
    gpx += `<metadata><name>${escapeHtml(trailName)}</name></metadata>`;
    gpx += `<trk><name>${escapeHtml(trailName)}</name><trkseg>`;
    coordinates.forEach(coord => {
        gpx += `<trkpt lat="${coord[1]}" lon="${coord[0]}"></trkpt>`; // GeoJSON is [lon, lat], GPX is lat, lon
    });
    gpx += `</trkseg></trk></gpx>`;
    return gpx;
}

// --- Map Initialization ---
function initializeLeafletMap() {
    if (!mapCanvas) { console.error("Map canvas element (#mapCanvas) not found!"); return; }
    if (typeof L === 'undefined' || typeof L.Control === 'undefined' || typeof L.Control.Locate === 'undefined') {
        console.error("Leaflet library (L) or Locate Control not loaded!");
        mapCanvas.innerHTML = '<div class="flex items-center justify-center h-full text-red-600"><i class="fa-solid fa-exclamation-triangle mr-2"></i> Lỗi tải thư viện bản đồ.</div>';
        return;
    }
    mapCanvas.innerHTML = '';

    try {
        const mapCenter = [11.3727, 106.1676];
        const map = L.map(mapCanvas).setView(mapCenter, 15); // Use local map variable
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
        }).addTo(map);
        const trailStyle = { "color": "#E67E22", "weight": 4, "opacity": 0.8 };
        const geoJsonLayer = L.geoJSON(powerPoleTrailGeoJSON, {
            style: trailStyle,
            onEachFeature: (feature, layer) => { if (feature.properties?.name) layer.bindPopup(`<b>${escapeHtml(feature.properties.name)}</b><br>Tuyến đường chính thức.`); }
        }).addTo(map);
        map.fitBounds(geoJsonLayer.getBounds().pad(0.1));
        const startPoint = powerPoleTrailGeoJSON.geometry.coordinates[0];
        const endPoint = powerPoleTrailGeoJSON.geometry.coordinates[powerPoleTrailGeoJSON.geometry.coordinates.length - 1];
        const startIcon = L.divIcon({ html: '<i class="fa-solid fa-person-hiking text-green-600 text-2xl"></i>', className: 'bg-transparent border-none', iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24] });
        const endIcon = L.divIcon({ html: '<i class="fa-solid fa-flag-checkered text-red-600 text-2xl"></i>', className: 'bg-transparent border-none', iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24] });
        if (startPoint) L.marker([startPoint[1], startPoint[0]], { icon: startIcon, title: "Điểm bắt đầu" }).addTo(map).bindPopup("<b>Điểm bắt đầu</b><br>Tuyến đường Cột Điện");
        if (endPoint) L.marker([endPoint[1], endPoint[0]], { icon: endIcon, title: "Điểm kết thúc (Gần đỉnh)" }).addTo(map).bindPopup("<b>Điểm kết thúc</b><br>(Gần đỉnh)");
        L.control.locate({
            position: 'topright', flyTo: true,
            strings: { title: "Hiển thị vị trí của tôi", popup: "Bạn đang ở trong bán kính {distance} {unit} từ điểm này", outsideMapBoundsMsg: "Có vẻ bạn đang ở ngoài phạm vi bản đồ." },
            locateOptions: { maxZoom: 17, enableHighAccuracy: true },
            iconElement: 'i', icon: 'fa-solid fa-location-crosshairs', iconLoading: 'fa-solid fa-spinner fa-spin'
        }).addTo(map);
        
        map.on('locationerror', (e) => { showMessage(`Lỗi định vị bản đồ: ${e.message}`, 'error'); });
    } catch (error) {
        console.error("Error initializing Leaflet map:", error);
        mapCanvas.innerHTML = '<div class="flex items-center justify-center h-full text-red-600"><i class="fa-solid fa-exclamation-triangle mr-2"></i> Lỗi khởi tạo bản đồ. Vui lòng thử lại.</div>';
    }
}

// --- Registration Form Handler ---
async function handleRegistrationSubmit(event) {
    event.preventDefault();
    if (safetyCommitError) safetyCommitError.classList.add('hidden');

    if (!registrationForm.checkValidity()) {
        registrationForm.reportValidity();
        if (safetyCommitCheckbox && !safetyCommitCheckbox.checked && safetyCommitError) safetyCommitError.classList.remove('hidden');
        // REFINED MESSAGE
        showMessage('Vui lòng điền đủ thông tin (*) và xác nhận cam kết.', 'error');
        return;
    }

    const groupSizeVal = parseInt(groupSizeInput.value, 10);
    const memberListText = memberListInput.value.trim();
    const membersInList = memberListText ? memberListText.split('\n').map(name => name.trim()).filter(Boolean) : [];
    if (!isNaN(groupSizeVal) && groupSizeVal > 0 && membersInList.length > groupSizeVal) {
        // REFINED MESSAGE
        showMessage(`Danh sách (${membersInList.length}) vượt quá số thành viên (${groupSizeVal}).`, 'error', 8000);
        memberListInput.focus();
        return;
    }

    setLoadingState(registerBtn, registerSpinner, true);
    // REFINED MESSAGE
    showMessage('Đang gửi đăng ký...', 'info', 0);

    const formData = new FormData(registrationForm);
    const data = {
        action: 'register',
        leaderName: formData.get('leaderName'),
        phoneNumber: formData.get('phoneNumber'),
        address: formData.get('address'),
        groupSize: formData.get('groupSize'),
        email: formData.get('email'),
        climbDate: formData.get('climbDate'),
        climbTime: formData.get('climbTime'),
        safetyCommit: safetyCommitCheckbox.checked,
        memberList: formData.get('memberList').trim()
    };

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST', redirect: "follow",
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            // REFINED MESSAGE
            showMessage('Đăng ký thành công! Vui lòng kiểm tra email.', 'success', 10000);
            registrationForm.reset();
            if (safetyCommitError) safetyCommitError.classList.add('hidden');
        } else {
            throw new Error(result.message || 'Đăng ký thất bại từ máy chủ.');
        }
    } catch (error) {
        console.error('Fetch error during registration:', error);
        // REFINED MESSAGE
        showMessage(`Lỗi đăng ký: ${error.message}. Vui lòng thử lại.`, 'error', 15000);
    } finally {
        setLoadingState(registerBtn, registerSpinner, false);
        if (messageBox.classList.contains('info')) hideMessage();
    }
}


// --- Certification Flow Functions ---

/** Starts the verification process (Location + Phone). */
function handleVerifyPhoneAndLocation() {
    const phoneNumber = verifyPhoneNumberInput.value.trim();
    if (!phoneNumber || !/^[0-9]{10,11}$/.test(phoneNumber)) {
        // REFINED MESSAGE
        showMessage('Vui lòng nhập SĐT đã đăng ký (10-11 số).', 'error');
        verifyPhoneNumberInput.focus();
        return;
    }

    setLoadingState(verifyPhoneBtn, certSpinner, true);
    // REFINED MESSAGE
    showMessage('Đang yêu cầu quyền vị trí...', 'info', 0);
    hideMemberSelectionAndResults();

    if (!navigator.geolocation) {
        // REFINED MESSAGE
        showMessage('Trình duyệt không hỗ trợ định vị.', 'error');
        setLoadingState(verifyPhoneBtn, certSpinner, false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => handleLocationSuccessForVerification(position, phoneNumber),
        handleLocationErrorForVerification,
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
}

/** Geolocation success callback during verification. */
function handleLocationSuccessForVerification(position, phoneNumber) {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    let isValid = false;

    console.log(`User location: Lat ${userLat}, Lon ${userLon} (Accuracy ~${accuracy}m)`);
    showMessage(`Vị trí xác định (~${accuracy.toFixed(0)}m). Đang kiểm tra...`, 'info', 0);

    const distance = getDistanceFromLatLonInMeters(userLat, userLon, SUMMIT_LATITUDE, SUMMIT_LONGITUDE);
    console.log(`Distance to summit: ${distance.toFixed(2)}m`);

    // Check distance to set isValid
    if (distance <= ALLOWED_RADIUS_METERS) {
        isValid = true;
    }

    // Xử lý logic tiếp theo dựa trên isValid
    if (isValid) {
        showMessage(`Vị trí hợp lệ. Đang tải danh sách...`, 'info', 0);
        fetchMembersListForSelection(phoneNumber);
    } else {
        showMessage(`Vị trí không hợp lệ (cách đỉnh ~${distance.toFixed(0)}m). Cần trong phạm vi ${ALLOWED_RADIUS_METERS}m.`, 'error', 12000);
        setLoadingState(verifyPhoneBtn, certSpinner, false);
    }
}

/** Geolocation error handler specific to the verification step. */
function handleLocationErrorForVerification(error) {
    // REFINED MESSAGE PREFIX
    let errorMsg = 'Lỗi định vị: ';
    switch (error.code) {
        case error.PERMISSION_DENIED: errorMsg += 'Quyền truy cập bị từ chối.'; break;
        case error.POSITION_UNAVAILABLE: errorMsg += 'Thông tin vị trí không khả dụng.'; break;
        case error.TIMEOUT: errorMsg += 'Yêu cầu vị trí hết thời gian chờ.'; break;
        default: errorMsg += `Lỗi không xác định (${error.code}).`; break;
    }
    showMessage(errorMsg, 'error', 10000);
    console.error('Geolocation Error during verification:', error);
    setLoadingState(verifyPhoneBtn, certSpinner, false);
    if (messageBox.classList.contains('info')) hideMessage();
}

/** Fetches the member list from Google Apps Script for selection. */
async function fetchMembersListForSelection(phoneNumber) {
    const fetchUrl = new URL(GOOGLE_SCRIPT_URL);
    fetchUrl.searchParams.append('action', 'getMembersByPhone');
    fetchUrl.searchParams.append('phone', phoneNumber);

    if(memberListContainer) {
        memberListContainer.innerHTML = '';
        memberListContainer.classList.add('loading');
    } else {
        console.error("memberListContainer not found!");
        setLoadingState(verifyPhoneBtn, certSpinner, false);
        return;
    }

    try {
        const response = await fetch(fetchUrl.toString(), { method: 'GET' });
        if (!response.ok) {
             let serverErrorMsg = `Lỗi ${response.status}: ${response.statusText}`;
             try { const errResult = await response.json(); serverErrorMsg = errResult.message || serverErrorMsg; } catch(e) {}
             throw new Error(serverErrorMsg);
         }
        const result = await response.json();

        if (result.success && Array.isArray(result.members)) {
            hideMessage();
            verifiedPhoneNumber = phoneNumber;
            displayMemberListForSelection(result.members);
            if(phoneVerificationArea) phoneVerificationArea.classList.add('hidden');
            if(memberSelectionArea) memberSelectionArea.classList.remove('hidden');
        } else {
             throw new Error(result.message || 'Không thể lấy danh sách thành viên.');
        }
    } catch (error) {
        console.error('Fetch error getting member list:', error);
        // REFINED MESSAGE
        showMessage(`Lỗi tải danh sách: ${error.message}. Vui lòng thử lại.`, 'error', 10000);
        resetVerificationProcess();
    } finally {
        setLoadingState(verifyPhoneBtn, certSpinner, false);
        if(memberListContainer) memberListContainer.classList.remove('loading');
        if (messageBox.classList.contains('info')) hideMessage();
    }
}

/** Dynamically creates and displays the member list for selection. */
function displayMemberListForSelection(members) {
    if (!memberListContainer) return;
    memberListContainer.innerHTML = '';
    uploadedPhotos = {};

    if (members.length === 0) {
        memberListContainer.innerHTML = '<p class="text-center text-gray-500 italic py-4">Không có thành viên nào được liệt kê trong đăng ký này.</p>'; // Slightly refined
        if (generateSelectedBtn) generateSelectedBtn.disabled = true;
        return;
    }

    if (generateSelectedBtn) generateSelectedBtn.disabled = false;

    members.forEach(name => {
        const memberId = `member_${name.replace(/[^a-zA-Z0-9_-]/g, '')}_${Math.random().toString(36).substring(2, 7)}`;
        const escapedName = escapeHtml(name);

        const listItem = document.createElement('div');
        listItem.className = 'member-item flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-100/60 rounded-md gap-3 sm:gap-4';
        listItem.innerHTML = `
            <div class="flex items-center space-x-3 flex-grow min-w-0">
                <input type="checkbox" id="cb_${memberId}" class="member-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0" data-member-name="${escapedName}">
                <label for="cb_${memberId}" class="member-name text-sm font-medium text-gray-700 truncate cursor-pointer" title="${escapedName}">${escapedName}</label>
                <img id="preview_${memberId}" src="" alt="Preview" class="member-preview h-10 w-10 object-cover rounded-full hidden border border-gray-200">
            </div>
            <div class="flex items-center space-x-2 flex-shrink-0 pl-7 sm:pl-0">
                <button type="button" class="upload-photo-btn text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-2 rounded-md transition duration-150 ease-in-out" data-input-id="file_${memberId}">
                    <i class="fa-solid fa-camera mr-1"></i> Tải ảnh
                </button>
                <input type="file" accept="image/*" class="hidden member-photo-input" id="file_${memberId}" data-member-name="${escapedName}" data-preview-id="preview_${memberId}" data-remove-id="remove_${memberId}">
                <button type="button" id="remove_${memberId}" class="remove-photo-btn text-xs text-red-500 hover:text-red-700 hidden" title="Xóa ảnh đã chọn">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;

        const uploadBtn = listItem.querySelector('.upload-photo-btn');
        const fileInput = listItem.querySelector('.member-photo-input');
        const removeBtn = listItem.querySelector('.remove-photo-btn');

        uploadBtn?.addEventListener('click', () => fileInput.click());
        fileInput?.addEventListener('change', handlePhotoSelection);
        removeBtn?.addEventListener('click', handleRemovePhoto);

        memberListContainer.appendChild(listItem);
    });
}

// --- Photo Cropping Functions ---

/** Handles photo selection, validates, and opens the cropper modal. */
function handlePhotoSelection(event) {
    const fileInput = event.target;
    const memberName = fileInput.dataset.memberName;
    const previewId = fileInput.dataset.previewId;
    const removeId = fileInput.dataset.removeId;
    const file = fileInput.files[0];

    if (!file || !previewId || !removeId || !memberName || !cropModal || !imageToCrop) {
        console.error("Missing elements or data for cropping.");
        if (fileInput) fileInput.value = '';
        return;
    }

    // Validation
    if (!file.type.startsWith('image/')) {
        // REFINED MESSAGE
        showMessage('Vui lòng chọn tệp ảnh.', 'error');
        fileInput.value = ''; return;
    }
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
        // REFINED MESSAGE
        showMessage(`Ảnh quá lớn (tối đa ${maxSizeMB}MB).`, 'error');
        fileInput.value = ''; return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        imageToCrop.src = e.target.result;
        currentCropContext = { name: memberName, previewId: previewId, removeId: removeId, fileInput: fileInput };
        cropModal.classList.remove('hidden');
        if (cropperInstance) cropperInstance.destroy();
        cropperInstance = new Cropper(imageToCrop, {
            aspectRatio: CROP_ASPECT_RATIO, viewMode: 1, dragMode: 'move', background: false,
            autoCropArea: 0.9, responsive: true, restore: false, checkOrientation: false,
            modal: true, guides: true, center: true, highlight: false, cropBoxMovable: true,
            cropBoxResizable: true, toggleDragModeOnDblclick: false,
        });
    }
    reader.onerror = (e) => {
        // REFINED MESSAGE
        showMessage('Lỗi đọc tệp ảnh.', 'error');
        console.error("FileReader error:", e);
        fileInput.value = '';
        handleCancelCrop();
    }
    reader.readAsDataURL(file);
}

/** Handles clicking the "Cancel" button in the crop modal. */
function handleCancelCrop() {
    if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
    if (cropModal) cropModal.classList.add('hidden');
    if (currentCropContext && currentCropContext.fileInput) currentCropContext.fileInput.value = '';
    if (imageToCrop) imageToCrop.src = '';
    currentCropContext = null;
}

/** Handles clicking the "Confirm Crop" button in the crop modal. */
function handleConfirmCrop() {
    if (!cropperInstance || !currentCropContext) {
        // REFINED MESSAGE
        showMessage('Lỗi: Không tìm thấy dữ liệu cắt.', 'error');
        handleCancelCrop();
        return;
    }

    try {
        const MAX_PHOTO_WIDTH = 800; // Define a max width for the output photo
        const croppedCanvas = cropperInstance.getCroppedCanvas({
            width: MAX_PHOTO_WIDTH, // Set desired width
            height: MAX_PHOTO_WIDTH / CROP_ASPECT_RATIO, // Calculate height based on aspect ratio
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
        if (!croppedCanvas) throw new Error("Không thể tạo ảnh đã cắt.");

        const croppedBase64 = croppedCanvas.toDataURL('image/jpeg', 0.85); // Quality 0.85 is a good balance
        const { name, previewId, removeId } = currentCropContext;
        const previewImg = document.getElementById(previewId);
        const removeBtn = document.getElementById(removeId);

        uploadedPhotos[name] = croppedBase64;
        console.log(`Stored CROPPED photo for key: ${name}`);

        if (previewImg) { previewImg.src = croppedBase64; previewImg.classList.remove('hidden'); }
        if (removeBtn) removeBtn.classList.remove('hidden');

        handleCancelCrop();

    } catch (error) {
        console.error("Error getting cropped image:", error);
        // REFINED MESSAGE
        showMessage(`Lỗi cắt ảnh: ${error.message}`, 'error');
        handleCancelCrop();
    }
}

/** Handles the removal of a selected photo. */
function handleRemovePhoto(event) {
    const removeBtn = event.target.closest('.remove-photo-btn');
    if (!removeBtn) return;
    const memberItem = removeBtn.closest('.member-item');
    if (!memberItem) return;

    const fileInput = memberItem.querySelector('.member-photo-input');
    const previewImg = memberItem.querySelector('.member-preview');
    const memberName = fileInput?.dataset.memberName;

    if (previewImg) { previewImg.classList.add('hidden'); previewImg.src = ''; }
    if (fileInput) fileInput.value = '';
    removeBtn.classList.add('hidden');

    if (memberName && uploadedPhotos[memberName]) {
        delete uploadedPhotos[memberName];
        console.log(`Removed photo for key: ${memberName}`);
    }
}

// --- Certificate Generation & Display ---

/** Gathers selected members and sends data to generate certificates. */
async function handleGenerateSelectedCertificates() {
    if (!verifiedPhoneNumber) {
        // REFINED MESSAGE
        showMessage('Lỗi: SĐT chưa được xác thực.', 'error');
        return;
    }

    const checkedBoxes = memberListContainer.querySelectorAll('.member-checkbox:checked');
    if (checkedBoxes.length === 0) {
        // REFINED MESSAGE
        showMessage('Vui lòng chọn thành viên.', 'error');
        return;
    }

    setLoadingState(generateSelectedBtn, generateSpinner, true);
    // REFINED MESSAGE
    showMessage(`Đang tạo ${checkedBoxes.length} chứng nhận...`, 'info', 0);

    const selectedMembersData = [];
    checkedBoxes.forEach(checkbox => {
        const memberName = checkbox.dataset.memberName;
        if (memberName) {
            selectedMembersData.push({
                name: memberName,
                photoData: uploadedPhotos[memberName] || null
            });
        }
    });

    const postData = { action: 'generateCertificatesWithPhotos', phone: verifiedPhoneNumber, members: selectedMembersData };

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST', redirect: "follow",
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(postData)
        });
        const result = await response.json();
        console.log("Received response from GAS:", result);

        if (result.success) {
            hideMessage();
            let resultMessage = `Hoàn tất! Đã tạo ${result.pdfLinks?.length || 0} chứng nhận.`;
             if (result.message && result.message.toLowerCase().includes('lỗi')) resultMessage = result.message;
            showMessage(resultMessage, (result.pdfLinks?.length > 0) ? 'success' : 'info', 15000);

            if(result.pdfLinks && result.pdfLinks.length > 0) {
                displayDownloadLinks(result.pdfLinks);
            } else {
                 displayDownloadLinks([]);
                 if(certificateResultMessage) certificateResultMessage.textContent = result.message || 'Không có chứng nhận nào được tạo thành công.';
            }
        } else {
             throw new Error(result.message || `Không thể tạo chứng nhận.`);
        }
    } catch (error) {
        console.error('Fetch error generating certificates:', error);
        // REFINED MESSAGE
        showMessage(`Lỗi tạo chứng nhận: ${error.message}. Vui lòng thử lại.`, 'error', 10000);
    } finally {
        setLoadingState(generateSelectedBtn, generateSpinner, false);
        if (messageBox.classList.contains('info')) hideMessage();
    }
}

/** Displays the final download links. */
function displayDownloadLinks(pdfLinks) {
    if (!certificateResult || !certificateResultTitle || !certificateResultMessage || !downloadLinks) {
        console.error("Certificate result elements not found."); return;
    }
    downloadLinks.innerHTML = '';

    if (!Array.isArray(pdfLinks) || pdfLinks.length === 0) {
        certificateResultTitle.textContent = 'Thông báo';
        certificateResultMessage.textContent = certificateResultMessage.textContent || 'Không có chứng nhận nào được tạo hoặc có lỗi.'; // Refined
    } else {
        certificateResultTitle.textContent = 'Chúc mừng! Chứng nhận đã sẵn sàng';
        certificateResultMessage.textContent = 'Tải chứng nhận của các thành viên đã tạo:'; // Refined
        pdfLinks.forEach(linkInfo => {
            if (!linkInfo || typeof linkInfo !== 'object' || !linkInfo.name || !linkInfo.url) { console.warn("Skipping invalid linkInfo:", linkInfo); return; }
            const li = document.createElement('li');
            const safeName = escapeHtml(linkInfo.name);
            const safeUrl = escapeHtml(linkInfo.url);
            const filenameSafeName = safeName.replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/\s+/g, '_');
            li.innerHTML = `
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" download="ChungNhan_NuiBaDen_${filenameSafeName}.pdf"
                   class="flex items-center text-blue-600 hover:text-blue-800 hover:underline font-medium py-1 group text-sm md:text-base">
                    <i class="fa-solid fa-cloud-arrow-down text-lg mr-3 text-blue-500 group-hover:text-blue-700 transition-colors"></i>
                    <span>Tải chứng nhận: ${safeName}</span>
                </a>`;
            downloadLinks.appendChild(li);
        });
    }
    certificateResult.classList.remove('hidden');
}

/** Hides the member selection and results areas. */
function hideMemberSelectionAndResults() {
    if(memberSelectionArea) memberSelectionArea.classList.add('hidden');
    if(certificateResult) certificateResult.classList.add('hidden');
    if(downloadLinks) downloadLinks.innerHTML = '';
}

/** Resets the verification process. */
function resetVerificationProcess() {
    hideMemberSelectionAndResults();
    if(phoneVerificationArea) phoneVerificationArea.classList.remove('hidden');
    if(memberListContainer) memberListContainer.innerHTML = '';
    if(verifyPhoneNumberInput) verifyPhoneNumberInput.value = '';
    verifiedPhoneNumber = null;
    uploadedPhotos = {};
    setLoadingState(verifyPhoneBtn, certSpinner, false);
    setLoadingState(generateSelectedBtn, generateSpinner, false);
    hideMessage();

    handleCancelCrop(); // Ensure cropper is reset
}

/** Handles GPX Download Button Click */
function handleDownloadGpx() {
    if (!powerPoleTrailGeoJSON || !powerPoleTrailGeoJSON.geometry || !powerPoleTrailGeoJSON.geometry.coordinates) {
        showMessage('Lỗi: Dữ liệu tuyến đường không khả dụng để tạo GPX.', 'error');
        console.error("GPX Error: Trail data is missing or invalid.");
        return;
    }
    try {
        const trailName = powerPoleTrailGeoJSON.properties?.name || "Duong Leo Nui Ba Den";
        const gpxData = createGpxContent(trailName, powerPoleTrailGeoJSON.geometry.coordinates);
        
        const blob = new Blob([gpxData], { type: 'application/gpx+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tuyen_cot_dien.gpx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage('Đã bắt đầu tải xuống tệp GPX.', 'success', 4000);
    } catch (error) {
        showMessage('Lỗi khi tạo tệp GPX. Vui lòng thử lại.', 'error');
        console.error("Error generating GPX file:", error);
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (registrationForm) registrationForm.addEventListener('submit', handleRegistrationSubmit);
    if (verifyPhoneBtn) verifyPhoneBtn.addEventListener('click', handleVerifyPhoneAndLocation);
    if (generateSelectedBtn) generateSelectedBtn.addEventListener('click', handleGenerateSelectedCertificates);
    if (resetVerificationBtn) resetVerificationBtn.addEventListener('click', resetVerificationProcess);
    if (downloadGpxBtn) downloadGpxBtn.addEventListener('click', handleDownloadGpx);

    // Cropper Modal Button Listeners
    if (cancelCropBtn) cancelCropBtn.addEventListener('click', handleCancelCrop);
    if (confirmCropBtn) confirmCropBtn.addEventListener('click', handleConfirmCrop);

    if (safetyCommitCheckbox && safetyCommitError) {
        safetyCommitCheckbox.addEventListener('change', () => {
            safetyCommitError.classList.toggle('hidden', safetyCommitCheckbox.checked);
        });
    }

    initializeLeafletMap();
});