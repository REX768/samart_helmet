// ملف اختبار API - يمكن استخدامه لاختبار النظام
// تشغيل: node test-api.js

const http = require('http');

const testData = {
    workerId: "001",
    temperature: 38.5,
    humidity: 65.2,
    gasLevel: 250,
    latitude: 24.7136,
    longitude: 46.6753,
    fallDetected: false,
    timestamp: new Date().toISOString()
};

const postData = JSON.stringify(testData);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/sensor-data',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`حالة الاستجابة: ${res.statusCode}`);
    console.log(`الرؤوس: ${JSON.stringify(res.headers)}`);
    
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log('الاستجابة:', chunk);
    });
});

req.on('error', (e) => {
    console.error(`خطأ في الطلب: ${e.message}`);
});

req.write(postData);
req.end();

console.log('تم إرسال بيانات الاختبار...');

