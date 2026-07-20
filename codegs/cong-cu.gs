/************************************************************
 * CODE.GS HOÀN CHỈNH
 * Dùng cho Google Sheet đăng ký leo núi
 *
 * Sheet dữ liệu gốc có các cột:
 * Timestamp | LeaderName | PhoneNumber | Birthday | CCCD | Address
 * GroupSize | Email | ClimbDate | ClimbTime | SafetyCom
 * MemberList | Status | CertificateLinks | SignatureImage
 * CommitmentPDF | XÓA?
 *
 * Chức năng:
 * 1. Xử lý trùng theo PhoneNumber + ClimbDate
 * 2. Dashboard thống kê leo núi theo ClimbDate
 * 3. Thống kê số lượt đăng ký, tổng lượt khách theo ngày/tháng/giai đoạn
 * 4. Thống kê theo tháng toàn bộ dữ liệu độc lập với khoảng ngày
 * 5. Dashboard có màu sắc, khung bảng, dòng xen kẽ, định dạng KPI
 ************************************************************/


/************************************************************
 * I. CẤU HÌNH CHUNG
 ************************************************************/

// Nếu muốn chỉ định chính xác tên sheet dữ liệu gốc thì nhập tại đây.
// Ví dụ: const DATA_SHEET_NAME = "Form Responses 1";
// Nếu để trống "", hệ thống tự lấy sheet dữ liệu đầu tiên không phải sheet công cụ.
const DATA_SHEET_NAME = "";

// Dòng tiêu đề trong sheet dữ liệu gốc
const HEADER_ROW = 1;

// Tên sheet xử lý trùng số điện thoại
const DUP_TOOL_SHEET_NAME = "XU_LY_TRUNG";

// Ô nhập điều kiện lọc trên sheet xử lý trùng
const DUP_FROM_CELL = "B2";
const DUP_TO_CELL = "D2";

// Tên sheet dashboard thống kê leo núi
const CLIMB_DASHBOARD_SHEET_NAME = "THONG_KE_LEO_NUI";

// Ô nhập điều kiện lọc trên dashboard
const DASHBOARD_FROM_CELL = "B3";
const DASHBOARD_TO_CELL = "D3";



/************************************************************
 * II. CẤU HÌNH TỰ DÒ CỘT THEO TIÊU ĐỀ
 ************************************************************/

// Cột số điện thoại
const PHONE_HEADERS = [
  "PhoneNumber",
  "Phone Number",
  "PhoneNum",
  "Phone Num",
  "Phone",
  "Mobile",
  "MobilePhone",
  "Mobile Phone",
  "SĐT",
  "SDT",
  "Số điện thoại",
  "So dien thoai",
  "Điện thoại",
  "Dien thoai"
];

// Cột ngày leo núi
const CLIMB_DATE_HEADERS = [
  "ClimbDate",
  "Climb Date",
  "Ngày leo núi",
  "Ngay leo nui",
  "Ngày đi",
  "Ngay di",
  "Ngày tham gia",
  "Ngay tham gia",
  "Ngày đăng ký leo núi",
  "Ngay dang ky leo nui",
  "Ngày dự kiến leo núi",
  "Ngay du kien leo nui"
];

// Cột số khách/số người trong nhóm
const CLIMB_GUEST_HEADERS = [
  "GroupSize",
  "Group Size",
  "Số khách",
  "So khach",
  "Số lượng khách",
  "So luong khach",
  "Số lượt khách",
  "So luot khach",
  "Lượt khách",
  "Luot khach",
  "Số người",
  "So nguoi",
  "Số người tham gia",
  "So nguoi tham gia",
  "Tổng số khách",
  "Tong so khach",
  "Tổng số người",
  "Tong so nguoi"
];


/************************************************************
 * III. MENU
 ************************************************************/

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu("XỬ LÝ TRÙNG SĐT")
    .addItem("1. Gom nhóm & kiểm tra", "taoBangXuLyMenu")
    .addItem("2. Xóa theo lựa chọn", "xoaTheoBangXuLy")
    .addItem("3. Tải lại / Làm mới bảng trùng", "lamMoiBangXuLy")
    .addToUi();

  ui.createMenu("THỐNG KÊ LEO NÚI")
    .addItem("1. Tạo dashboard thống kê", "taoDashboardLeoNui")
    .addItem("2. Cập nhật thống kê", "capNhatThongKeLeoNui")
    .addToUi();
}

function taoBangXuLyMenu() {
  taoBangXuLy(false);
}

function lamMoiBangXuLy() {
  taoBangXuLy(false);
}


/************************************************************
 * IV. XỬ LÝ TRÙNG SỐ ĐIỆN THOẠI
 * Điều kiện trùng: cùng SĐT chuẩn hóa + cùng ngày leo núi
 ************************************************************/

