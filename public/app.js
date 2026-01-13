// ========================================
// Smart Helmet - Dashboard Application
// ========================================

// HTTP Polling Configuration (يعمل على Vercel)
const CONFIG = {
    POLLING_INTERVAL: 2000,  // تحديث كل 2 ثانية
    SERVER_URL: window.location.origin
};

// Data Storage
let workersData = new Map();
let alertsCount = 0;
let isConnected = false;
let pollingTimer = null;

// DOM Elements
const elements = {
    // Connection
    connectionIndicator: document.getElementById('connectionIndicator'),
    connectionText: document.getElementById('connectionText'),

    // Stats
    totalWorkers: document.getElementById('totalWorkers'),
    activeWorkers: document.getElementById('activeWorkers'),
    totalAlerts: document.getElementById('totalAlerts'),
    emergencyCount: document.getElementById('emergencyCount'),

    // Workers
    workersContainer: document.getElementById('workersContainer'),
    noWorkers: document.getElementById('noWorkers'),
    searchWorker: document.getElementById('searchWorker'),

    // Header
    currentTime: document.getElementById('currentTime'),
    notificationBadge: document.getElementById('notificationBadge'),
    alertsBadge: document.getElementById('alertsBadge'),

    // Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    menuBtn: document.getElementById('menuBtn'),

    // View Toggle
    gridViewBtn: document.getElementById('gridViewBtn'),
    listViewBtn: document.getElementById('listViewBtn'),

    // Modal
    alertModal: document.getElementById('alertModal'),
    alertModalBody: document.getElementById('alertModalBody'),
    dismissAlert: document.getElementById('dismissAlert'),
    viewWorker: document.getElementById('viewWorker'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeClock();
    initializeSidebar();
    initializeSearch();
    initializeViewToggle();
    initializeModal();
    
    // بدء HTTP Polling بدلاً من Socket.IO
    startPolling();
    updateDisplay();
});

// ========================================
// Clock
// ========================================
function initializeClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    elements.currentTime.textContent = timeString;
}

// ========================================
// Sidebar
// ========================================
function initializeSidebar() {
    // Toggle sidebar collapse
    elements.sidebarToggle?.addEventListener('click', () => {
        elements.sidebar.classList.toggle('collapsed');
    });

    // Mobile menu toggle
    elements.menuBtn?.addEventListener('click', () => {
        elements.sidebar.classList.toggle('active');
    });

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 992) {
            if (!elements.sidebar.contains(e.target) && !elements.menuBtn.contains(e.target)) {
                elements.sidebar.classList.remove('active');
            }
        }
    });
}

// ========================================
// Search
// ========================================
function initializeSearch() {
    elements.searchWorker?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterWorkers(searchTerm);
    });
}

function filterWorkers(searchTerm) {
    const cards = document.querySelectorAll('.worker-card');
    cards.forEach(card => {
        const workerId = card.dataset.workerId?.toLowerCase() || '';
        if (workerId.includes(searchTerm) || searchTerm === '') {
            card.style.display = '';
            card.style.animation = 'fadeIn 0.3s ease';
        } else {
            card.style.display = 'none';
        }
    });
}

// ========================================
// View Toggle
// ========================================
function initializeViewToggle() {
    elements.gridViewBtn?.addEventListener('click', () => {
        setView('grid');
    });

    elements.listViewBtn?.addEventListener('click', () => {
        setView('list');
    });
}

function setView(view) {
    if (view === 'grid') {
        elements.workersContainer.className = 'workers-grid';
        elements.gridViewBtn.classList.add('active');
        elements.listViewBtn.classList.remove('active');
    } else {
        elements.workersContainer.className = 'workers-list';
        elements.listViewBtn.classList.add('active');
        elements.gridViewBtn.classList.remove('active');
    }
}

// ========================================
// Modal
// ========================================
function initializeModal() {
    elements.dismissAlert?.addEventListener('click', () => {
        closeModal();
    });

    elements.viewWorker?.addEventListener('click', () => {
        closeModal();
    });

    elements.alertModal?.addEventListener('click', (e) => {
        if (e.target === elements.alertModal) {
            closeModal();
        }
    });
}

function showModal(content) {
    elements.alertModalBody.innerHTML = content;
    elements.alertModal.classList.add('active');
}

function closeModal() {
    elements.alertModal.classList.remove('active');
}

