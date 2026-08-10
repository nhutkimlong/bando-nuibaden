// ----- CONFIGURATION -----
const SPREADSHEET_ID = '1mAQNIo2QVfl4uNiuyVS2lAiSEnA40AkDrnIhoBRQGag';
const TEMPLATE_ID = '115gn6bhafyTvAh1gniLiVEB80fG-F_Mz-XRvnbN2OtQ'; // Google Doc Template
const PDF_FOLDER_ID = '14JzQgv28umQScrRM0_pVEDK8FN_4kKi2';
const SIGNATURE_FOLDER_ID = '1YuCz2W0-DKm_Hya1-GG114mZzFJq4wSc'; // Thư mục lưu chữ ký
const COMMITMENT_TEMPLATE_ID = '1le-9TKmXUM3WLVoKDBJC0WaOODwyjDi1vKt3qgb_26w'; // Google Doc Cam kết

// --- NEW: Image Placeholder Configuration ---
// !!! ĐẢM BẢO GIÁ TRỊ NÀY KHỚP VỚI ALT TEXT DESCRIPTION TRONG DOC TEMPLATE !!!
const IMAGE_PLACEHOLDER_ALT_TEXT = "PHOTO_PLACEHOLDER";

// --- Feature Configuration ---
const SEND_CONFIRMATION_EMAIL = true;
const SEND_CERTIFICATE_EMAIL = true;
const BQL_NAME = "Ban Quản lý Khu du lịch Quốc gia Núi Bà Đen";

// --- Performance Optimization ---
const CACHE_DURATION = 300; // 5 minutes cache
const BATCH_SIZE = 5; // Reduced batch size for better stability
const MAX_MEMBERS_PER_REQUEST = 50; // Maximum members per request
const CERT_GENERATION_TIMEOUT = 300000; // 5 minutes timeout
const BATCH_DELAY = 300; // 300ms delay between batches

// --- Expected Column Names ---
const COL_TIMESTAMP = 'Timestamp';         // A
const COL_LEADER_NAME = 'LeaderName';      // B
const COL_PHONE_NUMBER = 'PhoneNumber';    // C
const COL_ADDRESS = 'Address';           // D
const COL_GROUP_SIZE = 'GroupSize';        // E
const COL_EMAIL = 'Email';               // F
const COL_CLIMB_DATE = 'ClimbDate';        // G
const COL_CLIMB_TIME = 'ClimbTime';        // H
const COL_SAFETY_COMMIT = 'SafetyCommit';  // I
const COL_MEMBER_LIST = 'MemberList';      // J
const COL_STATUS = 'Status';             // K
const COL_CERT_LINKS = 'CertificateLinks'; // L
const COL_BIRTHDAY = 'Birthday';
const COL_CCCD = 'CCCD';
const COL_COMMITMENT_PDF = 'CommitmentPDFLink';
const COL_SIGNATURE_IMAGE = 'SignatureImage';

// --- Monthly Sheet & Cache Management ---
let _sheetCache = null;
let _columnCache = null;
let _lastCacheTime = 0;

const EXCLUDED_SHEET_NAMES = ['XU_LY_TRUNG', 'THONG_KE_LEO_NUI'];

const HEADER_ALIASES = {
  [COL_TIMESTAMP]: ['timestamp', 'thời gian', 'thoi gian', 'ngày tạo'],
  [COL_LEADER_NAME]: ['leadername', 'họ tên', 'ho ten', 'họ và tên', 'người đăng ký', 'trưởng đoàn'],
  [COL_PHONE_NUMBER]: ['phonenumber', 'số điện thoại', 'so dien thoai', 'sđt', 'sdt', 'phone'],
  [COL_ADDRESS]: ['address', 'địa chỉ', 'dia chi'],
  [COL_GROUP_SIZE]: ['groupsize', 'số lượng', 'so luong', 'tổng số người', 'tong so nguoi', 'số người'],
  [COL_EMAIL]: ['email', 'thư điện tử'],
  [COL_CLIMB_DATE]: ['climbdate', 'ngày leo núi', 'ngay leo nui', 'ngày leo', 'ngay leo'],
  [COL_CLIMB_TIME]: ['climbtime', 'giờ leo núi', 'gio leo nui', 'giờ leo', 'gio leo', 'thời gian leo'],
  [COL_SAFETY_COMMIT]: ['safetycommit', 'cam kết', 'cam ket'],
  [COL_MEMBER_LIST]: ['memberlist', 'danh sách thành viên', 'danh sach thanh vien', 'thành viên', 'thanh vien'],
  [COL_STATUS]: ['status', 'trạng thái', 'trang thai'],
  [COL_CERT_LINKS]: ['certificatelinks', 'link chứng nhận', 'chứng nhận', 'chung nhan'],
  [COL_BIRTHDAY]: ['birthday', 'ngày sinh', 'ngay sinh'],
  [COL_CCCD]: ['cccd', 'căn cước', 'can cuoc', 'cmnd'],
  [COL_SIGNATURE_IMAGE]: ['signatureimage', 'chữ ký', 'chu ky', 'chữ ký ảnh'],
  [COL_COMMITMENT_PDF]: ['commitmentpdflink', 'cam kết pdf', 'bản cam kết', 'file cam kết']
};

function normalizePhone(phone) {
  if (phone === null || phone === undefined) return "";
  let p = phone.toString().replace(/[^\d]/g, "");
  if (!p) return "";
  if (!p.startsWith("0") && p.length === 9) p = "0" + p;
  return p;
}

