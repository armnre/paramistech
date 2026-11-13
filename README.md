# پارامیس‌تک — سایت، پرتال مشتریان و پنل مدیریت

نسخهٔ مستقل (Self-hosted) سایت پارامیس‌تک با **بک‌اند Node.js (Express) + API** و **دیتابیس PostgreSQL**، آمادهٔ دپلوی روی **Ubuntu**.

| بخش | آدرس | توضیح |
|---|---|---|
| سایت عمومی | `/` | معرفی، خدمات، نمونه‌کارها، نظرات، سوالات متداول، فرم درخواست پروژه |
| پرتال مشتریان | `/portal` | ورود با نام کاربری/رمز؛ سرویس‌ها، سررسیدها، فاکتورها، پرداخت کارت‌به‌کارت با آپلود رسید، اعلان‌ها، تغییر رمز. قابل نصب (PWA) |
| پنل مدیریت | `/admin` | ورود با نام کاربری/رمزی که خودتان می‌سازید؛ نقش‌ها: مدیر کل / مالی / محتوا |

## ساختار مخزن
```
apps/paramistech/src/        کد اصلی (React) + endpointهای API در src/api و منطق سرور در src/server
packages/components/         کامپوننت‌های UI (shadcn)
deploy/server/               سرور API: Express، اتصال PostgreSQL (zitejs-shim)، schema.sql، ابزارهای CLI
deploy/web/                  بیلد فرانت (Vite) — shimهای api و upload، manifest/PWA
deploy/native/               build.sh / migrate.sh / seed.sh  (قرارداد sitectl)
deploy/seed/data.json        خروجی کامل داده‌های فعلی سایت (محتوا، مشتریان، فاکتورها، …)
deploy/install.sh            نصب کامل یک‌مرحله‌ای روی سرور بدون sitectl
deploy/scripts/              بک‌آپ و بازیابی
docs/                        مستندات (API، معماری، پلن تغییرات)
```

## شروع سریع روی سرور
راهنمای کامل: **[deploy/README.md](deploy/README.md)**

```bash
# سرور دارای sitectl (همان سروری که پینوم رویش است)
sudo sitectl create paramistech YOUR-DOMAIN https://github.com/armnre/paramistech.git main
sudo sitectl seed paramistech
sudo sitectl run paramistech npm run admin -- YOUR_USERNAME 'YOUR_STRONG_PASSWORD'
```

## اجرای لوکال (توسعه)
```bash
createdb paramistech && psql paramistech -f deploy/server/schema.sql
export DATABASE_URL=postgresql://localhost/paramistech SESSION_SECRET=$(openssl rand -hex 32) PORT=3000
bash deploy/native/build.sh "$PWD" /tmp/pt-release        # یا مراحل دستی زیر
cd /tmp/pt-release/api && npm run seed && npm run admin -- admin 'Admin12345' && npm start
# فرانت در حالت توسعه (پراکسی /api به پورت 3000):
cd /tmp/paramistech-build/web && npx vite --config deploy/web/vite.config.ts
```