// ========================================
// Toast Notifications
// ========================================
function showToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    elements.toastContainer.appendChild(toast);

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        removeToast(toast);
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
        removeToast(toast);
    }, 5000);
}

function removeToast(toast) {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(-100%); opacity: 0; }
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);

// ========================================
// HTTP Polling (بدلاً من Socket.IO)
// ========================================

// بدء Polling
function startPolling() {
    // جلب البيانات فوراً
    fetchWorkersData();
    
    // ثم جلب البيانات بشكل دوري
    pollingTimer = setInterval(() => {
        fetchWorkersData();
    }, CONFIG.POLLING_INTERVAL);
    
    updateConnectionStatus(true);
    showToast('success', 'تم الاتصال', 'تم الاتصال بالخادم بنجاح');
    console.log('Started HTTP polling');
}

// إيقاف Polling
function stopPolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
    updateConnectionStatus(false);
}

// جلب بيانات العاملين من السيرفر
async function fetchWorkersData() {
    try {
        const response = await fetch(`${CONFIG.SERVER_URL}/api/workers`);
        
        if (!response.ok) {
            throw new Error('فشل جلب البيانات');
        }
        
        const data = await response.json();
        
        // حفظ البيانات السابقة للتحقق من التغييرات
        const previousData = new Map(workersData);
        
        // تحديث البيانات
        data.forEach(worker => {
            const workerId = worker.workerId;
            const previousWorker = previousData.get(workerId);
            
            // حفظ البيانات الجديدة
            workersData.set(workerId, worker);
            
            // التحقق من التنبيهات الجديدة
            if (worker.alerts && worker.alerts.length > 0) {
                // التحقق إذا كانت التنبيهات جديدة
                if (!previousWorker || JSON.stringify(previousWorker.alerts) !== JSON.stringify(worker.alerts)) {
                    handleAlerts(worker);
                }
            }
            
            // التحقق من السقوط
            if (worker.fallDetected && (!previousWorker || !previousWorker.fallDetected)) {
                showToast('error', 'تنبيه سقوط!', `تم اكتشاف سقوط للعامل #${workerId}`);
                showEmergencyModal(worker);
            }
        });
        
        // تحديث العرض
        updateDisplay();
        
        isConnected = true;
        updateConnectionStatus(true);
        
    } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        isConnected = false;
        updateConnectionStatus(false);
    }
}

// ========================================
// Connection Status
// ========================================
function updateConnectionStatus(connected) {
    if (connected) {
        elements.connectionIndicator.classList.add('connected');
        elements.connectionIndicator.classList.remove('disconnected');
        elements.connectionText.textContent = 'متصل';
    } else {
        elements.connectionIndicator.classList.remove('connected');
        elements.connectionIndicator.classList.add('disconnected');
        elements.connectionText.textContent = 'غير متصل';
    }
}

// إعادة المحاولة عند فقدان الاتصال
function retryConnection() {
    if (!isConnected) {
        console.log('إعادة محاولة الاتصال...');
        fetchWorkersData();
    }
}

// إعادة المحاولة كل 5 ثوانٍ إذا كان الاتصال منقطعاً
setInterval(retryConnection, 5000);

// ========================================
// Display Update
// ========================================
function updateDisplay() {
    const workers = Array.from(workersData.values());

    // Update stats
    updateStats(workers);

    // Update workers display
    if (workers.length === 0) {
        elements.workersContainer.style.display = 'none';
        elements.noWorkers.style.display = 'block';
        return;
    }

    elements.workersContainer.style.display = '';
    elements.noWorkers.style.display = 'none';

    // Render worker cards
    elements.workersContainer.innerHTML = workers.map(worker => createWorkerCard(worker)).join('');
}

function updateStats(workers) {
    const total = workers.length;
    const active = workers.filter(w => w.status !== 'emergency').length;
    const emergencies = workers.filter(w => w.status === 'emergency' || w.fallDetected).length;
    const alerts = workers.reduce((count, w) => count + (w.alerts?.length || 0), 0);

    // Animate number changes
    animateNumber(elements.totalWorkers, total);
    animateNumber(elements.activeWorkers, active);
    animateNumber(elements.totalAlerts, alerts);
    animateNumber(elements.emergencyCount, emergencies);

    // Update badges
    elements.notificationBadge.textContent = alerts;
    elements.alertsBadge.textContent = alerts;

    alertsCount = alerts;
}

