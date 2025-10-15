# 🔍 كيفية الحصول على معلومات MongoDB Atlas

## خطوات بالصور:

### 1️⃣ **افتح MongoDB Atlas Dashboard**
- اذهب إلى: https://cloud.mongodb.com
- سجل دخول

### 2️⃣ **اضغط على "Connect" في الكلستر**
- ستجد زر أخضر "Connect" بجانب اسم الكلستر
- اضغط عليه

### 3️⃣ **اختر "Drivers"**
- اختر "Connect your application"
- أو "Drivers"

### 4️⃣ **اختر Node.js**
- Driver: **Node.js**
- Version: **4.0 or later**

### 5️⃣ **انسخ Connection String**
سيكون بهذا الشكل:
```
mongodb+srv://<username>:<password>@YOUR_CLUSTER_NAME.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 6️⃣ **معلومات مهمة تحتاجها:**
1. **Cluster Name**: الجزء بعد @ وقبل .mongodb.net (مثل: cluster0.rj2vx)
2. **Username**: اسم المستخدم لقاعدة البيانات
3. **Password**: كلمة المرور
4. **Database Name**: اسم قاعدة البيانات (عادة: saudicord)

---

## 📝 **املأ هذه المعلومات:**

```
MY_CLUSTER_NAME = __________ (مثل: cluster0.rj2vx)
MY_USERNAME = __________
MY_PASSWORD = __________
MY_DATABASE = saudicord
```

## 🔧 **تحقق من الإعدادات:**

### ✅ **Network Access (مهم جداً!)**
1. اذهب إلى "Network Access" في القائمة الجانبية
2. تأكد من وجود: **0.0.0.0/0 (Allow from anywhere)**
3. إذا لم يكن موجود:
   - اضغط "Add IP Address"
   - اختر "Allow Access from Anywhere"
   - اضغط "Confirm"

### ✅ **Database Access**
1. اذهب إلى "Database Access"
2. تأكد من وجود مستخدم
3. تأكد من أن له صلاحيات "Read and write to any database"

### ✅ **Cluster Status**
1. تأكد أن الكلستر **أخضر** (Active)
2. إذا كان **أصفر** أو **paused**، اضغط Resume

---

## 🚀 **بعد الحصول على المعلومات:**

أرسل لي المعلومات بهذا الشكل:
```
cluster name: YOUR_ACTUAL_CLUSTER_NAME
مثال: cluster0.rj2vx أو cluster0.abcde
```

أو أرسل لي Connection String كامل (بدون كلمة المرور):
```
mongodb+srv://username:****@cluster-name.mongodb.net/
```

---

## 🎯 **نصائح مهمة:**

1. **لا ترسل كلمة المرور** - فقط استبدلها بـ ****
2. **تأكد من Network Access** - يجب أن يكون 0.0.0.0/0 للـ production
3. **الكلستر يجب أن يكون Active** - ليس paused

## 💡 **مشاكل شائعة:**

### "Authentication failed"
- تحقق من username و password
- تأكد أن المستخدم موجود في Database Access

### "Network timeout"
- تحقق من Network Access
- يجب السماح من 0.0.0.0/0

### "Cluster paused"
- الكلستر المجاني يتوقف بعد 60 يوم عدم استخدام
- اضغط Resume في Dashboard