function getMonthlySheetName(climbDateInput, timestampInput) {
  let date = null;
  if (climbDateInput) {
    if (climbDateInput instanceof Date && !isNaN(climbDateInput.getTime())) {
      date = climbDateInput;
    } else if (typeof climbDateInput === 'string') {
      const str = climbDateInput.trim();
      let match = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
      if (match) {
        date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      } else {
        match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
        if (match) {
          date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
        } else {
          const d = new Date(str);
          if (!isNaN(d.getTime())) date = d;
        }
      }
    }
  }

  if (!date && timestampInput) {
    if (timestampInput instanceof Date && !isNaN(timestampInput.getTime())) {
      date = timestampInput;
    } else {
      const d = new Date(timestampInput);
      if (!isNaN(d.getTime())) date = d;
    }
  }

  if (!date) date = new Date();

  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `T${month}-${year}`;
}

function getAllDataSheets(ss) {
  if (!ss) {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch(e) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
  }
  const sheets = ss.getSheets();
  const filtered = sheets.filter(sheet => !EXCLUDED_SHEET_NAMES.includes(sheet.getName()));

  // Sort monthly sheets newest first (e.g. T8-2026 before T7-2026 before T6-2026 before Sheet1)
  return filtered.sort((a, b) => {
    const parseScore = (name) => {
      const match = name.match(/^T(\d{1,2})[\-\_](\d{4})$/i);
      if (match) return Number(match[2]) * 100 + Number(match[1]);
      return 0; // Legacy sheets like Sheet1 get score 0 (lowest priority)
    };
    return parseScore(b.getName()) - parseScore(a.getName());
  });
}

function formatClimbTimeValue(value) {
  if (value === null || value === undefined || value === "") return "";
  let hh = "", mm = "";

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    hh = String(value.getHours()).padStart(2, '0');
    mm = String(value.getMinutes()).padStart(2, '0');
  } else {
    const text = String(value).trim();
    const match = text.match(/(\d{1,2}):(\d{2})(:\d{2})?/);
    if (match) {
      hh = String(match[1]).padStart(2, '0');
      mm = match[2];
    }
  }

  if (hh && mm) {
    return "'" + hh + ":" + mm;
  }

  const cleanText = String(value).trim().replace(/^'/, '');
  return cleanText ? "'" + cleanText : "";
}

function getOrCreateMonthlySheet(ss, sheetName) {
  if (!ss) {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch(e) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
  }
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = [
      COL_TIMESTAMP, COL_LEADER_NAME, COL_PHONE_NUMBER, COL_ADDRESS,
      COL_GROUP_SIZE, COL_EMAIL, COL_CLIMB_DATE, COL_CLIMB_TIME,
      COL_SAFETY_COMMIT, COL_MEMBER_LIST, COL_STATUS, COL_CERT_LINKS,
      COL_BIRTHDAY, COL_CCCD, COL_COMMITMENT_PDF, COL_SIGNATURE_IMAGE
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a86e8');
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);

    // Format PhoneNumber (col 3) and ClimbTime (col 8) as Plain Text (@) to prevent 1899 Date conversion
    sheet.getRange(2, 3, 1000, 1).setNumberFormat("@");
    sheet.getRange(2, 8, 1000, 1).setNumberFormat("@");

    Logger.log(`Created new monthly sheet "${sheetName}" with standard headers.`);
  }
  return sheet;
}

function getCachedSheet() {
  const now = Date.now();
  if (!_sheetCache || (now - _lastCacheTime) > (CACHE_DURATION * 1000)) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const dataSheets = getAllDataSheets(ss);
    _sheetCache = dataSheets.length > 0 ? dataSheets[dataSheets.length - 1] : ss.getSheets()[0];
    _lastCacheTime = now;
  }
  return _sheetCache;
}

function getCachedColumnIndices(sheet) {
  if (!_columnCache) {
    _columnCache = getColumnIndices(sheet);
  }
  return _columnCache;
}

// ----- CORS PREFLIGHT HANDLER -----
function doOptions(e) {
  Logger.log("--- Handling OPTIONS request (CORS Preflight) ---");
  try {
    return ContentService.createTextOutput()
      .setMimeType(ContentService.MimeType.TEXT)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type');
  } catch (error) {
    Logger.log(`!!! ERROR handling OPTIONS request: ${error} !!!`);
    return ContentService.createTextOutput("Error handling OPTIONS request").setMimeType(ContentService.MimeType.TEXT);
  }
}

// ----- MAIN ROUTING FUNCTIONS -----

function doPost(e) {
  let requestData, action = '';
  try {
    requestData = JSON.parse(e.postData.contents);
    action = requestData.action || '';
    Logger.log(`doPost received action: "${action}", data keys: ${Object.keys(requestData).join(', ')}`);

    switch (action) {
      case 'register':
        return handleRegistration(requestData);
      case 'generateCertificatesWithPhotos':
        return handleGenerateCertificatesWithPhotos(requestData);
      default:
        Logger.log(`Invalid action in doPost: ${action}`);
        return createJsonResponse({ success: false, message: 'Hành động POST không hợp lệ.' });
    }
  } catch (error) {
    Logger.log(`!!! ERROR in doPost (Action: ${action}): ${error.message}\nInput Data: ${JSON.stringify(requestData)}\nStack: ${error.stack}`);
    return createJsonResponse({ success: false, message: `Lỗi máy chủ khi xử lý POST: ${error.message}` });
  }
}

function doGet(e) {
  try {
    const action = e?.parameter?.action;
    Logger.log(`doGet received action: ${action}, parameters: ${JSON.stringify(e?.parameter || {})}`);

    switch (action) {
      case 'getMembers':
      case 'getMembersByPhone':
        const phoneForMembers = String(e.parameter.phone || e.parameter.phoneNumber || '').trim();
        return handleGetMembers(phoneForMembers);

      default:
        Logger.log(`No specific GET action matched (${action}). Returning status response.`);
        return createJsonResponse({ success: true, message: 'Ban Quan Ly Nui Ba Den API is active.' });
    }
  } catch (error) {
    Logger.log(`!!! ERROR in doGet: ${error.message}\nStack: ${error.stack}`);
    return createJsonResponse({ success: false, message: `Lỗi máy chủ khi xử lý GET: ${error.message}` });
  }
}


