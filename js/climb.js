// --- Configuration ---
const SUMMIT_LATITUDE = 11.382117991152592;
const SUMMIT_LONGITUDE = 106.17201169600158;
const REGISTRATION_LATITUDE = 11.3636370; // Tọa độ địa điểm đăng ký - CẬP NHẬT THEO ĐỊA CHỈ CỤ THỂ
const REGISTRATION_LONGITUDE = 106.1664847; // Tọa độ địa điểm đăng ký - CẬP NHẬT THEO ĐỊA CHỈ CỤ THỂ
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzafxB0TBS4_gcPIvaqbINNrnJJ_7aaE9Az3m9EqqkH5s2eo_mbzrRiOOw3jXolS5jfng/exec'; // Ensure this is your latest script URL
const CROP_ASPECT_RATIO = 11.89 / 16.73; // Defined aspect ratio

// API URLs
const COMBINED_API_URL = '/.netlify/functions/combined-data';

// Default GPS settings (fallback)
let GPS_SETTINGS = {
    registrationRadius: 50,
    certificateRadius: 150,
    requireGpsRegistration: true,
    requireGpsCertificate: true,
    registrationTimeEnabled: false,
    registrationStartTime: '06:00',
    registrationEndTime: '18:00'
};

// --- State Variables ---
let messageTimeout;
let verifiedPhoneNumber = null;
let uploadedPhotos = {}; // Stores { 'Member Name': 'croppedBase64string' }
let cropperInstance = null; // Holds the Cropper.js instance
let currentCropContext = null; // Holds {name, previewId, removeId, fileInput} during cropping
let signatureContext = null; // Holds canvas context for signature
let isDrawing = false; // Signature drawing state
let pendingRegistrationData = null; // Stores form data before commitment
let selectedRepresentativeType = null; // Stores the selected representative type

// --- DOM Elements (sẽ được khởi tạo trong DOMContentLoaded) ---
let registrationForm, registerBtn, registerSpinner, groupSizeInput, memberListInput, safetyCommitCheckbox, safetyCommitError;
let phoneVerificationArea, verifyPhoneNumberInput, verifyPhoneBtn, certSpinner, memberSelectionArea, memberListContainer, generateSelectedBtn, generateSpinner, resetVerificationBtn;
let certificateResult, certificateResultTitle, certificateResultMessage, downloadLinks;
let messageBox, currentYearSpan, mapCanvas;
let cropModal, imageToCrop, cancelCropBtn, confirmCropBtn;
let commitmentModal, closeCommitmentBtn, cancelCommitmentBtn, confirmCommitmentBtn, clearSignatureBtn, signatureCanvas;
let commitmentName, commitmentPhone, commitmentCCCD, commitmentEmail, commitmentAddress, commitmentGroupSize, commitmentDate, commitmentTime, commitmentBirthday;
let downloadGpxBtn;
let representativeModal, startRegistrationBtn, startRegistrationArea, registrationFormContainer;
let cancelRepresentativeBtn, confirmRepresentativeBtn;

// Loading & Success Modals Elements
let registrationLoadingModal, registrationSuccessModal, closeSuccessModalBtn, downloadTicketBtn;
let ticketCode, ticketRegTime, ticketLeaderName, ticketPhone, ticketCCCD, ticketGroupSize, ticketClimbDateTime, ticketAddress, ticketMemberListContainer, ticketMemberList, ticketQRCode;
let loadingModalTitle, loadingModalDesc, loadingModalDetails;

// --- Trekking Route Data (Unchanged) ---
const powerPoleTrailGeoJSON = { /* ... GeoJSON data ... */
    "type": "Feature", "properties": { "name": "Đường cột điện", "highway": "footway", "surface": "wood" }, "geometry": { "type": "LineString", "coordinates": [ [106.1664847, 11.3636370], [106.1662692, 11.3638531], [106.1660653, 11.3641397], [106.1658347, 11.3646262], [106.1656858, 11.3648313], [106.1656147, 11.3649273], [106.1655959, 11.3650180], [106.1655664, 11.3650864], [106.1655718, 11.3651890], [106.1655557, 11.3652626], [106.1655128, 11.3652941], [106.1655182, 11.3653730], [106.1655772, 11.3654467], [106.1656845, 11.3655229], [106.1657301, 11.3656255], [106.1657944, 11.3657175], [106.1658615, 11.3657780], [106.1659151, 11.3658595], [106.1659715, 11.3659647], [106.1659929, 11.3660725], [106.1659634, 11.3661593], [106.1659634, 11.3662671], [106.1659634, 11.3663775], [106.1659205, 11.3664696], [106.1658347, 11.3666615], [106.1658695, 11.3667825], [106.1659151, 11.3668772], [106.1659701, 11.3670507], [106.1659902, 11.3671165], [106.1660090, 11.3672335], [106.1660399, 11.3672861], [106.1660747, 11.3673558], [106.1660935, 11.3674346], [106.1661042, 11.3675780], [106.1661163, 11.3676674], [106.1661592, 11.3677370], [106.1661579, 11.3678370], [106.1661525, 11.3678777], [106.1661941, 11.3679869], [106.1661954, 11.3680855], [106.1661726, 11.3681289], [106.1661418, 11.3681972], [106.1661606, 11.3682879], [106.1661887, 11.3683432], [106.1662021, 11.3684786], [106.1661726, 11.3685312], [106.1661056, 11.3685917], [106.1660586, 11.3686574], [106.1660466, 11.3687231], [106.1660814, 11.3687915], [106.1661230, 11.3689559], [106.1661538, 11.3690058], [106.1661860, 11.3691057], [106.1662196, 11.3692214], [106.1662732, 11.3695580], [106.1663081, 11.3697092], [106.1663108, 11.3697645], [106.1663550, 11.3698407], [106.1663537, 11.3699038], [106.1663376, 11.3699301], [106.1662826, 11.3699538], [106.1662665, 11.3699801], [106.1662786, 11.3700274], [106.1662893, 11.3701339], [106.1662839, 11.3702273], [106.1662330, 11.3702733], [106.1661673, 11.3703285], [106.1661109, 11.3703798], [106.1660801, 11.3704679], [106.1661029, 11.3705034], [106.1661150, 11.3706085], [106.1660747, 11.3706546], [106.1660036, 11.3706940], [106.1659460, 11.3707663], [106.1659540, 11.3708215], [106.1659607, 11.3708597], [106.1659768, 11.3709504], [106.1659648, 11.3710266], [106.1659326, 11.3710635], [106.1658950, 11.3711029], [106.1658816, 11.3711516], [106.1658803, 11.3712055], [106.1658937, 11.3712765], [106.1659648, 11.3713317], [106.1660358, 11.3713856], [106.1661109, 11.3714355], [106.1661914, 11.3715013], [106.1662450, 11.3715512], [106.1662531, 11.3715999], [106.1662692, 11.3716696], [106.1663349, 11.3717222], [106.1663859, 11.3717458], [106.1663993, 11.3717682], [106.1663912, 11.3718458], [106.1663778, 11.3718878], [106.1663872, 11.3720088], [106.1664677, 11.3721468], [106.1664797, 11.3722165], [106.1665106, 11.3722770], [106.1665481, 11.3723007], [106.1666380, 11.3723493], [106.1666822, 11.3724137], [106.1667533, 11.3724913], [106.1668164, 11.3725492], [106.1668579, 11.3726202], [106.1668982, 11.3727451], [106.1669223, 11.3728371], [106.1669451, 11.3730028], [106.1669759, 11.3731014], [106.1670202, 11.3731526], [106.1670819, 11.3732802], [106.1670685, 11.3732933], [106.1670698, 11.3733393], [106.1671248, 11.3734537], [106.1671382, 11.3736062], [106.1671101, 11.3736628], [106.1670497, 11.3737377], [106.1670524, 11.3738311], [106.1670765, 11.3739481], [106.1670832, 11.3740519], [106.1670698, 11.3741558], [106.1671020, 11.3741847], [106.1671449, 11.3742307], [106.1671972, 11.3742768], [106.1672334, 11.3743359], [106.1672455, 11.3744122], [106.1672187, 11.3744753], [106.1672133, 11.3745410], [106.1672737, 11.3745778], [106.1672965, 11.3746396], [106.1672629, 11.3746935], [106.1672388, 11.3747593], [106.1672576, 11.3747803], [106.1673193, 11.3748855], [106.1674038, 11.3749933], [106.1675017, 11.3750472], [106.1675969, 11.3751669], [106.1676760, 11.3752589], [106.1677310, 11.3753049], [106.1677793, 11.3753575], [106.1678115, 11.3754061], [106.1678651, 11.3754811], [106.1679067, 11.3755034], [106.1679764, 11.3755521], [106.1680703, 11.3756428], [106.1680904, 11.3757256], [106.1681360, 11.3757703], [106.1682138, 11.3758624], [106.1682741, 11.3759518], [106.1682996, 11.3760307], [106.1683251, 11.3761385], [106.1683425, 11.3762305], [106.1683492, 11.3762897], [106.1683801, 11.3763436], [106.1684230, 11.3763817], [106.1684659, 11.3764027], [106.1686094, 11.3764856], [106.1686765, 11.3765395], [106.1687408, 11.3766013], [106.1688025, 11.3766736], [106.1688253, 11.3767314], [106.1688428, 11.3768629], [106.1688401, 11.3770088], [106.1688602, 11.3770601], [106.1688924, 11.3771837], [106.1688910, 11.3772560], [106.1688857, 11.3773323], [106.1688937, 11.3774335], [106.1689031, 11.3775807], [106.1689259, 11.3776794], [106.1689407, 11.3777293], [106.1689661, 11.3778161], [106.1689970, 11.3779055], [106.1690345, 11.3779699], [106.1690949, 11.3780725], [106.1691257, 11.3781619], [106.1691847, 11.3782487], [106.1692277, 11.3783025], [106.1692920, 11.3784051], [106.1692934, 11.3784695], [106.1693148, 11.3785537], [106.1693121, 11.3786786], [106.1693242, 11.3787180], [106.1693484, 11.3787732], [106.1693470, 11.3788390], [106.1693417, 11.3788666], [106.1693470, 11.3789823], [106.1693457, 11.3791032], [106.1693497, 11.3792255], [106.1693538, 11.3793057], [106.1693591, 11.3793649], [106.1693524, 11.3794135], [106.1693644, 11.3795068], [106.1693604, 11.3796199], [106.1693510, 11.3796541], [106.1692840, 11.3797409], [106.1692679, 11.3798710], [106.1692384, 11.3799991], [106.1692277, 11.3801642], [106.1692317, 11.3802891], [106.1692518, 11.3803496], [106.1692800, 11.3804443], [106.1692558, 11.3805521], [106.1693001, 11.3806993], [106.1692947, 11.3808347], [106.1692491, 11.3809715], [106.1691834, 11.3810970], [106.1691532, 11.3812423], [106.1692143, 11.3813435], [106.1693477, 11.3814671], [106.1694603, 11.3815263], [106.1695898, 11.3815881], [106.1696689, 11.3817189], [106.1697579, 11.3818330] ] } };

