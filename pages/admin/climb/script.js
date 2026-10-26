// Admin Climb Management Script
// Quản lý thông báo, tra cứu người leo núi và cài đặt GPS

// Configuration
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyWYJtTjYvSFT--TPpV6bk4-o6jKtqXBhe5di-h6ozC2sKscM_i8_PCJxzPpL_bEDNT/exec',
    CERTIFICATE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzafxB0TBS4_gcPIvaqbINNrnJJ_7aaE9Az3m9EqqkH5s2eo_mbzrRiOOw3jXolS5jfng/exec',
    COMBINED_API_URL: '/.netlify/functions/combined-data',
    NOTIFICATION_CHECK_INTERVAL: 30000, // 30 seconds
    NOTIFICATION_DISPLAY_DURATION: 10000, // 10 seconds
    MAX_NOTIFICATIONS: 5,
    DEFAULT_REGISTRATION_RADIUS: 50,
    DEFAULT_CERTIFICATE_RADIUS: 150
};

// Notification types and their styling
const NOTIFICATION_TYPES = {
    weather: { 
        name: 'Cảnh báo thời tiết', 
        icon: 'fa-cloud-rain', 
        bgColor: 'bg-blue-50', 
        borderColor: 'border-blue-200', 
        textColor: 'text-blue-800',
        iconColor: 'text-blue-600'
    },
    maintenance: { 
        name: 'Bảo trì', 
        icon: 'fa-tools', 
        bgColor: 'bg-yellow-50', 
        borderColor: 'border-yellow-200', 
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-600'
    },
    announcement: { 
        name: 'Thông báo chung', 
        icon: 'fa-bullhorn', 
        bgColor: 'bg-green-50', 
        borderColor: 'border-green-200', 
        textColor: 'text-green-800',
        iconColor: 'text-green-600'
    },
    emergency: { 
        name: 'Khẩn cấp', 
        icon: 'fa-exclamation-triangle', 
        bgColor: 'bg-red-50', 
        borderColor: 'border-red-200', 
        textColor: 'text-red-800',
        iconColor: 'text-red-600'
    }
};

// Global variables
let notifications = [];
let gpsSettings = {
    registrationRadius: CONFIG.DEFAULT_REGISTRATION_RADIUS,
    certificateRadius: CONFIG.DEFAULT_CERTIFICATE_RADIUS,
    requireGpsRegistration: true,
    requireGpsCertificate: true,
    registrationTimeEnabled: false,
    registrationStartTime: '06:00',
    registrationEndTime: '18:00'
};

// Loading state
let isLoading = false;

// Chart instances
let dailyChart = null;
let monthlyChart = null;
let visitorTypeChart = null;
let growthTrendChart = null;

// DOM Elements
let elements = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    loadInitialData();
    updateCurrentDate();
    setInterval(updateCurrentDate, 60000); // Update every minute
    
    // Auto-refresh data when tab becomes visible (user switches back to tab)
    // Commented out - only refresh when admin makes changes
    /*
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // Refresh data when user comes back to the tab
            refreshAllData(true); // Silent refresh
        }
    });
    
    // Auto-refresh data every 30 seconds to keep it fresh
    setInterval(function() {
        // Only refresh if tab is visible and not in loading state
        if (!document.hidden && !isLoading) {
            refreshAllData(true); // Silent refresh
        }
    }, 30000); // 30 seconds
    */
});

// Initialize DOM elements
function initializeElements() {
    elements = {
        // Stats
        totalRegistrations: document.getElementById('totalRegistrations'),
        activeNotifications: document.getElementById('activeNotifications'),
        totalCertificates: document.getElementById('totalCertificates'),
        gpsStatus: document.getElementById('gpsStatus'),
        
        // Notification form
        notificationForm: document.getElementById('notificationForm'),
        notificationType: document.getElementById('notificationType'),
        notificationTitle: document.getElementById('notificationTitle'),
        notificationMessage: document.getElementById('notificationMessage'),
        
        // Registration time settings
        registrationTimeEnabled: document.getElementById('registrationTimeEnabled'),
        registrationStartTime: document.getElementById('registrationStartTime'),
        registrationEndTime: document.getElementById('registrationEndTime'),
        registrationTimeSettings: document.getElementById('registrationTimeSettings'),
        activeNotificationsList: document.getElementById('activeNotificationsList'),
        
        // Search
        searchPhone: document.getElementById('searchPhone'),
        searchResults: document.getElementById('searchResults'),
        
        // GPS Settings
        gpsSettingsForm: document.getElementById('gpsSettingsForm'),
        registrationRadius: document.getElementById('registrationRadius'),
        certificateRadius: document.getElementById('certificateRadius'),
        requireGpsRegistration: document.getElementById('requireGpsRegistration'),
        requireGpsCertificate: document.getElementById('requireGpsCertificate'),
        
        // Recent registrations
        recentRegistrationsTable: document.getElementById('recentRegistrationsTable'),
        
        // Date
        currentDate: document.getElementById('currentDate'),
        currentYear: document.getElementById('currentYear')
    };
}

// Setup event listeners
function setupEventListeners() {
    // Notification form
    if (elements.notificationForm) {
        elements.notificationForm.addEventListener('submit', handleCreateNotification);
    }
    
    // Search
    if (elements.searchPhone) {
        elements.searchPhone.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchUser();
            }
        });
    }
    
    // GPS Settings form
    if (elements.gpsSettingsForm) {
        elements.gpsSettingsForm.addEventListener('submit', handleSaveGpsSettings);
    }
    
    // Registration time settings
    if (elements.registrationTimeEnabled) {
        elements.registrationTimeEnabled.addEventListener('change', toggleRegistrationTimeSettings);
        // Also call toggleRegistrationTimeSettings initially to set the correct state
        toggleRegistrationTimeSettings();
    }
    


    
    // Manual Certificate Generation
    initializeManualCertificateForm();
    
    // Member Management
    initializeMemberManagementForm();
}

// Load initial data
async function loadInitialData() {
    try {
        // Show loading state first
        updateStats({
            totalRegistrations: 'Đang tải...',
            activeNotifications: 0,
            totalCertificates: 'Đang tải...',
            gpsEnabled: false
        });
        
        await Promise.all([
            loadStats(),
            loadAllDataFromAPI(),
            loadRecentRegistrations(),
            loadDetailedStats()
        ]);
    } catch (error) {
        console.error('Error loading initial data:', error);
        showMessage('Có lỗi khi tải dữ liệu ban đầu', 'error');
    }
}

// Update current date
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    if (elements.currentDate) {
        elements.currentDate.textContent = now.toLocaleDateString('vi-VN', options);
    }
    
    if (elements.currentYear) {
        elements.currentYear.textContent = now.getFullYear();
    }
}

// ===== DETAILED STATISTICS =====