// ----- ACTION HANDLERS -----

function handleRegistration(requestData) {
    Logger.log(`handleRegistration received data: ${JSON.stringify(requestData)}`);
    
    // Fast validation
    const leaderName = String(requestData.leaderName || '').trim();
    const phoneNumber = String(requestData.phoneNumber || '').trim();
    const address = String(requestData.address || '').trim();
    const groupSizeStr = String(requestData.groupSize || '0').trim();
    const groupSize = parseInt(groupSizeStr, 10) || 0;
    const email = String(requestData.email || '').trim().toLowerCase();
    const climbDate = String(requestData.climbDate || '');
    const climbTime = String(requestData.climbTime || '');
    const safetyCommit = requestData.safetyCommit === true || String(requestData.safetyCommit).toLowerCase() === 'on' || String(requestData.safetyCommit).toLowerCase() === 'true';
    const memberList = String(requestData.memberList || '').trim();
    const birthday = String(requestData.birthday || '').trim();
    const signatureData = String(requestData.signatureData || '').trim();
    const cccd = String(requestData.cccd || '').trim();

    // Tự động thêm tên người trưởng nhóm vào danh sách thành viên nếu chưa có
    let processedMemberList = memberList;
    if (leaderName && leaderName.trim()) {
        const leaderNameTrimmed = leaderName.trim();
        const memberArray = memberList ? memberList.split('\n').map(name => name.trim()).filter(Boolean) : [];
        
        // Kiểm tra xem tên người trưởng đã có trong danh sách chưa
        const leaderExists = memberArray.some(member => 
            member.toLowerCase() === leaderNameTrimmed.toLowerCase()
        );
        
        if (!leaderExists) {
            // Thêm tên người trưởng vào đầu danh sách
            memberArray.unshift(leaderNameTrimmed);
            processedMemberList = memberArray.join('\n');
            Logger.log(`Auto-added leader "${leaderNameTrimmed}" to member list`);
        } else {
            Logger.log(`Leader "${leaderNameTrimmed}" already exists in member list`);
        }
    }

    if (!leaderName || !phoneNumber || !address || !email || !groupSize || groupSize <= 0 || !safetyCommit ) {
        Logger.log(`Reg Validation Failed: leader=${leaderName}, phone=${phoneNumber}, address=${address}, email=${email}, size=${groupSize}, commit=${safetyCommit}`);
        return createJsonResponse({ success: false, message: 'Thiếu thông tin bắt buộc.' });
    }
    if (!/^[0-9]{10,11}$/.test(phoneNumber)) return createJsonResponse({ success: false, message: 'Số điện thoại không hợp lệ.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return createJsonResponse({ success: false, message: 'Địa chỉ email không hợp lệ.' });

    Logger.log(`Extracted Reg Data OK: leaderName=${leaderName}, phoneNumber=${phoneNumber}, email=${email}`);

    const timestamp = new Date();
    let ss;
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch(e) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    const targetSheetName = getMonthlySheetName(climbDate, timestamp);
    const sheet = getOrCreateMonthlySheet(ss, targetSheetName);

    const cols = getColumnIndices(sheet);
    if (!cols) return createJsonResponse({ success: false, message: 'Lỗi cấu hình cột sheet.' });

    const status = 'Registered';
    const safetyCommitValue = safetyCommit ? 'Đã cam kết' : 'Chưa cam kết';

    // --- BƯỚC 1: LƯU THÔNG TIN ĐĂNG KÝ VÀO SHEET HÀNG THÁNG NGAY LẬP TỨC (ƯU TIÊN HÀNG ĐẦU) ---
    // Khởi tạo dòng mới với các trường Chữ ký & Link PDF tạm thời để trống
    const newRow = createRowArray(cols, {
        [COL_TIMESTAMP]: timestamp, [COL_LEADER_NAME]: leaderName,
        [COL_PHONE_NUMBER]: "'" + phoneNumber, [COL_ADDRESS]: address,
        [COL_GROUP_SIZE]: groupSize, [COL_EMAIL]: email,
        [COL_CLIMB_DATE]: climbDate, [COL_CLIMB_TIME]: formatClimbTimeValue(climbTime),
        [COL_BIRTHDAY]: birthday,
        [COL_CCCD]: cccd,
        [COL_SIGNATURE_IMAGE]: '',
        [COL_SAFETY_COMMIT]: safetyCommitValue, [COL_MEMBER_LIST]: processedMemberList,
        [COL_STATUS]: status, [COL_CERT_LINKS]: '',
        [COL_COMMITMENT_PDF]: ''
    });

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();
    const addedRowIndex = sheet.getLastRow();
    Logger.log(`Registration saved IMMEDIATELY for ${leaderName} (${phoneNumber}) in Sheet "${targetSheetName}" at Row ${addedRowIndex}`);

    // --- BƯỚC 2: XỬ LÝ LƯU CHỮ KÝ VÀ CẬP NHẬT BỔ SUNG VÀO SHEET ---
    let signatureFileUrl = '';
    if (signatureData && signatureData.startsWith('data:image')) {
      try {
        const base64Data = signatureData.split(',')[1];
        const contentType = signatureData.split(';')[0].split(':')[1];
        const decodedBytes = Utilities.base64Decode(base64Data);

        const regDate = new Date();
        const dd = String(regDate.getDate()).padStart(2, '0');
        const mm = String(regDate.getMonth() + 1).padStart(2, '0');
        const yyyy = regDate.getFullYear();
        const dateStr = `${dd}${mm}${yyyy}`;

        const safeName = leaderName.replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s+/g, '_');
        const fileName = `${dateStr}-${safeName}_signature.png`;

        const blob = Utilities.newBlob(decodedBytes, contentType, fileName);
        const folder = DriveApp.getFolderById(SIGNATURE_FOLDER_ID);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        signatureFileUrl = file.getUrl();

        if (signatureFileUrl && cols[COL_SIGNATURE_IMAGE]) {
          sheet.getRange(addedRowIndex, cols[COL_SIGNATURE_IMAGE]).setValue(signatureFileUrl);
          SpreadsheetApp.flush();
        }
      } catch (e) {
        Logger.log('Lỗi lưu chữ ký: ' + e);
      }
    }

    // --- BƯỚC 3: TẠO PDF CAM KẾT VÀ CẬP NHẬT BỔ SUNG VÀO SHEET ---
    let commitmentPDFUrl = '';
    try {
      const regDate = new Date();
      const dd = String(regDate.getDate()).padStart(2, '0');
      const mm = String(regDate.getMonth() + 1).padStart(2, '0');
      const yyyy = regDate.getFullYear();
      const dateStr = `${dd}${mm}${yyyy}`;
      const safeName = leaderName.replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s+/g, '_');
      const fileName = `${dateStr}-${safeName}_commitment`;

      const folder = DriveApp.getFolderById(SIGNATURE_FOLDER_ID);
      commitmentPDFUrl = createCommitmentPDF({
        leaderName, birthday, cccd, address, phoneNumber, email, groupSize, climbDate, climbTime
      }, signatureData, COMMITMENT_TEMPLATE_ID, folder, fileName);

      if (commitmentPDFUrl && cols[COL_COMMITMENT_PDF]) {
        sheet.getRange(addedRowIndex, cols[COL_COMMITMENT_PDF]).setValue(commitmentPDFUrl);
        SpreadsheetApp.flush();
      }
    } catch (e) {
      Logger.log('Lỗi tạo PDF cam kết: ' + e);
    }

    // --- BƯỚC 4: GỬI EMAIL XÁC NHẬN ---
    if (SEND_CONFIRMATION_EMAIL && email) {
      try {
        const subject = `Xác nhận đăng ký leo núi Bà Đen - ${leaderName || 'Khách'}`;
        const logData = { leaderName, phoneNumber, email, address, groupSize, climbDate, climbTime, safetyCommitValue, BQL_NAME };
        Logger.log(`DEBUG (Confirmation Email Data): ${JSON.stringify(logData)}`);
        for(const key in logData) { if (logData[key] === undefined || logData[key] === null) Logger.log(`WARNING: Conf Email - Var '${key}' is undef/null.`); }

        let htmlBody = `<p>Chào ${escapeHtml(leaderName || 'Bạn')},</p>`;
        htmlBody += `<p>${escapeHtml(BQL_NAME || 'BQL')} xác nhận bạn đã đăng ký thành công chuyến leo núi Bà Đen với thông tin:</p><ul>`;
        htmlBody += `<li>Số điện thoại: ${escapeHtml(phoneNumber || 'N/A')}</li>`;
        htmlBody += `<li>Email: ${escapeHtml(email || 'N/A')}</li>`;
        htmlBody += `<li>Địa chỉ: ${escapeHtml(address || 'N/A')}</li>`;
        htmlBody += `<li>Số lượng thành viên: ${escapeHtml(String(groupSize || 0))}</li>`;
        htmlBody += `<li>Ngày leo: ${climbDate ? escapeHtml(climbDate) + (climbTime ? ` lúc ${escapeHtml(climbTime)}` : '') : 'Chưa cung cấp'}</li>`;
        htmlBody += `<li>Cam kết an toàn: ${escapeHtml(safetyCommitValue || 'N/A')}</li></ul>`;
        htmlBody += `<p>Vui lòng chuẩn bị kỹ lưỡng theo hướng dẫn và quy định.</p><p>Chúc bạn có chuyến đi an toàn!</p>`;
        htmlBody += `<p>Trân trọng,<br>${escapeHtml(BQL_NAME || 'Ban Quản Lý')}.</p>`;

        MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody });
        Logger.log(`Sent confirmation email to ${email}`);
      } catch (mailError) { Logger.log(`!!! ERROR sending confirmation email: ${mailError}`); }
    } else if (SEND_CONFIRMATION_EMAIL && !email) { Logger.log("Reg success, no email provided."); }

    return createJsonResponse({ success: true, message: 'Đăng ký thành công!' + (SEND_CONFIRMATION_EMAIL ? ' Vui lòng kiểm tra email.' : '') });
}