function taoBangXuLy(isReload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetMain = getDataSheet_();
  const data = sheetMain.getDataRange().getValues();

  if (data.length <= HEADER_ROW) {
    if (!isReload) SpreadsheetApp.getUi().alert("Sheet dữ liệu gốc chưa có dữ liệu.");
    return;
  }

  let sheetTool = ss.getSheetByName(DUP_TOOL_SHEET_NAME);

  // Đọc ngày lọc hiện tại (nếu sheet xử lý trùng đã tồn tại)
  let filterFromDate = null;
  let filterToDate = null;
  if (sheetTool) {
    filterFromDate = parseDateValue_(sheetTool.getRange(DUP_FROM_CELL).getValue());
    filterToDate = parseDateValue_(sheetTool.getRange(DUP_TO_CELL).getValue());
  }

  const fromKey = filterFromDate ? dateKey_(filterFromDate) : null;
  const toKey = filterToDate ? dateKey_(filterToDate) : null;

  const header = data[HEADER_ROW - 1];
  const phoneCol = findColumnByHeaders_(header, PHONE_HEADERS);
  const dateCol = findColumnByHeaders_(header, CLIMB_DATE_HEADERS);

  if (phoneCol === -1) {
    if (!isReload) {
      SpreadsheetApp.getUi().alert(
        "Không tìm thấy cột số điện thoại.\n\n" +
        "Vui lòng kiểm tra tiêu đề cột. Cột số điện thoại nên đặt là: PhoneNumber."
      );
    }
    return;
  }

  if (dateCol === -1) {
    if (!isReload) {
      SpreadsheetApp.getUi().alert(
        "Không tìm thấy cột ngày leo núi.\n\n" +
        "Vui lòng kiểm tra tiêu đề cột. Cột ngày leo núi nên đặt là: ClimbDate."
      );
    }
    return;
  }

  let map = {};
  let skippedNoDateCount = 0;

  for (let i = HEADER_ROW; i < data.length; i++) {
    let phone = data[i][phoneCol];
    const climbDate = parseDateValue_(data[i][dateCol]);

    // Chỉ kiểm tra trùng khi có đủ SĐT và ngày leo
    if (!phone || !climbDate) {
      if (phone && !climbDate) skippedNoDateCount++;
      continue;
    }

    phone = normalizePhone(phone);
    if (!phone) continue;

    const climbKey = dateKey_(climbDate);

    // Lọc theo khoảng ngày leo núi (nếu người dùng có đặt Từ ngày / Đến ngày)
    if (fromKey && climbKey < fromKey) continue;
    if (toKey && climbKey > toKey) continue;

    // Điều kiện trùng: cùng SĐT + cùng ngày leo
    const duplicateKey = phone + "|" + climbKey;

    if (!map[duplicateKey]) {
      map[duplicateKey] = {
        phone: phone,
        climbDate: climbDate,
        climbKey: climbKey,
        items: []
      };
    }

    map[duplicateKey].items.push({
      row: i + 1,
      values: data[i]
    });
  }

  if (!sheetTool) {
    sheetTool = ss.insertSheet(DUP_TOOL_SHEET_NAME);
  }

  sheetTool.getRange(1, 1, sheetTool.getMaxRows(), sheetTool.getMaxColumns()).breakApart();
  sheetTool.clear();

  // Tạo khung lọc ngày ở các dòng đầu
  sheetTool.getRange("A2").setValue("Từ ngày");
  sheetTool.getRange("C2").setValue("Đến ngày");

  sheetTool.getRange("A2:D2")
    .setFontFamily("Arial")
    .setFontSize(10)
    .setVerticalAlignment("middle");

  sheetTool.getRange("A2")
    .setFontWeight("bold")
    .setFontColor("#1f4e78")
    .setBackground("#d9eaf7")
    .setHorizontalAlignment("center");

  sheetTool.getRange("C2")
    .setFontWeight("bold")
    .setFontColor("#1f4e78")
    .setBackground("#d9eaf7")
    .setHorizontalAlignment("center");

  if (filterFromDate) {
    sheetTool.getRange(DUP_FROM_CELL).setValue(filterFromDate);
  }
  if (filterToDate) {
    sheetTool.getRange(DUP_TO_CELL).setValue(filterToDate);
  }

  sheetTool.getRange(DUP_FROM_CELL)
    .setBackground("#fff2cc")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setNumberFormat("dd/MM/yyyy")
    .setBorder(true, true, true, true, true, true, "#b7b7b7", SpreadsheetApp.BorderStyle.SOLID);

  sheetTool.getRange(DUP_TO_CELL)
    .setBackground("#fff2cc")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setNumberFormat("dd/MM/yyyy")
    .setBorder(true, true, true, true, true, true, "#b7b7b7", SpreadsheetApp.BorderStyle.SOLID);

  const noteRange = sheetTool.getRange("F2:L2");
  noteRange.breakApart();
  noteRange.merge();
  noteRange
    .setValue("Để trống B2 & D2 để kiểm tra toàn bộ lịch sử dữ liệu. Nhập ngày leo núi tại B2/D2 nếu chỉ muốn kiểm tra khoảng ngày mong muốn.")
    .setFontFamily("Arial")
    .setFontSize(10)
    .setFontColor("#666666")
    .setFontStyle("italic")
    .setBackground("#f3f6f9")
    .setWrap(true)
    .setVerticalAlignment("middle");

  sheetTool.setRowHeight(2, 36);

  const outputHeader = [
    "XÓA?",
    "ROW GỐC",
    "SĐT CHUẨN HÓA",
    "NGÀY LEO CHUẨN HÓA",
    ...header
  ];

  ensureColumns_(sheetTool, outputHeader.length);

  let row = 4;

  sheetTool.getRange(row, 1, 1, outputHeader.length).setValues([outputHeader]);
  sheetTool.getRange(row, 1, 1, outputHeader.length)
    .setFontFamily("Arial")
    .setFontWeight("bold")
    .setFontColor("#ffffff")
    .setBackground("#1f4e78")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheetTool.setRowHeight(row, 34);

  row++;

  let checkboxRows = [];
  let duplicateGroupCount = 0;
  let duplicateRowCount = 0;

  const sortedKeys = Object.keys(map).sort((a, b) => {
    const groupA = map[a];
    const groupB = map[b];

    if (groupA.climbKey === groupB.climbKey) {
      return groupA.phone.localeCompare(groupB.phone);
    }

    return groupA.climbKey.localeCompare(groupB.climbKey);
  });

  sortedKeys.forEach(key => {
    const group = map[key];

    if (group.items.length > 1) {
      duplicateGroupCount++;
      duplicateRowCount += group.items.length;

      sheetTool.getRange(row, 1, 1, outputHeader.length)
        .merge()
        .setValue(
          "Ngày leo: " + formatDate_(group.climbDate) +
          " | SĐT: " + group.phone +
          " | Số dòng trùng: " + group.items.length
        )
        .setFontFamily("Arial")
        .setFontWeight("bold")
        .setFontColor("#274e13")
        .setBackground("#d9ead3")
        .setHorizontalAlignment("left")
        .setVerticalAlignment("middle");

      sheetTool.setRowHeight(row, 30);

      row++;

      group.items.forEach((item, index) => {
        const line = [
          false,
          item.row,
          group.phone,
          formatDate_(group.climbDate),
          ...item.values
        ];

        sheetTool.getRange(row, 1, 1, line.length).setValues([line]);

        const dataRange = sheetTool.getRange(row, 1, 1, line.length);
        dataRange
          .setFontFamily("Arial")
          .setFontSize(10)
          .setVerticalAlignment("middle")
          .setBorder(true, true, true, true, true, true, "#d9e2f3", SpreadsheetApp.BorderStyle.SOLID);

        if (index % 2 === 0) {
          dataRange.setBackground("#ffffff");
        } else {
          dataRange.setBackground("#f8fbfd");
        }

        sheetTool.getRange(row, 1).setHorizontalAlignment("center");
        sheetTool.getRange(row, 2).setHorizontalAlignment("center");
        sheetTool.getRange(row, 3).setHorizontalAlignment("center");
        sheetTool.getRange(row, 4).setHorizontalAlignment("center");

        checkboxRows.push(row);
        row++;
      });

      row++;
    }
  });

  checkboxRows.forEach(r => {
    sheetTool.getRange(r, 1).insertCheckboxes();
  });

  sheetTool.setFrozenRows(4);
  sheetTool.setHiddenGridlines(true);
  sheetTool.autoResizeColumns(1, Math.min(sheetTool.getLastColumn(), 14));

  let message =
    "Đã tạo bảng xử lý trùng SĐT theo điều kiện: cùng SĐT và cùng ngày leo.\n\n" +
    "Số nhóm trùng: " + duplicateGroupCount + "\n" +
    "Số dòng nằm trong nhóm trùng: " + duplicateRowCount + "\n\n";

  if (fromKey || toKey) {
    message += "Đang áp dụng lọc ngày leo núi: " +
      (fromKey ? "Từ " + formatDate_(filterFromDate) : "") +
      (toKey ? " Đến " + formatDate_(filterToDate) : "") + "\n\n";
  }

  message += "Vui lòng tick cột 'XÓA?' rồi chạy bước 2.";

  if (skippedNoDateCount > 0) {
    message +=
      "\n\nLưu ý: Có " + skippedNoDateCount +
      " dòng có SĐT nhưng không đọc được ngày leo nên chưa đưa vào kiểm tra trùng.";
  }

  if (!isReload) {
    SpreadsheetApp.getUi().alert(message);
  }
}