// --- Utility Functions ---
function showMessage(message, type = 'info', duration = 6000) {
    clearTimeout(messageTimeout);
    const iconClass = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    const colorClass = type === 'success' ? 'bg-green-100 border-green-400 text-green-800' : type === 'error' ? 'bg-red-100 border-red-400 text-red-800' : type === 'warning' ? 'bg-yellow-100 border-yellow-400 text-yellow-800' : 'bg-blue-100 border-blue-400 text-blue-800';
    messageBox.innerHTML = `
        <div class="flex items-center">
            <i class="fa-solid ${iconClass} text-xl mr-3"></i>
            <span class="flex-1">${message}</span>
            <button id="closeMessageBtn" class="ml-4 text-lg text-gray-500 hover:text-gray-800 focus:outline-none" aria-label="Đóng">&times;</button>
        </div>
    `;
    messageBox.className = `fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] min-w-[280px] max-w-[90vw] px-4 py-3 rounded-lg shadow-lg border ${colorClass} message-box transition-all duration-300`;
    messageBox.classList.remove('hidden');
    messageBox.classList.add('show');

    // Nút đóng thủ công
    const closeBtn = document.getElementById('closeMessageBtn');
    if (closeBtn) closeBtn.onclick = hideMessage;

    // Ẩn khi click/touch bất kỳ đâu trên màn hình (trừ messageBox)
    function hideOnUserAction(e) {
        if (!messageBox.contains(e.target)) {
            hideMessage();
        }
    }
    document.addEventListener('mousedown', hideOnUserAction, { once: true });
    document.addEventListener('touchstart', hideOnUserAction, { once: true });

    // Scroll vào vùng nhìn thấy nếu bị che
    setTimeout(() => {
        messageBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    if (duration > 0) messageTimeout = setTimeout(hideMessage, duration);
}
function hideMessage() {
    clearTimeout(messageTimeout);
    messageBox.classList.remove('show');
    setTimeout(() => messageBox.classList.add('hidden'), 300); // Đợi hiệu ứng fade out
}
function deg2rad(deg) { return deg * (Math.PI / 180); }
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; const dLat = deg2rad(lat2 - lat1); const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c;
}
function setLoadingState(button, spinner, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    if (spinner) {
        spinner.classList.toggle('hidden', !isLoading);
    }
}

// Hàm format ngày từ yyyy-mm-dd sang dd/mm/yyyy
function formatDateToDDMMYYYY(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Trả về nguyên bản nếu không parse được
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Hàm format ngày từ Date object sang dd/mm/yyyy
function formatDateObjectToDDMMYYYY(date) {
    if (!date || isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Hàm validation ngày sinh
function validateBirthday() {
    const birthdayInput = document.getElementById('birthday');
    if (!birthdayInput) return;

    const birthdayValue = birthdayInput.value;
    if (!birthdayValue) return;

    // Kiểm tra format yyyy-mm-dd
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthdayValue)) {
        birthdayInput.setCustomValidity('Vui lòng chọn ngày sinh hợp lệ');
        return;
    }

    const birthday = new Date(birthdayValue);
    const today = new Date();
    const age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    
    // Tính tuổi chính xác
    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
        actualAge--;
    }

                if (actualAge < 15) {
                birthdayInput.setCustomValidity('Bạn phải từ 15 tuổi trở lên để đăng ký leo núi');
            } else if (actualAge > 100) {
                birthdayInput.setCustomValidity('Vui lòng kiểm tra lại ngày sinh');
            } else {
                birthdayInput.setCustomValidity('');
            }
}

// Hàm helper để đảm bảo format ngày sinh đúng
function ensureBirthdayFormat(birthdayValue) {
    if (!birthdayValue) return '';
    
    // Nếu đã đúng format yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(birthdayValue)) {
        return birthdayValue;
    }
    
    // Nếu là Date object
    if (birthdayValue instanceof Date) {
        const year = birthdayValue.getFullYear();
        const month = String(birthdayValue.getMonth() + 1).padStart(2, '0');
        const day = String(birthdayValue.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Nếu là string khác format, thử parse
    try {
        const date = new Date(birthdayValue);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch (e) {
        console.warn('Không thể parse ngày sinh:', birthdayValue);
    }
    
    return birthdayValue; // Trả về nguyên bản nếu không parse được
}

// Validate CMND/CCCD: 9 digits OR 12 digits starting with 0
function isValidNationalId(nationalId) {
    const value = String(nationalId || '').trim();
    return /^(?:\d{9}|0\d{11})$/.test(value);
}

// --- Name Validation (profanity filter removed per request) ---
function normalizeVi(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
}

function removeVietnameseDiacritics(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

// --- Date/Time Validation Helpers ---
function parseLocalDateTime(yyyyMmDd, hhMm) {
    if (!yyyyMmDd) return null;
    try {
        const [y, m, d] = yyyyMmDd.split('-').map(Number);
        if (!y || !m || !d) return null;
        let hours = 0, minutes = 0;
        if (hhMm && /^(\d{2}):(\d{2})$/.test(hhMm)) {
            const parts = hhMm.split(':').map(Number);
            hours = parts[0]; minutes = parts[1];
        }
        return new Date(y, m - 1, d, hours, minutes, 0, 0);
    } catch (e) { return null; }
}

function isClimbDateTimeWithinGrace(dateStr, timeStr, graceMinutes = 30) {
    const scheduled = parseLocalDateTime(dateStr, timeStr);
    if (!scheduled) return true; // if cannot parse, don't block here
    const now = new Date();
    const graceMs = Math.max(0, Number(graceMinutes)) * 60 * 1000;
    return scheduled.getTime() >= (now.getTime() - graceMs);
}

const PROFANITY_PATTERNS = [];

function containsProfanity(name) { return false; }

function isCleanName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return false;
    if (trimmed.length < 2 || trimmed.length > 100) return false;
    // profanity filter removed
    return true;
}

// Lưu ý về định dạng ngày:
// - Input type="date" trả về yyyy-mm-dd (đúng cho backend)
// - Hiển thị trong modal cam kết: dd/mm/yyyy (đã format)
// - Backend có hàm formatDateDMY() để chuyển yyyy-mm-dd sang dd/mm/yyyy cho PDF

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
    if (!mapCanvas) { 
        console.error('Map canvas not found');
        return; 
    }
    
    // Kiểm tra từng thư viện một cách chi tiết
    if (typeof L === 'undefined') {
        mapCanvas.innerHTML = '<div class="flex items-center justify-center h-full text-red-600"><i class="fa-solid fa-exclamation-triangle mr-2"></i> Lỗi: Leaflet chưa được tải.</div>';
        console.error('Leaflet library not loaded');
        return;
    }
    
    if (typeof L.Control === 'undefined') {
        mapCanvas.innerHTML = '<div class="flex items-center justify-center h-full text-red-600"><i class="fa-solid fa-exclamation-triangle mr-2"></i> Lỗi: Leaflet Control chưa được tải.</div>';
        console.error('Leaflet Control not available');
        return;
    }
    
    if (typeof L.Control.Locate === 'undefined') {
        mapCanvas.innerHTML = '<div class="flex items-center justify-center h-full text-red-600"><i class="fa-solid fa-exclamation-triangle mr-2"></i> Lỗi: Locate Control chưa được tải.</div>';
        console.error('Leaflet Locate Control not available');
        return;
    }
    mapCanvas.innerHTML = '';

    try {
        const mapCenter = [11.3727, 106.1676];
        const map = L.map(mapCanvas).setView(mapCenter, 15); // Use local map variable
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: ''
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
        mapCanvas.innerHTML = '<div class="flex items-center justify-center h-full text-red-600"><i class="fa-solid fa-exclamation-triangle mr-2"></i> Lỗi khởi tạo bản đồ. Vui lòng thử lại.</div>';
    }
}

// --- GPS Settings Management ---

// Load GPS settings from API first, then localStorage if needed (legacy - now using combined API)
async function loadGpsSettings() {
    console.warn('loadGpsSettings is deprecated, use loadAllDataFromAPI instead');
    // Fallback to localStorage
    const storedSettings = localStorage.getItem('gpsSettings');
    if (storedSettings) {
        GPS_SETTINGS = JSON.parse(storedSettings);
        console.log('GPS Settings loaded from localStorage (fallback):', GPS_SETTINGS);
    }
}

// Get current GPS settings
function getGpsSettings() {
    return GPS_SETTINGS;
}

// --- Registration Form Handler ---
async function handleRegistrationSubmit(event) {
    event.preventDefault();
    
    if (safetyCommitError) safetyCommitError.classList.add('hidden');

    // Kiểm tra thời gian đăng ký
    if (!validateRegistrationTime()) {
        return;
    }

    // Kiểm tra số lượng thành viên nhận chứng nhận không vượt quá số lượng đăng ký
    const groupSize = parseInt(groupSizeInput?.value || '0', 10);
    const memberListRaw = memberListInput?.value || '';
    const memberListArr = memberListRaw.split('\n').map(x => x.trim()).filter(x => x);
    if (memberListArr.length > groupSize) {
        showMessage('Số lượng thành viên nhận chứng nhận không được lớn hơn số lượng đăng ký!', 'error');
        return;
    }

    if (!registrationForm.checkValidity()) {
        registrationForm.reportValidity();
        if (safetyCommitCheckbox && !safetyCommitCheckbox.checked && safetyCommitError) {
            safetyCommitError.classList.remove('hidden');
        }
        showMessage('Vui lòng điền đủ thông tin (*) và xác nhận cam kết.', 'error');
        return;
    }
    // Validate climb date/time not before current time
    const climbDateVal = document.getElementById('climbDate')?.value || '';
    const climbTimeVal = document.getElementById('climbTime')?.value || '';
    if (!isClimbDateTimeWithinGrace(climbDateVal, climbTimeVal, 30)) {
        showMessage('Ngày/giờ leo chỉ được sớm hơn tối đa 30 phút so với hiện tại.', 'error');
        return;
    }
    // Validate leader name and each member name (basic length only)
    const leaderNameInput = document.getElementById('leaderName');
    const leaderNameVal = leaderNameInput ? leaderNameInput.value : '';
    if (!leaderNameVal || leaderNameVal.trim().length < 2 || leaderNameVal.trim().length > 100) {
        showMessage('Họ và tên không hợp lệ.', 'error');
        return;
    }
    const memberListRawCheck = memberListInput?.value || '';
    const memberListArrForCheck = memberListRawCheck.split('\n').map(x => x.trim()).filter(x => x);
    for (const name of memberListArrForCheck) {
        if (!name || name.length < 2 || name.length > 100) {
            showMessage('Danh sách thành viên chứa tên không hợp lệ.', 'error');
            return;
        }
    }
    
    // Kiểm tra xem có yêu cầu GPS cho đăng ký không
    if (!GPS_SETTINGS.requireGpsRegistration) {
        // Nếu không yêu cầu GPS, tiếp tục với form data
        const formData = new FormData(registrationForm);
        // Validate national ID
        const nationalId = formData.get('cccd');
        if (!isValidNationalId(nationalId)) {
            showMessage('Số CMND/CCCD phải gồm 9 số hoặc 12 số bắt đầu bằng 0.', 'error');
            return;
        }
        pendingRegistrationData = {
            leaderName: formData.get('leaderName'),
            birthday: ensureBirthdayFormat(formData.get('birthday')),
            phoneNumber: formData.get('phoneNumber'),
            cccd: formData.get('cccd'),
            address: formData.get('address'),
            groupSize: formData.get('groupSize'),
            email: formData.get('email'),
            climbDate: formData.get('climbDate'),
            climbTime: formData.get('climbTime'),
            safetyCommit: safetyCommitCheckbox.checked,
            memberList: formData.get('memberList').trim()
        };
        showCommitmentModal();
        return;
    }
    
    // Bật hiệu ứng loading và disable nút Đăng ký để tránh click nhiều lần
    setLoadingState(registerBtn, registerSpinner, true);
    
    // Hiển thị Loading Modal
    if (registrationLoadingModal) {
        if (loadingModalTitle) loadingModalTitle.textContent = 'Đang xác định vị trí...';
        if (loadingModalDesc) loadingModalDesc.textContent = 'Hệ thống đang kiểm tra tọa độ GPS của bạn để đảm bảo bạn ở đúng địa điểm đăng ký.';
        if (loadingModalDetails) loadingModalDetails.classList.add('hidden');
        registrationLoadingModal.classList.remove('hidden');
    }
    
    // Kiểm tra vị trí trước khi cho phép đăng ký
    showMessage('Đang kiểm tra vị trí đăng ký...', 'info', 0);

    if (!navigator.geolocation) {
        showMessage('Trình duyệt không hỗ trợ định vị. Vui lòng sử dụng thiết bị khác.', 'error');
        setLoadingState(registerBtn, registerSpinner, false);
        if (registrationLoadingModal) {
            registrationLoadingModal.classList.add('hidden');
        }
        return;
    }

    const LOCATION_TIMEOUT = 5000; // 5 giây
    const ACCEPTABLE_ACCURACY = 200; // mét
    let bestPosition = null;
    let hasProcessedLocation = false;
    let accuracyTimeout = null;

    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
            if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
                bestPosition = pos;
            }
            // Nếu có vị trí đủ tốt, dùng luôn
            if (bestPosition.coords.accuracy < ACCEPTABLE_ACCURACY && !hasProcessedLocation) {
                navigator.geolocation.clearWatch(watchId);
                if (accuracyTimeout) clearTimeout(accuracyTimeout);
                hasProcessedLocation = true;
                handleLocationCheckForRegistration(bestPosition);
            }
        },
        (err) => {
            if (accuracyTimeout) clearTimeout(accuracyTimeout);
            handleLocationErrorForRegistration(err);
        },
        { enableHighAccuracy: false, timeout: LOCATION_TIMEOUT, maximumAge: 60000 }
    );

    // Nếu sau 5 giây chưa có vị trí tốt, dùng vị trí tốt nhất hiện có
    accuracyTimeout = setTimeout(() => {
        if (!hasProcessedLocation && bestPosition) {
            navigator.geolocation.clearWatch(watchId);
            hasProcessedLocation = true;
            showMessage('Đang sử dụng vị trí hiện tại...', 'info', 1500);
            handleLocationCheckForRegistration(bestPosition);
        } else if (!hasProcessedLocation) {
            navigator.geolocation.clearWatch(watchId);
            showMessage('Không thể xác định vị trí chính xác. Vui lòng kiểm tra quyền truy cập vị trí và thử lại.', 'error');
            setLoadingState(registerBtn, registerSpinner, false);
        }
    }, LOCATION_TIMEOUT);
}