// Load detailed statistics
async function loadDetailedStats() {
    try {
    
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getAllDashboardData`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();

        
        if (result.success) {
            const data = result.data;

            
            // Create charts
            createDailyChart(data.dailyChart);
            createMonthlyChart(data.monthlyChart);
            createVisitorTypeChart(data.visitorTypeData);
            createGrowthTrendChart(data.growthTrendData);
            updateExecutiveSummary(data.executiveSummary);
        } else {
            throw new Error(result.message || 'Không thể tải thống kê chi tiết');
        }
        
    } catch (error) {
        console.error('Error loading detailed stats:', error);
        // Show error message instead of fallback
        showMessage('Không thể tải thống kê chi tiết. Vui lòng thử lại sau.', 'error');
    }
}

// Create daily chart
function createDailyChart(data) {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;
    
    if (dailyChart) {
        dailyChart.destroy();
    }
    
    // Calculate appropriate step size based on data range
    const values = data.values || [];
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = maxValue - minValue;
    
    let stepSize = 1;
    if (range > 0) {
        if (range <= 10) {
            stepSize = 1;
        } else if (range <= 50) {
            stepSize = 5;
        } else if (range <= 100) {
            stepSize = 10;
        } else if (range <= 500) {
            stepSize = 50;
        } else {
            stepSize = Math.ceil(range / 10);
        }
    }
    
    dailyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [{
                label: 'Số lượng đăng ký',
                data: values,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        stepSize: stepSize,
                        maxTicksLimit: 8,
                        callback: function(value) {
                            return value + ' người';
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Create monthly chart
function createMonthlyChart(data) {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;
    
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    // Calculate appropriate step size based on data range
    const values = data.values || [];
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = maxValue - minValue;
    
    let stepSize = 1;
    if (range > 0) {
        if (range <= 10) {
            stepSize = 1;
        } else if (range <= 50) {
            stepSize = 5;
        } else if (range <= 100) {
            stepSize = 10;
        } else if (range <= 500) {
            stepSize = 50;
        } else {
            stepSize = Math.ceil(range / 10);
        }
    }
    
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels || [],
            datasets: [{
                label: 'Số lượng đăng ký',
                data: values,
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        stepSize: stepSize,
                        maxTicksLimit: 8,
                        callback: function(value) {
                            return value + ' người';
                        }
                    }
                }
            }
        }
    });
}

// Create visitor type chart
function createVisitorTypeChart(data) {
    const ctx = document.getElementById('visitorTypeChart');
    if (!ctx) return;
    
    if (visitorTypeChart) {
        visitorTypeChart.destroy();
    }
    
    const colors = [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)'
    ];
    
    visitorTypeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels || [],
            datasets: [{
                data: data.values || [],
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Create growth trend chart
function createGrowthTrendChart(data) {
    const ctx = document.getElementById('growthTrendChart');
    if (!ctx) return;
    
    if (growthTrendChart) {
        growthTrendChart.destroy();
    }
    
    growthTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [{
                label: 'Tăng trưởng (%)',
                data: data.values || [],
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: 'rgb(34, 197, 94)',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 8,
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Update executive summary
function updateExecutiveSummary(data) {
    const container = document.getElementById('executiveSummary');
    if (!container) return;
    
    container.innerHTML = `
        <div class="space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600">Tháng này:</span>
                <span class="font-semibold text-slate-800">${data.monthlyCount || 0} người</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600">Năm nay:</span>
                <span class="font-semibold text-slate-800">${data.yearlyCount || 0} người</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600">Tăng trưởng tháng:</span>
                <span class="font-semibold ${data.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${data.monthlyGrowth !== null ? (data.monthlyGrowth >= 0 ? '+' : '') + data.monthlyGrowth + '%' : 'N/A'}
                </span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600">TB/ngày tháng này:</span>
                <span class="font-semibold text-slate-800">${data.dailyAverage || 0} người</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600">Tăng trưởng TB/ngày:</span>
                <span class="font-semibold ${data.dailyAverageGrowth >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${data.dailyAverageGrowth !== null ? (data.dailyAverageGrowth >= 0 ? '+' : '') + data.dailyAverageGrowth + '%' : 'N/A'}
                </span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600">Xu hướng tuần:</span>
                <span class="font-semibold ${data.trend >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${data.trend !== null ? (data.trend >= 0 ? '+' : '') + data.trend + '%' : 'N/A'}
                </span>
            </div>
        </div>
    `;
}

// Create mock charts for fallback
function createMockCharts() {
    // Generate 30 days of data
    const dailyLabels = [];
    const dailyValues = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dailyLabels.push(date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }));
        dailyValues.push(Math.floor(Math.random() * 50) + 5); // Random 5-55
    }
    
    const mockDailyData = {
        labels: dailyLabels,
        values: dailyValues
    };
    
    // Generate 12 months of data
    const monthlyLabels = [];
    const monthlyValues = [];
    for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        monthlyLabels.push(date.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }));
        monthlyValues.push(Math.floor(Math.random() * 200) + 50); // Random 50-250
    }
    
    const mockMonthlyData = {
        labels: monthlyLabels,
        values: monthlyValues
    };
    
    const mockVisitorData = {
        labels: ['Đoàn nhỏ (1-5)', 'Đoàn vừa (6-10)', 'Đoàn lớn (11-20)', 'Đoàn rất lớn (>20)'],
        values: [25, 18, 8, 3] // Số lượng đoàn, không phải số người
    };
    
    // Generate 6 months growth data
    const growthLabels = [];
    const growthValues = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        growthLabels.push(date.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }));
        growthValues.push(i === 0 ? 0 : Math.floor(Math.random() * 100) - 50); // Random -50 to 50
    }
    
    const mockGrowthData = {
        labels: growthLabels,
        values: growthValues
    };
    
    const mockExecutiveData = {
        monthlyCount: 48,
        yearlyCount: 262,
        monthlyGrowth: 25.0,
        dailyAverage: 1.6,
        dailyAverageGrowth: 15.4,
        trend: 12.5
    };
    

    
    createDailyChart(mockDailyData);
    createMonthlyChart(mockMonthlyData);
    createVisitorTypeChart(mockVisitorData);
    createGrowthTrendChart(mockGrowthData);
    updateExecutiveSummary(mockExecutiveData);
}

// ===== NOTIFICATION MANAGEMENT =====

// Handle create notification
async function handleCreateNotification(e) {
    e.preventDefault();
    
    const type = elements.notificationType.value;
    const title = elements.notificationTitle.value.trim();
    const message = elements.notificationMessage.value.trim();
    
    if (!title || !message) {
        showMessage('Vui lòng điền đầy đủ thông tin', 'error');
        return;
    }
    
    // Prevent duplicate submission
    if (isLoading) {
        showMessage('Đang xử lý, vui lòng đợi...', 'warning');
        return;
    }
    
    try {
        isLoading = true;
        setLoadingState(true);
        
        const notification = {
            id: Date.now().toString(),
            type: type,
            title: title,
            message: message,
            createdAt: new Date().toISOString(),
            active: true
        };
        
        // Send to Netlify Function API
        try {
            const response = await fetch(CONFIG.COMBINED_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'createNotification',
                    data: notification
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create notification');
            }
            
            // Refresh notifications from server
            await loadNotifications();
            
            // Trigger storage event for other tabs/windows
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'climbNotifications',
                newValue: JSON.stringify(notifications)
            }));
        } catch (error) {
            console.error('Error creating notification:', error);
            // Fallback to localStorage for development
            notifications.push(notification);
            localStorage.setItem('climbNotifications', JSON.stringify(notifications));
            
            // Update UI
            updateNotificationsList();
            updateStats();
            
            // Trigger storage event for other tabs/windows
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'climbNotifications',
                newValue: JSON.stringify(notifications)
            }));
        }
        
        // Update UI
        updateNotificationsList();
        updateStats();
        
        // Clear form
        clearNotificationForm();
        
        // Trigger notification refresh on climb page
        try {
            // Try to refresh notifications on the climb page if it's open
            if (window.opener && window.opener.refreshNotifications) {
                window.opener.refreshNotifications();
            }
            
            // Also send message event for cross-window communication
            if (window.opener) {
                window.opener.postMessage({
                    type: 'NEW_NOTIFICATION',
                    data: notification
                }, '*');
            }
            
            // Trigger storage event for other tabs/windows
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'climbNotifications',
                newValue: JSON.stringify(notifications)
            }));
        } catch (error) {
            console.error('Could not refresh climb page notifications:', error);
        }
        
        showMessage('Thông báo đã được tạo thành công', 'success');
        
        // Refresh all data to show latest information
        await refreshAllData();
        
    } catch (error) {
        console.error('Error creating notification:', error);
        showMessage('Có lỗi khi tạo thông báo', 'error');
    } finally {
        isLoading = false;
        setLoadingState(false);
    }
}

// Clear notification form
function clearNotificationForm() {
    if (elements.notificationForm) {
        elements.notificationForm.reset();
    }
}

// Load all data from combined API
async function loadAllDataFromAPI() {
    try {
        // console.log('Loading all data from combined API...', new Date().toISOString());
        // console.trace('loadAllDataFromAPI called from:');
        
        const response = await fetch(CONFIG.COMBINED_API_URL);
        if (response.ok) {
            const result = await response.json();
            console.log('Combined API result:', result);
            
            // Process notifications
            notifications = result.notifications.data || [];
            localStorage.setItem('climbNotifications', JSON.stringify(notifications));
            
            // Process GPS settings
            gpsSettings = result.gpsSettings.data || {
                registrationRadius: CONFIG.DEFAULT_REGISTRATION_RADIUS,
                certificateRadius: CONFIG.DEFAULT_CERTIFICATE_RADIUS,
                requireGpsRegistration: true,
                requireGpsCertificate: true,
                registrationTimeEnabled: false,
                registrationStartTime: '06:00',
                registrationEndTime: '18:00'
            };
            localStorage.setItem('gpsSettings', JSON.stringify(gpsSettings));
            
            // Update UI
            updateNotificationsList();
            updateGpsSettingsForm();
            updateGpsStatus();
            updateStats();
            
        } else {
            throw new Error('Failed to fetch combined data');
        }
    } catch (error) {
        console.error('Error loading combined data:', error);
        // Fallback to individual APIs
        await loadNotifications();
        await loadGpsSettings();
    }
}

// Load notifications (legacy - now using combined API)
async function loadNotifications() {
    try {
        // Fetch from Combined API
        const response = await fetch(CONFIG.COMBINED_API_URL);
        if (response.ok) {
            const result = await response.json();
            notifications = result.notifications.data || [];
            // Sync with localStorage to ensure climb page can read
            localStorage.setItem('climbNotifications', JSON.stringify(notifications));
        } else {
            // Fallback to localStorage for development
            const stored = localStorage.getItem('climbNotifications');
            notifications = stored ? JSON.parse(stored) : [];
        }
        
        updateNotificationsList();
        updateStats();
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        // Fallback to localStorage for development
        const stored = localStorage.getItem('climbNotifications');
        notifications = stored ? JSON.parse(stored) : [];
        updateNotificationsList();
        updateStats();
    }
}

// Update notifications list
function updateNotificationsList() {
    if (!elements.activeNotificationsList) {
        return;
    }
    
    const activeNotifications = notifications.filter(n => n.active);
    
    if (activeNotifications.length === 0) {
        elements.activeNotificationsList.innerHTML = `
            <div class="text-center py-8 text-slate-500">
                <i class="fas fa-bell-slash text-4xl mb-4"></i>
                <p>Không có thông báo nào đang hoạt động</p>
            </div>
        `;
        return;
    }
    
    elements.activeNotificationsList.innerHTML = activeNotifications.map(notification => 
        createNotificationHTML(notification)
    ).join('');
}

// Create notification HTML
function createNotificationHTML(notification) {
    const typeInfo = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.announcement;
    const createdAt = new Date(notification.createdAt).toLocaleString('vi-VN');
    
    return `
        <div class="notification-item ${typeInfo.bgColor} ${typeInfo.borderColor} border rounded-lg p-4" data-notification-id="${notification.id}">
            <div class="flex items-start justify-between">
                <div class="flex items-start space-x-3 flex-1">
                    <div class="flex-shrink-0">
                        <i class="fas ${typeInfo.icon} ${typeInfo.iconColor} text-xl"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2 mb-1">
                            <h4 class="font-semibold ${typeInfo.textColor} text-sm">${notification.title}</h4>
                            <span class="px-2 py-1 text-xs ${typeInfo.bgColor} ${typeInfo.textColor} rounded-full border ${typeInfo.borderColor}">
                                ${typeInfo.name}
                            </span>
                        </div>
                        <p class="text-sm ${typeInfo.textColor} opacity-90 mb-2">${notification.message}</p>
                        <p class="text-xs text-slate-500">Tạo lúc: ${createdAt}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="toggleNotification('${notification.id}')" class="text-slate-400 hover:text-slate-600 transition-colors">
                        <i class="fas fa-eye-slash"></i>
                    </button>
                    <button onclick="deleteNotification('${notification.id}')" class="text-red-400 hover:text-red-600 transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Toggle notification active status
async function toggleNotification(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        try {
            setLoadingState(true);
            
            // Update notification status
            notification.active = !notification.active;
            
            // Send PUT request to Netlify Function API
            try {
                const response = await fetch(CONFIG.COMBINED_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'updateNotification',
                        data: {
                            id: notificationId,
                            active: notification.active
                        }
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to update notification');
                }
                
                // Refresh notifications from server
                await loadNotifications();
                
            } catch (error) {
                console.error('Error updating notification:', error);
                // Fallback to localStorage for development
                localStorage.setItem('climbNotifications', JSON.stringify(notifications));
                
                // Update UI
                updateNotificationsList();
                updateStats();
            }
            
            // Update UI
            updateNotificationsList();
            updateStats();
            
            // Trigger storage event for other tabs/windows
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'climbNotifications',
                newValue: JSON.stringify(notifications)
            }));
            
            // Trigger notification refresh on climb page
            try {
                if (window.opener && window.opener.refreshNotifications) {
                    window.opener.refreshNotifications();
                }
                
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'NEW_NOTIFICATION',
                        data: notification
                    }, '*');
                }
            } catch (error) {
                console.error('Could not refresh climb page notifications:', error);
            }
            
            const status = notification.active ? 'kích hoạt' : 'ẩn';
            showMessage(`Thông báo đã được ${status}`, 'success');
            
            // Refresh all data to show latest information
            await refreshAllData();
            
        } catch (error) {
            console.error('Error toggling notification:', error);
            showMessage('Có lỗi khi cập nhật thông báo', 'error');
        } finally {
            setLoadingState(false);
        }
    }
}