function animateNumber(element, newValue) {
    const currentValue = parseInt(element.textContent) || 0;
    if (currentValue === newValue) return;

    const duration = 500;
    const steps = 20;
    const increment = (newValue - currentValue) / steps;
    let current = currentValue;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        current += increment;
        element.textContent = Math.round(current);

        if (step >= steps) {
            element.textContent = newValue;
            clearInterval(timer);
        }
    }, duration / steps);
}

// ========================================
// Worker Card
// ========================================
function createWorkerCard(worker) {
    const cardClass = getCardClass(worker);
    const statusClass = getStatusClass(worker);
    const statusText = getStatusText(worker);

    // Sensor value classes
    const tempClass = getSensorClass(worker.temperature, 35, 40);
    const gasClass = getSensorClass(worker.gasLevel, 200, 300);
    const fallClass = worker.fallDetected ? 'danger' : '';

    // Location
    const hasLocation = worker.latitude && worker.longitude && worker.latitude !== 0;
    const mapUrl = hasLocation
        ? `https://www.google.com/maps?q=${worker.latitude},${worker.longitude}`
        : '#';

    // Alerts
    const alertsHTML = createAlertsHTML(worker.alerts);

    // Worker name
    const workerName = worker.name || `العامل #${worker.workerId}`;

    // Connection status
    const phoneStatus = worker.phoneConnected ? 'connected' : 'disconnected';
    const helmetStatus = worker.helmetConnected ? 'connected' : 'disconnected';

    return `
        <div class="worker-card ${cardClass}" data-worker-id="${worker.workerId}">
            <div class="worker-header">
                <div class="worker-info">
                    <div class="worker-avatar">
                        <i class="fas fa-user-hard-hat"></i>
                    </div>
                    <div>
                        <div class="worker-name">${workerName}</div>
                        <div class="worker-id">خوذة: ${worker.workerId}</div>
                    </div>
                </div>
                <span class="worker-status ${statusClass}">${statusText}</span>
            </div>

            <!-- Connection Status -->
            <div class="connection-indicators">
                <div class="conn-indicator ${phoneStatus}">
                    <i class="fas fa-mobile-alt"></i>
                    <span>${worker.phoneConnected ? 'الهاتف متصل' : 'الهاتف غير متصل'}</span>
                </div>
                <div class="conn-indicator ${helmetStatus}">
                    <i class="fas fa-hard-hat"></i>
                    <span>${worker.helmetConnected ? 'الخوذة متصلة' : 'الخوذة غير متصلة'}</span>
                </div>
            </div>

            <div class="sensor-grid">
                <div class="sensor-item">
                    <div class="sensor-label">
                        <i class="fas fa-temperature-high"></i>
                        درجة الحرارة
                    </div>
                    <div class="sensor-value ${tempClass}">
                        ${formatValue(worker.temperature)}
                        <span class="unit">°C</span>
                    </div>
                </div>

                <div class="sensor-item">
                    <div class="sensor-label">
                        <i class="fas fa-tint"></i>
                        الرطوبة
                    </div>
                    <div class="sensor-value">
                        ${formatValue(worker.humidity)}
                        <span class="unit">%</span>
                    </div>
                </div>

                <div class="sensor-item">
                    <div class="sensor-label">
                        <i class="fas fa-smog"></i>
                        مستوى الغاز
                    </div>
                    <div class="sensor-value ${gasClass}">
                        ${formatValue(worker.gasLevel, 0)}
                        <span class="unit">ppm</span>
                    </div>
                </div>

                <div class="sensor-item">
                    <div class="sensor-label">
                        <i class="fas fa-exclamation-triangle"></i>
                        حالة السقوط
                    </div>
                    <div class="sensor-value ${fallClass}">
                        ${worker.fallDetected ? 'تم اكتشاف سقوط!' : 'طبيعي'}
                    </div>
                </div>
            </div>

            <div class="location-section">
                <div class="location-coords">
                    <i class="fas fa-map-marker-alt"></i>
                    ${hasLocation
            ? `${worker.latitude.toFixed(6)}, ${worker.longitude.toFixed(6)}`
            : 'لا توجد بيانات موقع'}
                    ${worker.gpsAccuracy ? `<span class="gps-accuracy">(دقة: ${worker.gpsAccuracy.toFixed(0)}م)</span>` : ''}
                </div>
                ${hasLocation
            ? `<a href="${mapUrl}" target="_blank" class="map-btn">
                        <i class="fas fa-map"></i>
                        الخريطة
                       </a>`
            : ''}
            </div>

            ${worker.phone ? `
            <div class="worker-contact">
                <a href="tel:${worker.phone}" class="contact-btn">
                    <i class="fas fa-phone"></i>
                    اتصال
                </a>
                ${worker.emergencyPhone ? `
                <a href="tel:${worker.emergencyPhone}" class="contact-btn emergency">
                    <i class="fas fa-phone-alt"></i>
                    طوارئ
                </a>
                ` : ''}
            </div>
            ` : ''}

            ${alertsHTML}

            <div class="last-update">
                <i class="far fa-clock"></i>
                آخر تحديث: ${formatTime(worker.lastUpdate)}
            </div>
        </div>
    `;
}

