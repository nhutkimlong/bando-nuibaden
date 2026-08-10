    // --- Configuration ---
    const SPREADSHEET_ID = '1mAQNIo2QVfl4uNiuyVS2lAiSEnA40AkDrnIhoBRQGag'; // ID của Google Sheet của bạn

    // Expected Column Names (same as dangkytaochungnhan.gs)
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

    // --- Cache Management ---
    let _sheetCache = null;
    let _columnCache = null;
    let _lastCacheTime = 0;

    function getCachedSheet() {
      const now = Date.now();
      if (!_sheetCache || (now - _lastCacheTime) > (300 * 1000)) { // 5 minutes cache
        const dataSheets = getAllDataSheets();
        _sheetCache = dataSheets.length > 0 ? dataSheets[dataSheets.length - 1] : SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
        _lastCacheTime = now;
      }
      return _sheetCache;
    }

    function getCachedColumnIndices(sheet) {
      if (!_columnCache) {
        _columnCache = getColumnIndices(sheet);
        Logger.log(`Column indices cached: ${JSON.stringify(_columnCache)}`);
      }
      return _columnCache;
    }

    // --- getColumnIndices function (same as dangkytaochungnhan.gs) ---
    function getColumnIndices(sheet) {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const indices = {};
      const expectedCols = [
        COL_TIMESTAMP, COL_LEADER_NAME, COL_PHONE_NUMBER, COL_ADDRESS, COL_GROUP_SIZE, COL_EMAIL,
        COL_CLIMB_DATE, COL_CLIMB_TIME, COL_SAFETY_COMMIT, COL_MEMBER_LIST, COL_STATUS, COL_CERT_LINKS,
        COL_BIRTHDAY, COL_CCCD, COL_SIGNATURE_IMAGE, COL_COMMITMENT_PDF
      ];
      let criticalMissing = false;
      expectedCols.forEach(colName => {
        let foundIndex = -1;
        const lowerCaseColName = colName.toLowerCase();
        for (let i = 0; i < headers.length; i++) { 
          if (headers[i] && String(headers[i]).toLowerCase() === lowerCaseColName) { 
            foundIndex = i + 1; 
            break; 
          } 
        }
        if (foundIndex < 1) {
          Logger.log(`WARN: Column "${colName}" not found.`);
          // Check if missing column is critical
          if ([COL_PHONE_NUMBER, COL_LEADER_NAME, COL_EMAIL, COL_MEMBER_LIST].includes(colName)) {
            criticalMissing = true;
          }
        }
        indices[colName] = foundIndex;
      });
      if (criticalMissing) { 
        Logger.log("ERROR: Critical columns missing."); 
        return null; 
      }
      return indices;
    }

    // --- Main Function ---
    function doGet(e) {
      let action = e.parameter.action;
      let responseData = {};

      try {
        const data = getSheetData();
        let resultData = null;

        switch (action) {
          case 'getAllDashboardData':
            resultData = handleGetAllDashboardData(data);
            break;
          case 'getInitialStats':
            resultData = handleGetInitialStats(data);
            break;
          case 'getPeriodStats':
            let startDateStr = e.parameter.startDate;
            let endDateStr = e.parameter.endDate;
            resultData = handleGetPeriodStats(data, startDateStr, endDateStr);
            break;
          case 'searchPhone':
            let phone = e.parameter.phone;
            resultData = handleSearchPhone(data, phone);
            break;
          case 'getDailyChartData':
            resultData = handleGetDailyChartData(data);
            break;
          case 'getMonthlyChartData':
            resultData = handleGetMonthlyChartData(data);
            break;
          case 'getRecentRegistrations':
            let limit = e.parameter.limit ? parseInt(e.parameter.limit) : 10;
            resultData = handleGetRecentRegistrations(data, limit);
            break;
          case 'getMembersByPhone':
            let phoneForMembers = e.parameter.phone;
            resultData = handleGetMembersByPhone(data, phoneForMembers);
            break;
          default:
            throw new Error('Hành động không hợp lệ.');
        }

        responseData = {
          success: true,
          data: resultData
        };

      } catch (error) {
        Logger.log('Error in doGet: ' + error.message + ' Stack: ' + error.stack);
        responseData = {
          success: false,
          message: 'Đã xảy ra lỗi: ' + error.message,
          error: error.message
        };
      }

      return ContentService.createTextOutput(JSON.stringify(responseData))
                          .setMimeType(ContentService.MimeType.JSON);
    }

    // --- POST Handler for Manual Certificate Generation ---
    function doPost(e) {
      let requestData, action = '';
      try {
        requestData = JSON.parse(e.postData.contents);
        action = requestData.action || '';
        Logger.log(`doPost received action: "${action}", data keys: ${Object.keys(requestData).join(', ')}`);

        switch (action) {
          case 'generateCertificatesWithPhotos':
            return handleGenerateCertificatesWithPhotos(requestData);
          case 'findRegistrationDetails':
            return handleFindRegistrationDetails(requestData);
          case 'updateMemberList':
            return handleUpdateMemberList(requestData);
          default:
            Logger.log(`Invalid action in doPost: ${action}`);
            return createJsonResponse({ success: false, message: 'Hành động POST không hợp lệ.' });
        }
      } catch (error) {
        Logger.log(`!!! ERROR in doPost (Action: ${action}): ${error.message}\nInput Data: ${JSON.stringify(requestData)}\nStack: ${error.stack}`);
        return createJsonResponse({ success: false, message: `Lỗi máy chủ khi xử lý POST: ${error.message}` });
      }
    }

    // Test function to verify timestamp parsing
    function testTimestampParsing() {
      const testCases = [
        "21/08/2025 4:12:36",
        "21/08/2025 5:56:47", 
        "21/08/2025 6:00:20",
        "22/08/2025 5:55:17",
        "22/08/2025 6:45:55"
      ];
      
      console.log("Testing timestamp parsing:");
      testCases.forEach(testCase => {
        const parsed = parseDateCell(testCase);
        console.log(`${testCase} -> ${parsed ? parsed.toISOString() : 'INVALID'}`);
      });
    }

    const EXCLUDED_SHEET_NAMES = ['XU_LY_TRUNG', 'THONG_KE_LEO_NUI'];

    function getAllDataSheets() {
      let ss;
      try {
        ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      } catch(e) {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      }
      const sheets = ss.getSheets();
      return sheets.filter(sheet => !EXCLUDED_SHEET_NAMES.includes(sheet.getName()));
    }

    // --- Data Retrieval ---
    function getSheetData() {
      try {
        const dataSheets = getAllDataSheets();
        let combinedData = [];

        dataSheets.forEach(sheet => {
          const lastRow = sheet.getLastRow();
          if (lastRow >= 2) {
            const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
            const rows = range.getValues();
            combinedData = combinedData.concat(rows);
          }
        });

        return combinedData;
      } catch (error) {
        Logger.log('Error getting sheet data: ' + error.message);
        throw new Error('Lỗi khi truy cập Google Sheet: ' + error.message);
      }
    }

    // --- Utility Functions ---
    function parseDateCell(cellValue) {
        if (!cellValue) return null;
        let date;
        
        if (cellValue instanceof Date) {
            date = cellValue;
        } else {
            // Handle string format like "21/08/2025 4:12:36"
            const stringValue = String(cellValue).trim();
            if (stringValue.match(/^\d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2}:\d{2}$/)) {
                // Parse DD/MM/YYYY HH:MM:SS format
                const parts = stringValue.split(' ');
                const datePart = parts[0].split('/');
                const timePart = parts[1].split(':');
                
                const day = parseInt(datePart[0], 10);
                const month = parseInt(datePart[1], 10) - 1; // Month is 0-based
                const year = parseInt(datePart[2], 10);
                const hour = parseInt(timePart[0], 10);
                const minute = parseInt(timePart[1], 10);
                const second = parseInt(timePart[2], 10);
                
                date = new Date(year, month, day, hour, minute, second);
            } else {
                // Try standard Date parsing
                date = new Date(cellValue);
            }
        }
        
        if (isNaN(date.getTime())) {
            Logger.log(`Invalid date format encountered: ${cellValue}`);
            return null;
        }
        return date;
    }

    function parseGroupSizeCell(cellValue) {
        if (cellValue === null || cellValue === undefined || cellValue === '') return null;
        const groupSize = parseInt(cellValue, 10);
        if (isNaN(groupSize) || groupSize < 0) {
            Logger.log(`Invalid group size encountered: ${cellValue}`);
            return null;
        }
        return groupSize;
    }

    // --- Action Handlers ---
    function handleGetAllDashboardData(data) {
      const initialStats = handleGetInitialStats(data);
      const dailyChartData = handleGetDailyChartData(data);
      const monthlyChartData = handleGetMonthlyChartData(data);
      const visitorTypeData = handleGetVisitorTypeData(data);
      const growthTrendData = handleGetGrowthTrendData(data);
      const executiveSummary = generateExecutiveSummary(data, initialStats);

      return {
        initialStats: initialStats,
        dailyChart: dailyChartData,
        monthlyChart: monthlyChartData,
        visitorTypeData: visitorTypeData,
        growthTrendData: growthTrendData,
        executiveSummary: executiveSummary
      };
    }

    function handleGetInitialStats(data) {
      let monthlyCount = 0;
      let yearlyCount = 0;
      let totalCertificates = 0;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const sheet = getCachedSheet();
      const cols = getCachedColumnIndices(sheet);
      if (!cols) {
        throw new Error('Không thể lấy thông tin cột từ Google Sheet.');
      }

      data.forEach(row => {
        const timestampDate = parseDateCell(row[cols[COL_TIMESTAMP] - 1]);
        const groupSize = parseGroupSizeCell(row[cols[COL_GROUP_SIZE] - 1]);
        const certificateLinks = row[cols[COL_CERT_LINKS] - 1];

        if (timestampDate && groupSize !== null) {
            const rowYear = timestampDate.getFullYear();
            const rowMonth = timestampDate.getMonth();
            if (rowYear === currentYear) {
              yearlyCount += groupSize;
              if (rowMonth === currentMonth) {
                monthlyCount += groupSize;
              }
            }
        }
        
        // Count certificates - parse JSON array and count individual certificates
        if (certificateLinks && String(certificateLinks).trim() !== '' && String(certificateLinks).trim() !== 'N/A') {
          try {
            // Try to parse as JSON array
            const certificatesArray = JSON.parse(String(certificateLinks));
            if (Array.isArray(certificatesArray)) {
              // Count each certificate in the array
              totalCertificates += certificatesArray.length;
            } else {
              // If it's not an array but has content, count as 1
              totalCertificates += 1;
            }
          } catch (e) {
            // If JSON parsing fails, treat as single certificate
            Logger.log(`Failed to parse certificate JSON: ${e.message}`);
            totalCertificates += 1;
          }
        }
      });
      return { monthlyCount: monthlyCount, yearlyCount: yearlyCount, totalCertificates: totalCertificates };
    }

    function handleGetPeriodStats(data, startDateStr, endDateStr) {
      if (!startDateStr || !endDateStr) {
        throw new Error('Vui lòng cung cấp ngày bắt đầu và ngày kết thúc.');
      }
      let periodCount = 0;
      const startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Định dạng ngày không hợp lệ.');
      }
      if (startDate > endDate) {
        throw new Error('Ngày bắt đầu không được sau ngày kết thúc.');
      }

      const sheet = getCachedSheet();
      const cols = getCachedColumnIndices(sheet);
      if (!cols) {
        throw new Error('Không thể lấy thông tin cột từ Google Sheet.');
      }

      data.forEach(row => {
        const timestampDate = parseDateCell(row[cols[COL_TIMESTAMP] - 1]);
        const groupSize = parseGroupSizeCell(row[cols[COL_GROUP_SIZE] - 1]);
        if (timestampDate && groupSize !== null) {
            if (timestampDate >= startDate && timestampDate <= endDate) {
              periodCount += groupSize;
            }
        }
      });
      return { periodCount: periodCount };
    }

    function handleSearchPhone(data, phone) {
      if (!phone) {
        throw new Error('Vui lòng cung cấp số điện thoại để tìm kiếm.');
      }
      const searchTerm = phone.trim().replace(/\s+/g, '');
      let results = [];
      const scriptTimeZone = Session.getScriptTimeZone();
      const dateFormat = "dd/MM/yyyy";
      const timeFormat = "HH:mm";

      const sheet = getCachedSheet();
      const cols = getCachedColumnIndices(sheet);
      if (!cols) {
        throw new Error('Không thể lấy thông tin cột từ Google Sheet.');
      }

      data.forEach((row, index) => {
        const rowPhoneNumber = row[cols[COL_PHONE_NUMBER] - 1];

        if (rowPhoneNumber != null && String(rowPhoneNumber).replace(/^'/, '').trim().replace(/\s+/g, '') === searchTerm) {
          const registrationTimestampDate = parseDateCell(row[cols[COL_TIMESTAMP] - 1]);
          const climbDate = parseDateCell(row[cols[COL_CLIMB_DATE] - 1]);
          const groupSize = parseGroupSizeCell(row[cols[COL_GROUP_SIZE] - 1]);
          const leaderName = row[cols[COL_LEADER_NAME] - 1];
          const email = row[cols[COL_EMAIL] - 1];
          const address = row[cols[COL_ADDRESS] - 1];
          const certificateLinks = row[cols[COL_CERT_LINKS] - 1];

          let formattedRegistrationDate = registrationTimestampDate
              ? Utilities.formatDate(registrationTimestampDate, scriptTimeZone, dateFormat)
              : '(Ngày ĐK không hợp lệ)';
          let formattedRegistrationTime = registrationTimestampDate
              ? Utilities.formatDate(registrationTimestampDate, scriptTimeZone, timeFormat)
              : '(không có)';
          let formattedClimbDate = climbDate
              ? Utilities.formatDate(climbDate, scriptTimeZone, dateFormat)
              : '(không có)';

            // Count certificates for this registration
            let certificateCount = 0;
            if (certificateLinks && String(certificateLinks).trim() !== '' && String(certificateLinks).trim() !== 'N/A') {
              try {
                const certificatesArray = JSON.parse(String(certificateLinks));
                if (Array.isArray(certificatesArray)) {
                  certificateCount = certificatesArray.length;
                } else {
                  certificateCount = 1;
                }
              } catch (e) {
                certificateCount = 1;
              }
            }

            results.push({
                timestamp: formattedRegistrationDate,
                registrationTime: formattedRegistrationTime,
                leaderName: leaderName || '(không có)',
                email: email || '(không có)',
                phone: String(rowPhoneNumber),
                memberCount: groupSize !== null ? groupSize : '(không có)',
                trekDate: formattedClimbDate,
                address: address || '(không có)',
                certificateCount: certificateCount,
                _originalTimestamp: registrationTimestampDate
            });
        }
      });

      results.sort((a, b) => {
          const timeA = a._originalTimestamp ? a._originalTimestamp.getTime() : 0;
          const timeB = b._originalTimestamp ? b._originalTimestamp.getTime() : 0;
          return timeB - timeA;
      });

      return results.map(item => {
        delete item._originalTimestamp;
        return item;
      });
    }

    function handleGetDailyChartData(data) {
        const dailyCounts = {};
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        const scriptTimeZone = Session.getScriptTimeZone();
        const dateLabels = [];
        const tempDate = new Date(thirtyDaysAgo);

        while (tempDate <= today) {
            const formattedDate = Utilities.formatDate(tempDate, scriptTimeZone, "dd/MM");
            dateLabels.push(formattedDate);
            dailyCounts[formattedDate] = 0;
            tempDate.setDate(tempDate.getDate() + 1);
        }

        const sheet = getCachedSheet();
        const cols = getCachedColumnIndices(sheet);
        if (!cols) {
          throw new Error('Không thể lấy thông tin cột từ Google Sheet.');
        }

        data.forEach(row => {
            const timestampDate = parseDateCell(row[cols[COL_TIMESTAMP] - 1]);
            const groupSize = parseGroupSizeCell(row[cols[COL_GROUP_SIZE] - 1]);
            if (timestampDate && groupSize !== null && timestampDate >= thirtyDaysAgo && timestampDate <= today) {
                const dayKey = Utilities.formatDate(timestampDate, scriptTimeZone, "dd/MM");
                if (dailyCounts.hasOwnProperty(dayKey)) {
                  dailyCounts[dayKey] += groupSize;
                }
            }
        });
        const dateValues = dateLabels.map(label => dailyCounts[label]);
        return { labels: dateLabels, values: dateValues };
    }

    function handleGetMonthlyChartData(data) {
        const monthlyCounts = {};
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const scriptTimeZone = Session.getScriptTimeZone();
        const monthLabels = [];

        for (let i = 11; i >= 0; i--) {
            const targetDate = new Date(currentYear, currentMonth - i, 1);
            const formattedMonth = Utilities.formatDate(targetDate, scriptTimeZone, "MM/yyyy");
            monthLabels.push(formattedMonth);
            monthlyCounts[formattedMonth] = 0;
        }
        const twelveMonthsAgoDate = new Date(currentYear, currentMonth - 11, 1);
        twelveMonthsAgoDate.setHours(0,0,0,0);

        const sheet = getCachedSheet();
        const cols = getCachedColumnIndices(sheet);
        if (!cols) {
          throw new Error('Không thể lấy thông tin cột từ Google Sheet.');
        }

        data.forEach(row => {
            const timestampDate = parseDateCell(row[cols[COL_TIMESTAMP] - 1]);
            const groupSize = parseGroupSizeCell(row[cols[COL_GROUP_SIZE] - 1]);
            if (timestampDate && groupSize !== null && timestampDate >= twelveMonthsAgoDate) {
                const monthKey = Utilities.formatDate(timestampDate, scriptTimeZone, "MM/yyyy");
                if (monthlyCounts.hasOwnProperty(monthKey)) {
                    monthlyCounts[monthKey] += groupSize;
                }
            }
        });
        const monthValues = monthLabels.map(label => monthlyCounts[label]);
        return { labels: monthLabels, values: monthValues };
    }

    function handleGetVisitorTypeData(data) {
      const visitorTypes = {
        'Đoàn nhỏ (1-5 người)': 0,
        'Đoàn vừa (6-10 người)': 0,
        'Đoàn lớn (11-20 người)': 0,
        'Đoàn rất lớn (>20 người)': 0
      };

      const sheet = getCachedSheet();
      const cols = getCachedColumnIndices(sheet);
      if (!cols) {
        throw new Error('Không thể lấy thông tin cột từ Google Sheet.');
      }

      data.forEach(row => {
        const groupSize = parseGroupSizeCell(row[cols[COL_GROUP_SIZE] - 1]);
        if (groupSize !== null) {
          if (groupSize <= 5) {
            visitorTypes['Đoàn nhỏ (1-5 người)'] += 1; // Đếm số đoàn, không phải số người
          } else if (groupSize <= 10) {
            visitorTypes['Đoàn vừa (6-10 người)'] += 1; // Đếm số đoàn, không phải số người
          } else if (groupSize <= 20) {
            visitorTypes['Đoàn lớn (11-20 người)'] += 1; // Đếm số đoàn, không phải số người
          } else {
            visitorTypes['Đoàn rất lớn (>20 người)'] += 1; // Đếm số đoàn, không phải số người
          }
        }
      });

      return {
        labels: Object.keys(visitorTypes),
        values: Object.values(visitorTypes)
      };
    }

    function handleGetGrowthTrendData(data) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthlyData = {};
      const scriptTimeZone = Session.getScriptTimeZone();

      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(currentYear, currentMonth - i, 1);
        const monthKey = Utilities.formatDate(targetDate, scriptTimeZone, "MM/yyyy");
        monthlyData[monthKey] = 0;
      }

      const sheet = getCachedSheet();
      const cols = getCachedColumnIndices(sheet);
      if (!cols) {
        throw new Error('Không thể lấy thông tin cột từ Google Sheet.');
      }

      // Calculate monthly totals
      data.forEach(row => {
        const timestampDate = parseDateCell(row[cols[COL_TIMESTAMP] - 1]);
        const groupSize = parseGroupSizeCell(row[cols[COL_GROUP_SIZE] - 1]);
        if (timestampDate && groupSize !== null) {
          const monthKey = Utilities.formatDate(timestampDate, scriptTimeZone, "MM/yyyy");
          if (monthlyData.hasOwnProperty(monthKey)) {
            monthlyData[monthKey] += groupSize;
          }
        }
      });

      // Calculate growth rates
      const labels = Object.keys(monthlyData);
      const values = [];
      let previousValue = null;

      labels.forEach(monthKey => {
        const currentValue = monthlyData[monthKey];
        if (previousValue === null) {
          values.push(0); // First month has no growth rate
        } else if (previousValue === 0 && currentValue === 0) {
          values.push(null); // Không có dữ liệu
        } else if (previousValue === 0 && currentValue > 0) {
          values.push(100);
        } else {
          const growthRate = ((currentValue - previousValue) / previousValue) * 100;
          values.push(Math.round(growthRate * 10) / 10);
        }
        previousValue = currentValue;
      });

      return { labels: labels, values: values };
    }

    function handleGetRecentRegistrations(data, limit = 10) {
      const scriptTimeZone = Session.getScriptTimeZone();
      const dateFormat = "dd/MM/yyyy";
      const timeFormat = "HH:mm";
      let recentRegistrations = [];

      const sheet = getCachedSheet();
      const cols = getCachedColumnIndices(sheet);
      if (!cols) {
        throw new Error('Không thể lấy thông tin cột từ Google Sheet.');
      }

      // Convert data to objects with timestamp for sorting
      data.forEach(row => {
        const timestampDate = parseDateCell(row[cols[COL_TIMESTAMP] - 1]);
        const leaderName = row[cols[COL_LEADER_NAME] - 1];
        const phoneNumber = row[cols[COL_PHONE_NUMBER] - 1];
        const birthday = parseDateCell(row[cols[COL_BIRTHDAY] - 1]);
        const groupSize = parseGroupSizeCell(row[cols[COL_GROUP_SIZE] - 1]);

        if (timestampDate && leaderName) {
          let formattedBirthday = birthday
            ? Utilities.formatDate(birthday, scriptTimeZone, dateFormat)
            : '(không có)';

          recentRegistrations.push({
            timestamp: timestampDate,
            leaderName: leaderName || '(không có)',
            phoneNumber: phoneNumber || '(không có)',
            birthday: formattedBirthday,
            groupSize: groupSize !== null ? groupSize : '(không có)',
            registrationDate: Utilities.formatDate(timestampDate, scriptTimeZone, dateFormat),
            registrationTime: Utilities.formatDate(timestampDate, scriptTimeZone, timeFormat),
            status: 'active' // Default status
          });
        }
      });

      // Sort by timestamp (newest first) and limit results
      recentRegistrations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      recentRegistrations = recentRegistrations.slice(0, limit);

      // Remove timestamp from final result (keep only formatted date and time)
      return recentRegistrations.map(registration => {
        const { timestamp, ...result } = registration;
        return result;
      });
    }

    // --- Executive Summary ---
    function generateExecutiveSummary(data, initialStats) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonth = new Date(currentYear, currentMonth - 1, 1);
      const lastMonthYear = lastMonth.getFullYear();
      const lastMonthMonth = lastMonth.getMonth();

      const sheet = getCachedSheet();
      const cols = getCachedColumnIndices(sheet);
      if (!cols) {
        throw new Error('Không thể lấy thông tin cột từ Google Sheet.');
      }

      // Tính tổng khách tháng trước
      let lastMonthCount = 0;
      data.forEach(row => {
        const timestampDate = parseDateCell(row[cols[COL_TIMESTAMP] - 1]);
        const groupSize = parseGroupSizeCell(row[cols[COL_GROUP_SIZE] - 1]);
        if (timestampDate && groupSize !== null) {
          const rowYear = timestampDate.getFullYear();
          const rowMonth = timestampDate.getMonth();
          if (rowYear === lastMonthYear && rowMonth === lastMonthMonth) {
            lastMonthCount += groupSize;
          }
        }
      });

      // Tăng trưởng tháng
      let monthlyGrowth;
      if (lastMonthCount === 0) {
        if (initialStats.monthlyCount === 0) {
          monthlyGrowth = null; // Không có dữ liệu
        } else {
          monthlyGrowth = 100;
        }
      } else {
        monthlyGrowth = Math.round(((initialStats.monthlyCount - lastMonthCount) / lastMonthCount) * 100);
      }

      // Trung bình/ngày tháng này và tháng trước
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const daysInLastMonth = new Date(lastMonthYear, lastMonthMonth + 1, 0).getDate();
      const dailyAverage = Math.round(initialStats.monthlyCount / daysInMonth);
      const lastMonthDailyAverage = lastMonthCount > 0 ? Math.round(lastMonthCount / daysInLastMonth) : 0;
      let dailyAverageGrowth;
      if (lastMonthDailyAverage === 0) {
        if (dailyAverage === 0) {
          dailyAverageGrowth = null;
        } else {
          dailyAverageGrowth = 100;
        }
      } else {
        dailyAverageGrowth = Math.round(((dailyAverage - lastMonthDailyAverage) / lastMonthDailyAverage) * 100);
      }

      // So sánh tuần này với tuần trước (rolling 7 ngày)
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);

      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - 13);
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - 7);

      let currentWeekCount = 0;
      let lastWeekCount = 0;
      data.forEach(row => {
        const timestampDate = parseDateCell(row[cols[COL_TIMESTAMP] - 1]);
        const groupSize = parseGroupSizeCell(row[cols[COL_GROUP_SIZE] - 1]);
        if (timestampDate && groupSize !== null) {
          if (timestampDate >= weekStart && timestampDate <= today) {
            currentWeekCount += groupSize;
          } else if (timestampDate >= lastWeekStart && timestampDate <= lastWeekEnd) {
            lastWeekCount += groupSize;
          }
        }
      });
      let weeklyTrend;
      if (lastWeekCount === 0) {
        if (currentWeekCount === 0) {
          weeklyTrend = null;
        } else {
          weeklyTrend = 100;
        }
      } else {
        weeklyTrend = Math.round(((currentWeekCount - lastWeekCount) / lastWeekCount) * 100);
      }

      return {
        monthlyCount: initialStats.monthlyCount,
        yearlyCount: initialStats.yearlyCount,
        lastMonthCount: lastMonthCount,
        monthlyGrowth: monthlyGrowth,
        dailyAverage: dailyAverage,
        lastMonthDailyAverage: lastMonthDailyAverage,
        dailyAverageGrowth: dailyAverageGrowth,
        trend: weeklyTrend,
        currentWeekCount: currentWeekCount,
        lastWeekCount: lastWeekCount
      };
    }

    // ===== MANUAL CERTIFICATE GENERATION =====

    // Configuration for certificate generation
    const CERT_CONFIG = {
      TEMPLATE_ID: '115gn6bhafyTvAh1gniLiVEB80fG-F_Mz-XRvnbN2OtQ', // Google Doc Template
      PDF_FOLDER_ID: '14JzQgv28umQScrRM0_pVEDK8FN_4kKi2',
      IMAGE_PLACEHOLDER_ALT_TEXT: "PHOTO_PLACEHOLDER",
      SEND_CERTIFICATE_EMAIL: true,
      BQL_NAME: "Ban Quản lý Khu du lịch Quốc gia Núi Bà Đen",
      BATCH_SIZE: 5,
      MAX_MEMBERS_PER_REQUEST: 50,
      CERT_GENERATION_TIMEOUT: 300000, // 5 minutes
      BATCH_DELAY: 300 // 300ms delay between batches
    };

    // Handle get members by phone number
    function handleGetMembersByPhone(data, phoneNumber) {
      Logger.log(`handleGetMembersByPhone for phone: ${phoneNumber}`);
      try {
        if (!phoneNumber || !/^[0-9]{10,11}$/.test(phoneNumber)) {
          return { success: false, message: 'SĐT không hợp lệ.' };
        }
        
        let members = [];
        let found = false;
        
        const dataSheets = getAllDataSheets();
        for (let s = dataSheets.length - 1; s >= 0; s--) {
          const sheet = dataSheets[s];
          const cols = getColumnIndices(sheet);
          if (!cols || !cols[COL_PHONE_NUMBER] || !cols[COL_MEMBER_LIST]) continue;

          const allData = sheet.getDataRange().getValues();
          for (let i = allData.length - 1; i >= 1; i--) {
            const row = allData[i];
            const sheetPhone = String(row[cols[COL_PHONE_NUMBER] - 1] || '').replace(/^'/, '').trim();
            if (sheetPhone === phoneNumber) {
              const listStr = String(row[cols[COL_MEMBER_LIST] - 1] || '').trim();
              if (listStr) {
                members = listStr.split('\n').map(name => name.trim()).filter(Boolean);
              }
              found = true;
              Logger.log(`Found members for ${phoneNumber} in sheet "${sheet.getName()}" at row ${i + 1}. Count: ${members.length}`);
              break;
            }
          }
          if (found) break;
        }
        
        if (!found) {
          return { success: false, message: `Không tìm thấy đăng ký cho SĐT ${phoneNumber}.` };
        }
        
        return { success: true, data: { members: members } };
      } catch (error) {
        Logger.log(`!!! ERROR in handleGetMembersByPhone: ${error}`);
        return { success: false, message: `Lỗi server khi lấy members.` };
      }
    }

    // Handle manual certificate generation
    function handleGenerateCertificatesWithPhotos(requestData) {
      const startTime = Date.now();
      Logger.log(`handleGenerateCertificatesWithPhotos received data: ${JSON.stringify(requestData)}`);
      
      const phoneNumber = String(requestData.phone || '').trim();
      const selectedMembers = requestData.members;
      const manualData = requestData.manualData || {};
      const verificationMethod = requestData.verificationMethod || 'unknown';
      
      Logger.log(`Certificate generation request - Method: ${verificationMethod}, Phone: ${phoneNumber}, Members: ${selectedMembers?.length || 0}`);

      if (!phoneNumber || !/^[0-9]{10,11}$/.test(phoneNumber)) {
        return createJsonResponse({ success: false, message: 'Số điện thoại không hợp lệ.' });
      }
      
      if (!selectedMembers || !Array.isArray(selectedMembers) || selectedMembers.length === 0) {
        return createJsonResponse({ success: false, message: "Không có thành viên nào được chọn." });
      }
      
      // Check member limit
      if (selectedMembers.length > CERT_CONFIG.MAX_MEMBERS_PER_REQUEST) {
        return createJsonResponse({ 
          success: false, 
          message: `Quá nhiều thành viên (${selectedMembers.length}). Tối đa ${CERT_CONFIG.MAX_MEMBERS_PER_REQUEST} thành viên mỗi lần.` 
        });
      }

      // Get registration details
      const data = getSheetData();
      const regDetails = findRegistrationDetails(data, phoneNumber);
      if (!regDetails) {
        return createJsonResponse({ success: false, message: `Không tìm thấy đăng ký gốc cho SĐT ${phoneNumber}.` });
      }

      const { rowIndex, leaderName = 'Bạn', userEmail = null, climbDate = new Date(), climbTime = '' } = regDetails;
      Logger.log(`Found registration: Row=${rowIndex}, Leader=${leaderName}, Email=${userEmail}, Date=${climbDate}`);

      // Use manual data if provided
      const finalEmail = manualData.email || userEmail;
      const finalClimbDate = manualData.climbDate || climbDate;
      const finalClimbTime = manualData.climbTime || climbTime;
      const finalDuration = manualData.duration || '';

      let destFolder;
      try { 
        destFolder = DriveApp.getFolderById(CERT_CONFIG.PDF_FOLDER_ID); 
      } catch (e) { 
        Logger.log(`WARN: PDF Folder ID error. Using root. ${e}`); 
        destFolder = DriveApp.getRootFolder(); 
      }

      const pdfLinks = [], errors = [];
      const generationDate = new Date();
      const registrationTime = regDetails.registrationTimestamp instanceof Date ? regDetails.registrationTimestamp : null;
      const baseDateForDisplay = registrationTime || finalClimbDate;
      const dateStr = Utilities.formatDate(baseDateForDisplay, Session.getScriptTimeZone(), 'dd/MM/yyyy');
      
      // Calculate duration string
      let durationString = '';
      if (finalDuration) {
        const durationMinutes = parseInt(finalDuration, 10);
        if (!isNaN(durationMinutes)) {
          const hours = Math.floor(durationMinutes / 60);
          const minutes = durationMinutes % 60;
          const parts = [];
          if (hours > 0) parts.push(hours + ' Giờ');
          if (minutes > 0) parts.push(minutes + ' Phút');
          if (hours === 0 && minutes === 0) parts.push('0 Phút');
          durationString = parts.join(' ');
        }
      } else {
        const durationMs = registrationTime ? (generationDate.getTime() - registrationTime.getTime()) : null;
        durationString = durationMs !== null ? formatDurationVi(durationMs) : '';
      }

      Logger.log(`Generating certs for ${selectedMembers.length} members in batches of ${CERT_CONFIG.BATCH_SIZE}...`);
      
      // Process in batches for better performance
      for (let i = 0; i < selectedMembers.length; i += CERT_CONFIG.BATCH_SIZE) {
        // Check timeout
        if (Date.now() - startTime > CERT_CONFIG.CERT_GENERATION_TIMEOUT) {
          Logger.log(`Certificate generation timeout after ${Math.round((Date.now() - startTime)/1000)}s`);
          return createJsonResponse({ 
            success: false, 
            message: `Tạo chứng nhận bị gián đoạn do thời gian chờ. Đã tạo ${pdfLinks.length}/${selectedMembers.length} chứng nhận.`,
            pdfLinks: pdfLinks,
            partialSuccess: true
          });
        }
        
        const batch = selectedMembers.slice(i, i + CERT_CONFIG.BATCH_SIZE);
        const batchNumber = Math.floor(i / CERT_CONFIG.BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(selectedMembers.length / CERT_CONFIG.BATCH_SIZE);
        
        Logger.log(`Processing batch ${batchNumber}/${totalBatches} with ${batch.length} members...`);
        
        batch.forEach((memberInfo, batchIndex) => {
          if (!memberInfo || typeof memberInfo !== 'object') { 
            errors.push("Bad member data."); 
            return; 
          }
          
          const memberName = String(memberInfo.name || '').trim();
          const photoBase64 = memberInfo.photoData;
          
          if (!memberName) { 
            errors.push("Member name missing."); 
            return; 
          }

          try {
            const safeName = memberName.replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s+/g, '_') || 'Member';
            const fileNameBase = `ChungNhan_${safeName}_${Utilities.formatDate(generationDate, 'UTC', 'yyyyMMddHHmmss')}`;
            const pdfUrl = createCertificate(memberName, dateStr, String(finalClimbTime || ''), durationString, photoBase64, CERT_CONFIG.TEMPLATE_ID, destFolder, fileNameBase);
            
            if (pdfUrl) {
              pdfLinks.push({ name: memberName, url: pdfUrl });
              Logger.log(`Success: PDF for ${memberName} (${pdfLinks.length}/${selectedMembers.length})`);
            } else { 
              throw new Error(`createCert returned null for ${memberName}`); 
            }
          } catch (certError) {
            Logger.log(`!!! ERROR creating PDF for "${memberName}": ${certError}`);
            errors.push(`Lỗi tạo PDF cho ${memberName}.`);
          }
        });
        
        // Delay between batches to avoid rate limiting
        if (i + CERT_CONFIG.BATCH_SIZE < selectedMembers.length) {
          Logger.log(`Waiting ${CERT_CONFIG.BATCH_DELAY}ms before next batch...`);
          Utilities.sleep(CERT_CONFIG.BATCH_DELAY);
        }
      }
      
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      Logger.log(`Finished PDF gen in ${totalTime}s. Success: ${pdfLinks.length}, Errors: ${errors.length}`);

      let overallSuccess = pdfLinks.length > 0;
      let statusMsg = `Generated ${pdfLinks.length}/${selectedMembers.length} certificates`;
      if (errors.length > 0) statusMsg += ` (${errors.length} errors)`;
      statusMsg += ` in ${totalTime}s`;

      // Update sheet with certificate links
      try {
        const targetSheet = regDetails.sheet;
        const cols = getColumnIndices(targetSheet);
        if (targetSheet && rowIndex && cols) {
          if (cols[COL_STATUS]) targetSheet.getRange(rowIndex, cols[COL_STATUS]).setValue(statusMsg);
          if (cols[COL_CERT_LINKS]) targetSheet.getRange(rowIndex, cols[COL_CERT_LINKS]).setValue(pdfLinks.length > 0 ? JSON.stringify(pdfLinks) : '');
          SpreadsheetApp.flush();
          Logger.log(`Updated Sheet "${targetSheet.getName()}": Row ${rowIndex}, Status=${statusMsg}`);
        }
      } catch (e) { 
        Logger.log(`!!! Error updating sheet row ${rowIndex}: ${e}`); 
      }

      // Send email if configured
      let emailSent = false;
      if (CERT_CONFIG.SEND_CERTIFICATE_EMAIL && finalEmail && pdfLinks.length > 0) {
        try {
          const subject = `Chứng nhận chinh phục Núi Bà Đen - ${pdfLinks.length} thành viên`;
          const emailLogData = { leaderName, userEmail: finalEmail, BQL_NAME: CERT_CONFIG.BQL_NAME, pdfLinksCount: pdfLinks.length, errorsCount: errors.length, totalTime };
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
          htmlBody += `<p>Xin cảm ơn & hẹn gặp lại!</p><p>Trân trọng,<br>${escapeHtml(CERT_CONFIG.BQL_NAME || 'BQL')}.</p>`;

          MailApp.sendEmail({ to: finalEmail, subject: subject, htmlBody: htmlBody });
          emailSent = true;
          Logger.log(`Sent cert links email to ${finalEmail}.`);
        } catch (mailError) { 
          Logger.log(`!!! ERROR sending cert email: ${mailError}`); 
        }
      } else { 
        Logger.log(`Skipped cert email: Send=${CERT_CONFIG.SEND_CERTIFICATE_EMAIL}, Email=${finalEmail}, Links=${pdfLinks.length}`); 
      }

      let userRespMsg = `✅ Đã tạo ${pdfLinks.length}/${selectedMembers.length} chứng nhận trong ${totalTime}s.`;
      if (errors.length > 0) userRespMsg = `⚠️ Hoàn thành ${pdfLinks.length}/${selectedMembers.length} chứng nhận (${errors.length} lỗi) trong ${totalTime}s.`;
      if (!overallSuccess && errors.length > 0) userRespMsg = `❌ Tạo chứng nhận thất bại (${errors.length} lỗi).`;
      if (emailSent) userRespMsg += " 📧 Email đã gửi.";

      return createJsonResponse({ 
        success: overallSuccess && errors.length === 0, 
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

    // Find registration details by phone number across all data sheets
    function findRegistrationDetails(data, phoneNumber) {
      const dataSheets = getAllDataSheets();

      for (let s = dataSheets.length - 1; s >= 0; s--) {
        const sheet = dataSheets[s];
        const cols = getColumnIndices(sheet);
        if (!cols) continue;

        const allData = sheet.getDataRange().getValues();
        for (let i = allData.length - 1; i >= 1; i--) {
          const row = allData[i];
          const sheetPhone = String(row[cols[COL_PHONE_NUMBER] - 1] || '').replace(/^'/, '').trim();
          
          if (sheetPhone === phoneNumber) {
            const climbDateValue = row[cols[COL_CLIMB_DATE] - 1];
            const climbTimeValue = String(row[cols[COL_CLIMB_TIME] - 1] || '').trim();
            const registrationTsValue = row[cols[COL_TIMESTAMP] - 1];
            const leaderNameValue = String(row[cols[COL_LEADER_NAME] - 1] || 'Bạn').trim();
            const userEmailValue = String(row[cols[COL_EMAIL] - 1] || '').trim().toLowerCase();
            const memberListStrValue = String(row[cols[COL_MEMBER_LIST] - 1] || '').trim();
            
            Logger.log(`DEBUG findRegDetails: Found in Sheet "${sheet.getName()}", Row ${i+1}. Leader=${leaderNameValue}, Email=${userEmailValue}`);
            
            return {
              sheet: sheet,
              sheetName: sheet.getName(),
              rowIndex: i + 1,
              leaderName: leaderNameValue, 
              userEmail: userEmailValue || null,
              memberListString: memberListStrValue,
              climbDate: climbDateValue instanceof Date ? climbDateValue : (climbDateValue ? new Date(climbDateValue) : new Date()),
              climbTime: climbTimeValue,
              registrationTimestamp: registrationTsValue instanceof Date ? registrationTsValue : (registrationTsValue ? new Date(registrationTsValue) : null)
            };
          }
        }
      }
      Logger.log(`findRegDetails: Phone ${phoneNumber} not found in any sheet.`); 
      return null;
    }

    // Create certificate PDF
    function createCertificate(name, dateString, timeString, durationString, photoBase64, templateId, destinationFolder, outputFileNameBase) {
      let tempCopyFile = null, copyDoc = null;
      const placeholderAltText = CERT_CONFIG.IMAGE_PLACEHOLDER_ALT_TEXT;

      try {
        // Copy template
        const templateFile = DriveApp.getFileById(templateId);
        const tempCopyName = `TEMP_${outputFileNameBase}_${Utilities.getUuid()}`;
        tempCopyFile = templateFile.makeCopy(tempCopyName, destinationFolder);
        copyDoc = DocumentApp.openById(tempCopyFile.getId());

        // Replace image if base64 data provided
        let imageReplaced = false;
        if (photoBase64 && photoBase64.startsWith('data:image')) {
          // Decode Base64 to Blob
          const base64Data = photoBase64.split(',')[1];
          const contentType = photoBase64.split(';')[0].split(':')[1];
          const decodedBytes = Utilities.base64Decode(base64Data);
          const blob = Utilities.newBlob(decodedBytes, contentType, `${name}_photo`);

          // Get document body
          const body = copyDoc.getBody();
          const inlineImages = body.getImages();

          // Find and replace INLINE_IMAGE
          for (let i = 0; i < inlineImages.length; i++) {
            const img = inlineImages[i];
            const altDesc = img.getAltDescription();
            if (altDesc === placeholderAltText) {
              const parent = img.getParent();
              const indexInParent = parent.getChildIndex(img);
              const placeholderWidth = img.getWidth();
              const placeholderHeight = img.getHeight();
              // Insert new image and remove old one
              const newImage = parent.insertInlineImage(indexInParent, blob);
              newImage.setWidth(placeholderWidth);
              newImage.setHeight(placeholderHeight);
              img.removeFromParent();
              imageReplaced = true;
              break;
            }
          }

          if (!imageReplaced) {
            Logger.log(`Không tìm thấy placeholder "${placeholderAltText}" trong tài liệu.`);
          }
        } else {
          Logger.log(`Không có ảnh hoặc định dạng Base64 không hợp lệ.`);
        }

        // Replace text placeholders
        const body = copyDoc.getBody();
        body.replaceText('{{FullName}}', name || 'N/A');
        body.replaceText('{{Date}}', dateString || 'N/A');
        body.replaceText('{{ClimbTime}}', timeString || 'N/A');
        body.replaceText('{{Time}}', timeString || 'N/A');
        body.replaceText('{{DateTime}}', (dateString && timeString) ? `${dateString} ${timeString}` : (dateString || 'N/A'));
        body.replaceText('{{Duration}}', durationString || '');
        body.replaceText('{{ElapsedTime}}', durationString || '');

        // Save and export PDF
        copyDoc.saveAndClose();
        copyDoc = null;
        const pdfBlob = tempCopyFile.getAs(MimeType.PDF).setName(outputFileNameBase + '.pdf');
        const pdfFile = destinationFolder.createFile(pdfBlob);
        pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return pdfFile.getUrl();

      } catch (error) {
        Logger.log(`Lỗi khi tạo chứng chỉ: ${error}`);
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

    // Format duration in Vietnamese
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
      } catch (e) { 
        return ''; 
      }
    }

    // Create JSON response
    function createJsonResponse(data) { 
      return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); 
    }

    // Escape HTML
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

    // ===== MEMBER MANAGEMENT FUNCTIONS =====

    // Find registration details by phone number
    function handleFindRegistrationDetails(requestData) {
      try {
        const phoneNumber = String(requestData.phone || '').trim();
        
        if (!phoneNumber) {
          return createJsonResponse({ 
            success: false, 
            message: 'Số điện thoại không được để trống' 
          });
        }
        
        Logger.log(`Tìm kiếm đăng ký với số điện thoại: ${phoneNumber}`);
        
        const sheet = getCachedSheet();
        const columnIndices = getCachedColumnIndices(sheet);
        
        if (!columnIndices) {
          return createJsonResponse({ 
            success: false, 
            message: 'Lỗi cấu hình cột trong Google Sheet' 
          });
        }
        
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
          return createJsonResponse({ 
            success: false, 
            message: 'Không có dữ liệu đăng ký nào' 
          });
        }
        
        // Search from the most recent entry (bottom to top)
        for (let row = lastRow; row >= 2; row--) {
          const phoneCell = sheet.getRange(row, columnIndices[COL_PHONE_NUMBER]);
          const phoneValue = String(phoneCell.getValue() || '').trim();
          
          if (phoneValue === phoneNumber) {
            // Found the registration, get all data
            const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
            const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            
            const registrationData = {};
            headers.forEach((header, index) => {
              if (header) {
                registrationData[header] = rowData[index];
              }
            });
            
            Logger.log(`Tìm thấy đăng ký cho số điện thoại ${phoneNumber} tại dòng ${row}`);
            
            return createJsonResponse({
              success: true,
              data: registrationData,
              message: 'Tìm thấy thông tin đăng ký'
            });
          }
        }
        
        return createJsonResponse({ 
          success: false, 
          message: 'Không tìm thấy đăng ký với số điện thoại này' 
        });
        
      } catch (error) {
        Logger.log(`Lỗi khi tìm kiếm đăng ký: ${error.message}`);
        return createJsonResponse({ 
          success: false, 
          message: `Lỗi khi tìm kiếm: ${error.message}` 
        });
      }
    }

    // Update member list for a registration
    function handleUpdateMemberList(requestData) {
      try {
        const phoneNumber = String(requestData.phone || '').trim();
        const memberList = requestData.memberList || [];
        const originalMemberList = requestData.originalMemberList || [];
        
        if (!phoneNumber) {
          return createJsonResponse({ 
            success: false, 
            message: 'Số điện thoại không được để trống' 
          });
        }
        
        if (!Array.isArray(memberList)) {
          return createJsonResponse({ 
            success: false, 
            message: 'Danh sách thành viên không hợp lệ' 
          });
        }
        
        Logger.log(`Cập nhật danh sách thành viên cho số điện thoại: ${phoneNumber}`);
        Logger.log(`Danh sách cũ: ${JSON.stringify(originalMemberList)}`);
        Logger.log(`Danh sách mới: ${JSON.stringify(memberList)}`);
        
        const sheet = getCachedSheet();
        const columnIndices = getCachedColumnIndices(sheet);
        
        if (!columnIndices) {
          return createJsonResponse({ 
            success: false, 
            message: 'Lỗi cấu hình cột trong Google Sheet' 
          });
        }
        
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
          return createJsonResponse({ 
            success: false, 
            message: 'Không có dữ liệu đăng ký nào' 
          });
        }
        
        // Search for the registration
        let foundRow = -1;
        for (let row = lastRow; row >= 2; row--) {
          const phoneCell = sheet.getRange(row, columnIndices[COL_PHONE_NUMBER]);
          const phoneValue = String(phoneCell.getValue() || '').trim();
          
          if (phoneValue === phoneNumber) {
            foundRow = row;
            break;
          }
        }
        
        if (foundRow === -1) {
          return createJsonResponse({ 
            success: false, 
            message: 'Không tìm thấy đăng ký với số điện thoại này' 
          });
        }
        
        // Update the member list
        const memberListColumn = columnIndices[COL_MEMBER_LIST];
        if (!memberListColumn) {
          return createJsonResponse({ 
            success: false, 
            message: 'Không tìm thấy cột danh sách thành viên' 
          });
        }
        
        const memberListString = JSON.stringify(memberList);
        sheet.getRange(foundRow, memberListColumn).setValue(memberListString);
        
        // Update group size if the column exists
        const groupSizeColumn = columnIndices[COL_GROUP_SIZE];
        if (groupSizeColumn) {
          sheet.getRange(foundRow, groupSizeColumn).setValue(memberList.length);
        }
        
        // Clear cache to force refresh
        _sheetCache = null;
        _columnCache = null;
        
        Logger.log(`Đã cập nhật danh sách thành viên cho dòng ${foundRow}`);
        Logger.log(`Số thành viên mới: ${memberList.length}`);
        
        return createJsonResponse({
          success: true,
          message: `Đã cập nhật thành công danh sách thành viên. Số thành viên: ${memberList.length}`,
          data: {
            phoneNumber: phoneNumber,
            memberCount: memberList.length,
            memberList: memberList
          }
        });
        
      } catch (error) {
        Logger.log(`Lỗi khi cập nhật danh sách thành viên: ${error.message}`);
        return createJsonResponse({ 
          success: false, 
          message: `Lỗi khi cập nhật: ${error.message}` 
        });
      }
    }