function handleGenerateCertificatesWithPhotos(requestData) {
    const startTime = Date.now();
    Logger.log(`handleGenerateCertificatesWithPhotos received data: ${JSON.stringify(requestData)}`);
    const phoneNumber = String(requestData.phone || requestData.phoneNumber || '').trim();
    const selectedMembers = requestData.members;
    const verificationMethod = requestData.verificationMethod || 'unknown';
    
    Logger.log(`Certificate generation request - Method: ${verificationMethod}, Phone: ${phoneNumber}, Members: ${selectedMembers?.length || 0}`);

    if (!phoneNumber || !/^[0-9]{10,11}$/.test(phoneNumber)) return createJsonResponse({ success: false, message: 'Số điện thoại không hợp lệ.' });
    if (!selectedMembers || !Array.isArray(selectedMembers) || selectedMembers.length === 0) return createJsonResponse({ success: false, message: "Không có thành viên nào được chọn." });
    
    // Check member limit
    if (selectedMembers.length > MAX_MEMBERS_PER_REQUEST) {
        return createJsonResponse({ 
            success: false, 
            message: `Quá nhiều thành viên (${selectedMembers.length}). Tối đa ${MAX_MEMBERS_PER_REQUEST} thành viên mỗi lần.` 
        });
    }

    let ss;
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch(e) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    const regDetails = findRegistrationDetails(ss, phoneNumber);
    if (!regDetails) return createJsonResponse({ success: false, message: `Không tìm thấy đăng ký gốc cho SĐT ${phoneNumber}.` });

    const targetSheet = regDetails.sheet;
    const { rowIndex, leaderName = 'Bạn', userEmail = null, climbDate = new Date(), climbTime = '' } = regDetails;
    Logger.log(`Found registration in Sheet "${targetSheet.getName()}": Row=${rowIndex}, Leader=${leaderName}, Email=${userEmail}, Date=${climbDate}`);

    let destFolder;
    try { destFolder = DriveApp.getFolderById(PDF_FOLDER_ID); } catch (e) { Logger.log(`WARN: PDF Folder ID error. Using root. ${e}`); destFolder = DriveApp.getRootFolder(); }

    const pdfLinks = [], errors = [];
    const generationDate = new Date();
    const registrationTime = regDetails.registrationTimestamp instanceof Date ? regDetails.registrationTimestamp : null;
    const baseDateForDisplay = registrationTime || climbDate;
    const dateStr = Utilities.formatDate(baseDateForDisplay, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    const durationMs = registrationTime ? (generationDate.getTime() - registrationTime.getTime()) : null;
    const durationString = durationMs !== null ? formatDurationVi(durationMs) : '';

    Logger.log(`Generating certs for ${selectedMembers.length} members in batches of ${BATCH_SIZE}...`);
    
    // Process in batches for better performance
    for (let i = 0; i < selectedMembers.length; i += BATCH_SIZE) {
        // Check timeout
        if (Date.now() - startTime > CERT_GENERATION_TIMEOUT) {
            Logger.log(`Certificate generation timeout after ${Math.round((Date.now() - startTime)/1000)}s`);
            return createJsonResponse({ 
                success: false, 
                message: `Tạo chứng nhận bị gián đoạn do thời gian chờ. Đã tạo ${pdfLinks.length}/${selectedMembers.length} chứng nhận.`,
                pdfLinks: pdfLinks,
                partialSuccess: true
            });
        }
        
        const batch = selectedMembers.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(selectedMembers.length / BATCH_SIZE);
        
        Logger.log(`Processing batch ${batchNumber}/${totalBatches} with ${batch.length} members...`);
        
        batch.forEach((memberInfo, batchIndex) => {
            if (!memberInfo || typeof memberInfo !== 'object') { errors.push("Bad member data."); return; }
            const memberName = String(memberInfo.name || '').trim();
            const photoBase64 = memberInfo.photoData;
            if (!memberName) { errors.push("Member name missing."); return; }

            try {
                const safeName = memberName.replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s+/g, '_') || 'Member';
                const fileNameBase = `ChungNhan_${safeName}_${Utilities.formatDate(generationDate, 'UTC', 'yyyyMMddHHmmss')}`;
                const pdfUrl = createCertificate(memberName, dateStr, String(climbTime || ''), durationString, photoBase64, TEMPLATE_ID, destFolder, fileNameBase);
                if (pdfUrl) {
                    pdfLinks.push({ name: memberName, url: pdfUrl });
                    Logger.log(`Success: PDF for ${memberName} (${pdfLinks.length}/${selectedMembers.length})`);
                } else { throw new Error(`createCert returned null for ${memberName}`); }
            } catch (certError) {
                Logger.log(`!!! ERROR creating PDF for "${memberName}": ${certError.message || certError}\nStack: ${certError.stack || ''}`);
                errors.push(`Lỗi tạo PDF cho ${memberName}: ${certError.message || certError}`);
            }
        });
        
        // Delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < selectedMembers.length) {
            Logger.log(`Waiting ${BATCH_DELAY}ms before next batch...`);
            Utilities.sleep(BATCH_DELAY);
        }
    }
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    Logger.log(`Finished PDF gen in ${totalTime}s. Success: ${pdfLinks.length}, Errors: ${errors.length}`);

    let overallSuccess = pdfLinks.length > 0;
    let statusMsg = `Generated ${pdfLinks.length}/${selectedMembers.length} certificates`;
    if (errors.length > 0) statusMsg += ` (${errors.length} errors)`;
    statusMsg += ` in ${totalTime}s`;

    try {
        _columnCache = null; // Reset cache
        const cols = getColumnIndices(targetSheet);
        if(cols) {
            if (cols[COL_STATUS]) targetSheet.getRange(rowIndex, cols[COL_STATUS]).setValue(statusMsg);
            if (cols[COL_CERT_LINKS]) targetSheet.getRange(rowIndex, cols[COL_CERT_LINKS]).setValue(pdfLinks.length > 0 ? JSON.stringify(pdfLinks) : '');
            SpreadsheetApp.flush();
            Logger.log(`Updated Sheet "${targetSheet.getName()}": Row ${rowIndex}, Status=${statusMsg}, Links=${pdfLinks.length}`);
        }
    } catch (e) { Logger.log(`!!! Error updating sheet row ${rowIndex}: ${e}`); }

    let emailSent = false;
    if (SEND_CERTIFICATE_EMAIL && userEmail && pdfLinks.length > 0) {
        try {
            const subject = `Chứng nhận chinh phục Núi Bà Đen - ${pdfLinks.length} thành viên`;
            const emailLogData = { leaderName, userEmail, BQL_NAME, pdfLinksCount: pdfLinks.length, errorsCount: errors.length, totalTime };
            Logger.log(`DEBUG (Cert Email Data): ${JSON.stringify(emailLogData)}`);

            let htmlBody = `<p>Chào ${escapeHtml(leaderName || 'Bạn')},</p>`;
            htmlBody += `<p>Chúc mừng bạn và đoàn đã chinh phục thành công đỉnh Núi Bà Đen!</p>`;
            htmlBody += `<p>Link tải chứng nhận điện tử cho các thành viên:</p><ul>`;
            pdfLinks.forEach(linkInfo => {
                const name = linkInfo?.name ? escapeHtml(linkInfo.name) : '[N/A]';
                const url = linkInfo?.url ? escapeHtml(linkInfo.url) : '#';
                htmlBody += `<li>${name}: <a href="${url}" target="_blank" rel="noopener noreferrer">Tải chứng nhận</a></li>`;
            });
            htmlBody += `</ul>`;
            if (errors.length > 0) htmlBody += `<p style="color:red;">⚠️ Lưu ý: Có ${errors.length} lỗi xảy ra khi tạo chứng nhận.</p>`;
            htmlBody += `<p>Xin cảm ơn & hẹn gặp lại!</p><p>Trân trọng,<br>${escapeHtml(BQL_NAME || 'BQL')}.</p>`;

            MailApp.sendEmail({ to: userEmail, subject: subject, htmlBody: htmlBody });
            emailSent = true;
            Logger.log(`Sent cert links email to ${userEmail}.`);
        } catch (mailError) { Logger.log(`!!! ERROR sending cert email: ${mailError}`); }
    } else { Logger.log(`Skipped cert email: Send=${SEND_CERTIFICATE_EMAIL}, Email=${userEmail}, Links=${pdfLinks.length}`); }

    let userRespMsg = `✅ Đã tạo ${pdfLinks.length}/${selectedMembers.length} chứng nhận trong ${totalTime}s.`;
    if (errors.length > 0) userRespMsg = `⚠️ Hoàn thành ${pdfLinks.length}/${selectedMembers.length} chứng nhận (${errors.length} lỗi) trong ${totalTime}s.`;
    if (!overallSuccess && errors.length > 0) userRespMsg = `❌ Tạo chứng nhận thất bại (${errors.length} lỗi).`;
    if (emailSent) userRespMsg += " 📧 Email đã gửi.";

    return createJsonResponse({ 
        success: overallSuccess, 
        message: userRespMsg, 
        pdfLinks: pdfLinks,
        stats: {
            total: selectedMembers.length,
            success: pdfLinks.length,
            errors: errors.length,
            timeSeconds: totalTime
        }
    });
}