function xoaTheoBangXuLy() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTool = ss.getSheetByName(DUP_TOOL_SHEET_NAME);
  const sheetMain = getDataSheet_();

  if (!sheetTool) {
    SpreadsheetApp.getUi().alert("Chưa có sheet XU_LY_TRUNG. Vui lòng chạy bước 1 trước.");
    return;
  }

  const data = sheetTool.getDataRange().getValues();
  let rowsToDelete = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === true && typeof data[i][1] === "number") {
      rowsToDelete.push(data[i][1]);
    }
  }

  if (rowsToDelete.length === 0) {
    SpreadsheetApp.getUi().alert("Chưa chọn dòng nào để xóa (Vui lòng tích vào ô 'XÓA?').");
    return;
  }

  rowsToDelete = [...new Set(rowsToDelete)];
  rowsToDelete.sort((a, b) => b - a);

  rowsToDelete.forEach(r => {
    sheetMain.deleteRow(r);
  });

  SpreadsheetApp.getUi().alert(
    "Đã xóa thành công " + rowsToDelete.length + " dòng khỏi sheet dữ liệu gốc!\n\n" +
    "Khi nào cần kiểm tra tiếp hoặc qua những ngày sau mới dùng, bạn vui lòng chọn Menu: XỬ LÝ TRÙNG SĐT -> '3. Tải lại / Làm mới bảng trùng'."
  );
}