// Delete notification
async function deleteNotification(notificationId) {
    if (confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
        try {
            setLoadingState(true);
            
            // Send DELETE request to Netlify Function API
            try {
                const response = await fetch(CONFIG.COMBINED_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'deleteNotification',
                        data: { id: notificationId }
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to delete notification');
                }
                
                // Refresh notifications from server
                await loadNotifications();
                
            } catch (error) {
                console.error('Error deleting notification:', error);
                // Fallback to localStorage for development
                notifications = notifications.filter(n => n.id !== notificationId);
                localStorage.setItem('climbNotifications', JSON.stringify(notifications));
                
                // Update UI
                updateNotificationsList();
                updateStats();
            }
            
            // Update UI
            updateNotificationsList();
            updateStats();
            
            // Trigger storage event for other tabs/windows
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'climbNotifications',
                newValue: JSON.stringify(notifications)
            }));
            
            // Trigger notification refresh on climb page
            try {
                if (window.opener && window.opener.refreshNotifications) {
                    window.opener.refreshNotifications();
                }
                
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'NEW_NOTIFICATION',
                        data: { deleted: true, id: notificationId }
                    }, '*');
                }
            } catch (error) {
                console.error('Could not refresh climb page notifications:', error);
            }
            
            showMessage('Thông báo đã được xóa', 'success');
            
            // Refresh all data to show latest information
            await refreshAllData();
            
        } catch (error) {
            console.error('Error deleting notification:', error);
            showMessage('Có lỗi khi xóa thông báo', 'error');
        } finally {
            setLoadingState(false);
        }
    }
}

// ===== USER SEARCH =====

// Search user by phone number
async function searchUser() {
    const phoneNumber = elements.searchPhone.value.trim();
    
    if (!phoneNumber) {
        showMessage('Vui lòng nhập số điện thoại để tìm kiếm', 'warning');
        return;
    }
    
    try {
        setLoadingState(true);
        
        // Call Google Apps Script API
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=searchPhone&phone=${encodeURIComponent(phoneNumber)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Kiểm tra và xử lý dữ liệu trước khi hiển thị
            if (Array.isArray(result.data)) {
                displaySearchResults(result.data);
            } else {
                throw new Error('Dữ liệu trả về không đúng định dạng');
            }
        } else {
            throw new Error(result.message || 'Không thể tìm kiếm người dùng');
        }
        
    } catch (error) {
        console.error('Error searching user:', error);
        
        // Hiển thị thông báo lỗi cụ thể hơn
        let errorMessage = 'Có lỗi khi tìm kiếm người dùng';
        if (error.message.includes('HTTP error')) {
            errorMessage = 'Không thể kết nối đến Google Apps Script';
        } else {
            errorMessage = error.message;
        }
        
        showMessage(errorMessage, 'error');
        
        // Xóa kết quả tìm kiếm cũ
        if (elements.searchResults) {
            elements.searchResults.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Không thể tìm kiếm. Vui lòng thử lại sau.</p>
                </div>
            `;
        }
    } finally {
        setLoadingState(false);
    }
}

// Display search results
function displaySearchResults(results) {
    if (!elements.searchResults) return;
    
    if (results.length === 0) {
        elements.searchResults.innerHTML = `
            <div class="text-center py-8 text-slate-500">
                <i class="fas fa-search text-4xl mb-4"></i>
                <p>Không tìm thấy thông tin người leo núi</p>
            </div>
        `;
        return;
    }
    
    // Giới hạn hiển thị 5 kết quả gần nhất
    const limitedResults = results.slice(0, 5);
    const totalCount = results.length;
    
    let html = `
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-blue-800">
                    <i class="fas fa-info-circle mr-2"></i>
                    Tìm thấy ${totalCount} lần đăng ký
                </span>
                ${totalCount > 5 ? `<span class="text-xs text-blue-600">Hiển thị 5 lần gần nhất</span>` : ''}
            </div>
        </div>
    `;
    
    html += limitedResults.map((user, index) => {
        // Đảm bảo tất cả các trường đều có giá trị mặc định
        const safeUser = {
            leaderName: user.leaderName || 'Không có tên',
            phone: user.phone || 'Không có',
            memberCount: user.memberCount || user.groupSize || 0,
            timestamp: user.timestamp || 'Không có',
            trekDate: user.trekDate || 'Không có',
            address: user.address || 'Không có'
        };
        
        return `
        <div class="search-result-item bg-white border border-slate-200 rounded-lg p-4 mb-3">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                    <span class="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-xs font-medium rounded-full mr-3">
                        ${index + 1}
                    </span>
                    <h4 class="font-semibold text-slate-800">${safeUser.leaderName}</h4>
                </div>
                <span class="status-badge status-active">
                    Hoạt động
                </span>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span class="text-slate-600">SĐT:</span>
                    <span class="font-medium">${safeUser.phone}</span>
                </div>
                <div>
                    <span class="text-slate-600">Số thành viên:</span>
                    <span class="font-medium">${safeUser.memberCount}</span>
                </div>
                <div>
                    <span class="text-slate-600">Ngày đăng ký:</span>
                    <span class="font-medium">${safeUser.timestamp}</span>
                </div>
                <div>
                    <span class="text-slate-600">Ngày leo núi:</span>
                    <span class="font-medium">${safeUser.trekDate}</span>
                </div>
            </div>
            <div class="mt-3 pt-3 border-t border-slate-200">
                <div class="flex items-center justify-between">
                    <span class="text-slate-600">Địa chỉ:</span>
                    <span class="font-medium text-slate-800">${safeUser.address}</span>
                </div>
            </div>
        </div>
    `;
    }).join('');
    
    elements.searchResults.innerHTML = html;
}

// ===== GPS SETTINGS =====

// Load GPS settings (legacy - now using combined API)
async function loadGpsSettings() {
    try {
        // Fetch from Netlify Function API
        const response = await fetch(CONFIG.GPS_SETTINGS_API_URL);
        if (response.ok) {
            const result = await response.json();
            gpsSettings = result.data || {
                registrationRadius: CONFIG.DEFAULT_REGISTRATION_RADIUS,
                certificateRadius: CONFIG.DEFAULT_CERTIFICATE_RADIUS,
                requireGpsRegistration: true,
                requireGpsCertificate: true,
                registrationTimeEnabled: false,
                registrationStartTime: '06:00',
                registrationEndTime: '18:00'
            };
        } else {
            // Fallback to localStorage for development
            const stored = localStorage.getItem('climbGpsSettings');
            if (stored) {
                gpsSettings = { ...gpsSettings, ...JSON.parse(stored) };
            }
        }
        
        updateGpsSettingsForm();
        updateGpsStatus();
        
    } catch (error) {
        console.error('Error loading GPS settings:', error);
        // Fallback to localStorage for development
        const stored = localStorage.getItem('climbGpsSettings');
        if (stored) {
            gpsSettings = { ...gpsSettings, ...JSON.parse(stored) };
        }
        updateGpsSettingsForm();
        updateGpsStatus();
    }
}

// Update GPS settings form
function updateGpsSettingsForm() {
    if (elements.registrationRadius) {
        elements.registrationRadius.value = gpsSettings.registrationRadius;
    }
    if (elements.certificateRadius) {
        elements.certificateRadius.value = gpsSettings.certificateRadius;
    }
    if (elements.requireGpsRegistration) {
        elements.requireGpsRegistration.checked = gpsSettings.requireGpsRegistration;
    }
    if (elements.requireGpsCertificate) {
        elements.requireGpsCertificate.checked = gpsSettings.requireGpsCertificate;
    }
    
    // Update registration time settings
    if (elements.registrationTimeEnabled) {
        elements.registrationTimeEnabled.checked = gpsSettings.registrationTimeEnabled;
        toggleRegistrationTimeSettings();
    }
    if (elements.registrationStartTime) {
        elements.registrationStartTime.value = gpsSettings.registrationStartTime;
    }
    if (elements.registrationEndTime) {
        elements.registrationEndTime.value = gpsSettings.registrationEndTime;
    }
}

// Toggle registration time settings visibility
function toggleRegistrationTimeSettings() {
    const isEnabled = elements.registrationTimeEnabled.checked;
    const settingsDiv = elements.registrationTimeSettings;
    
    if (settingsDiv) {
        if (isEnabled) {
            settingsDiv.style.display = 'grid';
            settingsDiv.style.opacity = '1';
        } else {
            settingsDiv.style.display = 'none';
            settingsDiv.style.opacity = '0.5';
        }
    }
}

// Handle save GPS settings
async function handleSaveGpsSettings(e) {
    e.preventDefault();
    
    const newSettings = {
        registrationRadius: parseInt(elements.registrationRadius.value) || CONFIG.DEFAULT_REGISTRATION_RADIUS,
        certificateRadius: parseInt(elements.certificateRadius.value) || CONFIG.DEFAULT_CERTIFICATE_RADIUS,
        requireGpsRegistration: elements.requireGpsRegistration.checked,
        requireGpsCertificate: elements.requireGpsCertificate.checked,
        registrationTimeEnabled: elements.registrationTimeEnabled.checked,
        registrationStartTime: elements.registrationStartTime.value,
        registrationEndTime: elements.registrationEndTime.value
    };
    
    try {
        setLoadingState(true);
        
        // Send to Netlify Function API
        try {
            const response = await fetch(CONFIG.COMBINED_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateGpsSettings',
                    data: newSettings
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save GPS settings');
            }
            
            gpsSettings = newSettings;
            updateGpsStatus();
            
            // Trigger GPS settings refresh on climb page
            try {
                if (window.opener && window.opener.refreshGpsSettings) {
                    window.opener.refreshGpsSettings();
                }
                
                // Also trigger localStorage event for other tabs/windows
                localStorage.setItem('gpsSettings', JSON.stringify(newSettings));
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'gpsSettings',
                    newValue: JSON.stringify(newSettings)
                }));
            } catch (error) {
                console.error('Could not refresh climb page GPS settings:', error);
            }
            
            showMessage('Cài đặt GPS đã được lưu thành công và đồng bộ với hệ thống', 'success');
            
            // Refresh all data to show latest information
            await refreshAllData();
            
        } catch (error) {
            console.error('Error saving GPS settings to server:', error);
            // Fallback to localStorage for development
            gpsSettings = newSettings;
            localStorage.setItem('climbGpsSettings', JSON.stringify(gpsSettings));
            updateGpsStatus();
            showMessage('Cài đặt GPS đã được lưu thành công (chế độ offline)', 'success');
            
            // Refresh all data to show latest information
            await refreshAllData();
        }
        
    } catch (error) {
        console.error('Error saving GPS settings:', error);
        showMessage('Có lỗi khi lưu cài đặt GPS', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Reset GPS settings
function resetGpsSettings() {
    if (confirm('Bạn có chắc chắn muốn khôi phục cài đặt mặc định?')) {
        gpsSettings = {
            registrationRadius: CONFIG.DEFAULT_REGISTRATION_RADIUS,
            certificateRadius: CONFIG.DEFAULT_CERTIFICATE_RADIUS,
            requireGpsRegistration: true,
            requireGpsCertificate: true,
            registrationTimeEnabled: false,
            registrationStartTime: '06:00',
            registrationEndTime: '18:00'
        };
        
        updateGpsSettingsForm();
        localStorage.setItem('climbGpsSettings', JSON.stringify(gpsSettings));
        updateGpsStatus();
        showMessage('Đã khôi phục cài đặt mặc định', 'success');
    }
}

// Update GPS status
function updateGpsStatus() {
    if (elements.gpsStatus) {
        const isEnabled = gpsSettings.requireGpsRegistration || gpsSettings.requireGpsCertificate;
        elements.gpsStatus.textContent = isEnabled ? 'Bật' : 'Tắt';
        elements.gpsStatus.className = isEnabled ? 'text-2xl font-bold text-green-600' : 'text-2xl font-bold text-red-600';
    }
}

// ===== STATS AND DATA =====

// Load stats
async function loadStats() {
    try {
        // Fetch from Google Apps Script API
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getInitialStats`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const stats = {
                totalRegistrations: result.data.yearlyCount || 0,
                activeNotifications: notifications.filter(n => n.active).length,
                totalCertificates: result.data.totalCertificates || 0, // Use actual certificate count
                gpsEnabled: gpsSettings.requireGpsRegistration || gpsSettings.requireGpsCertificate
            };
            
            updateStats(stats);
        } else {
            throw new Error(result.message || 'Không thể tải thống kê');
        }
        
    } catch (error) {
        console.error('Error loading stats:', error);
        // Show error state instead of old data
        const stats = {
            totalRegistrations: 'Lỗi',
            activeNotifications: notifications.filter(n => n.active).length,
            totalCertificates: 'Lỗi',
            gpsEnabled: gpsSettings.requireGpsRegistration || gpsSettings.requireGpsCertificate
        };
        updateStats(stats);
        showMessage('Không thể tải thống kê. Vui lòng thử lại.', 'error');
    }
}