function getCardClass(worker) {
    if (worker.status === 'emergency' || worker.fallDetected) return 'emergency';
    if (worker.alerts && worker.alerts.length > 0) return 'warning';
    return '';
}

function getStatusClass(worker) {
    if (worker.status === 'emergency' || worker.fallDetected) return 'status-emergency';
    if (worker.alerts && worker.alerts.length > 0) return 'status-warning';
    return 'status-active';
}

function getStatusText(worker) {
    if (worker.status === 'emergency' || worker.fallDetected) return 'طوارئ';
    if (worker.alerts && worker.alerts.length > 0) return 'تحذير';
    return 'نشط';
}

function getSensorClass(value, warningThreshold, dangerThreshold) {
    if (!value && value !== 0) return '';
    if (value > dangerThreshold) return 'danger';
    if (value > warningThreshold) return 'warning';
    return '';
}

function formatValue(value, decimals = 1) {
    if (value === null || value === undefined) return '--';
    return Number(value).toFixed(decimals);
}

function formatTime(timestamp) {
    if (!timestamp) return 'غير متاح';
    const date = new Date(timestamp);
    return date.toLocaleString('ar-SA', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function createAlertsHTML(alerts) {
    if (!alerts || alerts.length === 0) return '';

    const alertItems = alerts.map(alert => `
        <div class="alert-item ${alert.severity === 'critical' ? '' : 'warning'}">
            <i class="fas fa-exclamation-circle"></i>
            ${alert.message}
        </div>
    `).join('');

    return `<div class="card-alerts">${alertItems}</div>`;
}

// ========================================
// Alerts Handling
// ========================================
function handleAlerts(workerData) {
    workerData.alerts.forEach(alert => {
        const toastType = alert.severity === 'critical' ? 'error' : 'warning';
        showToast(toastType, `تنبيه - العامل #${workerData.workerId}`, alert.message);

        // Browser notification
        if (alert.severity === 'critical') {
            sendBrowserNotification(workerData, alert);
        }
    });
}

function showEmergencyModal(workerData) {
    const content = `
        <div style="text-align: center;">
            <p style="font-size: 1.1rem; margin-bottom: 16px;">
                <strong>العامل #${workerData.workerId}</strong>
            </p>
            <p style="color: var(--danger); font-weight: 600;">
                تم اكتشاف سقوط محتمل!
            </p>
            ${workerData.latitude && workerData.longitude ? `
                <p style="margin-top: 16px; color: var(--dark-500);">
                    <i class="fas fa-map-marker-alt"></i>
                    الموقع: ${workerData.latitude.toFixed(6)}, ${workerData.longitude.toFixed(6)}
                </p>
            ` : ''}
        </div>
    `;
    showModal(content);
}

// ========================================
// Browser Notifications
// ========================================
function sendBrowserNotification(workerData, alert) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`تنبيه عاجل - العامل #${workerData.workerId}`, {
            body: alert.message,
            icon: '/favicon.ico',
            tag: `alert-${workerData.workerId}`,
            requireInteraction: true
        });
    }
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// ========================================
// Auto Refresh
// ========================================
setInterval(() => {
    updateDisplay();
}, 5000);

// Initial display
updateDisplay();

// ========================================
// Keyboard Shortcuts
// ========================================
document.addEventListener('keydown', (e) => {
    // ESC to close modal
    if (e.key === 'Escape') {
        closeModal();
    }

    // Ctrl+K to focus search
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        elements.searchWorker?.focus();
    }
});

console.log('Smart Helmet Dashboard initialized');