/************************************************************
 * V. DASHBOARD THỐNG KÊ LEO NÚI
 ************************************************************/

function taoDashboardLeoNui() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheetDash = ss.getSheetByName(CLIMB_DASHBOARD_SHEET_NAME);

  if (!sheetDash) {
    sheetDash = ss.insertSheet(CLIMB_DASHBOARD_SHEET_NAME);
  }

  sheetDash.getRange(1, 1, sheetDash.getMaxRows(), sheetDash.getMaxColumns()).breakApart();
  sheetDash.clear();

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  ensureColumns_(sheetDash, 12);
  ensureRows_(sheetDash, 180);

  sheetDash.getRange(DASHBOARD_FROM_CELL).setValue(firstDayOfMonth).setNumberFormat("dd/MM/yyyy");
  sheetDash.getRange(DASHBOARD_TO_CELL).setValue(today).setNumberFormat("dd/MM/yyyy");

  applyDashboardBaseStyle_(sheetDash);

  capNhatThongKeLeoNui();

  sheetDash.autoResizeColumns(1, 11);

  SpreadsheetApp.getUi().alert("Đã tạo dashboard thống kê leo núi với giao diện màu sắc, định dạng tối ưu.");
}


function capNhatThongKeLeoNui() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetMain = getDataSheet_();

  let sheetDash = ss.getSheetByName(CLIMB_DASHBOARD_SHEET_NAME);

  if (!sheetDash) {
    taoDashboardLeoNui();
    return;
  }

  ensureColumns_(sheetDash, 12);
  ensureRows_(sheetDash, 180);

  const data = sheetMain.getDataRange().getValues();

  if (data.length <= HEADER_ROW) {
    SpreadsheetApp.getUi().alert("Sheet dữ liệu gốc chưa có dữ liệu.");
    return;
  }

  const header = data[HEADER_ROW - 1];

  const dateCol = findColumnByHeaders_(header, CLIMB_DATE_HEADERS);
  const guestCol = findColumnByHeaders_(header, CLIMB_GUEST_HEADERS);

  if (dateCol === -1) {
    SpreadsheetApp.getUi().alert(
      "Không tìm thấy cột ngày leo núi.\n\n" +
      "Sheet của bạn cần có tiêu đề cột: ClimbDate."
    );
    return;
  }

  if (guestCol === -1) {
    SpreadsheetApp.getUi().alert(
      "Không tìm thấy cột số khách.\n\n" +
      "Sheet của bạn cần có tiêu đề cột: GroupSize."
    );
    return;
  }

  const fromDate = parseDateValue_(sheetDash.getRange(DASHBOARD_FROM_CELL).getValue());
  const toDate = parseDateValue_(sheetDash.getRange(DASHBOARD_TO_CELL).getValue());

  if (!fromDate || !toDate) {
    SpreadsheetApp.getUi().alert("Vui lòng nhập đúng định dạng ngày tại ô B3 và D3.");
    return;
  }

  const fromKey = dateKey_(fromDate);
  const toKey = dateKey_(toDate);

  if (fromKey > toKey) {
    SpreadsheetApp.getUi().alert("Từ ngày không được lớn hơn Đến ngày.");
    return;
  }

  let totalRegister = 0;
  let totalGuest = 0;

  let dailyMap = {};
  let monthlyRangeMap = {};
  let monthlyAllMap = {};

  for (let i = HEADER_ROW; i < data.length; i++) {
    const row = data[i];

    const climbDate = parseDateValue_(row[dateCol]);
    if (!climbDate) continue;

    const climbKey = dateKey_(climbDate);

    let guestCount = parseGuestCount_(row[guestCol]);

    if (guestCount <= 0) guestCount = 1;

    /********************************************************
     * 1. THỐNG KÊ THEO THÁNG TOÀN BỘ DỮ LIỆU
     * Không phụ thuộc B3 - D3
     ********************************************************/
    const monthKeyValue = monthKey_(climbDate);

    if (!monthlyAllMap[monthKeyValue]) {
      monthlyAllMap[monthKeyValue] = {
        month: monthKeyValue,
        register: 0,
        guest: 0
      };
    }

    monthlyAllMap[monthKeyValue].register++;
    monthlyAllMap[monthKeyValue].guest += guestCount;

    /********************************************************
     * 2. THỐNG KÊ THEO NGÀY VÀ THEO THÁNG TRONG GIAI ĐOẠN
     * Có phụ thuộc B3 - D3
     ********************************************************/
    if (climbKey < fromKey || climbKey > toKey) continue;

    totalRegister++;
    totalGuest += guestCount;

    if (!dailyMap[climbKey]) {
      dailyMap[climbKey] = {
        date: climbDate,
        register: 0,
        guest: 0
      };
    }

    dailyMap[climbKey].register++;
    dailyMap[climbKey].guest += guestCount;

    if (!monthlyRangeMap[monthKeyValue]) {
      monthlyRangeMap[monthKeyValue] = {
        month: monthKeyValue,
        register: 0,
        guest: 0
      };
    }

    monthlyRangeMap[monthKeyValue].register++;
    monthlyRangeMap[monthKeyValue].guest += guestCount;
  }

  const activeDays = Object.keys(dailyMap).length;
  const avgGuestPerDay = activeDays > 0 ? totalGuest / activeDays : 0;
  const avgGuestPerRegister = totalRegister > 0 ? totalGuest / totalRegister : 0;

  applyDashboardBaseStyle_(sheetDash);
  clearDashboardOutput_(sheetDash);

  const stats = [
    ["Giai đoạn thống kê", formatDate_(fromDate) + " - " + formatDate_(toDate)],
    ["Tổng số lượt đăng ký", totalRegister],
    ["Tổng lượt khách", totalGuest],
    ["Số ngày có đăng ký leo núi", activeDays],
    ["Bình quân khách/ngày có đăng ký", avgGuestPerDay],
    ["Bình quân khách/lượt đăng ký", avgGuestPerRegister]
  ];

  sheetDash.getRange(7, 1, stats.length, 2).setValues(stats);

  /************** BẢNG 1: THỐNG KÊ THEO NGÀY **************/

  const dailyRows = Object.keys(dailyMap)
    .sort()
    .map(key => [
      dailyMap[key].date,
      dailyMap[key].register,
      dailyMap[key].guest
    ]);

  sheetDash.getRange("A16:C16")
    .setValues([["Ngày leo núi", "Số lượt đăng ký", "Tổng lượt khách"]]);

  if (dailyRows.length > 0) {
    ensureRows_(sheetDash, 17 + dailyRows.length);
    sheetDash.getRange(17, 1, dailyRows.length, 3).setValues(dailyRows);
    sheetDash.getRange(17, 1, dailyRows.length, 1).setNumberFormat("dd/MM/yyyy");
  } else {
    showNoDataMessage_(sheetDash, 17, 1, 3, "Không có dữ liệu trong giai đoạn đã chọn.");
  }

  /************** BẢNG 2: THỐNG KÊ THEO THÁNG TRONG GIAI ĐOẠN **************/

  const monthlyRangeRows = Object.keys(monthlyRangeMap)
    .sort((a, b) => monthStringToDate_(a) - monthStringToDate_(b))
    .map(key => [
      monthlyRangeMap[key].month,
      monthlyRangeMap[key].register,
      monthlyRangeMap[key].guest
    ]);

  sheetDash.getRange("E16:G16")
    .setValues([["Tháng", "Số lượt đăng ký", "Tổng lượt khách"]]);

  if (monthlyRangeRows.length > 0) {
    ensureRows_(sheetDash, 17 + monthlyRangeRows.length);
    sheetDash.getRange(17, 5, monthlyRangeRows.length, 3).setValues(monthlyRangeRows);
  } else {
    showNoDataMessage_(sheetDash, 17, 5, 3, "Không có dữ liệu trong giai đoạn đã chọn.");
  }

  /************** BẢNG 3: THỐNG KÊ THEO THÁNG TOÀN BỘ DỮ LIỆU **************/

  const monthlyAllRows = Object.keys(monthlyAllMap)
    .sort((a, b) => monthStringToDate_(a) - monthStringToDate_(b))
    .map(key => [
      monthlyAllMap[key].month,
      monthlyAllMap[key].register,
      monthlyAllMap[key].guest
    ]);

  sheetDash.getRange("I16:K16")
    .setValues([["Tháng", "Số lượt đăng ký", "Tổng lượt khách"]]);

  if (monthlyAllRows.length > 0) {
    ensureRows_(sheetDash, 17 + monthlyAllRows.length);
    sheetDash.getRange(17, 9, monthlyAllRows.length, 3).setValues(monthlyAllRows);
  } else {
    showNoDataMessage_(sheetDash, 17, 9, 3, "Không có dữ liệu để thống kê.");
  }

  applyDashboardDynamicStyle_(
    sheetDash,
    dailyRows.length,
    monthlyRangeRows.length,
    monthlyAllRows.length
  );

  sheetDash.autoResizeColumns(1, 11);
}