function handleGetMembers(phoneNumber) {
    Logger.log(`handleGetMembers for phone: ${phoneNumber}`);
    try {
        const cleanPhone = normalizePhone(phoneNumber);
        if (!cleanPhone || cleanPhone.length < 9) return createJsonResponse({ success: false, message: 'SĐT không hợp lệ.' });

        const regDetails = findRegistrationDetails(cleanPhone);
        if (!regDetails) {
            return createJsonResponse({ success: false, message: `Không tìm thấy đăng ký cho SĐT ${phoneNumber}.` });
        }

        let members = [];
        if (regDetails.memberListString) {
            members = regDetails.memberListString.split('\n').map(name => name.trim()).filter(Boolean);
        }
        if (members.length === 0 && regDetails.leaderName) {
            members = [regDetails.leaderName];
        }

        Logger.log(`handleGetMembers: Found ${members.length} members for ${cleanPhone} in Sheet "${regDetails.sheetName}" at Row ${regDetails.rowIndex}.`);
        return createJsonResponse({ 
            success: true, 
            members: members,
            sheetName: regDetails.sheetName,
            rowIndex: regDetails.rowIndex,
            leaderName: regDetails.leaderName
        });
    } catch (error) {
        Logger.log(`!!! ERROR in handleGetMembers: ${error}`);
        return createJsonResponse({ success: false, message: `Lỗi server khi lấy members: ${error.message}` });
    }
}


