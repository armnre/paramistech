// Imports the sample (placeholder) services, projects, FAQs and contact settings.
// Every row is marked is_placeholder = true, so production hides it until replaced.
// Local:      node scripts/seed-content.mjs
// Container:  docker compose exec app node scripts/seed-content.mjs
import pg from 'pg';

try {
  await import('dotenv/config');
} catch {
  // Containers receive their environment directly.
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const sample = 'این متن نمونه است و باید با اطلاعات تأییدشده جایگزین شود.';

const services = [
  ['enterprise-software', 'building', 'توسعه نرم‌افزار سازمانی', 'راهکارهای مقیاس‌پذیر برای بهینه‌سازی عملیات و افزایش بهره‌وری سازمان‌ها.'],
  ['mobile-apps', 'smartphone', 'توسعه اپلیکیشن موبایل', 'طراحی و توسعه اپلیکیشن‌های موبایل iOS و Android با بهترین تجربه کاربری.'],
  ['cloud-security', 'cloud', 'زیرساخت ابری و امنیت', 'مهاجرت به ابر، مقیاس‌پذیری و امنیت در سطح سازمانی.'],
  ['ai-data', 'brain', 'هوش مصنوعی و داده', 'بهره‌گیری از قدرت داده و AI برای ساخت راهکارهای هوشمند و تصمیم‌محور.'],
];

const projects = [
  ['smart-finance', 'فین‌تک', 'اپلیکیشن مالی هوشمند', 'نمونهٔ مفهومی مدیریت مالی شخصی و تحلیل هزینه‌ها و درآمدها.'],
  ['hospital-management', 'سلامت', 'سامانه مدیریت بیمارستان', 'نمونهٔ مفهومی مدیریت نوبت‌دهی، پرونده‌های پزشکی و خدمات درمانی.'],
  ['home-store', 'فروشگاهی', 'فروشگاه آنلاین لوازم خانگی', 'نمونهٔ مفهومی تجربه خرید سریع و امن همراه با پنل مدیریت.'],
];

const faqs = [
  ['برای شروع یک پروژه چه کاری باید انجام دهم؟', 'از طریق فرم درخواست پروژه با ما تماس بگیرید. پس از بررسی اطلاعات اولیه، برای گفت‌وگو و شناخت بهتر نیازها با شما هماهنگ می‌کنیم.'],
  ['زمان انجام پروژه چقدر است؟', 'زمان‌بندی به دامنه و پیچیدگی پروژه بستگی دارد. پس از مرحله کشف، برنامه اجرایی و زمان‌بندی شفاف ارائه می‌دهیم.'],
  ['آیا پس از تحویل محصول هم پشتیبانی می‌کنید؟', 'بله. برنامه پشتیبانی و نگهداری متناسب با نیاز محصول شما در نظر گرفته می‌شود.'],
  ['آیا می‌توانم پیش از شروع، درباره ایده‌ام مشورت کنم؟', 'بله. گفت‌وگوی اولیه فرصتی برای بررسی ایده، هدف‌ها و بهترین مسیر اجراست.'],
];

const sampleEn = 'This is sample text and must be replaced with approved content before launch.';

// English placeholders (NEEDS CLIENT REVIEW), keyed by Persian slug / position.
const servicesEn = {
  'enterprise-software': ['Enterprise software', 'Scalable solutions that streamline operations and lift productivity.'],
  'mobile-apps': ['Mobile applications', 'Design and build of iOS and Android apps with the best possible user experience.'],
  'cloud-security': ['Cloud & security', 'Cloud migration, scaling and enterprise-grade security.'],
  'ai-data': ['AI & data', 'Practical AI and data products that turn information into decisions.'],
};
const projectsEn = {
  'smart-finance': ['Fintech', 'Smart finance app', 'Concept example: personal finance management with smart analysis of spending and income.'],
  'hospital-management': ['Healthcare', 'Hospital management system', 'Concept example: appointment scheduling, medical records and care services in one platform.'],
  'home-store': ['E-commerce', 'Home appliances online store', 'Concept example: a fast, safe shopping experience with a powerful admin panel.'],
};
const faqsEn = [
  ['What do I need to do to start a project?', 'Send us a request through the project form. After reviewing the basics we will schedule a conversation to understand your needs better.'],
  ['How long does a project take?', 'It depends on scope and complexity. After the discovery phase we share a clear plan and schedule.'],
  ['Do you support the product after delivery?', 'Yes. We agree a support and maintenance plan that fits your product.'],
  ['Can I get advice on my idea before we start?', 'Yes. An initial conversation is a chance to review the idea, the goals and the best way forward.'],
];

const socials = [
  { label: 'لینکدین', href: 'https://linkedin.com' },
  { label: 'اینستاگرام', href: 'https://instagram.com' },
  { label: 'تلگرام', href: 'https://t.me' },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  for (const [index, [slug, icon, title, description]] of services.entries()) {
    const [titleEn, shortEn] = servicesEn[slug];
    await pool.query(
      `INSERT INTO services (slug, icon, title, short_description, body_md, title_en, short_description_en, body_md_en, published, sort_order, is_placeholder)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, true) ON CONFLICT (slug) DO NOTHING`,
      [slug, icon, title, description, sample, titleEn, shortEn, sampleEn, index],
    );
    // Back-fill English on sample rows created before English existed (never touches real content).
    await pool.query(
      `UPDATE services SET title_en = $2, short_description_en = $3, body_md_en = $4
       WHERE slug = $1 AND is_placeholder AND title_en IS NULL`,
      [slug, titleEn, shortEn, sampleEn],
    );
  }

  for (const [index, [slug, category, title, summary]] of projects.entries()) {
    const [categoryEn, titleEn, summaryEn] = projectsEn[slug];
    await pool.query(
      `INSERT INTO projects (slug, category, title, summary, year, challenge_md, solution_md, results_md,
         category_en, title_en, summary_en, challenge_md_en, solution_md_en, results_md_en, published, sort_order, is_placeholder)
       VALUES ($1, $2, $3, $4, 'نمونهٔ مفهومی', $5, $5, $6, $7, $8, $9, $10, $10, $11, true, $12, true) ON CONFLICT (slug) DO NOTHING`,
      [slug, category, title, summary, sample, 'نتایج واقعی فقط پس از تأیید مشتری منتشر می‌شوند.', categoryEn, titleEn, summaryEn, sampleEn, 'Real results are published only after the client approves them.', index],
    );
    await pool.query(
      `UPDATE projects SET category_en = $2, title_en = $3, summary_en = $4, challenge_md_en = $5, solution_md_en = $5, results_md_en = $6
       WHERE slug = $1 AND is_placeholder AND title_en IS NULL`,
      [slug, categoryEn, titleEn, summaryEn, sampleEn, 'Real results are published only after the client approves them.'],
    );
  }

  const existingFaqs = await pool.query('SELECT 1 FROM faqs LIMIT 1');
  if (existingFaqs.rowCount === 0) {
    for (const [index, [question, answer]] of faqs.entries()) {
      const [questionEn, answerEn] = faqsEn[index];
      await pool.query(
        `INSERT INTO faqs (question, answer, question_en, answer_en, published, sort_order, is_placeholder) VALUES ($1, $2, $3, $4, true, $5, true)`,
        [question, answer, questionEn, answerEn, index],
      );
    }
  }
  for (const [index, [question]] of faqs.entries()) {
    const [questionEn, answerEn] = faqsEn[index];
    await pool.query(
      `UPDATE faqs SET question_en = $2, answer_en = $3 WHERE question = $1 AND is_placeholder AND question_en IS NULL`,
      [question, questionEn, answerEn],
    );
  }

  await pool.query(
    `INSERT INTO settings (id, contact_email, contact_phone, contact_phone_href, contact_address, contact_address_en, socials, is_placeholder)
     VALUES (1, 'hello@paramistech.example', '+۹۸ ۲۱ ۰۰۰۰ ۰۰۰۰', '+982100000000', 'تهران، ایران', 'Tehran, Iran', $1::jsonb, true)
     ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(socials)],
  );
  await pool.query(
    `UPDATE settings SET contact_address_en = 'Tehran, Iran' WHERE id = 1 AND is_placeholder AND (contact_address_en IS NULL OR contact_address_en = '')`,
  );

  console.log('Placeholder content seed is ready.');
} finally {
  await pool.end();
}