/************************************************************
 * VI. TỰ CẬP NHẬT KHI SỬA ĐIỀU KIỆN DASHBOARD
 ************************************************************/

function onEdit(e) {
  try {
    if (!e || !e.range) return;

    const sheet = e.range.getSheet();
    const cell = e.range.getA1Notation();

    if (
      sheet.getName() === CLIMB_DASHBOARD_SHEET_NAME &&
      (
        cell === DASHBOARD_FROM_CELL ||
        cell === DASHBOARD_TO_CELL
      )
    ) {
      capNhatThongKeLeoNui();
    }

  } catch (err) {
    Logger.log(err);
  }
}


/************************************************************
 * VII. HÀM ĐỊNH DẠNG DASHBOARD
 ************************************************************/

function applyDashboardBaseStyle_(sheetDash) {
  sheetDash.setHiddenGridlines(true);

  // Tiêu đề chính
  const titleRange = sheetDash.getRange("A1:K1");
  titleRange.breakApart();
  titleRange.merge();
  titleRange
    .setValue("DASHBOARD THỐNG KÊ ĐĂNG KÝ LEO NÚI")
    .setFontFamily("Arial")
    .setFontSize(16)
    .setFontWeight("bold")
    .setFontColor("#ffffff")
    .setBackground("#1f4e78")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheetDash.setRowHeight(1, 42);

  // Vùng điều kiện lọc
  sheetDash.getRange("A3").setValue("Từ ngày");
  sheetDash.getRange("C3").setValue("Đến ngày");

  sheetDash.getRange("A3:D3")
    .setFontFamily("Arial")
    .setFontSize(10)
    .setVerticalAlignment("middle");

  sheetDash.getRange("A3")
    .setFontWeight("bold")
    .setFontColor("#1f4e78")
    .setBackground("#d9eaf7")
    .setHorizontalAlignment("center");

  sheetDash.getRange("C3")
    .setFontWeight("bold")
    .setFontColor("#1f4e78")
    .setBackground("#d9eaf7")
    .setHorizontalAlignment("center");

  sheetDash.getRange("B3")
    .setBackground("#fff2cc")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setNumberFormat("dd/MM/yyyy")
    .setBorder(true, true, true, true, true, true, "#b7b7b7", SpreadsheetApp.BorderStyle.SOLID);

  sheetDash.getRange("D3")
    .setBackground("#fff2cc")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setNumberFormat("dd/MM/yyyy")
    .setBorder(true, true, true, true, true, true, "#b7b7b7", SpreadsheetApp.BorderStyle.SOLID);

  const noteRange = sheetDash.getRange("F3:K3");
  noteRange.breakApart();
  noteRange.merge();
  noteRange
    .setValue("Bảng ngày và tháng trong giai đoạn tính theo B3 - D3. Bảng tháng toàn bộ dữ liệu tính độc lập.")
    .setFontFamily("Arial")
    .setFontSize(10)
    .setFontColor("#666666")
    .setFontStyle("italic")
    .setBackground("#f3f6f9")
    .setWrap(true)
    .setVerticalAlignment("middle");

  sheetDash.setRowHeight(3, 36);

  // Tiêu đề KPI
  sheetDash.getRange("A6:B6")
    .setValues([["CHỈ TIÊU", "KẾT QUẢ"]])
    .setFontFamily("Arial")
    .setFontWeight("bold")
    .setFontColor("#ffffff")
    .setBackground("#38761d")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#274e13", SpreadsheetApp.BorderStyle.SOLID);

  sheetDash.setRowHeight(6, 32);

  // Tiêu đề các bảng
  styleDashboardSectionTitle_(
    sheetDash.getRange("A15:C15"),
    "THỐNG KÊ THEO NGÀY LEO NÚI"
  );

  styleDashboardSectionTitle_(
    sheetDash.getRange("E15:G15"),
    "THỐNG KÊ THEO THÁNG TRONG GIAI ĐOẠN"
  );

  styleDashboardSectionTitle_(
    sheetDash.getRange("I15:K15"),
    "THỐNG KÊ THEO THÁNG TOÀN BỘ DỮ LIỆU"
  );

  sheetDash.setFrozenRows(3);

  // Độ rộng cột tối ưu
  sheetDash.setColumnWidth(1, 190);
  sheetDash.setColumnWidth(2, 130);
  sheetDash.setColumnWidth(3, 130);
  sheetDash.setColumnWidth(4, 30);

  sheetDash.setColumnWidth(5, 150);
  sheetDash.setColumnWidth(6, 130);
  sheetDash.setColumnWidth(7, 130);
  sheetDash.setColumnWidth(8, 30);

  sheetDash.setColumnWidth(9, 150);
  sheetDash.setColumnWidth(10, 130);
  sheetDash.setColumnWidth(11, 130);
}