// ----- HELPER FUNCTIONS -----

// Optimized certificate creation with better error handling
function createCertificate(name, dateString, timeString, durationString, photoBase64, templateId, destinationFolder, outputFileNameBase) {
  let tempCopyFile = null, copyDoc = null;
  const placeholderAltText = IMAGE_PLACEHOLDER_ALT_TEXT; // Alt text của hình ảnh placeholder

  try {
    // Sao chép template
    const templateFile = DriveApp.getFileById(templateId);
    const tempCopyName = `TEMP_${outputFileNameBase}_${Utilities.getUuid()}`;
    tempCopyFile = templateFile.makeCopy(tempCopyName, destinationFolder);
    copyDoc = DocumentApp.openById(tempCopyFile.getId());

    // Lấy body một lần duy nhất
    const body = copyDoc.getBody();

    // Thay thế hình ảnh nếu có dữ liệu Base64
    let imageReplaced = false;
    if (photoBase64 && photoBase64.startsWith('data:image')) {
      const base64Data = photoBase64.split(',')[1];
      const contentType = photoBase64.split(';')[0].split(':')[1];
      const decodedBytes = Utilities.base64Decode(base64Data);
      const blob = Utilities.newBlob(decodedBytes, contentType, `${name}_photo`);

      const inlineImages = body.getImages();
      for (let i = 0; i < inlineImages.length; i++) {
        const img = inlineImages[i];
        if (img.getAltDescription() === placeholderAltText) {
          const parent = img.getParent();
          const indexInParent = parent.getChildIndex(img);
          const newImage = parent.insertInlineImage(indexInParent, blob);
          newImage.setWidth(img.getWidth());
          newImage.setHeight(img.getHeight());
          img.removeFromParent();
          imageReplaced = true;
          break;
        }
      }
      if (!imageReplaced) Logger.log(`Không tìm thấy placeholder "${placeholderAltText}" trong tài liệu.`);
    } else {
      Logger.log(`Không có ảnh hoặc định dạng Base64 không hợp lệ.`);
    }

    // Thay thế văn bản
    body.replaceText('{{FullName}}', name || 'N/A');
    body.replaceText('{{Date}}', dateString || 'N/A');
    // New placeholders for climb time
    body.replaceText('{{ClimbTime}}', timeString || 'N/A');
    body.replaceText('{{Time}}', timeString || 'N/A');
    body.replaceText('{{DateTime}}', (dateString && timeString) ? `${dateString} ${timeString}` : (dateString || 'N/A'));
    body.replaceText('{{Duration}}', durationString || '');
    body.replaceText('{{ElapsedTime}}', durationString || '');

    // Lưu và xuất PDF
    copyDoc.saveAndClose();
    copyDoc = null;
    const pdfBlob = tempCopyFile.getAs(MimeType.PDF).setName(outputFileNameBase + '.pdf');
    const pdfFile = destinationFolder.createFile(pdfBlob);
    try {
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      Logger.log(`WARN: setSharing failed for ${outputFileNameBase}: ${shareErr}`);
    }
    const fileUrl = pdfFile.getUrl();
    Logger.log(`PDF created successfully: ${fileUrl}`);
    return fileUrl;

  } catch (error) {
    Logger.log(`Lỗi khi tạo chứng chỉ cho "${name}": ${error.message || error}\nStack: ${error.stack || ''}`);
    return null;
  } finally {
    if (copyDoc) {
      try {
        copyDoc.saveAndClose();
      } catch (e) {}
    }
    if (tempCopyFile) {
      try {
        if (!tempCopyFile.isTrashed()) tempCopyFile.setTrashed(true);
      } catch (e) {
        Logger.log(`Lỗi khi xóa file tạm: ${e}`);
      }
    }
  }
}