// Kiểm tra vị trí cho đăng ký
function handleLocationCheckForRegistration(position) {
    // Kiểm tra position có hợp lệ không
    if (!position || !position.coords) {
        showMessage('Không thể xác định vị trí. Vui lòng thử lại.', 'error');
        setLoadingState(registerBtn, registerSpinner, false);
        if (registrationLoadingModal) {
            registrationLoadingModal.classList.add('hidden');
        }
        return;
    }
    
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    const distance = getDistanceFromLatLonInMeters(userLat, userLon, REGISTRATION_LATITUDE, REGISTRATION_LONGITUDE);

    if (distance <= GPS_SETTINGS.registrationRadius) {
        showMessage('Vị trí hợp lệ. Đang chuẩn bị cam kết...', 'success', 2000);

        // Lưu lại dữ liệu form để dùng cho bước cam kết
        const formData = new FormData(registrationForm);
        // Validate climb date/time not before current time (redundant check)
        const climbDateVal2 = String(formData.get('climbDate') || '');
        const climbTimeVal2 = String(formData.get('climbTime') || '');
        if (!isClimbDateTimeWithinGrace(climbDateVal2, climbTimeVal2, 30)) {
            showMessage('Ngày/giờ leo chỉ được sớm hơn tối đa 30 phút so với hiện tại.', 'error');
            setLoadingState(registerBtn, registerSpinner, false);
            if (registrationLoadingModal) {
                registrationLoadingModal.classList.add('hidden');
            }
            return;
        }
        // Validate names (leader + members) with basic length only
        const leaderNameVal = String(formData.get('leaderName') || '').trim();
        if (!leaderNameVal || leaderNameVal.length < 2 || leaderNameVal.length > 100) {
            showMessage('Họ và tên không hợp lệ.', 'error');
            setLoadingState(registerBtn, registerSpinner, false);
            if (registrationLoadingModal) {
                registrationLoadingModal.classList.add('hidden');
            }
            return;
        }
        const memberListRawCheck2 = (formData.get('memberList') || '').toString();
        const memberListArrForCheck2 = memberListRawCheck2.split('\n').map(x => x.trim()).filter(x => x);
        for (const name of memberListArrForCheck2) {
            if (!name || name.length < 2 || name.length > 100) {
                showMessage('Danh sách thành viên chứa tên không hợp lệ.', 'error');
                setLoadingState(registerBtn, registerSpinner, false);
                if (registrationLoadingModal) {
                    registrationLoadingModal.classList.add('hidden');
                }
                return;
            }
        }
        // Validate national ID
        const nationalId = formData.get('cccd');
        if (!isValidNationalId(nationalId)) {
            showMessage('Số CMND/CCCD phải gồm 9 số hoặc 12 số bắt đầu bằng 0.', 'error');
            setLoadingState(registerBtn, registerSpinner, false);
            if (registrationLoadingModal) {
                registrationLoadingModal.classList.add('hidden');
            }
            return;
        }
        
        // Đảm bảo format ngày sinh đúng (yyyy-mm-dd)
        let birthdayValue = formData.get('birthday');
        if (birthdayValue) {
            // Nếu có flatpickr, lấy giá trị thực từ input
            const birthdayInput = document.getElementById('birthday');
            if (birthdayInput && birthdayInput._flatpickr && birthdayInput._flatpickr.selectedDates[0]) {
                birthdayValue = birthdayInput._flatpickr.selectedDates[0];
            }
            // Sử dụng helper function để đảm bảo format đúng
            birthdayValue = ensureBirthdayFormat(birthdayValue);
        }
        
        pendingRegistrationData = {
            leaderName: formData.get('leaderName'),
            birthday: birthdayValue,
            phoneNumber: formData.get('phoneNumber'),
            cccd: formData.get('cccd'),
            address: formData.get('address'),
            groupSize: formData.get('groupSize'),
            email: formData.get('email'),
            climbDate: formData.get('climbDate'),
            climbTime: formData.get('climbTime'),
            safetyCommit: safetyCommitCheckbox.checked,
            memberList: formData.get('memberList').trim()
        };

        setTimeout(() => {
            setLoadingState(registerBtn, registerSpinner, false);
            if (registrationLoadingModal) {
                registrationLoadingModal.classList.add('hidden');
            }
            showCommitmentModal();
        }, 2000);
    } else {
        showMessage(`Vị trí không hợp lệ (cách ${distance.toFixed(0)}m). Vui lòng di chuyển đến đúng địa điểm đăng ký và thử lại.`, 'error', 10000);
        setLoadingState(registerBtn, registerSpinner, false);
        if (registrationLoadingModal) {
            registrationLoadingModal.classList.add('hidden');
        }
    }
}

// Xử lý lỗi định vị cho đăng ký
function handleLocationErrorForRegistration(error) {
    let errorMsg = 'Lỗi định vị: ';
    let detailedMsg = '';
    
    switch (error.code) {
        case error.PERMISSION_DENIED: 
            errorMsg += 'Quyền truy cập bị từ chối.';
            detailedMsg = 'Vui lòng cấp quyền truy cập vị trí và thử lại.';
            break;
        case error.POSITION_UNAVAILABLE: 
            errorMsg += 'Thông tin vị trí không khả dụng.';
            detailedMsg = 'Không thể xác định vị trí. Vui lòng kiểm tra GPS và thử lại.';
            break;
        case error.TIMEOUT: 
            errorMsg += 'Yêu cầu vị trí hết thời gian chờ.';
            detailedMsg = 'Vui lòng thử lại sau.';
            break;
        default: 
            errorMsg += `Lỗi không xác định (${error.code}).`;
            detailedMsg = 'Vui lòng thử lại sau.';
            break;
    }
    
    const fullMessage = detailedMsg ? `${errorMsg} ${detailedMsg}` : errorMsg;
    showMessage(fullMessage, 'error', 12000);
    setLoadingState(registerBtn, registerSpinner, false);
    if (registrationLoadingModal) {
        registrationLoadingModal.classList.add('hidden');
    }
}



// --- Commitment Modal Functions ---

// Hiển thị modal cam kết
function showCommitmentModal() {
    if (!pendingRegistrationData) {
        showMessage('Lỗi: Không có dữ liệu đăng ký.', 'error');
        return;
    }

    // Cập nhật thông tin trong modal
    if (commitmentName) commitmentName.textContent = pendingRegistrationData.leaderName;
    if (commitmentPhone) commitmentPhone.textContent = pendingRegistrationData.phoneNumber;
    if (commitmentCCCD) commitmentCCCD.textContent = pendingRegistrationData.cccd;
    if (commitmentEmail) commitmentEmail.textContent = pendingRegistrationData.email;
    if (commitmentAddress) commitmentAddress.textContent = pendingRegistrationData.address;
    if (commitmentGroupSize) commitmentGroupSize.textContent = pendingRegistrationData.groupSize;
    if (commitmentDate) commitmentDate.textContent = formatDateToDDMMYYYY(pendingRegistrationData.climbDate) || 'Chưa chọn';
    if (commitmentTime) commitmentTime.textContent = pendingRegistrationData.climbTime || 'Chưa chọn';
    if (commitmentBirthday) commitmentBirthday.textContent = formatDateToDDMMYYYY(pendingRegistrationData.birthday) || '';

    // Tự động điền ngày tháng năm hiện tại với định dạng dd/mm/yyyy
    const today = new Date();
    const dayElement = document.getElementById('commitmentDay');
    const monthElement = document.getElementById('commitmentMonth');
    const yearElement = document.getElementById('commitmentYear');
    
    if (dayElement) dayElement.textContent = String(today.getDate()).padStart(2, '0');
    if (monthElement) monthElement.textContent = String(today.getMonth() + 1).padStart(2, '0');
    if (yearElement) yearElement.textContent = today.getFullYear();

    // Hiển thị modal
    if (commitmentModal) {
        commitmentModal.classList.remove('hidden');
        initializeSignatureCanvas();
    } else {
        showMessage('Lỗi: Không thể hiển thị modal cam kết.', 'error');
    }
}

