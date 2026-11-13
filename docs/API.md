# مرجع API

همهٔ درخواست‌ها: `POST /api/<endpoint>` با `Content-Type: application/json` و بدنهٔ `{"input": {...}}`.
پاسخ موفق: `{"data": ...}` — خطا: `{"error": {"message": "...", "code": "UNAUTHORIZED|FORBIDDEN|NOT_FOUND|BAD_REQUEST"}}` با کد HTTP متناظر.

| Endpoint | دسترسی | actionها / ورودی |
|---|---|---|
| `siteContent` | عمومی | `{}` → محتوای سایت (خدمات، نمونه‌کارها، نظرات، FAQ، آمار) + تنظیمات |
| `submitRequest` | عمومی | فرم درخواست پروژه: `fullName, phone, email?, company?, projectType, budget, timeline, details, estimatedCost?` |
| `adminAuth` | — | `status` · `setup` (ساخت اولین مدیر وقتی هیچ مدیری نیست) · `login {username,password}` → `token` · `me {token}` · `changePassword` |
| `adminCrud` | توکن ادمین + نقش | `{token, table, action: list|get|save|delete, id?, data?, filters?}` — جدول‌ها: customers, services, invoices, payments, bankAccounts, projectRequests, contentItems, siteSettings, notifications, admins, activityLog |
| `adminFinance` | توکن ادمین (مالی) | `dashboard` · `runBilling` · `issueForService {id}` · `createInvoice {invoice}` · `markPaid {id}` · `cancelInvoice {id}` · `reviewPayment {id, approve, note?}` |
| `portal` | توکن مشتری | `login {username,password}` → `token` · `me` · `submitPayment {invoiceId, trackingCode, receiptUrl, …}` · `markRead` · `changePassword` |
| `upload` | عمومی (محدودیت نرخ) | بدنهٔ خام فایل + هدر `x-filename` → `{url}` |
| `health` (GET) | عمومی | `{ok:true}` |

نقش‌ها: **مدیر کل** همه‌چیز · **مالی** مشتری/سرویس/فاکتور/پرداخت/حساب بانکی/اعلان/درخواست‌ها · **محتوا** محتوای سایت/تنظیمات/درخواست‌ها.
نشست‌ها: توکن امضاشده با HMAC-SHA256 (`SESSION_SECRET`)، رمزها PBKDF2-SHA256 با salt.