// Update stats
function updateStats(stats = null) {
    if (!stats) {
        stats = {
            totalRegistrations: '-',  // Show loading indicator instead of old data
            activeNotifications: notifications.filter(n => n.active).length,
            totalCertificates: '-',   // Show loading indicator instead of old data
            gpsEnabled: gpsSettings.requireGpsRegistration || gpsSettings.requireGpsCertificate
        };
    }
    
    if (elements.totalRegistrations) {
        elements.totalRegistrations.textContent = stats.totalRegistrations;
    }
    if (elements.activeNotifications) {
        elements.activeNotifications.textContent = stats.activeNotifications;
    }
    if (elements.totalCertificates) {
        elements.totalCertificates.textContent = stats.totalCertificates;
    }
    if (elements.gpsStatus) {
        elements.gpsStatus.textContent = stats.gpsEnabled ? 'Bật' : 'Tắt';
        elements.gpsStatus.className = stats.gpsEnabled ? 'text-2xl font-bold text-green-600' : 'text-2xl font-bold text-red-600';
    }
}

// Load recent registrations
async function loadRecentRegistrations() {
    try {
        // Fetch recent registrations from Google Apps Script - limit to 5
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getRecentRegistrations&limit=5`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            displayRecentRegistrations(result.data);
        } else {
            throw new Error(result.message || 'Không thể tải dữ liệu đăng ký gần đây');
        }
        
    } catch (error) {
        console.error('Error loading recent registrations:', error);
        // Fallback to mock data
        const recentRegistrations = [
            {
                leaderName: 'Nguyễn Văn A',
                phoneNumber: '0123456789',
                birthday: '01/01/1990',
                registrationDate: '15/01/2024',
                registrationTime: '09:30',
                status: 'active'
            },
            {
                leaderName: 'Trần Thị B',
                phoneNumber: '0987654321',
                birthday: '15/05/1985',
                registrationDate: '14/01/2024',
                registrationTime: '14:15',
                status: 'active'
            },
            {
                leaderName: 'Lê Văn C',
                phoneNumber: '0369852147',
                birthday: '20/12/1992',
                registrationDate: '13/01/2024',
                registrationTime: '16:45',
                status: 'pending'
            }
        ];
        
        displayRecentRegistrations(recentRegistrations);
    }
}

// Display recent registrations
function displayRecentRegistrations(registrations) {
    if (!elements.recentRegistrationsTable) return;
    
    if (registrations.length === 0) {
        elements.recentRegistrationsTable.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-slate-500">
                    Không có đăng ký gần đây
                </td>
            </tr>
        `;
        return;
    }
    
    elements.recentRegistrationsTable.innerHTML = registrations.map(registration => `
        <tr class="table-row">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                ${registration.leaderName}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                ${registration.phoneNumber}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                ${registration.birthday}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                ${registration.registrationDate}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                ${registration.registrationTime || 'N/A'}
            </td>
        </tr>
    `).join('');
}

// ===== UTILITY FUNCTIONS =====

// Refresh all data
async function refreshAllData(silent = false) {
    try {
        if (!silent) {
            setLoadingState(true);
        }
        
        // Update auto-refresh status
        updateAutoRefreshStatus(true);
        
        // Refresh all data from combined API
        await loadAllDataFromAPI();
        
        // Refresh stats
        await loadStats();
        
        // Refresh recent registrations
        await loadRecentRegistrations();
        
        // Refresh detailed stats
        await loadDetailedStats();
        
        if (!silent) {
            showMessage('Đã làm mới tất cả dữ liệu', 'success');
        }
        
        // Update auto-refresh status
        updateAutoRefreshStatus(false);
        
    } catch (error) {
        console.error('Error refreshing data:', error);
        if (!silent) {
            showMessage('Có lỗi khi làm mới dữ liệu', 'error');
        }
        updateAutoRefreshStatus(false);
    } finally {
        if (!silent) {
            setLoadingState(false);
        }
    }
}