// Khởi tạo canvas chữ ký
function initializeSignatureCanvas() {
    if (!signatureCanvas) return;

    const canvas = signatureCanvas;
    const ctx = canvas.getContext('2d');

    // Lấy kích thước hiển thị thực tế
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    // Tăng kích thước pixel thực tế để xuất ảnh nét hơn
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    // Scale context để nét hơn trên mọi thiết bị
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    signatureContext = ctx;

    // Thiết lập style cho canvas
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Xóa canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Thêm event listeners cho chữ ký
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events cho mobile
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', stopDrawing);
}

// Bắt đầu vẽ chữ ký
function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

// Vẽ chữ ký
function draw(e) {
    if (!isDrawing || !signatureContext) return;

    e.preventDefault();
    const canvas = signatureCanvas;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    signatureContext.lineTo(x, y);
    signatureContext.stroke();
    signatureContext.beginPath();
    signatureContext.moveTo(x, y);
}

// Dừng vẽ chữ ký
function stopDrawing() {
    isDrawing = false;
    if (signatureContext) {
        signatureContext.beginPath();
    }
}

// Xử lý touch events
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    signatureCanvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    signatureCanvas.dispatchEvent(mouseEvent);
}

// Xóa chữ ký
function clearSignature() {
    if (signatureContext && signatureCanvas) {
        signatureContext.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    }
}

// Kiểm tra chữ ký có hợp lệ không
function isSignatureValid() {
    if (!signatureContext || !signatureCanvas) return false;
    
    const imageData = signatureContext.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height);
    const data = imageData.data;
    
    // Kiểm tra xem có pixel nào được vẽ không
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true; // Có pixel được vẽ
    }
    return false;
}

// Ẩn modal cam kết
function hideCommitmentModal() {
    if (commitmentModal) {
        commitmentModal.classList.add('hidden');
    }
    pendingRegistrationData = null;
    clearSignature();
}