function createCommitmentPDF(data, signatureData, templateId, destinationFolder, outputFileNameBase) {
  let tempCopyFile = null, copyDoc = null;
  try {
    const templateFile = DriveApp.getFileById(templateId);
    const tempCopyName = `TEMP_${outputFileNameBase}_${Utilities.getUuid()}`;
    tempCopyFile = templateFile.makeCopy(tempCopyName, destinationFolder);
    copyDoc = DocumentApp.openById(tempCopyFile.getId());

    const body = copyDoc.getBody();
    body.replaceText('{{FullName}}', data.leaderName || 'N/A');
    body.replaceText('{{Birthday}}', formatDateDMY(data.birthday) || 'N/A');
    body.replaceText('{{CCCD}}', data.cccd || 'N/A');
    body.replaceText('{{Address}}', data.address || 'N/A');
    body.replaceText('{{PhoneNumber}}', data.phoneNumber || 'N/A');
    body.replaceText('{{Email}}', data.email || 'N/A');
    body.replaceText('{{GroupSize}}', data.groupSize || 'N/A');
    body.replaceText('{{ClimbDate}}', formatDateDMY(data.climbDate));
    body.replaceText('{{ClimbTime}}', data.climbTime || 'N/A');

    const now = new Date();
    const signDay = String(now.getDate()).padStart(2, '0');
    const signMonth = String(now.getMonth() + 1).padStart(2, '0');
    const signYear = now.getFullYear();
    const signDate = `${signDay}/${signMonth}/${signYear}`;

    body.replaceText('{{SignDay}}', signDay);
    body.replaceText('{{SignMonth}}', signMonth);
    body.replaceText('{{SignYear}}', signYear);
    body.replaceText('{{SignDate}}', signDate);

    // Chèn ảnh chữ ký
    if (signatureData && signatureData.startsWith('data:image')) {
      const base64Data = signatureData.split(',')[1];
      const contentType = signatureData.split(';')[0].split(':')[1];
      const decodedBytes = Utilities.base64Decode(base64Data);
      const blob = Utilities.newBlob(decodedBytes, contentType, `${data.leaderName}_signature.png`);
      const images = body.getImages();
      let replaced = false;
      for (let i = 0; i < images.length; i++) {
        if (images[i].getAltDescription() === 'SIGNATURE_PLACEHOLDER') {
          const parent = images[i].getParent();
          const idx = parent.getChildIndex(images[i]);
          const width = images[i].getWidth();
          const height = images[i].getHeight();
          const newImg = parent.insertInlineImage(idx, blob);
          newImg.setWidth(width);
          newImg.setHeight(height);
          images[i].removeFromParent();
          replaced = true;
          break;
        }
      }
      if (!replaced) Logger.log('Không tìm thấy placeholder chữ ký trong template');
    }

    copyDoc.saveAndClose();
    copyDoc = null;
    const pdfBlob = tempCopyFile.getAs(MimeType.PDF).setName(outputFileNameBase + '.pdf');
    const pdfFile = destinationFolder.createFile(pdfBlob);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return pdfFile.getUrl();

  } catch (error) {
    Logger.log('Lỗi tạo PDF cam kết: ' + error);
    return '';
  } finally {
    if (copyDoc) try { copyDoc.saveAndClose(); } catch (e) {}
    if (tempCopyFile) try { if (!tempCopyFile.isTrashed()) tempCopyFile.setTrashed(true); } catch (e) {}
  }
}

function formatDateDMY(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Format duration in Vietnamese, e.g., 4 giờ 32 phút 10 giây
function formatDurationVi(durationMs) {
  try {
    if (typeof durationMs !== 'number' || !isFinite(durationMs) || durationMs < 0) return '';
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (hours > 0) parts.push(hours + ' Giờ');
    if (minutes > 0) parts.push(minutes + ' Phút');
    if (hours === 0 && minutes === 0) parts.push(seconds + ' Giây');
    return parts.join(' ');
  } catch (e) { return ''; }
}

// --- createJsonResponse (Giữ nguyên) ---
function createJsonResponse(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }

// --- getColumnIndexByName (Giữ nguyên) ---
function getColumnIndexByName(sheet, columnName) {
   if (!columnName) return -1;
   const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
   const lowerCaseColName = columnName.toLowerCase();
   for (let i = 0; i < headers.length; i++) { if (headers[i] && String(headers[i]).toLowerCase() === lowerCaseColName) return i + 1; }
   Logger.log(`Column "${columnName}" not found.`); return -1;
 }

// --- escapeHtml (Giữ nguyên - Phiên bản đúng) ---
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        try {
            unsafe = String(unsafe);
        } catch (e) {
            console.warn("Không thể chuyển đổi giá trị thành chuỗi để escape:", unsafe);
            return '';
        }
    }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