// Update auto-refresh status
function updateAutoRefreshStatus(isRefreshing) {
    const statusElement = document.getElementById('autoRefreshStatus');
    if (statusElement) {
        if (isRefreshing) {
            statusElement.innerHTML = '<i class="fas fa-sync-alt fa-spin mr-1"></i>Đang cập nhật...';
            statusElement.className = 'text-white text-xs opacity-100';
        } else {
            const now = new Date();
            const timeString = now.toLocaleTimeString('vi-VN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            statusElement.innerHTML = `<i class="fas fa-sync-alt mr-1"></i>Cập nhật lúc ${timeString}`;
            statusElement.className = 'text-white text-xs opacity-75';
        }
    }
}

// Show message
function showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
    
    const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 
                   type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
    
    messageDiv.className += ` ${bgColor} text-white`;
    
    messageDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                          type === 'error' ? 'fa-exclamation-circle' : 
                          type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'} mr-2"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Animate in
    setTimeout(() => {
        messageDiv.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.classList.add('translate-x-full');
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.parentElement.removeChild(messageDiv);
            }
        }, 300);
    }, 5000);
}

// Set loading state
function setLoadingState(loading) {
    const refreshButton = document.getElementById('refreshButton');
    const submitButtons = document.querySelectorAll('button[type="submit"]');
    
    if (refreshButton) {
        if (loading) {
            refreshButton.disabled = true;
            refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Đang tải...';
        } else {
            refreshButton.disabled = false;
            refreshButton.innerHTML = '<i class="fas fa-sync-alt mr-1"></i>Làm mới';
        }
    }
    
    submitButtons.forEach(button => {
        if (loading) {
            button.disabled = true;
            const originalText = button.getAttribute('data-original-text') || button.innerHTML;
            button.setAttribute('data-original-text', originalText);
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang xử lý...';
        } else {
            button.disabled = false;
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
            }
        }
    });
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Get status class
function getStatusClass(status) {
    switch (status) {
        case 'active': return 'status-active';
        case 'inactive': return 'status-inactive';
        case 'pending': return 'status-pending';
        default: return 'status-inactive';
    }
}

// Get status text
function getStatusText(status) {
    switch (status) {
        case 'active': return 'Hoạt động';
        case 'inactive': return 'Không hoạt động';
        case 'pending': return 'Chờ xử lý';
        default: return 'Không xác định';
    }
}





// ===== MANUAL CERTIFICATE GENERATION =====

// Initialize manual certificate form
function initializeManualCertificateForm() {
    const form = document.getElementById('manualCertificateForm');
    const generateBtn = document.getElementById('generateManualCertBtn');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const resetFormBtn = document.getElementById('resetManualFormBtn');
    const loadDataBtn = document.getElementById('loadDataBtn');
    
    if (form) {
        form.addEventListener('submit', handleManualCertificateGeneration);
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', handleManualCertificateGeneration);
    }
    
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', addManualMember);
    }
    
    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', resetManualForm);
    }
    
    if (loadDataBtn) {
        loadDataBtn.addEventListener('click', loadRegistrationDataByPhone);
    }
    
    // Add event listener for phone number input to auto-load data on Enter
    const phoneInput = document.getElementById('manualPhone');
    if (phoneInput) {
        phoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadRegistrationDataByPhone();
            }
        });
    }
}

// Initialize member management form
function initializeMemberManagementForm() {
    const searchBtn = document.getElementById('searchMemberBtn');
    const addNewMemberBtn = document.getElementById('addNewMemberBtn');
    const saveChangesBtn = document.getElementById('saveMemberChangesBtn');
    const resetChangesBtn = document.getElementById('resetMemberChangesBtn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', searchMemberRegistration);
    }
    
    if (addNewMemberBtn) {
        addNewMemberBtn.addEventListener('click', addNewMemberToList);
    }
    
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', saveMemberChanges);
    }
    
    if (resetChangesBtn) {
        resetChangesBtn.addEventListener('click', resetMemberChanges);
    }
    
    // Add event listener for phone number input to auto-search on Enter
    const phoneInput = document.getElementById('memberSearchPhone');
    if (phoneInput) {
        phoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchMemberRegistration();
            }
        });
    }
}

// Add new member to manual certificate form
function addManualMember() {
    const memberList = document.getElementById('manualMemberList');
    if (!memberList) return;
    
    const memberItem = document.createElement('div');
    memberItem.className = 'member-item flex items-center space-x-3 p-3 border border-slate-200 rounded-lg';
    memberItem.innerHTML = `
        <input type="checkbox" class="member-checkbox h-4 w-4 text-green-600 focus:ring-green-500 border-slate-300 rounded" checked>
        <input type="text" class="member-name flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" placeholder="Họ tên thành viên" required>
        <button type="button" class="remove-member text-red-600 hover:text-red-800">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    memberList.appendChild(memberItem);
    
    // Add event listeners
    const removeBtn = memberItem.querySelector('.remove-member');
    const nameInput = memberItem.querySelector('.member-name');
    
    removeBtn.addEventListener('click', () => {
        memberItem.remove();
        updateManualPhotoUploads();
    });
    
    nameInput.addEventListener('input', () => {
        updateManualPhotoUploads();
    });
    
    updateManualPhotoUploads();
}

// Update photo upload sections based on member list
function updateManualPhotoUploads() {
    const memberList = document.getElementById('manualMemberList');
    const photoUploads = document.getElementById('manualPhotoUploads');
    
    if (!memberList || !photoUploads) return;
    
    const memberItems = memberList.querySelectorAll('.member-item');
    photoUploads.innerHTML = '';
    
    memberItems.forEach((item, index) => {
        const memberName = item.querySelector('.member-name').value || `Thành viên ${index + 1}`;
        
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-upload-item flex flex-col space-y-3 p-3 border border-slate-200 rounded-lg';
        photoItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <input type="text" class="photo-name flex-1 px-3 py-2 border border-slate-300 rounded-lg" value="${memberName}" readonly>
                <input type="file" class="photo-file" accept="image/*" style="display: none;">
                <button type="button" class="select-photo bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm">
                    <i class="fas fa-image mr-1"></i>Chọn ảnh
                </button>
                <span class="photo-status text-sm text-gray-500">Chưa chọn ảnh</span>
            </div>
            <div class="photo-preview-container hidden">
                <div class="relative">
                    <img class="photo-preview max-w-full h-32 object-cover rounded-lg border" src="" alt="Preview">
                    <div class="absolute top-2 right-2 flex space-x-1">
                        <button type="button" class="crop-photo bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded text-xs">
                            <i class="fas fa-crop-alt"></i>
                        </button>
                        <button type="button" class="remove-photo bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="photo-info text-xs text-gray-500 mt-1"></div>
            </div>
        `;
        
        photoUploads.appendChild(photoItem);
        
        // Add event listeners
        const selectBtn = photoItem.querySelector('.select-photo');
        const fileInput = photoItem.querySelector('.photo-file');
        const status = photoItem.querySelector('.photo-status');
        const previewContainer = photoItem.querySelector('.photo-preview-container');
        const preview = photoItem.querySelector('.photo-preview');
        const info = photoItem.querySelector('.photo-info');
        const cropBtn = photoItem.querySelector('.crop-photo');
        const removeBtn = photoItem.querySelector('.remove-photo');
        
        selectBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                const file = e.target.files[0];
                
                // Validate file type and size
                if (!file.type.startsWith('image/')) {
                    showMessage('Vui lòng chọn file ảnh hợp lệ', 'error');
                    return;
                }
                
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (file.size > maxSize) {
                    showMessage('Kích thước ảnh không được vượt quá 5MB', 'error');
                    return;
                }
                
                // Show preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    previewContainer.classList.remove('hidden');
                    status.textContent = file.name;
                    status.className = 'photo-status text-sm text-green-600';
                    
                    // Show file info
                    const sizeKB = (file.size / 1024).toFixed(1);
                    info.textContent = `${file.type}, ${sizeKB}KB`;
                    
                    // Store original file for cropping
                    photoItem.setAttribute('data-original-file', e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
        
        cropBtn.addEventListener('click', () => {
            const originalFile = photoItem.getAttribute('data-original-file');
            if (originalFile) {
                showImageCropper(originalFile, (croppedImage) => {
                    preview.src = croppedImage;
                    photoItem.setAttribute('data-cropped-image', croppedImage);
                    info.textContent = 'Đã cắt ảnh (400x500px)';
                    showMessage('Đã cắt ảnh thành công!', 'success');
                });
            } else {
                showMessage('Vui lòng chọn ảnh trước khi cắt', 'warning');
            }
        });
        
        removeBtn.addEventListener('click', () => {
            fileInput.value = '';
            previewContainer.classList.add('hidden');
            status.textContent = 'Chưa chọn ảnh';
            status.className = 'photo-status text-sm text-gray-500';
            photoItem.removeAttribute('data-original-file');
            photoItem.removeAttribute('data-cropped-image');
        });
    });
}

