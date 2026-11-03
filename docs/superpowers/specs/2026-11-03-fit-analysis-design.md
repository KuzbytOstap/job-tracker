# Аналіз відповідності вакансії: дизайн і контракт для реалізації

- **Дата:** 2026-11-03
- **Проєкт:** 3 із 4 (профіль, лист під вакансію, аналіз відповідності, автозаповнення в розширенні)
- **Залежить від:** проєкти 1 і 2 (профіль, провайдер профільного AI, функція квоти за шаблоном COVER_LETTER)
- Позначки: **(Остап)** сказав сам, **(мій розсуд)** моє припущення, Остап може змінити.

## 1. Навіщо

Після відгуку трекер чесно показує, де вакансія не збігається з Остапом: зарплата, формат роботи, тип зайнятості, роки досвіду, технології. Червоним позначено лише справжні розбіжності. Мета: за секунду бачити відгуки, які були марними або ризикованими, і не підганяти відповідь під бажане (Остап: «чесний, без підігрування»).

## 2. Рішення Остапа

1. **Запуск (Остап):** автоматично після створення заявки (якщо є текст вакансії), плюс кнопка «Оновити» в картці заявки.
2. **Показ (Остап):** у картці заявки повний список критеріїв з вердиктами, а на картках дошки й списку маленький червоний індикатор із кількістю розбіжностей.
3. **Критерії (Остап):** зарплата, формат роботи, тип зайнятості, роки досвіду, технології (стек вакансії проти CV).

## 3. Цілі, не цілі, антицілі

**Цілі**
- Один виклик AI на заявку дає рівно п'ять оцінок (по одній на критерій) з коротким поясненням і цитатою, що саме сказано у вакансії й що є у вас.
- Результат зберігається в заявці, видно без нового запиту; список заявок отримує лише легку цифру.
- Автозапуск не заважає створенню заявки й не ламає редагування (див. п. 6, `updatedAt`).

**Не цілі**
- Рекомендація «подаватись чи ні», загальний бал, переписування листа чи CV.
- Автоматичне перерахування при зміні профілю чи тексту вакансії (лише кнопка).
- Критерії локації й мови, нові поля профілю («роки досвіду» оцінюються з тексту CV).
- Робота розширення, будь-який запис у профіль.