function applyDashboardDynamicStyle_(sheetDash, dailyCount, monthlyRangeCount, monthlyAllCount) {
  // Định dạng KPI
  sheetDash.getRange("A7:A12")
    .setFontFamily("Arial")
    .setFontWeight("bold")
    .setFontColor("#1f4e78")
    .setBackground("#edf4fb")
    .setVerticalAlignment("middle");

  sheetDash.getRange("B7:B12")
    .setFontFamily("Arial")
    .setFontWeight("bold")
    .setFontColor("#0b5394")
    .setBackground("#ffffff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheetDash.getRange("A7:B12")
    .setBorder(true, true, true, true, true, true, "#b7c9d9", SpreadsheetApp.BorderStyle.SOLID);

  sheetDash.getRange("B8:B10").setNumberFormat("#,##0");
  sheetDash.getRange("B11:B12").setNumberFormat("0.00");

  sheetDash.getRange("B8:B10")
    .setFontSize(13)
    .setFontColor("#38761d");

  sheetDash.setRowHeights(7, 6, 28);

  // Định dạng bảng
  styleDashboardTable_(sheetDash, 16, 1, 3, dailyCount);
  styleDashboardTable_(sheetDash, 16, 5, 3, monthlyRangeCount);
  styleDashboardTable_(sheetDash, 16, 9, 3, monthlyAllCount);
}


function clearDashboardOutput_(sheetDash) {
  const maxRows = sheetDash.getMaxRows();

  sheetDash.getRange("A7:B12").clearContent().clearFormat();

  if (maxRows >= 16) {
    sheetDash.getRange(16, 1, maxRows - 15, 3).breakApart().clearContent().clearFormat();
    sheetDash.getRange(16, 5, maxRows - 15, 3).breakApart().clearContent().clearFormat();
    sheetDash.getRange(16, 9, maxRows - 15, 3).breakApart().clearContent().clearFormat();
  }

  styleDashboardSectionTitle_(
    sheetDash.getRange("A15:C15"),
    "THỐNG KÊ THEO NGÀY LEO NÚI"
  );

  styleDashboardSectionTitle_(
    sheetDash.getRange("E15:G15"),
    "THỐNG KÊ THEO THÁNG TRONG GIAI ĐOẠN"
  );

  styleDashboardSectionTitle_(
    sheetDash.getRange("I15:K15"),
    "THỐNG KÊ THEO THÁNG TOÀN BỘ DỮ LIỆU"
  );
}


function styleDashboardSectionTitle_(range, title) {
  range.breakApart();
  range.merge();
  range
    .setValue(title)
    .setFontFamily("Arial")
    .setFontSize(11)
    .setFontWeight("bold")
    .setFontColor("#ffffff")
    .setBackground("#1f4e78")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#17365d", SpreadsheetApp.BorderStyle.SOLID);
}


function styleDashboardTable_(sheetDash, headerRow, startCol, colCount, dataRowCount) {
  const headerRange = sheetDash.getRange(headerRow, startCol, 1, colCount);

  headerRange
    .setFontFamily("Arial")
    .setFontWeight("bold")
    .setFontColor("#ffffff")
    .setBackground("#6aa84f")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true)
    .setBorder(true, true, true, true, true, true, "#38761d", SpreadsheetApp.BorderStyle.SOLID);

  sheetDash.setRowHeight(headerRow, 34);

  const bodyRowCount = Math.max(dataRowCount, 1);
  const bodyRange = sheetDash.getRange(headerRow + 1, startCol, bodyRowCount, colCount);

  bodyRange
    .setFontFamily("Arial")
    .setFontSize(10)
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#d9e2f3", SpreadsheetApp.BorderStyle.SOLID)
    .setWrap(true);

  if (dataRowCount > 0) {
    for (let i = 0; i < dataRowCount; i++) {
      const rowRange = sheetDash.getRange(headerRow + 1 + i, startCol, 1, colCount);

      if (i % 2 === 0) {
        rowRange.setBackground("#ffffff");
      } else {
        rowRange.setBackground("#f8fbfd");
      }
    }

    // Căn giữa và định dạng số cho các cột số liệu
    sheetDash.getRange(headerRow + 1, startCol + 1, dataRowCount, colCount - 1)
      .setHorizontalAlignment("center")
      .setNumberFormat("#,##0");

    // Căn giữa cột ngày/tháng
    sheetDash.getRange(headerRow + 1, startCol, dataRowCount, 1)
      .setHorizontalAlignment("center");

  } else {
    bodyRange
      .setBackground("#fff2cc")
      .setFontStyle("italic")
      .setFontColor("#666666")
      .setHorizontalAlignment("center");
  }
}