// Image cropper function with improved cropping logic
function showImageCropper(imageSrc, callback) {
    // Create modal for image cropping
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">Cắt ảnh - Chọn vùng ảnh cho chứng chỉ</h3>
                <button class="close-cropper text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="cropper-container mb-4 relative bg-gray-100 rounded-lg overflow-hidden">
                <div class="cropper-overlay absolute inset-0 pointer-events-none">
                    <div class="crop-frame absolute border-2 border-white shadow-lg" style="width: 200px; height: 250px; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                        <div class="absolute -top-6 left-0 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                            Tỷ lệ 4:5 (Khuyến nghị cho chứng chỉ)
                        </div>
                    </div>
                </div>
                <img id="cropperImage" src="${imageSrc}" class="max-w-full max-h-96 object-contain cursor-move">
            </div>
            <div class="flex justify-between items-center">
                <div class="text-sm text-gray-600">
                    <p>• Kéo ảnh để điều chỉnh vị trí</p>
                    <p>• Khung màu trắng là vùng sẽ được cắt</p>
                </div>
                <div class="flex space-x-2">
                    <button class="reset-crop px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded">
                        <i class="fas fa-undo mr-1"></i>Đặt lại
                    </button>
                    <button class="cancel-crop px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded">Hủy</button>
                    <button class="apply-crop px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
                        <i class="fas fa-check mr-1"></i>Áp dụng
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const cropperImage = modal.querySelector('#cropperImage');
    const cropFrame = modal.querySelector('.crop-frame');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    // Initialize image position
    cropperImage.style.position = 'relative';
    cropperImage.style.left = '0px';
    cropperImage.style.top = '0px';
    cropperImage.style.transition = 'all 0.3s ease';
    
    // Mouse events for dragging
    cropperImage.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(cropperImage.style.left) || 0;
        startTop = parseInt(cropperImage.style.top) || 0;
        cropperImage.style.transition = 'none';
        cropperImage.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newLeft = startLeft + deltaX;
        const newTop = startTop + deltaY;
        
        // Limit movement to keep image visible
        const containerRect = modal.querySelector('.cropper-container').getBoundingClientRect();
        const imageRect = cropperImage.getBoundingClientRect();
        const frameRect = cropFrame.getBoundingClientRect();
        
        const maxLeft = frameRect.right - containerRect.left - imageRect.width;
        const minLeft = frameRect.left - containerRect.left;
        const maxTop = frameRect.bottom - containerRect.top - imageRect.height;
        const minTop = frameRect.top - containerRect.top;
        
        cropperImage.style.left = Math.max(maxLeft, Math.min(minLeft, newLeft)) + 'px';
        cropperImage.style.top = Math.max(maxTop, Math.min(minTop, newTop)) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
        cropperImage.style.transition = 'all 0.3s ease';
        cropperImage.style.cursor = 'grab';
    });
    
    // Reset crop position
    const resetBtn = modal.querySelector('.reset-crop');
    resetBtn.addEventListener('click', () => {
        cropperImage.style.left = '0px';
        cropperImage.style.top = '0px';
    });
    
    // Close modal functions
    const closeBtn = modal.querySelector('.close-cropper');
    const cancelBtn = modal.querySelector('.cancel-crop');
    const applyBtn = modal.querySelector('.apply-crop');
    
    const closeModal = () => {
        document.body.removeChild(modal);
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    applyBtn.addEventListener('click', () => {
        // Calculate crop coordinates
        const containerRect = modal.querySelector('.cropper-container').getBoundingClientRect();
        const imageRect = cropperImage.getBoundingClientRect();
        const frameRect = cropFrame.getBoundingClientRect();
        
        // Calculate relative positions
        const cropX = (frameRect.left - imageRect.left) / imageRect.width;
        const cropY = (frameRect.top - imageRect.top) / imageRect.height;
        const cropWidth = frameRect.width / imageRect.width;
        const cropHeight = frameRect.height / imageRect.height;
        
        // Create canvas for cropping
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Set canvas size to crop frame size
            canvas.width = 400; // Fixed width for certificate
            canvas.height = 500; // Fixed height for certificate (4:5 ratio)
            
            // Calculate source coordinates
            const srcX = cropX * img.width;
            const srcY = cropY * img.height;
            const srcWidth = cropWidth * img.width;
            const srcHeight = cropHeight * img.height;
            
            // Draw cropped image
            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height);
            
            // Convert to base64
            const croppedImageData = canvas.toDataURL('image/jpeg', 0.9);
            callback(croppedImageData);
            closeModal();
        };
        
        img.src = imageSrc;
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Prevent image dragging
    cropperImage.addEventListener('dragstart', (e) => e.preventDefault());
}

// Optimize image for certificate (resize and compress)
function optimizeImageForCertificate(imageSrc, callback) {
    if (!imageSrc) {
        callback(null);
        return;
    }
    const img = new Image();
    img.onload = function() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate optimal size (max 400x500 for certificate)
            const maxWidth = 400;
            const maxHeight = 500;
            let { width, height } = img;
            
            // Calculate scaling to fit within max dimensions while maintaining aspect ratio
            const scale = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
            
            // Set canvas size
            canvas.width = width;
            canvas.height = height;
            
            // Draw resized image
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to base64 with compression
            const optimizedImageData = canvas.toDataURL('image/jpeg', 0.85);
            callback(optimizedImageData);
        } catch (err) {
            console.error('Error optimizing image:', err);
            callback(imageSrc);
        }
    };
    img.onerror = function() {
        console.error('Failed to load image for optimization');
        callback(null);
    };
    
    img.src = imageSrc;
}

// Reset manual certificate form
function resetManualForm() {
    const form = document.getElementById('manualCertificateForm');
    const result = document.getElementById('manualCertResult');
    
    // Hide all sections
    const loadedDataSection = document.getElementById('loadedDataSection');
    const loadingData = document.getElementById('loadingData');
    const errorData = document.getElementById('errorData');
    
    if (loadedDataSection) loadedDataSection.classList.add('hidden');
    if (loadingData) loadingData.classList.add('hidden');
    if (errorData) errorData.classList.add('hidden');
    
    if (form) {
        form.reset();
    }
    
    if (result) {
        result.classList.add('hidden');
    }
    
    // Clear member list
    const memberList = document.getElementById('manualMemberList');
    if (memberList) {
        memberList.innerHTML = '';
    }
    
    // Clear photo uploads
    const photoUploads = document.getElementById('manualPhotoUploads');
    if (photoUploads) {
        photoUploads.innerHTML = '';
    }
    
    showMessage('Đã làm mới form', 'success');
}

