# 🚀 إعدادات Render Environment Variables الصحيحة

## ✅ المتغيرات المطلوبة فقط (7 متغيرات):

انسخ كل سطر بالضبط كما هو:

```
CLIENT_URL=https://saudicord.onrender.com
JWT_SECRET=saudicord-secret-key-2024
MONGODB_URI=mongodb+srv://abood3alshrary_db_user:23U4pKSr6zNEnf0C@saudicord.sfzfre8.mongodb.net/saudicord?retryWrites=true&w=majority&appName=saudicord
NODE_ENV=production
PORT=10000
RESET_DB=false
USE_MONGODB=true
```

## ❌ احذف هذه المتغيرات إن وجدت:

- DATABASE_URL
- DB_HOST
- DB_NAME
- DB_PASSWORD
- DB_PORT
- DB_USER
- STUN_SERVER

## 📋 خطوات التحديث في Render:

### 1. افتح Render Dashboard
https://dashboard.render.com

### 2. اختر خدمة saudicord

### 3. اذهب لتاب Environment

### 4. احذف المتغيرات القديمة:
- اضغط على 3 نقاط بجانب كل متغير PostgreSQL
- اختر Delete

### 5. تحقق/حدث المتغيرات:
تأكد أن كل متغير موجود بالقيمة الصحيحة:

| Key | Value |
|-----|-------|
| CLIENT_URL | https://saudicord.onrender.com |
| JWT_SECRET | saudicord-secret-key-2024 |
| MONGODB_URI | mongodb+srv://abood3alshrary_db_user:23U4pKSr6zNEnf0C@saudicord.sfzfre8.mongodb.net/saudicord?retryWrites=true&w=majority&appName=saudicord |
| NODE_ENV | production |
| PORT | 10000 |
| RESET_DB | false |
| USE_MONGODB | true |

### 6. احفظ التغييرات:
اضغط Save Changes

### 7. Deploy:
- اضغط Manual Deploy
- اختر Deploy latest commit
- انتظر 3-5 دقائق

## ✅ للتأكد من النجاح:

بعد اكتمال Deploy، افتح:
```
https://saudicord.onrender.com/api/health
```

يجب أن يظهر:
```json
{
  "status": "OK",
  "database": "Connected",
  "timestamp": "..."
}
```

## 🎉 النتيجة:

- الموقع سيعمل 100%
- تسجيل دخول: `admin` / `admin509`
- أو: `liongtas` / `Lion509`

---
Made With Love By SirAbody 💝
