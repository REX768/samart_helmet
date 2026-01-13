const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ========================================
// Data Storage
// ========================================

// بيانات العاملين (من الخوذة + الهاتف)
const workersData = new Map();

// معلومات العاملين المسجلين
const workersInfo = new Map();

// حالة اتصال الهواتف
const phoneConnections = new Map();

// ملف حفظ بيانات العاملين
const WORKERS_FILE = path.join(__dirname, 'data', 'workers.json');

// ========================================
// Data Persistence
// ========================================

// تحميل بيانات العاملين المحفوظة
function loadWorkersData() {
    try {
        if (fs.existsSync(WORKERS_FILE)) {
            const data = fs.readFileSync(WORKERS_FILE, 'utf8');
            const workers = JSON.parse(data);
            workers.forEach(worker => {
                workersInfo.set(worker.workerId, worker);
            });
            console.log(`تم تحميل ${workers.length} عامل من الملف`);
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات العاملين:', error);
    }
}

// حفظ بيانات العاملين
function saveWorkersData() {
    try {
        const dir = path.dirname(WORKERS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const workers = Array.from(workersInfo.values());
        fs.writeFileSync(WORKERS_FILE, JSON.stringify(workers, null, 2));
    } catch (error) {
        console.error('خطأ في حفظ بيانات العاملين:', error);
    }
}

// تحميل البيانات عند بدء التشغيل
loadWorkersData();

// ========================================
// API Endpoints
// ========================================

// استقبال البيانات من ESP32 (الخوذة)
app.post('/api/sensor-data', (req, res) => {
    const {
        workerId,
        temperature,
        humidity,
        gasLevel,
        accelX,
        accelY,
        accelZ,
        fallDetected,
        mpuStatus,
        timestamp
    } = req.body;

    if (!workerId) {
        return res.status(400).json({ error: 'workerId مطلوب' });
    }

    // جلب بيانات العامل الحالية أو إنشاء جديدة
    let workerData = workersData.get(workerId) || {};
    const workerInfo = workersInfo.get(workerId) || {};

    // دمج البيانات من الخوذة
    workerData = {
        ...workerData,
        workerId,
        // معلومات العامل
        name: workerInfo.name || null,
        phone: workerInfo.phone || null,
        emergencyPhone: workerInfo.emergencyPhone || null,
        address: workerInfo.address || null,
        // بيانات المستشعرات (من الخوذة)
        temperature: temperature || null,
        humidity: humidity || null,
        gasLevel: gasLevel || null,
        accelX: accelX || null,
        accelY: accelY || null,
        accelZ: accelZ || null,
        fallDetected: fallDetected || false,
        mpuStatus: mpuStatus || 'unknown',
        // حالة الاتصال
        helmetConnected: true,
        helmetLastUpdate: timestamp || new Date().toISOString(),
        // الموقع (من الهاتف)
        latitude: workerData.latitude || null,
        longitude: workerData.longitude || null,
        gpsAccuracy: workerData.gpsAccuracy || null,
        gpsSource: workerData.gpsSource || null,
        phoneConnected: phoneConnections.has(workerId),
        // حالة عامة
        status: 'active',
        lastUpdate: new Date().toISOString(),
        alerts: []
    };

    // تحديد التنبيهات
    if (temperature && temperature > 40) {
        workerData.alerts.push({
            type: 'temperature',
            message: `درجة حرارة عالية: ${temperature}°C`,
            severity: 'high'
        });
    }

    if (gasLevel && gasLevel > 300) {
        workerData.alerts.push({
            type: 'gas',
            message: `مستوى غاز خطير: ${gasLevel} ppm`,
            severity: 'critical'
        });
        workerData.status = 'emergency';
    }

    if (fallDetected) {
        workerData.alerts.push({
            type: 'fall',
            message: 'تم اكتشاف سقوط!',
            severity: 'critical'
        });
        workerData.status = 'emergency';
    }

    workersData.set(workerId, workerData);

    // إرسال البيانات إلى لوحة التحكم
    io.to('dashboard').emit('sensor-update', workerData);

    res.json({
        success: true,
        message: 'تم استلام البيانات بنجاح',
        alerts: workerData.alerts.length > 0 ? workerData.alerts : null
    });
});

// الحصول على بيانات جميع العاملين
app.get('/api/workers', (req, res) => {
    const workers = Array.from(workersData.values());
    res.json(workers);
});

// الحصول على بيانات عامل محدد
app.get('/api/worker/:workerId', (req, res) => {
    const workerId = req.params.workerId;
    const workerData = workersData.get(workerId);

    if (!workerData) {
        return res.status(404).json({ error: 'العامل غير موجود' });
    }

    res.json(workerData);
});

// تسجيل عامل جديد
app.post('/api/worker/register', (req, res) => {
    const { workerId, name, phone, emergencyPhone, address } = req.body;

    if (!workerId || !name) {
        return res.status(400).json({ error: 'workerId و name مطلوبان' });
    }

    const workerInfo = {
        workerId,
        name,
        phone: phone || null,
        emergencyPhone: emergencyPhone || null,
        address: address || null,
        registeredAt: new Date().toISOString()
    };

    workersInfo.set(workerId, workerInfo);
    saveWorkersData();

    res.json({
        success: true,
        message: 'تم تسجيل العامل بنجاح',
        worker: workerInfo
    });
});

// الحصول على معلومات العاملين المسجلين
app.get('/api/workers/info', (req, res) => {
    const workers = Array.from(workersInfo.values());
    res.json(workers);
});

// ========================================
// WebSocket Handling
// ========================================

io.on('connection', (socket) => {
    const clientType = socket.handshake.query.type || 'dashboard';
    const workerId = socket.handshake.query.workerId;

    console.log(`اتصال جديد: ${clientType} (${socket.id})${workerId ? ` - Worker: ${workerId}` : ''}`);

    // ========================================
    // Dashboard Client
    // ========================================
    if (clientType === 'dashboard') {
        socket.join('dashboard');

        // إرسال البيانات الحالية
        const currentData = Array.from(workersData.values());
        socket.emit('initial-data', currentData);
    }

    // ========================================
    // Worker Client (Phone App)
    // ========================================
    if (clientType === 'worker' && workerId) {
        socket.join(`worker-${workerId}`);
        phoneConnections.set(workerId, socket.id);

        console.log(`هاتف العامل ${workerId} متصل`);

        // إعلام لوحة التحكم
        io.to('dashboard').emit('phone-connected', { workerId });

        // تسجيل العامل
        socket.on('worker-register', (data) => {
            const { name, phone, emergencyPhone, address } = data;

            const workerInfo = {
                workerId: data.workerId,
                name,
                phone,
                emergencyPhone,
                address,
                registeredAt: new Date().toISOString()
            };

            workersInfo.set(data.workerId, workerInfo);
            saveWorkersData();

            console.log(`تم تسجيل العامل: ${name} (${data.workerId})`);

            // تحديث بيانات العامل
            let workerData = workersData.get(data.workerId) || {};
            workerData = {
                ...workerData,
                workerId: data.workerId,
                name,
                phone,
                emergencyPhone,
                address,
                phoneConnected: true,
                lastUpdate: new Date().toISOString()
            };
            workersData.set(data.workerId, workerData);

            io.to('dashboard').emit('sensor-update', workerData);
        });

        // استقبال الموقع من الهاتف
        socket.on('worker-location', (data) => {
            const { latitude, longitude, accuracy, timestamp, source } = data;

            console.log(`موقع العامل ${workerId}: ${latitude}, ${longitude} (دقة: ${accuracy}م)`);

            // تحديث بيانات العامل
            let workerData = workersData.get(workerId) || {};
            const workerInfo = workersInfo.get(workerId) || {};

            workerData = {
                ...workerData,
                workerId,
                name: workerInfo.name || workerData.name,
                phone: workerInfo.phone || workerData.phone,
                emergencyPhone: workerInfo.emergencyPhone || workerData.emergencyPhone,
                address: workerInfo.address || workerData.address,
                latitude,
                longitude,
                gpsAccuracy: accuracy,
                gpsSource: source || 'phone-gps',
                phoneConnected: true,
                phoneLastUpdate: new Date(timestamp).toISOString(),
                lastUpdate: new Date().toISOString()
            };

            workersData.set(workerId, workerData);

            // إرسال إلى لوحة التحكم
            io.to('dashboard').emit('location-update', {
                workerId,
                latitude,
                longitude,
                accuracy,
                timestamp
            });

            io.to('dashboard').emit('sensor-update', workerData);

            // تأكيد الاستلام
            socket.emit('location-received');
        });

        // Heartbeat من الهاتف
        socket.on('worker-heartbeat', (data) => {
            phoneConnections.set(workerId, socket.id);

            let workerData = workersData.get(workerId);
            if (workerData) {
                workerData.phoneConnected = true;
                workerData.phoneLastHeartbeat = new Date().toISOString();
                workersData.set(workerId, workerData);
            }
        });

        // انقطاع الهاتف
        socket.on('worker-disconnect', (data) => {
            console.log(`هاتف العامل ${workerId} قطع الاتصال`);
            phoneConnections.delete(workerId);

            let workerData = workersData.get(workerId);
            if (workerData) {
                workerData.phoneConnected = false;
                workersData.set(workerId, workerData);
                io.to('dashboard').emit('sensor-update', workerData);
            }

            io.to('dashboard').emit('phone-disconnected', { workerId });
        });
    }

    // ========================================
    // Disconnect Handling
    // ========================================
    socket.on('disconnect', () => {
        console.log(`انقطاع الاتصال: ${socket.id}`);

        if (clientType === 'worker' && workerId) {
            phoneConnections.delete(workerId);

            let workerData = workersData.get(workerId);
            if (workerData) {
                workerData.phoneConnected = false;
                workersData.set(workerId, workerData);
                io.to('dashboard').emit('sensor-update', workerData);
            }

            io.to('dashboard').emit('phone-disconnected', { workerId });
        }
    });
});

// ========================================
// Phone Connection Monitoring
// ========================================

// التحقق من اتصال الهواتف كل 30 ثانية
setInterval(() => {
    const now = Date.now();

    workersData.forEach((workerData, workerId) => {
        if (workerData.phoneConnected && workerData.phoneLastHeartbeat) {
            const lastHeartbeat = new Date(workerData.phoneLastHeartbeat).getTime();
            const timeSinceHeartbeat = now - lastHeartbeat;

            // إذا مر أكثر من 60 ثانية بدون heartbeat
            if (timeSinceHeartbeat > 60000) {
                workerData.phoneConnected = false;
                workersData.set(workerId, workerData);
                io.to('dashboard').emit('sensor-update', workerData);
                io.to('dashboard').emit('phone-disconnected', { workerId });
            }
        }
    });
}, 30000);

// ========================================
// Routes
// ========================================

// الصفحة الرئيسية (لوحة التحكم)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// تطبيق العامل
app.get('/worker', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'worker', 'index.html'));
});