function showNoDataMessage_(sheetDash, row, startCol, colCount, message) {
  const range = sheetDash.getRange(row, startCol, 1, colCount);
  range.breakApart();
  range.merge();
  range
    .setValue(message)
    .setFontFamily("Arial")
    .setFontStyle("italic")
    .setFontColor("#666666")
    .setBackground("#fff2cc")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#d6b656", SpreadsheetApp.BorderStyle.SOLID);
}


/************************************************************
 * VIII. HÀM PHỤ TRỢ
 ************************************************************/

function getDataSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (DATA_SHEET_NAME) {
    const namedSheet = ss.getSheetByName(DATA_SHEET_NAME);

    if (namedSheet) {
      return namedSheet;
    }
  }

  const sheets = ss.getSheets();

  for (let i = 0; i < sheets.length; i++) {
    const name = sheets[i].getName();

    if (
      name !== DUP_TOOL_SHEET_NAME &&
      name !== CLIMB_DASHBOARD_SHEET_NAME
    ) {
      return sheets[i];
    }
  }

  return sheets[0];
}


function ensureColumns_(sheet, requiredCols) {
  const maxCols = sheet.getMaxColumns();

  if (maxCols < requiredCols) {
    sheet.insertColumnsAfter(maxCols, requiredCols - maxCols);
  }
}


