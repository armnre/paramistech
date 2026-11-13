# راهنمای کامل دپلوی پارامیس‌تک روی Ubuntu

دو روش دارید؛ **روش ۱ پیشنهادی است** چون سرور شما (paramisserver) از قبل با `sitectl` (کیت مخزن pinum-ambulance) آماده شده و سایت‌ها کاملاً جدا از هم اجرا می‌شوند.

---

## معماری
```
اینترنت ─► nginx (80/443 + SSL)
             ├─ YOUR-DOMAIN  /           ─► /srv/sites/paramistech/current/web   (فایل‌های استاتیک React)
             │                /api, /uploads ─► 127.0.0.1:<port>  (Node — systemd: site-paramistech)
PostgreSQL (فقط localhost) ─ دیتابیس و کاربر اختصاصی paramistech
```
- **API:** هر فایل `apps/paramistech/src/api/<name>.ts` = `POST /api/<name>` با بدنهٔ `{"input": {...}}` → پاسخ `{"data": ...}` یا `{"error": {"message","code"}}`.
- **آپلود:** `POST /api/upload` (رسیدها و تصاویر) → در `UPLOAD_DIR` ذخیره و از `/uploads/...` سرو می‌شود.
- **سلامت:** `GET /api/health`.
- **صدور خودکار فاکتور:** خود سرویس هر ساعت چرخه را بررسی می‌کند (حداکثر هر ۶ ساعت اجرا): ۳ روز قبل از سررسید فاکتور صادر و اعلان داده می‌شود، فاکتورهای عقب‌افتاده «معوق» می‌شوند. اجرای دستی: `npm run billing`.

---

## روش ۱ — با sitectl (سرور فعلی)

> اگر `sitectl` روی سرور نیست، اول کیت را نصب کنید:
> `cd ~ && git clone https://github.com/armnre/pinum-ambulance.git && sudo bash pinum-ambulance/deploy/server-kit/bootstrap.sh`

```bash
# ۱) DNS: رکورد A دامنه (و www) را به آی‌پی سرور (87.107.40.130) بدهید.

# ۲) ساخت سایت (کاربر لینوکس، پورت، دیتابیس UTF8، nginx، بیلد، SSL)
sudo sitectl create paramistech YOUR-DOMAIN https://github.com/armnre/paramistech.git main

# ۳-الف) محتوای سایت (خدمات، نمونه‌کارها، نظرات، FAQ، آمار، تنظیمات) — داخل همین مخزن
sudo sitectl seed paramistech

# ۳-ب) داده‌های تجاری (مشتریان، سرویس‌ها، فاکتورها، پرداخت‌ها، حساب‌های بانکی، مدیران، درخواست‌ها)
#      به دلیل امنیت در مخزن «خصوصی» armnre/paramistech-private-data است (نه در مخزن عمومی).
#      گیت‌هاب نام کاربری + Personal Access Token می‌خواهد (Settings → Developer settings → Tokens):
cd /tmp && git clone https://github.com/armnre/paramistech-private-data.git
sudo cp /tmp/paramistech-private-data/private-data.json /srv/sites/paramistech/shared/
sudo chown site-paramistech: /srv/sites/paramistech/shared/private-data.json
sudo sitectl run paramistech npm run seed -- --file /srv/sites/paramistech/shared/private-data.json
sudo rm -rf /tmp/paramistech-private-data /srv/sites/paramistech/shared/private-data.json

# ۴) ساخت/ریست حساب مدیر کل با نام کاربری و رمز دلخواه شما (رمز حداقل ۸ کاراکتر)
sudo sitectl run paramistech npm run admin -- YOUR_USERNAME 'YOUR_STRONG_PASSWORD'
#    نقش‌های دیگر:  ... npm run admin -- ali 'Pass12345' مالی "علی رضایی"

# ۵) آپدیت خودکار با هر push (اختیاری)
sudo sitectl autoupdate paramistech on

# ۶) بررسی
sudo sitectl status paramistech
curl -s https://YOUR-DOMAIN/api/health
```

**آپدیت دستی بعد از push:** `sudo sitectl deploy paramistech`  
**لاگ:** `sudo journalctl -u site-paramistech -f`

---