// ========================================
// Helper Functions
// ========================================

function getLocalIPAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const interfaceName in interfaces) {
        const interfaceInfo = interfaces[interfaceName];
        for (const info of interfaceInfo) {
            if (info.family === 'IPv4' && !info.internal) {
                addresses.push({
                    interface: interfaceName,
                    address: info.address
                });
            }
        }
    }

    return addresses;
}

// ========================================
// Server Start
// ========================================

server.listen(PORT, () => {
    console.log('\n========================================');
    console.log('  نظام الخوذة الذكية - الخادم');
    console.log('========================================');
    console.log(`  الخادم يعمل على المنفذ: ${PORT}`);

    const ipAddresses = getLocalIPAddresses();

    console.log('\n  الروابط المتاحة:');
    console.log('  ----------------------------------------');
    console.log(`  لوحة التحكم:`);
    console.log(`    http://localhost:${PORT}`);

    if (ipAddresses.length > 0) {
        console.log(`    http://${ipAddresses[0].address}:${PORT}`);
    }

    console.log(`\n  تطبيق العامل (للهاتف):`);
    console.log(`    http://localhost:${PORT}/worker`);

    if (ipAddresses.length > 0) {
        console.log(`    http://${ipAddresses[0].address}:${PORT}/worker`);
    }

    console.log(`\n  ESP32 API:`);
    if (ipAddresses.length > 0) {
        console.log(`    http://${ipAddresses[0].address}:${PORT}/api/sensor-data`);
    }

    console.log('========================================\n');
});