// Ẩn modal đăng ký thành công
function hideSuccessModal() {
    if (registrationSuccessModal) {
        registrationSuccessModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    // Khôi phục khu vực bắt đầu đăng ký
    if (startRegistrationArea && registrationFormContainer) {
        registrationFormContainer.classList.add('hidden');
        startRegistrationArea.classList.remove('hidden');
        startRegistrationArea.scrollIntoView({ behavior: 'smooth' });
    }
}

// Tải động thư viện html2canvas-pro
function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve();
    return new Promise((resolve, reject) => {
        console.log('Đang tải thư viện html2canvas-pro từ CDN...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas-pro@latest/dist/html2canvas.min.js';
        script.onload = () => {
            console.log('Thư viện html2canvas đã tải xong.');
            resolve();
        };
        script.onerror = () => {
            console.error('Không thể tải thư viện html2canvas.');
            reject(new Error('Không thể tải thư viện xuất ảnh.'));
        };
        document.head.appendChild(script);
    });
}

// Xử lý chụp ảnh và tải xuống ticket đăng ký thành công
async function handleDownloadTicketImage() {
    const ticketCard = document.getElementById('registrationTicketCard');
    if (!ticketCard) {
        showMessage('Không tìm thấy vé đăng ký để tải.', 'error');
        return;
    }

    if (!downloadTicketBtn) return;
    const originalContent = downloadTicketBtn.innerHTML;
    downloadTicketBtn.disabled = true;
    downloadTicketBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang tạo ảnh...';

    try {
        await loadHtml2Canvas();
        
        // Đợi 400ms để đảm bảo mã QR Code từ API đã được hiển thị đầy đủ
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Chụp ticketCard
        const canvas = await html2canvas(ticketCard, {
            useCORS: true,
            allowTaint: true,
            scale: 3, // Độ phân giải cao sắc nét
            backgroundColor: null // Giữ nền trong suốt cho các góc bo tròn
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // Tạo link để tải xuống
        const a = document.createElement('a');
        const codeText = ticketCode ? ticketCode.textContent : 'Ve_Dang_Ky';
        a.href = imgData;
        a.download = `Ve_Leo_Nui_${codeText}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showMessage('Đã tải ảnh vé thành công!', 'success', 4000);
    } catch (error) {
        console.error('Lỗi chụp ảnh vé:', error);
        showMessage('Không thể tải ảnh tự động. Vui lòng tự chụp lại màn hình điện thoại của bạn.', 'error', 8000);
    } finally {
        downloadTicketBtn.disabled = false;
        downloadTicketBtn.innerHTML = originalContent;
    }
}

// Hiển thị màn hình xác minh đăng ký cho bảo vệ (quét từ QR)
function showVerificationScreen(urlParams) {
    const overlay = document.getElementById('guardVerificationOverlay');
    if (!overlay) return;

    // Hiển thị lớp phủ
    overlay.classList.remove('hidden');
    document.title = 'Xác minh đăng ký leo núi';

    // Điền dữ liệu từ tham số URL
    const verifyCode = document.getElementById('verifyCode');
    const verifyLeader = document.getElementById('verifyLeader');
    const verifyPhone = document.getElementById('verifyPhone');
    const verifyCCCD = document.getElementById('verifyCCCD');
    const verifySize = document.getElementById('verifySize');
    const verifyDateTime = document.getElementById('verifyDateTime');

    if (verifyCode) verifyCode.textContent = urlParams.get('code') || 'N/A';
    if (verifyLeader) verifyLeader.textContent = urlParams.get('leader') || 'N/A';
    if (verifyPhone) verifyPhone.textContent = urlParams.get('phone') || 'N/A';
    if (verifyCCCD) verifyCCCD.textContent = urlParams.get('cccd') || 'N/A';
    
    const size = urlParams.get('size') || '0';
    if (verifySize) verifySize.textContent = `${size} Người`;
    
    const date = urlParams.get('date') || '--/--/----';
    const time = urlParams.get('time') || '--:--';
    if (verifyDateTime) verifyDateTime.textContent = `${date} ${time}`;
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
    hideMemberSelectionAndResults();

    // Kiểm tra xem có yêu cầu GPS cho chứng chỉ không
    if (!GPS_SETTINGS.requireGpsCertificate) {
        // Nếu không yêu cầu GPS, tiếp tục trực tiếp
        showMessage('Đang tải danh sách thành viên...', 'info', 0);
        fetchMembersListForSelection(phoneNumber);
        return;
    }

    // REFINED MESSAGE
    showMessage('Đang yêu cầu quyền vị trí...', 'info', 0);

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

    showMessage(`Vị trí xác định (~${accuracy.toFixed(0)}m). Đang kiểm tra...`, 'info', 0);

    const distance = getDistanceFromLatLonInMeters(userLat, userLon, SUMMIT_LATITUDE, SUMMIT_LONGITUDE);

    // Check distance to set isValid
    if (distance <= GPS_SETTINGS.certificateRadius) {
        isValid = true;
    }

    // Xử lý logic tiếp theo dựa trên isValid
    if (isValid) {
        showMessage(`Vị trí hợp lệ. Đang tải danh sách...`, 'info', 0);
        fetchMembersListForSelection(phoneNumber);
    } else {
        showMessage(`Vị trí không hợp lệ (cách đỉnh ~${distance.toFixed(0)}m). Cần trong phạm vi ${GPS_SETTINGS.certificateRadius}m. Vui lòng di chuyển đến đỉnh núi và thử lại.`, 'error', 12000);
        setLoadingState(verifyPhoneBtn, certSpinner, false);
    }
}

/** Geolocation error handler specific to the verification step. */
function handleLocationErrorForVerification(error) {
    let errorMsg = 'Lỗi định vị: ';
    
    switch (error.code) {
        case error.PERMISSION_DENIED: 
            errorMsg += 'Quyền truy cập bị từ chối.';
            break;
        case error.POSITION_UNAVAILABLE: 
            errorMsg += 'Thông tin vị trí không khả dụng.';
            break;
        case error.TIMEOUT: 
            errorMsg += 'Yêu cầu vị trí hết thời gian chờ.';
            break;
        default: 
            errorMsg += `Lỗi không xác định (${error.code}).`;
            break;
    }
    
    const fullMessage = `${errorMsg} Vui lòng cấp quyền truy cập vị trí và thử lại.`;
    
    showMessage(fullMessage, 'error', 10000);
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
            displayMemberListForSelection(result.members, phoneNumber);
            if(phoneVerificationArea) phoneVerificationArea.classList.add('hidden');
            if(memberSelectionArea) memberSelectionArea.classList.remove('hidden');
        } else {
             throw new Error(result.message || 'Không thể lấy danh sách thành viên.');
        }
    } catch (error) {
        // Check if it's a "not found" error
        if (error.message.includes('not found') || error.message.includes('Không tìm thấy')) {
            showMessage(`Số điện thoại ${phoneNumber} chưa được đăng ký trong hệ thống. Vui lòng kiểm tra lại hoặc đăng ký trước.`, 'error', 12000);
        } else {
            showMessage(`Lỗi tải danh sách: ${error.message}. Vui lòng thử lại.`, 'error', 10000);
        }
        resetVerificationProcess();
    } finally {
        setLoadingState(verifyPhoneBtn, certSpinner, false);
        if(memberListContainer) memberListContainer.classList.remove('loading');
        if (messageBox.classList.contains('info')) hideMessage();
    }
}

/** Dynamically creates and displays the member list for selection. */
function displayMemberListForSelection(members, phoneNumber) {
    if (!memberListContainer) return;
    memberListContainer.innerHTML = '';
    uploadedPhotos = {};

    if (members.length === 0) {
        memberListContainer.innerHTML = `
            <div class="text-center py-6">
                <div class="text-red-500 mb-2">
                    <i class="fas fa-exclamation-triangle text-2xl"></i>
                </div>
                <p class="text-red-600 font-medium mb-2">Số điện thoại chưa đăng ký!</p>
                <p class="text-gray-600 text-sm">Số điện thoại <strong>${phoneNumber}</strong> chưa được đăng ký trong hệ thống.</p>
                <p class="text-gray-500 text-sm mt-2">Vui lòng kiểm tra lại số điện thoại hoặc đăng ký trước khi nhận chứng chỉ.</p>
            </div>
        `;
        if (generateSelectedBtn) generateSelectedBtn.disabled = true;
        return;
    }

    if (generateSelectedBtn) generateSelectedBtn.disabled = false;

    // Thêm checkbox "Chọn tất cả"
    const selectAllId = 'selectAllMembersCheckbox';
    const selectAllDiv = document.createElement('div');
    selectAllDiv.className = 'flex items-center mb-2';
    selectAllDiv.innerHTML = `
        <input type="checkbox" id="${selectAllId}" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2">
        <label for="${selectAllId}" class="text-sm font-medium text-gray-700 cursor-pointer select-none">Chọn tất cả</label>
    `;
    memberListContainer.appendChild(selectAllDiv);

    // Tạo danh sách thành viên
    const memberCheckboxes = [];
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
        const checkbox = listItem.querySelector('.member-checkbox');
        if (checkbox) memberCheckboxes.push(checkbox);

        uploadBtn?.addEventListener('click', () => fileInput.click());
        fileInput?.addEventListener('change', handlePhotoSelection);
        removeBtn?.addEventListener('click', handleRemovePhoto);

        memberListContainer.appendChild(listItem);
    });

    // Xử lý logic "Chọn tất cả"
    const selectAllCheckbox = document.getElementById(selectAllId);
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            memberCheckboxes.forEach(cb => {
                cb.checked = selectAllCheckbox.checked;
            });
        });
        // Nếu tất cả checkbox con được tick thủ công thì "Chọn tất cả" cũng tick
        memberCheckboxes.forEach(cb => {
            cb.addEventListener('change', function() {
                const allChecked = memberCheckboxes.every(c => c.checked);
                selectAllCheckbox.checked = allChecked;
            });
        });
    }
}

// --- Photo Cropping Functions ---

// Fallback loadCropperJS function if not defined in HTML
if (typeof window.loadCropperJS !== 'function') {
    window.loadCropperJS = function() {
        if (window.Cropper) return Promise.resolve();
        
        return new Promise((resolve, reject) => {
            console.log('Fallback: Loading Cropper.js from CDN...');
            const cropperScript = document.createElement('script');
            cropperScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js';
            cropperScript.onload = () => {
                console.log('Fallback: Cropper.js script loaded');
                // Wait a bit more to ensure Cropper is available
                setTimeout(() => {
                    if (window.Cropper) {
                        console.log('Fallback: Cropper.js is available');
                        resolve();
                    } else {
                        console.log('Fallback: Cropper.js not available after load');
                        reject(new Error('Cropper.js not available after loading'));
                    }
                }, 100);
            };
            cropperScript.onerror = () => {
                console.log('Fallback: Failed to load Cropper.js');
                reject(new Error('Failed to load Cropper.js from CDN'));
            };
            document.head.appendChild(cropperScript);
        });
    };
}

/** Handles photo selection, validates, and opens the cropper modal. */
async function handlePhotoSelection(event) {
    const fileInput = event.target;
    const memberName = fileInput.dataset.memberName;
    const previewId = fileInput.dataset.previewId;
    const removeId = fileInput.dataset.removeId;
    const file = fileInput.files[0];

    if (!file || !previewId || !removeId || !memberName || !cropModal || !imageToCrop) {
        if (fileInput) fileInput.value = '';
        return;
    }

    // Validation
    if (!file.type.startsWith('image/')) {
        showMessage('Vui lòng chọn tệp ảnh.', 'error');
        fileInput.value = ''; return;
    }
    const maxSizeMB = 8;
    if (file.size > maxSizeMB * 1024 * 1024) {
        showMessage(`Ảnh quá lớn (tối đa ${maxSizeMB}MB).`, 'error');
        fileInput.value = ''; return;
    }

    try {
        // Ensure Cropper.js is loaded before proceeding
        if (typeof window.loadCropperJS !== 'function') {
            throw new Error('loadCropperJS function not available');
        }
        
        console.log('Loading Cropper.js...');
        await window.loadCropperJS();
        console.log('Cropper.js loaded, checking availability...');
        
        // Wait a bit more to ensure Cropper is fully available
        let attempts = 0;
        while (typeof window.Cropper === 'undefined' && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (typeof window.Cropper === 'undefined') {
            throw new Error('Cropper.js failed to load properly');
        }
        
        console.log('Cropper.js is ready to use');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            imageToCrop.src = e.target.result;
            currentCropContext = { name: memberName, previewId: previewId, removeId: removeId, fileInput: fileInput };
            cropModal.classList.remove('hidden');
            if (cropperInstance) cropperInstance.destroy();
            
            // Double-check that Cropper is available
            if (typeof window.Cropper === 'undefined') {
                showMessage('Lỗi: Thư viện cắt ảnh chưa được tải.', 'error');
                handleCancelCrop();
                return;
            }
            
            cropperInstance = new window.Cropper(imageToCrop, {
                aspectRatio: CROP_ASPECT_RATIO, viewMode: 1, dragMode: 'move', background: false,
                autoCropArea: 0.9, responsive: true, restore: false, checkOrientation: false,
                modal: true, guides: true, center: true, highlight: false, cropBoxMovable: true,
                cropBoxResizable: true, toggleDragModeOnDblclick: false,
            });
        }
        reader.onerror = (e) => {
            showMessage('Lỗi đọc tệp ảnh.', 'error');
            fileInput.value = '';
            handleCancelCrop();
        }
        reader.readAsDataURL(file);
    } catch (error) {
        showMessage('Lỗi tải thư viện cắt ảnh.', 'error');
        fileInput.value = '';
    }
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

        const croppedBase64 = croppedCanvas.toDataURL('image/jpeg', 0.95); // Quality 0.95 for higher quality
        const { name, previewId, removeId } = currentCropContext;
        const previewImg = document.getElementById(previewId);
        const removeBtn = document.getElementById(removeId);

        uploadedPhotos[name] = croppedBase64;

        if (previewImg) { previewImg.src = croppedBase64; previewImg.classList.remove('hidden'); }
        if (removeBtn) removeBtn.classList.remove('hidden');

        handleCancelCrop();

    } catch (error) {
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
    }
}

// --- Certificate Generation & Display ---

/** Gathers selected members and sends data to generate certificates. */
async function handleGenerateSelectedCertificates() {
    if (!verifiedPhoneNumber) {
        showMessage('Lỗi: SĐT chưa được xác thực.', 'error');
        return;
    }

    const checkedBoxes = memberListContainer.querySelectorAll('.member-checkbox:checked');
    if (checkedBoxes.length === 0) {
        showMessage('Vui lòng chọn thành viên.', 'error');
        return;
    }

    setLoadingState(generateSelectedBtn, generateSpinner, true);
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

    const postData = { 
        action: 'generateCertificatesWithPhotos', 
        phone: verifiedPhoneNumber, 
        members: selectedMembersData,
        verificationMethod: 'gps'
    };

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST', redirect: "follow",
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(postData)
        });
        const result = await response.json();

        if (result.success || (result.pdfLinks && result.pdfLinks.length > 0)) {
            hideMessage();
            let resultMessage = result.message || `Hoàn tất! Đã tạo ${result.pdfLinks?.length || 0} chứng nhận.`;
            showMessage(resultMessage, (result.pdfLinks?.length > 0) ? 'success' : 'info', 15000);

            if (result.pdfLinks && result.pdfLinks.length > 0) {
                displayDownloadLinks(result.pdfLinks);
            } else {
                displayDownloadLinks([]);
                if (certificateResultMessage) certificateResultMessage.textContent = result.message || 'Không có chứng nhận nào được tạo thành công.';
            }
        } else {
             throw new Error(result.message || `Không thể tạo chứng nhận.`);
        }
    } catch (error) {
        showMessage(`Lỗi tạo chứng nhận: ${error.message}. Vui lòng thử lại.`, 'error', 10000);
    } finally {
        setLoadingState(generateSelectedBtn, generateSpinner, false);
        if (messageBox.classList.contains('info')) hideMessage();
    }
}

/** Displays the final download links. */
function displayDownloadLinks(pdfLinks) {
    if (!certificateResult || !certificateResultTitle || !certificateResultMessage || !downloadLinks) {
        return;
    }
    downloadLinks.innerHTML = '';

    if (!Array.isArray(pdfLinks) || pdfLinks.length === 0) {
        certificateResultTitle.textContent = 'Thông báo';
        certificateResultMessage.textContent = certificateResultMessage.textContent || 'Không có chứng nhận nào được tạo hoặc có lỗi.';
    } else {
        certificateResultTitle.textContent = 'Chúc mừng! Chứng nhận đã sẵn sàng';
        certificateResultMessage.textContent = 'Tải chứng nhận của các thành viên đã tạo:';
        pdfLinks.forEach(linkInfo => {
            if (!linkInfo || typeof linkInfo !== 'object' || !linkInfo.name || !linkInfo.url) { return; }
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
    }
}



// Xử lý xác nhận cam kết
async function handleConfirmCommitment() {
    if (!isSignatureValid()) {
        showMessage('Vui lòng ký tay để xác nhận cam kết.', 'error');
        return;
    }

    if (!pendingRegistrationData) {
        showMessage('Lỗi: Không có dữ liệu đăng ký.', 'error');
        return;
    }

    // Disable nút xác nhận cam kết ngay khi bắt đầu gửi + hiệu ứng loading
    if (confirmCommitmentBtn) {
        confirmCommitmentBtn.disabled = true;
        confirmCommitmentBtn.classList.add('opacity-60', 'cursor-not-allowed');
        let spinner = confirmCommitmentBtn.querySelector('.spinner');
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.className = 'spinner ml-2 border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block align-middle animate-spin';
            confirmCommitmentBtn.appendChild(spinner);
        } else {
            spinner.classList.remove('hidden');
        }
    }

    // Thiết lập nội dung cho Loading Modal khi gửi đăng ký
    if (loadingModalTitle) loadingModalTitle.textContent = 'Đang gửi đăng ký...';
    if (loadingModalDesc) loadingModalDesc.textContent = 'Hệ thống đang lưu trữ thông tin cam kết và tạo hồ sơ đăng ký leo núi của bạn.';
    if (loadingModalDetails) loadingModalDetails.classList.remove('hidden');

    // Hiển thị Loading Modal
    if (registrationLoadingModal) {
        registrationLoadingModal.classList.remove('hidden');
    }

    // Thông báo chờ
    showMessage('Vui lòng chờ, đang tạo bản cam kết...', 'info', 0);
    setLoadingState(confirmCommitmentBtn, null, true);

    try {
        // Lấy chữ ký dưới dạng base64
        const signatureData = signatureCanvas.toDataURL('image/png');

        const data = {
            action: 'register',
            ...pendingRegistrationData,
            signatureData: signatureData,
            locationMethod: 'gps'
        };

        showMessage('Đang gửi thông tin đăng ký...', 'info', 0);
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            redirect: "follow",
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            hideMessage(); // Ẩn thông báo đợi trước khi hiển thị thành công
            
            // Tạo mã đăng ký ngẫu nhiên client-side
            const regDate = new Date();
            const formattedTime = String(regDate.getHours()).padStart(2, '0') + ':' + String(regDate.getMinutes()).padStart(2, '0');
            const formattedDate = String(regDate.getDate()).padStart(2, '0') + '/' + String(regDate.getMonth() + 1).padStart(2, '0') + '/' + regDate.getFullYear();
            const regTimeStr = `${formattedTime} ${formattedDate}`;
            
            const phoneStr = String(pendingRegistrationData.phoneNumber || '');
            const last4Phone = phoneStr.length >= 4 ? phoneStr.slice(-4) : 'xxxx';
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const ticketCodeStr = `NBD-${last4Phone}-${randomNum}`;

            // Điền thông tin vào Success Modal (Vé điện tử)
            if (ticketCode) ticketCode.textContent = ticketCodeStr;
            if (ticketRegTime) ticketRegTime.textContent = regTimeStr;
            if (ticketLeaderName) ticketLeaderName.textContent = pendingRegistrationData.leaderName;
            if (ticketPhone) ticketPhone.textContent = pendingRegistrationData.phoneNumber;
            if (ticketCCCD) ticketCCCD.textContent = pendingRegistrationData.cccd;
            if (ticketGroupSize) ticketGroupSize.textContent = `${pendingRegistrationData.groupSize} Người`;
            
            const climbDateFormatted = formatDateToDDMMYYYY(pendingRegistrationData.climbDate);
            const climbTimeStr = pendingRegistrationData.climbTime || '--:--';
            if (ticketClimbDateTime) ticketClimbDateTime.textContent = `${climbDateFormatted} ${climbTimeStr}`;
            if (ticketAddress) ticketAddress.textContent = pendingRegistrationData.address;

            // Xử lý danh sách đoàn
            if (ticketMemberListContainer && ticketMemberList) {
                const memberListStr = pendingRegistrationData.memberList || '';
                const membersArray = memberListStr.split('\n').map(m => m.trim()).filter(Boolean);
                if (membersArray.length > 0) {
                    ticketMemberList.innerHTML = membersArray.map((m, idx) => `${idx + 1}. ${escapeHtml(m)}`).join('<br>');
                    ticketMemberListContainer.classList.remove('hidden');
                } else {
                    ticketMemberListContainer.classList.add('hidden');
                }
            }
            // Tạo mã QR Code
            if (ticketQRCode) {
                const verifyUrl = new URL(window.location.origin + window.location.pathname);
                verifyUrl.searchParams.append('verify', '1');
                verifyUrl.searchParams.append('code', ticketCodeStr);
                verifyUrl.searchParams.append('leader', removeVietnameseDiacritics(pendingRegistrationData.leaderName));
                verifyUrl.searchParams.append('phone', pendingRegistrationData.phoneNumber);
                verifyUrl.searchParams.append('cccd', pendingRegistrationData.cccd);
                verifyUrl.searchParams.append('size', pendingRegistrationData.groupSize);
                verifyUrl.searchParams.append('date', climbDateFormatted);
                verifyUrl.searchParams.append('time', climbTimeStr);
                
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verifyUrl.toString())}&ecc=M`;
                ticketQRCode.src = qrUrl;
            }
            // Hiển thị Success Modal
            if (registrationSuccessModal) {
                registrationSuccessModal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }

            // Reset form
            registrationForm.reset();
            if (safetyCommitError) safetyCommitError.classList.add('hidden');
            
            // Đóng các modal trung gian
            if (registrationLoadingModal) registrationLoadingModal.classList.add('hidden');
            hideCommitmentModal();
        } else {
            throw new Error(result.message || 'Đăng ký thất bại từ máy chủ.');
        }
    } catch (error) {
        hideMessage(); // Ẩn thông báo đợi trước khi hiển thị lỗi
        if (registrationLoadingModal) registrationLoadingModal.classList.add('hidden');
        showMessage(`Lỗi đăng ký: ${error.message}. Vui lòng thử lại.`, 'error', 15000);
    } finally {
        setLoadingState(confirmCommitmentBtn, null, false);
        if (confirmCommitmentBtn) {
            confirmCommitmentBtn.disabled = false;
            confirmCommitmentBtn.classList.remove('opacity-60', 'cursor-not-allowed');
            let spinner = confirmCommitmentBtn.querySelector('.spinner');
            if (spinner) spinner.classList.add('hidden');
        }
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Kiểm tra xem có đang ở chế độ xác minh vé dành cho bảo vệ không
    const searchStr = window.location.search.replace(/&amp;amp;/g, '&').replace(/&amp;/g, '&');
    const urlParams = new URLSearchParams(searchStr);
    if (urlParams.has('verify')) {
        showVerificationScreen(urlParams);
        return; // Dừng khởi tạo phần còn lại của trang vì bảo vệ chỉ cần xem màn hình xác minh
    }

    // Khởi tạo tất cả DOM elements
    initializeDOMElements();
    
    // Thiết lập event listeners
    setupEventListeners();
    
    // Tự động điền ngày và giờ hiện tại
    setupDefaultDateTime();
    
    // Load all data from combined API
    await loadAllDataFromAPI();
    
    // Khởi tạo hệ thống thông báo admin
    initializeNotificationSystem();
    
    // Khởi tạo bản đồ với delay nhỏ để đảm bảo Leaflet đã load
    setTimeout(() => {
        initializeLeafletMap();
    }, 100);

            // Khởi tạo flatpickr cho ngày sinh (nếu có)
        const birthdayInput = document.getElementById('birthday');
        if (birthdayInput && typeof flatpickr !== 'undefined') {
            flatpickr(birthdayInput, {
                dateFormat: "Y-m-d",
                maxDate: "2009-12-31", // Giới hạn 15 tuổi trở lên
                locale: "vn",
                altInput: true,
                altFormat: "d/m/Y",
                yearRange: [1900, 2009],
                defaultDate: null,
                onChange: function(selectedDates, dateStr, instance) {
                    // Đảm bảo format đúng cho backend
                    birthdayInput.value = dateStr;
                }
            });
        } else if (birthdayInput) {
        // Fallback cho mobile: thêm validation và format
        birthdayInput.addEventListener('input', function() {
            // Đảm bảo format yyyy-mm-dd
            let value = this.value;
            if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                // Nếu người dùng nhập dd/mm/yyyy, chuyển thành yyyy-mm-dd
                const parts = value.split('/');
                if (parts.length === 3) {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2];
                    if (year.length === 4) {
                        this.value = `${year}-${month}-${day}`;
                    }
                }
            }
        });
    }
});