**Антицілі**
- Підігрування: модель називає розбіжність «незначною», бо «можна швидко вивчити». Якщо CV не підтверджує, це MISMATCH.
- Вигадані факти про Остапа, яких немає в профілі, CV й контексті.
- Червона позначка там, де вакансія нічого не каже: це UNKNOWN, не MISMATCH.
- Виконання інструкцій з тексту вакансії; витік CV, пошти, телефону, адреси в логи чи модель (у модель лише текст CV, пункти контексту, параметри пошуку, ім'я не потрібне).
- Фоновий аналіз підвищує `updatedAt` і викликає 409 у відкритій формі редагування.
- Кількість позначок рахується з сирого JSON у кожному запиті списку (важке поле в список не потрапляє).

## 4. Дані (мій розсуд щодо імен)

`JobApplication` отримує три необов'язкові поля:
- `fitAnalysis Json?` (збережений результат), `fitAnalyzedAt DateTime?`, `fitMismatchCount Int?` (null означає «не аналізувалось»).

Нова функція квоти (за зразком `COVER_LETTER`, лист не запитуваний, глухий кут як PROFILE і COVER_LETTER):
- `AiFeature.FIT_ANALYSIS`; `AiGlobalLimits.fitAnalysisGenerationLimit Int @default(30)`; `AiUserLimit.fitAnalysisGenerationLimit Int?`; `AiUsageDaily.fitAnalysisGenerationCount Int @default(0)`.
- Код помилки `"FIT_ANALYSIS_LIMIT_REACHED"` (HTTP 429), ключ у статусі використання `fitAnalysis`, поле адмінки `fitAnalysisGenerationLimit`, DTO користувача `fitAnalysis`.
- Нова міграція `prisma/migrations/20261103130000_add_fit_analysis/migration.sql`, лише dev, ніколи прод.

## 5. Контракт типів (дослівно, усі потоки)

```ts
export type FitCriterionValue = "SALARY" | "WORK_FORMAT" | "EMPLOYMENT_TYPE" | "EXPERIENCE_YEARS" | "TECHNOLOGIES";
export type FitVerdictValue = "MATCH" | "MISMATCH" | "UNKNOWN";
export type FitItemDTO = {
  criterion: FitCriterionValue;
  verdict: FitVerdictValue;
  vacancyValue: string | null;
  yourValue: string | null;
  reason: string;
};
export type FitAnalysisDTO = { items: FitItemDTO[]; analyzedAt: string };
export type FitAnalysisOutcomeDTO =
  | { status: "ok"; application: ApplicationDTO }
  | { status: "skipped"; reason: string };
```
- `ApplicationDTO` отримує `fitAnalysis?: FitAnalysisDTO | null` (необов'язкове, щоб не ламати фікстури).
- `ApplicationListItemDTO` отримує `fitMismatchCount?: number | null`.
- `AiUsageStatusResponse` і `AiUsageStatus` отримують `fitAnalysis: AiQuotaStatus`; `AdminQuotaAmounts` і `AdminUserOverrides` отримують `fitAnalysis`; `AiGlobalLimitsDTO` отримує `fitAnalysisGenerationLimit`.
- Порядок критеріїв завжди фіксований: SALARY, WORK_FORMAT, EMPLOYMENT_TYPE, EXPERIENCE_YEARS, TECHNOLOGIES. Рівно п'ять записів, кожен критерій один раз.
- Причини пропуску (`reason`): існуючі `ProfileAiSkipReason` плюс `"NO_VACANCY_TEXT"`. Заявки немає, чи вона чужа: HTTP 404, не skipped.

## 6. Поведінка

**Провайдер.** Нова операція `analyzeFit` у `ProfileAiProvider` (мок і OpenAI), модель Luna, `reasoning.effort` `"medium"` (константа `FIT_ANALYSIS_REASONING_EFFORT`), ліміт виходу 2500 токенів, `chargeFailedRuns: true`, структурований вихід. Вхід: текст вакансії (обрізається до 15000), текст основного CV (до 30000), пункти контексту (кожен до 1000), параметри пошуку з профілю (зарплата сума/валюта/період, типи зайнятості, формати роботи), компанія й посада. Усе в тегах як недовірені дані.

**Правила чесності в інструкції (дослівна суть):**
- Для кожного з п'яти критеріїв повернути вердикт, `vacancyValue` (що каже вакансія, коротко, або null), `yourValue` (що є у профілі чи CV, або null) і причину до 300 символів.
- MISMATCH, коли вакансія щось вимагає чи пропонує, а профіль/CV це не підтверджує або суперечить. Ніякого «можна вивчити».
- UNKNOWN, коли вакансія про критерій мовчить, або коли для порівняння немає даних Остапа (порожні параметри пошуку), причина це каже.
- MATCH лише з підтвердженням у даних.
- Зарплата: порівнювати лише коли валюти й періоди зіставні очевидно; інакше UNKNOWN із поясненням.
- Роки досвіду: вимога вакансії проти оцінки з CV (сума релевантного стажу), у причині назвати цифри.
- Технології: обов'язкові технології вакансії проти CV й контексту; побажання («плюс», «nice to have») не дають MISMATCH.
- Нічого не вигадувати, не звертатись ні до якої «користі» для користувача.

**Сервіс.** `lib/fit-analysis-service.ts`: `analyzeApplicationFit(userId, applicationId)`: заявка чужа чи відсутня → помилка «не знайдено»; немає `jobPostingText` → `skipped NO_VACANCY_TEXT`; немає тексту основного CV → `skipped NO_CV_TEXT`; потім `runProfileOperation` з `feature: AiFeature.FIT_ANALYSIS`. Результат валідується (рівно п'ять критеріїв), впорядковується, зберігається; `fitMismatchCount` рахується як число MISMATCH. **При збереженні `updatedAt` і `lastActivityAt` не змінюються** (мій розсуд: явно передати наявні значення, щоб фоновий аналіз не давав 409 у відкритій формі).

**API.** `POST /api/applications/[id]/fit-analysis` без тіла, повертає `FitAnalysisOutcomeDTO` зі статусом 200 (skipped теж 200), `Cache-Control: no-store`, 401/403/404/500 за наявним шаблоном. Нічого сенситивного в логах (лише назва помилки).

**Клієнт.** `analyzeApplicationFit(id): Promise<FitAnalysisOutcomeDTO>` у `lib/api.ts`; хук `useAnalyzeApplicationFit()` (мутація, змінна `string` з id заявки), після `status: "ok"` застосовує `application` до кешів через наявну синхронізацію (`applyApplicationToCaches`), завжди інвалідує `queryKeys.aiUsage()`.

**Автозапуск.** Після успішного створення заявки (форма створення) і якщо у створеної заявки є `jobPostingText`, клієнт тихо викликає `useAnalyzeApplicationFit` для її id. Помилки, пропуски, відсутність AI-доступу мовчки ігноруються, форма й тост створення не залежать від аналізу.

## 7. Інтерфейс (мій розсуд, Остап підтвердив місце)

- **Картка заявки:** секція «Відповідність вакансії». П'ять рядків: назва критерію, значок вердикту, `vacancyValue` проти `yourValue`, причина. MISMATCH червоний (іконка плюс слово, не лише колір), MATCH спокійний зелений, UNKNOWN нейтральний сірий. Заголовок із датою аналізу. Кнопка «Оновити» (вимкнена під час запуску, spinner `motion-reduce:animate-none`). Порожній стан «Ще не аналізувалось» з кнопкою «Проаналізувати», активна лише з текстом вакансії. Квота: `AiQuotaNotice` (без запиту додаткового ліміту), без AI-доступу блокування, як для листа (приховано для REJECTED). Причини пропуску людським текстом.
- **Дошка й список (десктоп, мобільні, консольна дошка, якщо там є картки заявок):** маленький червоний чип «N» з доступною назвою («N розбіжностей») при `fitMismatchCount > 0`; нічого, коли 0 чи null. Існуючі розміри й мобільна поведінка не ламаються, `ApplicationListItemDTO` отримує лише поле з п. 5.
- Переклади EN і UK, без тире, у новому просторі `fit`.

## 8. Розподіл на потоки (файли не перетинаються)

**Потік A, дані й квота.** Володіє: `prisma/schema.prisma`, нова міграція, `lib/ai/access-control.ts`, `lib/ai-quota.ts`, `lib/api-types.ts` (усі типи з п. 5, включно з Fit DTO), `app/api/ai-usage/route.ts`, `lib/admin/*`, `lib/admin-limits.ts`, адмінські маршрути й компоненти (`app/api/admin/*`, `components/admin/*`), `components/ai/ai-quota-notice.tsx`, `lib/i18n/api-errors.ts`, переклади квоти й адмінки (`ai.ts`, `errors.ts`, `admin.ts`, `profile.ts` ключ причини `profile.ai.reasons.fitAnalysisLimit`), `lib/profile/skip-reasons.ts`, реєстрація `fit` у `lib/i18n/messages/{en,uk}/index.ts` (імпорт `./fit`), та всі тести й фікстури цих файлів. Дзеркалить коміти 27749bc і 7bf25e2 проєкту 2 для нової функції `FIT_ANALYSIS`.

**Потік B, AI, сервіс, API, клієнт.** Володіє: `lib/ai/profile-provider.ts`, `lib/ai/providers/openai-profile-provider.ts`, `lib/ai/providers/mock-profile-provider.ts` і їх тести, `lib/fit-analysis.ts` (схеми, розбір збереженого JSON, порядок, підрахунок), `lib/fit-analysis-service.ts`, `lib/applications.ts` (мапери `ApplicationDTO.fitAnalysis` і `ApplicationListItemDTO.fitMismatchCount`, колонки вибірки списку), `app/api/applications/[id]/fit-analysis/route.ts`, `lib/api.ts` (одна функція), `hooks/use-analyze-application-fit.ts`, `lib/cache-updates.ts` і `lib/sync-application-caches.ts` лише за потреби перенести нове поле в список, їх тести. Мок: повертає передбачуваний набір із різними вердиктами (щоб UI можна було перевірити вручну), маркер `[mock:profile-error]` у вакансії кидає помилку.

**Потік C, інтерфейс.** Володіє: `components/applications/fit-analysis-section.tsx` і тест, інтеграція в `components/applications/application-detail-view.tsx`, чип на картках дошки/списку (`components/board/*` де відображаються заявки), автозапуск у `components/applications/application-create-form.tsx`, переклади `lib/i18n/messages/{en,uk}/fit.ts`, їх тести. Перед UI виконати ui-ux-pro-max один раз для фокусованого аудиту. Мова UI й кольори через існуючі токени Game Hub, shadcn примітиви, `motion/react` лише якщо потрібен рух.

## 9. Обмеження

npm, без нових залежностей, без коментарів у коді, мінімальні зміни, не чіпати непов'язане, не запускати тести/typecheck/lint/збірку/міграції, не комітити й не пушити. GitNexus індекс застарілий: blast radius через grep. Міграція лише dev. Профільні операції й квоти PROFILE і COVER_LETTER не змінюють поведінку. `AI_PROVIDER=mock` працює без квоти й без AI-доступу, як і раніше для профільних операцій.

## 10. Лишається виконавцям

Точні межі довжин, тексти інструкції (за суттю п. 6), форма збереженого JSON (має містити `items` у фіксованому порядку), розмітка й дизайн секції, місце чипа на кожній картці, тести.