function ensureRows_(sheet, requiredRows) {
  const maxRows = sheet.getMaxRows();

  if (maxRows < requiredRows) {
    sheet.insertRowsAfter(maxRows, requiredRows - maxRows);
  }
}


function normalizeText_(text) {
  return text
    ? text.toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "")
      .trim()
    : "";
}


function findColumnByHeaders_(headerRow, acceptedHeaders) {
  const normalizedAccepted = acceptedHeaders.map(h => normalizeText_(h));

  for (let i = 0; i < headerRow.length; i++) {
    const header = normalizeText_(headerRow[i]);

    if (normalizedAccepted.includes(header)) {
      return i;
    }
  }

  return -1;
}


function normalizePhone(phone) {
  if (!phone) return "";

  return phone.toString()
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/-/g, "")
    .replace(/^(\+84)/, "0")
    .replace(/^84/, "0")
    .trim();
}


function parseDateValue_(value) {
  if (!value) return null;

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  const text = value.toString().trim();

  let match = text.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);

  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1])
    );
  }

  match = text.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  }

  const date = new Date(text);

  if (!isNaN(date)) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  return null;
}


function parseGuestCount_(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") return value;

  const text = value.toString().replace(/[^\d]/g, "");

  return text ? Number(text) : 0;
}


function dateKey_(date) {
  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );
}


function monthKey_(date) {
  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "MM/yyyy"
  );
}


function formatDate_(date) {
  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "dd/MM/yyyy"
  );
}


function monthStringToDate_(monthString) {
  const parts = monthString.split("/");

  if (parts.length !== 2) {
    return new Date(1900, 0, 1);
  }

  const month = Number(parts[0]) - 1;
  const year = Number(parts[1]);

  return new Date(year, month, 1);
}