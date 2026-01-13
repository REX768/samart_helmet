# نظام الخوذة الذكية لسلامة العاملين في المجال النفطي

نظام متكامل لمراقبة سلامة العاملين في المواقع النفطية باستخدام الخوذة الذكية المزودة بمجموعة من المستشعرات.

## المكونات التقنية

### الأجهزة المستخدمة:
- **ESP32**: المتحكم الدقيق الرئيسي
- **DHT22**: مستشعر درجة الحرارة والرطوبة
- **MPU6050**: مستشعر الصدمات لاكتشاف السقوط
- **NEO-8M**: جهاز تحديد الموقع GPS
- **MQ-4**: مستشعر الغازات السامة

## المميزات

- ✅ مراقبة لحظية لظروف البيئة (درجة الحرارة والرطوبة)
- ✅ اكتشاف السقوط والحوادث تلقائياً
- ✅ تتبع موقع العامل في الوقت الفعلي
- ✅ كشف الغازات السامة والتنبيه الفوري
- ✅ لوحة تحكم مركزية لمسؤول السلامة
- ✅ تنبيهات فورية عند وجود خطر
- ✅ ربط مباشر مع خرائط Google لعرض الموقع

## التثبيت والتشغيل

### المتطلبات:
- Node.js (الإصدار 14 أو أحدث)
- npm

### خطوات التثبيت:

1. تثبيت المكتبات المطلوبة:
```bash
npm install
```

2. تشغيل الخادم:
```bash
npm start
```

أو للتطوير مع إعادة التشغيل التلقائي:
```bash
npm run dev
```

3. فتح المتصفح على:
```
http://localhost:3000
```

## استخدام API

### إرسال بيانات من ESP32:

```http
POST http://localhost:3000/api/sensor-data
Content-Type: application/json

{
  "workerId": "001",
  "temperature": 35.5,
  "humidity": 60.2,
  "gasLevel": 150,
  "latitude": 24.7136,
  "longitude": 46.6753,
  "fallDetected": false,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### الحصول على بيانات جميع العاملين:

```http
GET http://localhost:3000/api/workers
```

### الحصول على بيانات عامل محدد:

```http
GET http://localhost:3000/api/worker/001
```

## مثال كود ESP32

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <MPU6050.h>
#include <TinyGPS++.h>
#include <MQ4.h>

// إعدادات WiFi
const char* ssid = "اسم_الشبكة";
const char* password = "كلمة_المرور";
const char* serverURL = "http://192.168.1.100:3000/api/sensor-data";

// المستشعرات
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

MPU6050 mpu;
MQ4 mq4(A0);
TinyGPSPlus gps;

void setup() {
  Serial.begin(115200);
  
  // الاتصال بـ WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  // تهيئة المستشعرات
  dht.begin();
  mpu.begin();
  mq4.begin();
}

void loop() {
  // قراءة البيانات من المستشعرات
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  float gasLevel = mq4.readGas();
  bool fallDetected = detectFall();
  
  // قراءة GPS
  float lat = 0, lng = 0;
  if (gps.location.isValid()) {
    lat = gps.location.lat();
    lng = gps.location.lng();
  }
  
  // إرسال البيانات
  sendDataToServer(temperature, humidity, gasLevel, lat, lng, fallDetected);
  
  delay(5000); // إرسال كل 5 ثوانٍ
}
```

## الواجهة

تعرض لوحة التحكم:
- حالة كل عامل (نشط/حالة طوارئ)
- درجة الحرارة والرطوبة
- مستوى الغازات
- حالة السقوط
- موقع العامل مع رابط لخرائط Google
- التنبيهات الفورية

## ملاحظات

- النظام حالياً لا يستخدم قاعدة بيانات، البيانات تُخزن في الذاكرة
- عند إعادة تشغيل الخادم، سيتم فقدان البيانات السابقة
- يمكن إضافة قاعدة بيانات لاحقاً لتخزين البيانات التاريخية

## التطوير المستقبلي

- [ ] إضافة قاعدة بيانات لتخزين البيانات التاريخية
- [ ] إضافة تقارير وتحليلات
- [ ] إضافة نظام إشعارات متقدم
- [ ] إضافة لوحة تحكم للموظفين
- [ ] دعم الألواح الشمسية وإدارة الطاقة

## الترخيص

ISC

