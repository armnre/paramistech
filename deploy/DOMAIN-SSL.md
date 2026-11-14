# دامنه و SSL — paramistech.ir

## وضعیت فعلی
دیپلوی روی سرور موفق است (سرویس active، health ok، seed و ادمین ساخته شده).
فقط SSL صادر نشد چون **DNS دامنه هنوز به سرور شما اشاره نمی‌کند**:

| رکورد | الان | باید باشد |
|---|---|---|
| paramistech.ir (A) | 185.142.159.116 (لیارا) | IP سرور شما |
| www (CNAME) | himalayas.liara.cloud | paramistech.ir یا A به IP سرور |

## مراحل
1. روی سرور IP را ببینید: `curl -4 https://api.ipify.org`
2. در پنل DNS (لیارا/ابرآروان/nic.ir هرجا که nameserver است):
   - رکورد A برای `@` → IP سرور، TTL = 300
   - رکورد www: حذف CNAME لیارا و ساخت A به همان IP (یا CNAME به paramistech.ir)
   - اگر از ابرآروان/کلودفلر استفاده می‌کنید، **پروکسی (ابر نارنجی) را خاموش** کنید تا SSL صادر شود.
   - اگر دامنه روی لیارا اپ دارد، آن را از تنظیمات دامنه‌ی اپ لیارا حذف کنید.
3. چند دقیقه صبر و بررسی: `dig +short paramistech.ir` باید IP سرور را برگرداند.
4. پورت‌ها: `sudo ufw allow 'Nginx Full'`
5. صدور گواهی: `sudo sitectl ssl paramistech`
6. بررسی نهایی: `sudo bash /srv/sites/paramistech/repo/deploy/scripts/postcheck.sh paramistech paramistech.ir`

## پس از راه‌اندازی
- سایت: https://paramistech.ir — پنل ادمین: https://paramistech.ir/admin (کاربر admin)
- **رمز ادمین را بلافاصله از پنل → تغییر رمز عوض کنید** (رمز در تاریخچه‌ی ترمینال مانده؛ `history -c`).
- آپدیت خودکار هر ۵ دقیقه فعال است؛ هر push روی main ظرف چند دقیقه live می‌شود و build خراب هیچ‌وقت live نمی‌شود.
- پشتیبان: `deploy/scripts/backup.sh` / بازگردانی: `deploy/scripts/restore.sh`
- لاگ: `journalctl -u site-paramistech -f`

پیام `could not change directory to "/home/paramisadmin"` بی‌خطر است (کاربر postgres به home شما دسترسی ندارد).