// --- decodeBase64Image (Giữ nguyên) ---
function decodeBase64Image(base64String) {
   const match = base64String.match(/^data:(image\/.+);base64,(.+)$/);
   if (!match) throw new Error("Invalid Base64.");
   return { contentType: match[1], decodedBytes: Utilities.base64Decode(match[2]) };
 }

// --- findRegistrationDetails (Cập nhật quét đa sheet) ---
function findRegistrationDetails(phoneNumber, ssOrSheet) {
  Logger.log(`findRegistrationDetails called for phone: ${phoneNumber}`);
  if (!phoneNumber) return null;

  const searchPhone = normalizePhone(phoneNumber);
  if (!searchPhone) return null;

  let ss;
  if (ssOrSheet && typeof ssOrSheet.getName === 'function' && typeof ssOrSheet.getParent === 'function') {
    ss = ssOrSheet.getParent();
  } else {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch(e) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
  }

  const dataSheets = getAllDataSheets(ss);
  let bestCandidate = null;

  dataSheets.forEach(sheet => {
    const cols = getColumnIndices(sheet);
    if (!cols || !cols[COL_PHONE_NUMBER] || cols[COL_PHONE_NUMBER] < 1) return;

    const phoneCol = cols[COL_PHONE_NUMBER];
    const leaderNameCol = cols[COL_LEADER_NAME] > 0 ? cols[COL_LEADER_NAME] : -1;
    const emailCol = cols[COL_EMAIL] > 0 ? cols[COL_EMAIL] : -1;
    const memberListCol = cols[COL_MEMBER_LIST] > 0 ? cols[COL_MEMBER_LIST] : -1;
    const climbDateCol = cols[COL_CLIMB_DATE] > 0 ? cols[COL_CLIMB_DATE] : -1;
    const climbTimeCol = cols[COL_CLIMB_TIME] > 0 ? cols[COL_CLIMB_TIME] : -1;
    const timestampCol = cols[COL_TIMESTAMP] > 0 ? cols[COL_TIMESTAMP] : -1;

    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      const sheetPhone = normalizePhone(data[i][phoneCol - 1]);
      if (sheetPhone === searchPhone) {
        const climbDateValue = climbDateCol > 0 ? data[i][climbDateCol - 1] : null;
        const climbTimeValue = climbTimeCol > 0 ? String(data[i][climbTimeCol - 1] || '').trim() : '';
        const registrationTsValue = timestampCol > 0 ? data[i][timestampCol - 1] : null;
        const leaderNameValue = leaderNameCol > 0 ? String(data[i][leaderNameCol - 1] || 'Bạn').trim() : 'Bạn';
        const userEmailValue = emailCol > 0 ? String(data[i][emailCol - 1] || '').trim().toLowerCase() : '';
        const memberListStrValue = memberListCol > 0 ? String(data[i][memberListCol - 1] || '').trim() : '';

        const tsDate = registrationTsValue instanceof Date ? registrationTsValue : (registrationTsValue ? new Date(registrationTsValue) : null);
        const cDate = climbDateValue instanceof Date ? climbDateValue : (climbDateValue ? new Date(climbDateValue) : null);
        const sortTime = tsDate ? tsDate.getTime() : (cDate ? cDate.getTime() : 0);

        const candidate = {
          sheet: sheet,
          sheetName: sheet.getName(),
          rowIndex: i + 1,
          leaderName: leaderNameValue,
          userEmail: userEmailValue || null,
          memberListString: memberListStrValue,
          climbDate: cDate || new Date(),
          climbTime: climbTimeValue,
          registrationTimestamp: tsDate,
          sortTime: sortTime
        };

        if (!bestCandidate || 
            candidate.sortTime > bestCandidate.sortTime || 
            (candidate.sortTime === bestCandidate.sortTime && candidate.rowIndex > bestCandidate.rowIndex)) {
          bestCandidate = candidate;
        }
      }
    }
  });

  if (bestCandidate) {
    Logger.log(`DEBUG findRegDetails: Selected NEWEST registration for ${searchPhone} in Sheet "${bestCandidate.sheetName}", Row ${bestCandidate.rowIndex}. Leader=${bestCandidate.leaderName}, Email=${bestCandidate.userEmail}`);
    return bestCandidate;
  }

  Logger.log(`findRegDetails: Phone ${searchPhone} not found in any sheet.`);
  return null;
}

// --- getColumnIndices ---
function getColumnIndices(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return null;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const indices = {};

  const expectedCols = [
    COL_TIMESTAMP, COL_LEADER_NAME, COL_PHONE_NUMBER, COL_ADDRESS, COL_GROUP_SIZE, COL_EMAIL,
    COL_CLIMB_DATE, COL_CLIMB_TIME, COL_SAFETY_COMMIT, COL_MEMBER_LIST, COL_STATUS, COL_CERT_LINKS,
    COL_BIRTHDAY, COL_CCCD, COL_SIGNATURE_IMAGE, COL_COMMITMENT_PDF
  ];

  expectedCols.forEach(colName => {
    let foundIndex = -1;
    const aliases = (typeof HEADER_ALIASES !== 'undefined' && HEADER_ALIASES[colName]) ? HEADER_ALIASES[colName] : [];
    const lowerCol = colName.toLowerCase();

    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || '').trim().toLowerCase();
      if (h === lowerCol || aliases.includes(h)) {
        foundIndex = i + 1;
        break;
      }
    }
    indices[colName] = foundIndex;
  });

  return indices;
}

// --- createRowArray (Giữ nguyên) ---
function createRowArray(columnIndexMap, dataObject) {
     const maxColIndex = Math.max(...Object.values(columnIndexMap).filter(idx => idx > 0));
     if (maxColIndex <= 0) return [];
     const newRow = []; newRow.length = maxColIndex; newRow.fill('');
     for (const colName in dataObject) { if (dataObject.hasOwnProperty(colName) && columnIndexMap[colName] > 0) newRow[columnIndexMap[colName] - 1] = dataObject[colName]; }
     return newRow;
 }