// Hàm khởi tạo tất cả DOM elements
function initializeDOMElements() {
    // Registration Form
    registrationForm = document.getElementById('registrationForm');
    registerBtn = document.getElementById('registerBtn');
    registerSpinner = document.getElementById('registerSpinner');
    groupSizeInput = document.getElementById('groupSize');
    memberListInput = document.getElementById('memberList');
    safetyCommitCheckbox = document.getElementById('safetyCommit');
    safetyCommitError = document.getElementById('safetyCommitError');

    // Certification Flow
    phoneVerificationArea = document.getElementById('phoneVerificationArea');
    verifyPhoneNumberInput = document.getElementById('verifyPhoneNumber');
    verifyPhoneBtn = document.getElementById('verifyPhoneBtn');
    certSpinner = document.getElementById('certSpinner');
    memberSelectionArea = document.getElementById('memberSelectionArea');
    memberListContainer = document.getElementById('memberListContainer');
    generateSelectedBtn = document.getElementById('generateSelectedBtn');
    generateSpinner = document.getElementById('generateSpinner');
    resetVerificationBtn = document.getElementById('resetVerificationBtn');

    // Results Area
    certificateResult = document.getElementById('certificateResult');
    certificateResultTitle = document.getElementById('certificateResultTitle')?.querySelector('span');
    certificateResultMessage = document.getElementById('certificateResultMessage');
    downloadLinks = document.getElementById('downloadLinks');

    // General Elements
    messageBox = document.getElementById('messageBox');
    currentYearSpan = document.getElementById('currentYear');
    mapCanvas = document.getElementById('mapCanvas');

    // Cropper Modal Elements
    cropModal = document.getElementById('cropModal');
    imageToCrop = document.getElementById('imageToCrop');
    cancelCropBtn = document.getElementById('cancelCropBtn');
    confirmCropBtn = document.getElementById('confirmCropBtn');

    // Commitment Modal Elements
    commitmentModal = document.getElementById('commitmentModal');
    closeCommitmentBtn = document.getElementById('closeCommitmentBtn');
    cancelCommitmentBtn = document.getElementById('cancelCommitmentBtn');
    confirmCommitmentBtn = document.getElementById('confirmCommitmentBtn');
    clearSignatureBtn = document.getElementById('clearSignatureBtn');
    signatureCanvas = document.getElementById('signatureCanvas');

    // Commitment Display Elements
    commitmentName = document.getElementById('commitmentName');
    commitmentPhone = document.getElementById('commitmentPhone');
    commitmentCCCD = document.getElementById('commitmentCCCD');
    commitmentEmail = document.getElementById('commitmentEmail');
    commitmentAddress = document.getElementById('commitmentAddress');
    commitmentGroupSize = document.getElementById('commitmentGroupSize');
    commitmentDate = document.getElementById('commitmentDate');
    commitmentTime = document.getElementById('commitmentTime');
    commitmentBirthday = document.getElementById('commitmentBirthday');

    // Other Elements
    downloadGpxBtn = document.getElementById('downloadGpxBtn');

    // Representative Modal Elements
    representativeModal = document.getElementById('representativeModal');
    startRegistrationBtn = document.getElementById('startRegistrationBtn');
    startRegistrationArea = document.getElementById('startRegistrationArea');
    registrationFormContainer = document.getElementById('registrationFormContainer');
    cancelRepresentativeBtn = document.getElementById('cancelRepresentativeBtn');
    confirmRepresentativeBtn = document.getElementById('confirmRepresentativeBtn');

    // Cập nhật năm hiện tại
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

    // Loading & Success Modals
    registrationLoadingModal = document.getElementById('registrationLoadingModal');
    loadingModalTitle = document.getElementById('loadingModalTitle');
    loadingModalDesc = document.getElementById('loadingModalDesc');
    loadingModalDetails = document.getElementById('loadingModalDetails');
    registrationSuccessModal = document.getElementById('registrationSuccessModal');
    downloadTicketBtn = document.getElementById('downloadTicketBtn');
    closeSuccessModalBtn = document.getElementById('closeSuccessModalBtn');
    ticketCode = document.getElementById('ticketCode');
    ticketRegTime = document.getElementById('ticketRegTime');
    ticketLeaderName = document.getElementById('ticketLeaderName');
    ticketPhone = document.getElementById('ticketPhone');
    ticketCCCD = document.getElementById('ticketCCCD');
    ticketGroupSize = document.getElementById('ticketGroupSize');
    ticketClimbDateTime = document.getElementById('ticketClimbDateTime');
    ticketAddress = document.getElementById('ticketAddress');
    ticketMemberListContainer = document.getElementById('ticketMemberListContainer');
    ticketMemberList = document.getElementById('ticketMemberList');
    ticketQRCode = document.getElementById('ticketQRCode');

    // Đảm bảo các modal được ẩn khi khởi tạo
    if (commitmentModal) {
        commitmentModal.classList.add('hidden');
    }
    if (registrationLoadingModal) {
        registrationLoadingModal.classList.add('hidden');
    }
    if (registrationSuccessModal) {
        registrationSuccessModal.classList.add('hidden');
    }
}