## روش ۲ — نصب مستقل (سرور تازه بدون sitectl)
```bash
cd ~ && git clone https://github.com/armnre/paramistech.git && cd paramistech
sudo bash deploy/install.sh YOUR-DOMAIN YOUR_USERNAME 'YOUR_STRONG_PASSWORD'
# داده‌های تجاری (مخزن خصوصی، مثل بالا):
git clone https://github.com/armnre/paramistech-private-data.git /tmp/pd && sudo cp /tmp/pd/private-data.json /srv/paramistech/shared/ && sudo chown paramistech: /srv/paramistech/shared/private-data.json
cd /srv/paramistech/current/api && sudo -u paramistech env $(sudo cat /etc/paramistech.env | xargs) npm run seed -- --file /srv/paramistech/shared/private-data.json
sudo certbot --nginx -d YOUR-DOMAIN -d www.YOUR-DOMAIN --redirect -m you@mail.com --agree-tos -n
```
همین اسکریپت برای آپدیت هم هست: `git pull && sudo bash deploy/install.sh YOUR-DOMAIN`  
(هر بار یک نسخهٔ جدید در `/srv/paramistech/releases` ساخته و اتمیک جایگزین می‌شود؛ ۵ نسخهٔ آخر نگه داشته می‌شود.)

| کار | دستور |
|---|---|
| وضعیت/ری‌استارت | `sudo systemctl status paramistech` / `sudo systemctl restart paramistech` |
| لاگ زنده | `sudo journalctl -u paramistech -f` |
| ساخت/ریست مدیر | `cd /srv/paramistech/current/api && sudo -u paramistech env $(sudo cat /etc/paramistech.env \| xargs) npm run admin -- user 'pass'` |
| بک‌آپ دستی | `sudo /usr/local/bin/paramistech-backup` (خودکار هر شب ۳:۴۰، نگهداری ۱۴ روز در `/var/backups/paramistech`) |
| بازیابی | `sudo bash deploy/scripts/restore.sh /var/backups/paramistech/db-….dump [uploads-….tar.gz]` |
| بازگشت به نسخهٔ قبل | `sudo ln -sfn /srv/paramistech/releases/<قبلی> /srv/paramistech/current && sudo systemctl restart paramistech` |

---

## متغیرهای محیطی
| نام | توضیح |
|---|---|
| `DATABASE_URL` | اتصال PostgreSQL |
| `SESSION_SECRET` | کلید امضای نشست ادمین و مشتری (≥۳۲ کاراکتر). **تغییرش همه را از حساب خارج می‌کند.** |
| `PORT` / `HOST` | پورت API (پیش‌فرض روی 127.0.0.1) |
| `UPLOAD_DIR` | محل ذخیرهٔ فایل‌های آپلودی (باید در بک‌آپ باشد) |
| `SITE_DOMAIN` | دامنه |
| `NPM_REGISTRY` | اگر npmjs روی سرور کند/مسدود بود: `https://registry.npmmirror.com` |

در sitectl متغیر اضافه: `sudo sitectl env paramistech`.

---

## نکات مهم
- **رمزهای قبلی:** هش رمزها همان الگوریتم قبلی است؛ مدیران و مشتریانی که در سایت قبلی رمز داشتند با همان رمز وارد می‌شوند. فقط اگر `SESSION_SECRET` تازه باشد، نشست‌های باز قبلی باطل می‌شوند (طبیعی است).
- **فایل‌های قبلی** (رسیدها/تصاویر آپلودشده در سایت قبلی) با آدرس اصلی‌شان لینک شده‌اند و نمایش داده می‌شوند؛ فایل‌های جدید روی خود سرور ذخیره می‌شوند.
- **دیتابیس باید UTF8 باشد** (sitectl و install.sh همین را می‌سازند).
- اجرای مجدد `seed` امن است (ردیف‌های موجود دست نمی‌خورند). برای بازنویسی کامل با داده‌های فایل: `npm run seed -- --overwrite`.

## عیب‌یابی
| مشکل | راه‌حل |
|---|---|
| `502 Bad Gateway` | سرویس بالا نیست: `journalctl -u site-paramistech -n 100` (یا `-u paramistech`) |
| `SESSION_SECRET must be at least 32 characters` | متغیر را تنظیم کنید و ری‌استارت |
| `npm install` گیر می‌کند | `NPM_REGISTRY=https://registry.npmmirror.com` |
| آپلود «فایل خیلی بزرگ» | `client_max_body_size` در nginx و `UPLOAD_MAX` |
| ورود ادمین کار نمی‌کند | `npm run admin -- <user> '<pass>'` رمز را ریست و حساب را فعال می‌کند |