// Load registration data by phone number
async function loadRegistrationDataByPhone() {
    const phoneInput = document.getElementById('manualPhone');
    const emailInput = document.getElementById('manualEmail');
    const dateInput = document.getElementById('manualClimbDate');
    const timeInput = document.getElementById('manualClimbTime');
    const durationInput = document.getElementById('manualDuration');
    
    // Show/hide sections
    const loadedDataSection = document.getElementById('loadedDataSection');
    const loadingData = document.getElementById('loadingData');
    const errorData = document.getElementById('errorData');
    
    if (!phoneInput || !phoneInput.value.trim()) {
        showMessage('Vui lòng nhập số điện thoại', 'error');
        return;
    }
    
    const phoneNumber = phoneInput.value.trim();
    if (!/^[0-9]{10,11}$/.test(phoneNumber)) {
        showMessage('Số điện thoại không hợp lệ', 'error');
        return;
    }
    
    // Show loading state
    if (loadedDataSection) loadedDataSection.classList.add('hidden');
    if (errorData) errorData.classList.add('hidden');
    if (loadingData) loadingData.classList.remove('hidden');
    
    try {
        // Get members list
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getMembersByPhone&phone=${encodeURIComponent(phoneNumber)}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('getMembersByPhone response:', result);
            
            // Check if we have valid data structure
            if (result.success && result.data && result.data.success && result.data.data && result.data.data.members && result.data.data.members.length > 0) {
                // Update member list
                const memberList = document.getElementById('manualMemberList');
                if (memberList) {
                    memberList.innerHTML = '';
                    
                    result.data.data.members.forEach((memberName, index) => {
                        const memberItem = document.createElement('div');
                        memberItem.className = 'member-item flex items-center space-x-3 p-3 border border-slate-200 rounded-lg';
                        memberItem.innerHTML = `
                            <input type="checkbox" class="member-checkbox h-4 w-4 text-green-600 focus:ring-green-500 border-slate-300 rounded" checked>
                            <input type="text" class="member-name flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" value="${memberName}" required>
                            <button type="button" class="remove-member text-red-600 hover:text-red-800">
                                <i class="fas fa-times"></i>
                            </button>
                        `;
                        
                        memberList.appendChild(memberItem);
                        
                        // Add event listeners
                        const removeBtn = memberItem.querySelector('.remove-member');
                        const nameInput = memberItem.querySelector('.member-name');
                        
                        removeBtn.addEventListener('click', () => {
                            memberItem.remove();
                            updateManualPhotoUploads();
                        });
                        
                        nameInput.addEventListener('input', () => {
                            updateManualPhotoUploads();
                        });
                    });
                    
                    updateManualPhotoUploads();
                }
                
                // Get registration details for email and date
                const regResponse = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=searchPhone&phone=${encodeURIComponent(phoneNumber)}`);
                
                if (regResponse.ok) {
                    const regResult = await regResponse.json();
                    
                    if (regResult.success && regResult.data && regResult.data.length > 0) {
                        const registration = regResult.data[0]; // Get most recent
                        
                        // Map data from searchPhone response to form fields
                        // searchPhone returns: timestamp, registrationTime, leaderName, email, phone, memberCount, trekDate, address, certificateCount
                        if (emailInput) {
                            // Use email from searchPhone response
                            emailInput.value = registration.email && registration.email !== '(không có)' ? registration.email : '';
                        }
                        
                        if (dateInput && registration.trekDate && registration.trekDate !== '(không có)') {
                            // Convert DD/MM/YYYY to YYYY-MM-DD for date input
                            const dateParts = registration.trekDate.split('/');
                            if (dateParts.length === 3) {
                                const formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
                                dateInput.value = formattedDate;
                            }
                        }
                        
                        // Populate climb time with registration time from searchPhone response
                        if (timeInput && registration.registrationTime && registration.registrationTime !== '(không có)') {
                            timeInput.value = registration.registrationTime;
                        }
                        
                        // Duration is not available in searchPhone response, so leave empty
                        if (durationInput) {
                            durationInput.value = '';
                        }
                    }
                }
                
                // Show success state
                if (loadingData) loadingData.classList.add('hidden');
                if (loadedDataSection) loadedDataSection.classList.remove('hidden');
                
                showMessage(`Đã tải ${result.data.data.members.length} thành viên từ đăng ký gốc`, 'success');
                
            } else {
                // No data found
                console.log('Data structure check failed:', {
                    resultSuccess: result.success,
                    hasData: !!result.data,
                    dataSuccess: result.data?.success,
                    hasDataData: !!result.data?.data,
                    hasMembers: !!result.data?.data?.members,
                    membersLength: result.data?.data?.members?.length
                });
                
                if (loadingData) loadingData.classList.add('hidden');
                if (errorData) {
                    errorData.classList.remove('hidden');
                    const errorMessage = document.getElementById('errorMessage');
                    if (errorMessage) {
                        errorMessage.textContent = result.message || 'Không tìm thấy thông tin đăng ký cho số điện thoại này';
                    }
                }
            }
        } else {
            throw new Error(`Network error: ${response.status}`);
        }
        
    } catch (error) {
        console.error('Error loading registration data:', error);
        
        // Show error state
        if (loadingData) loadingData.classList.add('hidden');
        if (errorData) {
            errorData.classList.remove('hidden');
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) {
                errorMessage.textContent = `Không thể tải dữ liệu đăng ký: ${error.message}. Vui lòng thử lại.`;
            }
        }
    }
}

// Handle manual certificate generation
let isGeneratingManualCert = false;
async function handleManualCertificateGeneration(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    
    if (isGeneratingManualCert) {
        return;
    }
    
    const submitBtn = document.getElementById('generateManualCertBtn');
    const spinner = document.getElementById('manualCertSpinner');
    
    // Collect form data
    const phoneInput = document.getElementById('manualPhone');
    const phoneNumber = phoneInput ? phoneInput.value.trim() : '';
    const emailInput = document.getElementById('manualEmail');
    const email = emailInput ? emailInput.value.trim() : '';
    const dateInput = document.getElementById('manualClimbDate');
    const climbDate = dateInput ? dateInput.value : '';
    const timeInput = document.getElementById('manualClimbTime');
    const climbTime = timeInput ? timeInput.value : '';
    const durationInput = document.getElementById('manualDuration');
    const duration = durationInput ? durationInput.value : '';
    const notesInput = document.getElementById('manualNotes');
    const notes = notesInput ? notesInput.value.trim() : '';
    
    // Validate Phone Number
    if (!phoneNumber || !/^[0-9]{10,11}$/.test(phoneNumber)) {
        showMessage('Vui lòng nhập số điện thoại đăng ký hợp lệ (10-11 số)', 'error');
        if (phoneInput) phoneInput.focus();
        return;
    }
    
    // Validate Email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage('Email không đúng định dạng. Vui lòng kiểm tra lại hoặc để trống', 'error');
        if (emailInput) emailInput.focus();
        return;
    }
    
    // Collect selected members
    const memberItems = document.querySelectorAll('#manualMemberList .member-item');
    if (memberItems.length === 0) {
        showMessage('Chưa có danh sách thành viên. Vui lòng nhấn "Tìm thông tin" hoặc "Thêm thành viên" trước', 'error');
        return;
    }
    
    const selectedMembers = [];
    
    // Process members and photos asynchronously
    const memberPromises = Array.from(memberItems).map(async (item, index) => {
        const checkbox = item.querySelector('.member-checkbox');
        const nameInput = item.querySelector('.member-name');
        
        if (checkbox && checkbox.checked && nameInput && nameInput.value.trim()) {
            const memberName = nameInput.value.trim();
            const photoItem = document.querySelector(`#manualPhotoUploads .photo-upload-item:nth-child(${index + 1})`);
            
            const memberData = {
                name: memberName,
                photoData: null
            };
            
            // Get photo data (cropped if available, otherwise original)
            if (photoItem) {
                const croppedImage = photoItem.getAttribute('data-cropped-image');
                const originalFile = photoItem.getAttribute('data-original-file');
                
                if (croppedImage) {
                    memberData.photoData = croppedImage;
                    return memberData;
                } else if (originalFile) {
                    return new Promise((resolve) => {
                        try {
                            optimizeImageForCertificate(originalFile, (optimizedImage) => {
                                memberData.photoData = optimizedImage;
                                resolve(memberData);
                            });
                        } catch (imgErr) {
                            console.error('Error optimizing image:', imgErr);
                            resolve(memberData);
                        }
                    });
                }
            }
            
            return memberData;
        }
        return null;
    });
    
    const resolvedMembers = await Promise.all(memberPromises);
    selectedMembers.push(...resolvedMembers.filter(member => member !== null));
    
    if (selectedMembers.length === 0) {
        showMessage('Vui lòng tích chọn ít nhất một thành viên để tạo chứng nhận', 'error');
        return;
    }
    
    // Show loading state
    isGeneratingManualCert = true;
    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');
    showMessage(`Đang tiến hành tạo ${selectedMembers.length} chứng nhận, vui lòng chờ...`, 'info');
    
    try {
        // Call Google Apps Script API with text/plain to avoid CORS preflight options failure
        const certEndpoint = CONFIG.CERTIFICATE_SCRIPT_URL || CONFIG.GOOGLE_SCRIPT_URL;
        const response = await fetch(certEndpoint, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
                action: 'generateCertificatesWithPhotos',
                phone: phoneNumber,
                members: selectedMembers,
                manualData: {
                    email: email,
                    climbDate: climbDate,
                    climbTime: climbTime,
                    duration: duration,
                    notes: notes
                },
                verificationMethod: 'admin'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Máy chủ phản hồi mã lỗi ${response.status}`);
        }
        
        const rawText = await response.text();
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (jsonErr) {
            console.error('Non-JSON response from Google Script:', rawText);
            throw new Error('Dữ liệu phản hồi từ máy chủ không hợp lệ');
        }
        
        const isSuccess = result.success || (result.pdfLinks && result.pdfLinks.length > 0);
        
        if (isSuccess) {
            // Show success result
            const resultDiv = document.getElementById('manualCertResult');
            const detailsDiv = document.getElementById('manualCertDetails');
            
            if (resultDiv && detailsDiv) {
                const count = result.pdfLinks?.length || result.stats?.success || selectedMembers.length;
                detailsDiv.innerHTML = `
                    <p class="font-medium"><strong>Kết quả:</strong> ${result.message || 'Tạo chứng nhận thành công!'}</p>
                    <p><strong>Email nhận:</strong> ${email || '(không gửi qua email)'}</p>
                    <p><strong>Số chứng chỉ đã tạo:</strong> ${count}/${selectedMembers.length}</p>
                    ${result.stats?.timeSeconds ? `<p><strong>Thời gian thực hiện:</strong> ${result.stats.timeSeconds} giây</p>` : ''}
                    ${result.pdfLinks && result.pdfLinks.length > 0 ? `
                        <div class="mt-3">
                            <p class="font-semibold text-slate-800">Danh sách chứng chỉ đã tạo:</p>
                            <ul class="list-disc list-inside space-y-1 mt-1">
                                ${result.pdfLinks.map(link => `
                                    <li><a href="${link.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-medium">${link.name || 'Thành viên'}: Tải chứng nhận (PDF)</a></li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                `;
                
                resultDiv.classList.remove('hidden');
                resultDiv.scrollIntoView({ behavior: 'smooth' });
            }
            
            showMessage(result.message || 'Tạo chứng chỉ thành công!', 'success');
        } else {
            showMessage(result.message || 'Có lỗi khi tạo chứng chỉ từ máy chủ', 'error');
        }
        
    } catch (error) {
        console.error('Error generating manual certificate:', error);
        showMessage('Lỗi khi tạo chứng chỉ: ' + error.message, 'error');
    } finally {
        isGeneratingManualCert = false;
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
    }
}

// ===== MEMBER MANAGEMENT FUNCTIONS =====

// Global variables for member management
let currentMemberData = null;
let originalMemberList = [];

// Search for member registration
async function searchMemberRegistration() {
    const phoneNumber = document.getElementById('memberSearchPhone').value.trim();
    
    if (!phoneNumber) {
        showMessage('Vui lòng nhập số điện thoại', 'error');
        return;
    }
    
    // Show loading state
    showMemberLoadingState(true);
    hideMemberErrorState();
    hideMemberRegistrationInfo();
    hideMemberListSection();
    
    try {
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'findRegistrationDetails',
                phone: phoneNumber
            })
        });
        
        if (!response.ok) {
            throw new Error('Lỗi kết nối server');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            currentMemberData = result.data;
            originalMemberList = JSON.parse(result.data.MemberList || '[]');
            
            displayMemberRegistrationInfo(result.data);
            displayMemberList(originalMemberList);
            
            showMemberRegistrationInfo();
            showMemberListSection();
        } else {
            showMemberErrorState(result.message || 'Không tìm thấy đăng ký với số điện thoại này');
        }
        
    } catch (error) {
        console.error('Error searching member registration:', error);
        showMemberErrorState('Lỗi khi tìm kiếm: ' + error.message);
    } finally {
        showMemberLoadingState(false);
    }
}

// Display member registration info
function displayMemberRegistrationInfo(data) {
    document.getElementById('memberRegName').value = data.LeaderName || data.Name || '';
    document.getElementById('memberRegEmail').value = data.Email || '';
    
    // Format registration date
    let regDate = data.Timestamp || data.RegistrationDate || '';
    if (regDate) {
        if (regDate instanceof Date) {
            regDate = regDate.toLocaleDateString('vi-VN');
        } else if (typeof regDate === 'string') {
            // Try to parse and format the date
            const date = new Date(regDate);
            if (!isNaN(date.getTime())) {
                regDate = date.toLocaleDateString('vi-VN');
            }
        }
    }
    document.getElementById('memberRegDate').value = regDate;
    
    const memberList = JSON.parse(data.MemberList || '[]');
    document.getElementById('memberRegCount').value = memberList.length;
    
    // Display detailed information
    document.getElementById('memberRegPhone').textContent = data.PhoneNumber || data.Phone || 'N/A';
    document.getElementById('memberRegAddress').textContent = data.Address || 'N/A';
    
    // Format climb date
    let climbDate = data.ClimbDate || '';
    if (climbDate) {
        if (climbDate instanceof Date) {
            climbDate = climbDate.toLocaleDateString('vi-VN');
        } else if (typeof climbDate === 'string') {
            const date = new Date(climbDate);
            if (!isNaN(date.getTime())) {
                climbDate = date.toLocaleDateString('vi-VN');
            }
        }
    }
    document.getElementById('memberRegClimbDate').textContent = climbDate || 'N/A';
    
    document.getElementById('memberRegClimbTime').textContent = data.ClimbTime || 'N/A';
    document.getElementById('memberRegStatus').textContent = data.Status || 'Đã đăng ký';
    
    // Check if certificates exist
    const certLinks = data.CertificateLinks || '';
    if (certLinks && certLinks.trim()) {
        try {
            const certArray = JSON.parse(certLinks);
            document.getElementById('memberRegCertificates').textContent = `${certArray.length} chứng chỉ`;
        } catch (e) {
            document.getElementById('memberRegCertificates').textContent = 'Có chứng chỉ';
        }
    } else {
        document.getElementById('memberRegCertificates').textContent = 'Chưa có';
    }
}

// Display member list
function displayMemberList(memberList) {
    const memberListContainer = document.getElementById('memberList');
    memberListContainer.innerHTML = '';
    
    if (memberList.length === 0) {
        memberListContainer.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <i class="fas fa-users text-2xl mb-2"></i>
                <p>Chưa có thành viên nào</p>
            </div>
        `;
        updateMemberStats();
        return;
    }
    
    memberList.forEach((member, index) => {
        const memberItem = createMemberItem(member, index);
        memberListContainer.appendChild(memberItem);
    });
    
    updateMemberStats();
}

// Update member statistics
function updateMemberStats() {
    const memberItems = document.querySelectorAll('#memberList .member-item');
    const totalCount = memberItems.length;
    
    // Count new members (those with "Thành viên mới" or empty names)
    let newCount = 0;
    memberItems.forEach(item => {
        const nameInput = item.querySelector('.member-name');
        const name = nameInput.value.trim();
        if (name === 'Thành viên mới' || name === '') {
            newCount++;
        }
    });
    
    // Calculate deleted count (original - current + new)
    const deletedCount = Math.max(0, originalMemberList.length - totalCount + newCount);
    
    // Update display
    document.getElementById('memberTotalCount').textContent = totalCount;
    document.getElementById('memberNewCount').textContent = newCount;
    document.getElementById('memberDeletedCount').textContent = deletedCount;
    
    // Show/hide stats section
    const statsDiv = document.getElementById('memberStats');
    if (totalCount > 0 || newCount > 0 || deletedCount > 0) {
        statsDiv.classList.remove('hidden');
    } else {
        statsDiv.classList.add('hidden');
    }
}

// Create member item element
function createMemberItem(member, index) {
    const memberItem = document.createElement('div');
    memberItem.className = 'member-item flex items-center space-x-3 p-3 border border-slate-200 rounded-lg bg-white';
    memberItem.setAttribute('data-index', index);
    
    memberItem.innerHTML = `
        <div class="flex-1">
            <input type="text" class="member-name w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value="${member}" placeholder="Họ tên thành viên" required>
        </div>
        <button type="button" class="edit-member text-blue-600 hover:text-blue-800 px-2 py-1">
            <i class="fas fa-edit"></i>
        </button>
        <button type="button" class="remove-member text-red-600 hover:text-red-800 px-2 py-1">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    // Add event listeners
    const editBtn = memberItem.querySelector('.edit-member');
    const removeBtn = memberItem.querySelector('.remove-member');
    const nameInput = memberItem.querySelector('.member-name');
    
    editBtn.addEventListener('click', () => {
        nameInput.focus();
        nameInput.select();
    });
    
    removeBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn xóa thành viên này?')) {
            memberItem.remove();
            updateMemberIndices();
            updateMemberStats();
        }
    });
    
    // Add event listener for name changes
    nameInput.addEventListener('input', () => {
        updateMemberStats();
    });
    
    return memberItem;
}

// Add new member to list
function addNewMemberToList() {
    const memberList = document.getElementById('memberList');
    const newMember = 'Thành viên mới';
    const newIndex = memberList.children.length;
    
    const memberItem = createMemberItem(newMember, newIndex);
    memberList.appendChild(memberItem);
    
    // Focus on the new member's name input
    const nameInput = memberItem.querySelector('.member-name');
    nameInput.focus();
    nameInput.select();
    
    updateMemberStats();
}

// Update member indices after deletion
function updateMemberIndices() {
    const memberItems = document.querySelectorAll('#memberList .member-item');
    memberItems.forEach((item, index) => {
        item.setAttribute('data-index', index);
    });
}

// Save member changes
async function saveMemberChanges() {
    if (!currentMemberData) {
        showMessage('Không có dữ liệu đăng ký để lưu', 'error');
        return;
    }
    
    // Collect current member list
    const memberItems = document.querySelectorAll('#memberList .member-item');
    const currentMemberList = [];
    
    memberItems.forEach(item => {
        const nameInput = item.querySelector('.member-name');
        const name = nameInput.value.trim();
        if (name) {
            currentMemberList.push(name);
        }
    });
    
    if (currentMemberList.length === 0) {
        showMessage('Danh sách thành viên không được để trống', 'error');
        return;
    }
    
    // Check if there are any changes
    const hasChanges = JSON.stringify(currentMemberList.sort()) !== JSON.stringify(originalMemberList.sort());
    if (!hasChanges) {
        showMessage('Không có thay đổi nào để lưu', 'info');
        return;
    }
    
    // Show loading state
    const saveBtn = document.getElementById('saveMemberChangesBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang lưu...';
    
    try {
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'updateMemberList',
                phone: currentMemberData.Phone,
                memberList: currentMemberList,
                originalMemberList: originalMemberList
            })
        });
        
        if (!response.ok) {
            throw new Error('Lỗi kết nối server');
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update current data
            currentMemberData.MemberList = JSON.stringify(currentMemberList);
            originalMemberList = [...currentMemberList];
            
            // Update display
            document.getElementById('memberRegCount').value = currentMemberList.length;
            
            // Show success message
            showMemberSaveResult(result.message, currentMemberList.length);
            showMessage('Lưu thay đổi thành công!', 'success');
        } else {
            showMessage(result.message || 'Có lỗi khi lưu thay đổi', 'error');
        }
        
    } catch (error) {
        console.error('Error saving member changes:', error);
        showMessage('Lỗi khi lưu thay đổi: ' + error.message, 'error');
    } finally {
        // Reset button state
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// Reset member changes
function resetMemberChanges() {
    if (!currentMemberData) {
        showMessage('Không có dữ liệu để khôi phục', 'error');
        return;
    }
    
    if (confirm('Bạn có chắc muốn khôi phục danh sách thành viên về trạng thái ban đầu?')) {
        displayMemberList(originalMemberList);
        showMessage('Đã khôi phục danh sách thành viên', 'info');
    }
}

// Show/hide member loading state
function showMemberLoadingState(show) {
    const loadingDiv = document.getElementById('memberLoadingData');
    if (show) {
        loadingDiv.classList.remove('hidden');
    } else {
        loadingDiv.classList.add('hidden');
    }
}

// Show/hide member error state
function showMemberErrorState(message) {
    const errorDiv = document.getElementById('memberErrorData');
    const errorMessage = document.getElementById('memberErrorMessage');
    errorMessage.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideMemberErrorState() {
    const errorDiv = document.getElementById('memberErrorData');
    errorDiv.classList.add('hidden');
}

// Show/hide member registration info
function showMemberRegistrationInfo() {
    const infoDiv = document.getElementById('memberRegistrationInfo');
    infoDiv.classList.remove('hidden');
}

function hideMemberRegistrationInfo() {
    const infoDiv = document.getElementById('memberRegistrationInfo');
    infoDiv.classList.add('hidden');
}

// Show/hide member list section
function showMemberListSection() {
    const listDiv = document.getElementById('memberListSection');
    listDiv.classList.remove('hidden');
}

function hideMemberListSection() {
    const listDiv = document.getElementById('memberListSection');
    listDiv.classList.add('hidden');
}

// Show member save result
function showMemberSaveResult(message, memberCount) {
    const resultDiv = document.getElementById('memberSaveResult');
    const detailsDiv = document.getElementById('memberSaveDetails');
    
    detailsDiv.innerHTML = `
        <p><strong>Thông báo:</strong> ${message}</p>
        <p><strong>Số thành viên hiện tại:</strong> ${memberCount}</p>
        <p><strong>Thời gian cập nhật:</strong> ${new Date().toLocaleString('vi-VN')}</p>
    `;
    
    resultDiv.classList.remove('hidden');
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

// Export functions for global access
window.searchUser = searchUser;
window.clearNotificationForm = clearNotificationForm;
window.toggleNotification = toggleNotification;
window.deleteNotification = deleteNotification;
window.resetGpsSettings = resetGpsSettings;
window.refreshAllData = refreshAllData;