// --- Representative Modal Functions ---
function showRepresentativeModal() {
    if (representativeModal) {
        representativeModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function hideRepresentativeModal() {
    if (representativeModal) {
        representativeModal.classList.add('hidden');
        document.body.style.overflow = '';
        // Reset selection
        selectedRepresentativeType = null;
        const radioButtons = document.querySelectorAll('input[name="representativeType"]');
        radioButtons.forEach(radio => radio.checked = false);
        if (confirmRepresentativeBtn) {
            confirmRepresentativeBtn.disabled = true;
            confirmRepresentativeBtn.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
        }
    }
}



function selectRepresentativeType(type) {
    selectedRepresentativeType = type;
    
    // Update radio button
    const radioButton = document.getElementById(type + 'Type');
    if (radioButton) {
        radioButton.checked = true;
    }
    
    // Auto-fill group size for individual climber
    if (type === 'individual' && groupSizeInput) {
        groupSizeInput.value = '1';
        // Trigger change event to update any dependent logic
        groupSizeInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Enable/disable confirm button based on selection
    if (confirmRepresentativeBtn) {
        if (type === 'member') {
            confirmRepresentativeBtn.disabled = true;
            confirmRepresentativeBtn.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
        } else {
            confirmRepresentativeBtn.disabled = false;
            confirmRepresentativeBtn.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
        }
    }
}

function handleConfirmRepresentative() {
    if (!selectedRepresentativeType) {
        showMessage('Vui lòng chọn vai trò của bạn.', 'error');
        return;
    }
    
    if (selectedRepresentativeType === 'member') {
        showMessage('Vui lòng liên hệ trưởng đoàn để đăng ký thay vì tự đăng ký.', 'warning');
        return;
    }
    
    // Hide modal and show registration form
    hideRepresentativeModal();
    
    // Show registration form
    if (startRegistrationArea) {
        startRegistrationArea.classList.add('hidden');
    }
    if (registrationFormContainer) {
        registrationFormContainer.classList.remove('hidden');
    }
    
    // Show success message
    showMessage(`Đã xác nhận vai trò: ${selectedRepresentativeType === 'leader' ? 'Trưởng đoàn/Đại diện nhóm' : 'Cá nhân leo núi'}. Vui lòng điền thông tin đăng ký.`, 'success');
}

// Hàm thiết lập event listeners
function setupEventListeners() {
    // Representative Modal Event Listeners
    if (startRegistrationBtn) startRegistrationBtn.addEventListener('click', showRepresentativeModal);
    if (cancelRepresentativeBtn) cancelRepresentativeBtn.addEventListener('click', hideRepresentativeModal);
    if (confirmRepresentativeBtn) confirmRepresentativeBtn.addEventListener('click', handleConfirmRepresentative);
    
    // Registration Form Event Listeners
    if (registrationForm) registrationForm.addEventListener('submit', handleRegistrationSubmit);
    
    if (verifyPhoneBtn) verifyPhoneBtn.addEventListener('click', handleVerifyPhoneAndLocation);
    if (generateSelectedBtn) generateSelectedBtn.addEventListener('click', handleGenerateSelectedCertificates);
    if (resetVerificationBtn) resetVerificationBtn.addEventListener('click', resetVerificationProcess);
    if (downloadGpxBtn) downloadGpxBtn.addEventListener('click', handleDownloadGpx);

    // Cropper Modal Button Listeners
    if (cancelCropBtn) cancelCropBtn.addEventListener('click', handleCancelCrop);
    if (confirmCropBtn) confirmCropBtn.addEventListener('click', handleConfirmCrop);

    // Commitment Modal Button Listeners
    if (closeCommitmentBtn) closeCommitmentBtn.addEventListener('click', hideCommitmentModal);
    if (cancelCommitmentBtn) cancelCommitmentBtn.addEventListener('click', hideCommitmentModal);
    if (clearSignatureBtn) clearSignatureBtn.addEventListener('click', clearSignature);
    if (confirmCommitmentBtn) confirmCommitmentBtn.addEventListener('click', handleConfirmCommitment);
    if (closeSuccessModalBtn) closeSuccessModalBtn.addEventListener('click', hideSuccessModal);
    if (downloadTicketBtn) downloadTicketBtn.addEventListener('click', handleDownloadTicketImage);

    if (safetyCommitCheckbox && safetyCommitError) {
        safetyCommitCheckbox.addEventListener('change', () => {
            safetyCommitError.classList.toggle('hidden', safetyCommitCheckbox.checked);
        });
    }

    // Validation cho ngày sinh
    const birthdayInput = document.getElementById('birthday');
    if (birthdayInput) {
        birthdayInput.addEventListener('change', validateBirthday);
        birthdayInput.addEventListener('blur', validateBirthday);
    }



    // Enforce CMND/CCCD only digits and max length 12 while typing
    const cccdInput = document.getElementById('cccd');
    if (cccdInput) {
        // Set maxlength attribute for text inputs; if type=number, we'll still hard-truncate below
        try { cccdInput.setAttribute('maxlength', '12'); } catch (e) {}
        cccdInput.setAttribute('inputmode', 'numeric');
        cccdInput.addEventListener('input', function() {
            const digitsOnly = this.value.replace(/\D/g, '');
            // Allow up to 12 digits max
            const truncated = digitsOnly.slice(0, 12);
            if (this.value !== truncated) this.value = truncated;
        });
        cccdInput.addEventListener('paste', function(e) {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            const digitsOnly = String(pasted || '').replace(/\D/g, '').slice(0, 12);
            document.execCommand('insertText', false, digitsOnly);
        });
    }

    // Close representative modal when clicking outside
    if (representativeModal) {
        representativeModal.addEventListener('click', function(e) {
            if (e.target === representativeModal) {
                hideRepresentativeModal();
            }
        });
    }
}

// Hàm thiết lập ngày giờ mặc định
function setupDefaultDateTime() {
    const climbDateInput = document.getElementById('climbDate');
    const climbTimeInput = document.getElementById('climbTime');
    const now = new Date();
    
    if (climbDateInput) {
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        climbDateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    
    if (climbTimeInput) {
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        climbTimeInput.value = `${hh}:${min}`;
    }
}

// --- Admin Notification System ---
let adminNotifications = [];
let notificationCheckInterval = null;

// Configuration for notification system
const NOTIFICATION_CONFIG = {
    DISPLAY_DURATION: 10000, // Show notifications for 10 seconds
    FADE_DURATION: 500, // Fade animation duration
    MAX_NOTIFICATIONS: 3 // Maximum number of notifications to show at once
};

// Notification types and their styling
const NOTIFICATION_TYPES = {
    weather: { 
        name: 'Cảnh báo thời tiết', 
        icon: 'fa-cloud-rain', 
        bgColor: 'bg-blue-100', 
        borderColor: 'border-blue-500', 
        textColor: 'text-blue-900',
        iconColor: 'text-blue-600'
    },
    maintenance: { 
        name: 'Bảo trì', 
        icon: 'fa-tools', 
        bgColor: 'bg-yellow-100', 
        borderColor: 'border-yellow-500', 
        textColor: 'text-yellow-900',
        iconColor: 'text-yellow-600'
    },
    announcement: { 
        name: 'Thông báo chung', 
        icon: 'fa-bullhorn', 
        bgColor: 'bg-green-100', 
        borderColor: 'border-green-500', 
        textColor: 'text-green-900',
        iconColor: 'text-green-600'
    },
    emergency: { 
        name: 'Khẩn cấp', 
        icon: 'fa-exclamation-triangle', 
        bgColor: 'bg-red-100', 
        borderColor: 'border-red-500', 
        textColor: 'text-red-900',
        iconColor: 'text-red-600'
    }
};

// Function to fetch notifications from admin system (legacy - now using combined API)
async function fetchAdminNotifications() {
    console.warn('fetchAdminNotifications is deprecated, use loadAllDataFromAPI instead');
    return [];
}

// Function to check if notification is new (not seen before)
function isNewNotification(notification) {
    const seenNotifications = JSON.parse(localStorage.getItem('seenNotifications') || '[]');
    const isSeen = seenNotifications.includes(notification.id);
    
    return !isSeen;
    
    // Production code (uncomment when deploying)
    // return !isSeen;
}

// Function to mark notification as seen
function markNotificationAsSeen(notificationId) {
    const seenNotifications = JSON.parse(localStorage.getItem('seenNotifications') || '[]');
    if (!seenNotifications.includes(notificationId)) {
        seenNotifications.push(notificationId);
        localStorage.setItem('seenNotifications', JSON.stringify(seenNotifications));
    }
}

// Function to create notification HTML
function createNotificationHTML(notification) {
    const typeInfo = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.announcement;
    
    return `
        <div id="notification-${notification.id}" class="notification-item notification-enter bg-white border-l-4 ${typeInfo.borderColor} rounded-lg shadow-lg p-4" data-notification-id="${notification.id}">
            <div class="flex items-start justify-between">
                <div class="flex items-start space-x-3 flex-1">
                    <div class="flex-shrink-0 mt-1">
                        <div class="w-10 h-10 rounded-full ${typeInfo.bgColor} flex items-center justify-center">
                            <i class="fas ${typeInfo.icon} ${typeInfo.iconColor} text-lg"></i>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-semibold ${typeInfo.textColor} text-base leading-tight">${notification.title}</h4>
                            <span class="px-3 py-1 text-xs font-medium ${typeInfo.bgColor} ${typeInfo.textColor} rounded-full">
                                ${typeInfo.name}
                            </span>
                        </div>
                        <p class="text-sm ${typeInfo.textColor} opacity-90 leading-relaxed">${notification.message}</p>
                    </div>
                </div>
                <button onclick="dismissNotification('${notification.id}')" class="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>
        </div>
    `;
}

// Function to show notification
function showNotification(notification) {
    console.log('Showing notification:', notification);
    
    const container = document.getElementById('adminNotifications');
    if (!container) {
        console.error('adminNotifications container not found!');
        return;
    }
    
    console.log('Found adminNotifications container:', container);
    
    const notificationHTML = createNotificationHTML(notification);
    container.insertAdjacentHTML('beforeend', notificationHTML);
    
    // Animate in
    const notificationElement = document.getElementById(`notification-${notification.id}`);
    if (notificationElement) {
        // Force reflow
        notificationElement.offsetHeight;
        
        setTimeout(() => {
            notificationElement.classList.remove('notification-enter');
            notificationElement.classList.add('notification-enter-active');
        }, 50);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            dismissNotification(notification.id);
        }, 10000);
    }
    
    // Auto dismiss after duration
    setTimeout(() => {
        dismissNotification(notification.id);
    }, NOTIFICATION_CONFIG.DISPLAY_DURATION);
    
    // Mark as seen
    markNotificationAsSeen(notification.id);
}

// Function to dismiss notification
function dismissNotification(notificationId) {
    const notificationElement = document.getElementById(`notification-${notificationId}`);
    if (!notificationElement) return;
    
    // Mark as seen in localStorage
    const seenNotifications = JSON.parse(localStorage.getItem('seenNotifications') || '[]');
    if (!seenNotifications.includes(notificationId)) {
        seenNotifications.push(notificationId);
        localStorage.setItem('seenNotifications', JSON.stringify(seenNotifications));
    }
    
    // Animate out
    notificationElement.classList.remove('notification-enter-active');
    notificationElement.classList.add('notification-exit', 'notification-exit-active');
    
    setTimeout(() => {
        if (notificationElement.parentNode) {
            notificationElement.parentNode.removeChild(notificationElement);
        }
    }, 300);
}

// Function to load all data from combined API
async function loadAllDataFromAPI() {
    try {
        console.log('Loading all data from combined API...');
        
        const response = await fetch(COMBINED_API_URL);
        if (response.ok) {
            const result = await response.json();
            console.log('Combined API result:', result);
            
            // Check if we have cached data to compare
            const cachedData = localStorage.getItem('combinedDataCache');
            if (cachedData) {
                const cached = JSON.parse(cachedData);
                const notificationsChanged = cached.notifications.lastModified !== result.notifications.lastModified;
                const gpsChanged = cached.gpsSettings.lastModified !== result.gpsSettings.lastModified;
                
                if (!notificationsChanged && !gpsChanged) {
                    // Use cached data and update UI
                    GPS_SETTINGS = cached.gpsSettings.data;
                    const notifications = cached.notifications.data.filter(n => n.active);
                    processNotifications(notifications);
                    // Ensure UI reflects cached settings
                    updateRegistrationTimeStatus();
                    updateCertificateRadiusDisplay();
                    return;
                }
            }
            
            // Save new data to cache
            localStorage.setItem('combinedDataCache', JSON.stringify({
                notifications: result.notifications,
                gpsSettings: result.gpsSettings
            }));
            
            // Process GPS settings
            GPS_SETTINGS = result.gpsSettings.data;
            localStorage.setItem('gpsSettings', JSON.stringify(GPS_SETTINGS));
            
            // Process notifications
            const notifications = result.notifications.data.filter(n => n.active);
            localStorage.setItem('climbNotifications', JSON.stringify(notifications));
            processNotifications(notifications);
            
                // Update registration time status after GPS settings are loaded
    updateRegistrationTimeStatus();
    
    // Update certificate radius display
    updateCertificateRadiusDisplay();
            
        } else {
            throw new Error('Failed to fetch combined data');
        }
    } catch (error) {
        console.error('Error loading combined data:', error);
        // Fallback to individual APIs
        await loadGpsSettings();
        checkForNewNotificationsFromLocalStorage();
        
        // Update registration time status even in fallback case
        updateRegistrationTimeStatus();
        
        // Update certificate radius display
        updateCertificateRadiusDisplay();
    }
}

// Function to process notifications
function processNotifications(notifications) {
    // Filter for new notifications
    const newNotifications = notifications.filter(isNewNotification);
    
    // Limit the number of notifications shown
    const notificationsToShow = newNotifications.slice(0, NOTIFICATION_CONFIG.MAX_NOTIFICATIONS);
    
    notificationsToShow.forEach(notification => {
        showNotification(notification);
    });
}

// Function to check for new notifications on page load (fetch from API first)
async function checkForNewNotificationsOnPageLoad() {
    // This function is now replaced by loadAllDataFromAPI
    await loadAllDataFromAPI();
}

// Function to check for new notifications from localStorage only (no API call)
function checkForNewNotificationsFromLocalStorage() {
    try {
        const storedNotifications = localStorage.getItem('climbNotifications');
        if (!storedNotifications) return;
        
        const notifications = JSON.parse(storedNotifications);
        const activeNotifications = notifications.filter(n => n.active);
        const newNotifications = activeNotifications.filter(isNewNotification);
        
        // Limit the number of notifications shown
        const notificationsToShow = newNotifications.slice(0, NOTIFICATION_CONFIG.MAX_NOTIFICATIONS);
        
        notificationsToShow.forEach(notification => {
            showNotification(notification);
        });
    } catch (error) {
        console.error('Error checking for notifications from localStorage:', error);
    }
}

// Function to check for new notifications (with API call - only when needed)
async function checkForNewNotifications() {
    console.warn('checkForNewNotifications is deprecated, use loadAllDataFromAPI instead');
    await loadAllDataFromAPI();
}

// Function to initialize notification system
function initializeNotificationSystem() {
    // Check for notifications immediately on page load (fetch from API first, then localStorage)
    checkForNewNotificationsOnPageLoad();
    
    // Listen for localStorage changes (when admin creates new notifications)
    window.addEventListener('storage', function(e) {
        if (e.key === 'climbNotifications') {
            console.log('New notification detected via storage event, refreshing...');
            // Clear existing notifications and check for new ones
            const container = document.getElementById('adminNotifications');
            if (container) {
                container.innerHTML = '';
            }
            checkForNewNotificationsFromLocalStorage();
        }
    });
    
    // Listen for custom events from admin panel (cross-window communication)
    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'NEW_NOTIFICATION') {
            console.log('New notification event received, refreshing...');
            const container = document.getElementById('adminNotifications');
            if (container) {
                container.innerHTML = '';
            }
            checkForNewNotificationsFromLocalStorage();
        }
    });
    
    // Listen for GPS settings changes
    window.addEventListener('storage', function(e) {
        if (e.key === 'gpsSettings') {
            console.log('GPS settings changed via storage event, refreshing...');
            const newSettings = JSON.parse(e.newValue);
            GPS_SETTINGS = newSettings;
            console.log('GPS Settings updated from storage:', GPS_SETTINGS);
            // Update registration time status when GPS settings change
            updateRegistrationTimeStatus();
            
            // Update certificate radius display when GPS settings change
            updateCertificateRadiusDisplay();
        }
    });
    
    // Listen for combined data cache changes
    window.addEventListener('storage', function(e) {
        if (e.key === 'combinedDataCache') {
            console.log('Combined data cache changed, refreshing...');
            // Force refresh to get latest data
            loadAllDataFromAPI();
        }
    });
    
    // Clean up old seen notifications (older than 7 days)
    cleanupOldSeenNotifications();
    
    // Initialize registration time status after data is loaded
    // updateRegistrationTimeStatus(); // Moved to after data loading
    
    // Update registration time status every minute
    setInterval(updateRegistrationTimeStatus, 60000);
}

