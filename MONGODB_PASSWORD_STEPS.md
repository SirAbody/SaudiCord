# 🔐 خطوات تغيير كلمة المرور في MongoDB Atlas

## خطوة 1: افتح Database Access
![Step 1](https://mongodb.com)
1. سجل دخول في https://cloud.mongodb.com
2. من القائمة الجانبية اختر **"Database Access"**

## خطوة 2: عدل المستخدم
1. ابحث عن `abood3alshrary_db_user`
2. اضغط زر **"Edit"** (أيقونة القلم) على اليمين

## خطوة 3: غير كلمة المرور
1. اضغط على **"Edit Password"**
2. اختر **"Autogenerate Secure Password"** (موصى به)
   أو اكتب كلمة مرور مثل: `SaudiCord2024`
3. **انسخ كلمة المرور واحفظها!** 📝
4. اضغط **"Update User"**

## خطوة 4: احصل على Connection String الكامل
1. ارجع للـ Clusters
2. اضغط **"Connect"**
3. اختر **"Drivers"**
4. انسخ الـ connection string
5. استبدل `<db_password>` بكلمة المرور الجديدة

### مثال:
**قبل:**
```
mongodb+srv://abood3alshrary_db_user:<db_password>@saudicord.sfzfre8.mongodb.net/
```

**بعد (مع كلمة المرور الجديدة):**
```
mongodb+srv://abood3alshrary_db_user:SaudiCord2024@saudicord.sfzfre8.mongodb.net/saudicord?retryWrites=true&w=majority
```

---

# 📝 خطوات تحديث Render.com

## خطوة 1: افتح Render Dashboard
1. اذهب إلى https://dashboard.render.com
2. اضغط على خدمة **"saudicord"**

## خطوة 2: اذهب لـ Environment
1. اضغط على تاب **"Environment"** في الأعلى
2. ستجد قائمة بـ Environment Variables

## خطوة 3: حدث MONGODB_URI
1. ابحث عن **MONGODB_URI**
2. إذا موجود: اضغط على الـ 3 نقاط واختر **Edit**
3. إذا غير موجود: اضغط **"Add Environment Variable"**

## خطوة 4: ضع القيمة الجديدة
- **Key**: `MONGODB_URI`
- **Value**: الـ connection string الكامل مع كلمة المرور الجديدة
  ```
  mongodb+srv://abood3alshrary_db_user:YOUR_NEW_PASSWORD@saudicord.sfzfre8.mongodb.net/saudicord?retryWrites=true&w=majority&appName=saudicord
  ```

## خطوة 5: احفظ و Deploy
1. اضغط **"Save Changes"**
2. اضغط **"Manual Deploy"** في الأعلى
3. اختر **"Clear build cache & deploy"**
4. انتظر 5 دقائق

---

# ✅ للتأكد من نجاح العملية

بعد اكتمال الـ Deploy، افتح:
```
https://saudicord.onrender.com/api/health
```

يجب أن تشاهد:
```json
{
  "status": "OK",
  "database": "Connected",
  "timestamp": "..."
}
```

---

# 🆘 إذا لم تعمل

## تحقق من:
1. ✅ كلمة المرور صحيحة (بدون مسافات)
2. ✅ Network Access يحتوي على `0.0.0.0/0`
3. ✅ الـ cluster اسمه `saudicord.sfzfre8`
4. ✅ المستخدم له صلاحيات `Atlas admin` أو `readWriteAnyDatabase`

## جرب محلياً أولاً:
```bash
cd server
node verify-mongodb.js
# الصق connection string مع كلمة المرور الجديدة
```

---

# 📌 ملاحظات مهمة

1. **لا تشارك كلمة المرور** مع أحد
2. **احفظها في مكان آمن** (مدير كلمات مرور)
3. **استخدم كلمة مرور قوية** (أرقام + حروف + رموز)
4. **غير كلمة المرور دورياً** للأمان

---

Made With Love By SirAbody 💝