// Function to update registration time status display
function updateRegistrationTimeStatus() {
    const container = document.getElementById('registrationTimeStatus');
    if (!container) return;
    
    // Check if GPS_SETTINGS is properly initialized
    if (!GPS_SETTINGS || typeof GPS_SETTINGS.registrationTimeEnabled === 'undefined') {
        container.innerHTML = '';
        return;
    }
    
    const status = getRegistrationTimeStatus();
    if (!status) {
        container.innerHTML = '';
        return;
    }
    
    const isOpen = status.includes('✅');
    const bgColor = isOpen ? 'bg-green-100' : 'bg-red-100';
    const borderColor = isOpen ? 'border-green-500' : 'border-red-500';
    const textColor = isOpen ? 'text-green-800' : 'text-red-800';
    const icon = isOpen ? 'fa-clock' : 'fa-clock';
    const iconColor = isOpen ? 'text-green-600' : 'text-red-600';
    
    container.innerHTML = `
        <div class="${bgColor} border-l-4 ${borderColor} p-4 rounded-lg shadow-md">
            <div class="flex items-center">
                <i class="fas ${icon} ${iconColor} text-lg mr-3"></i>
                <div class="flex-1">
                    <p class="font-medium ${textColor} text-sm">${status}</p>
                </div>
            </div>
        </div>
    `;
}

// Update certificate radius display
function updateCertificateRadiusDisplay() {
    const radiusElement = document.getElementById('certificateRadiusDisplay');
    if (!radiusElement || !GPS_SETTINGS) return;
    
    const radius = GPS_SETTINGS.certificateRadiusMeters || 150;
    radiusElement.textContent = radius;
}



// Function to cleanup old seen notifications
function cleanupOldSeenNotifications() {
    const seenNotifications = JSON.parse(localStorage.getItem('seenNotifications') || '[]');
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // In a real implementation, you might want to store timestamps with the IDs
    // For now, we'll just clear all seen notifications weekly
    if (seenNotifications.length > 100) { // Arbitrary limit
        localStorage.removeItem('seenNotifications');
    }
}

// Function to stop notification system
function stopNotificationSystem() {
    // Remove event listeners if needed
    // Currently using passive listeners, so no cleanup needed
}

// Function to manually refresh all data (can be called from admin panel)
function refreshAllData() {
    console.log('Manually refreshing all data...');
    const container = document.getElementById('adminNotifications');
    if (container) {
        container.innerHTML = '';
    }
    loadAllDataFromAPI();
}

// Function to manually refresh notifications (can be called from admin panel)
function refreshNotifications() {
    refreshAllData();
}

// Function to refresh GPS settings (can be called from admin panel)
async function refreshGpsSettings() {
    // Clear cache to force fresh data
    localStorage.removeItem('combinedDataCache');
    localStorage.removeItem('gpsSettings');
    
    // Load fresh data from API
    await loadAllDataFromAPI();
}

// ===== REGISTRATION TIME VALIDATION =====

// Check if current time is within registration time window
function isWithinRegistrationTime() {
    // Check if GPS_SETTINGS exists and has the required properties
    if (!GPS_SETTINGS || !GPS_SETTINGS.registrationTimeEnabled) {
        return true; // No time restriction
    }
    
    // Check if time settings exist
    if (!GPS_SETTINGS.registrationStartTime || !GPS_SETTINGS.registrationEndTime) {
        return true; // No time restriction if times are not set
    }
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes
    
    const [startHour, startMinute] = GPS_SETTINGS.registrationStartTime.split(':').map(Number);
    const [endHour, endMinute] = GPS_SETTINGS.registrationEndTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    // Handle overnight time ranges (e.g., 22:00 to 06:00)
    if (endTime < startTime) {
        return currentTime >= startTime || currentTime <= endTime;
    } else {
        return currentTime >= startTime && currentTime <= endTime;
    }
}

// Get registration time status message
function getRegistrationTimeStatus() {
    // Check if GPS_SETTINGS exists and has the required properties
    if (!GPS_SETTINGS || !GPS_SETTINGS.registrationTimeEnabled) {
        return null;
    }
    
    // Check if time settings exist
    if (!GPS_SETTINGS.registrationStartTime || !GPS_SETTINGS.registrationEndTime) {
        return null;
    }
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = GPS_SETTINGS.registrationStartTime.split(':').map(Number);
    const [endHour, endMinute] = GPS_SETTINGS.registrationEndTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    if (endTime < startTime) {
        // Overnight range
        if (currentTime >= startTime || currentTime <= endTime) {
            return `✅ Đăng ký mở cửa (${GPS_SETTINGS.registrationStartTime} - ${GPS_SETTINGS.registrationEndTime})`;
        } else {
            return `❌ Đăng ký đóng cửa (${GPS_SETTINGS.registrationStartTime} - ${GPS_SETTINGS.registrationEndTime})`;
        }
    } else {
        // Same day range
        if (currentTime >= startTime && currentTime <= endTime) {
            return `✅ Đăng ký mở cửa (${GPS_SETTINGS.registrationStartTime} - ${GPS_SETTINGS.registrationEndTime})`;
        } else {
            return `❌ Đăng ký đóng cửa (${GPS_SETTINGS.registrationStartTime} - ${GPS_SETTINGS.registrationEndTime})`;
        }
    }
}

// Validate registration time before form submission
function validateRegistrationTime() {
    if (!isWithinRegistrationTime()) {
        const status = getRegistrationTimeStatus();
        const message = status ? `Không thể đăng ký lúc này. ${status}` : 'Không thể đăng ký lúc này.';
        showMessage(message, 'error', 8000);
        return false;
    }
    return true;
}



// Export functions for global access
window.refreshNotifications = refreshNotifications;
window.dismissNotification = dismissNotification;
window.refreshGpsSettings = refreshGpsSettings;
window.getGpsSettings = getGpsSettings;
window.isWithinRegistrationTime = isWithinRegistrationTime;
window.getRegistrationTimeStatus = getRegistrationTimeStatus;
window.validateRegistrationTime = validateRegistrationTime;
