# DEVELOPMENT RULES & CODING STANDARDS — TradeJournal

## 1. Core Guiding Principles

1. **Understand First**: Never modify code without inspecting the full implementation, dependencies, and side effects.
2. **Preserve Existing Functionality**: Existing screens, routes, and business logic must continue functioning after every change.
3. **Non-Destructive Changes**: Never drop tables, truncate records, or break API response signatures without explicit approval.
4. **Consistency**: Adhere to the established styling, naming conventions, and architecture.

---

## 2. Frontend Development Standards (React 19 + Tailwind v4)

- **Functional Components & Hooks**:
  - Always use modern functional components with React Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`).
  - Keep state localized to the smallest necessary scope.
- **Theme & Styling**:
  - The UI uses Tailwind CSS v4 tokens with a default dark theme (`#0b0f19` background, `#121b2d` card surfaces, `#1e293b` borders).
  - Always support Light Mode using `light:` modifiers (e.g. `bg-[#121b2d] light:bg-white border-[#1e293b] light:border-slate-200 text-white light:text-slate-900`).
  - Reuse established typography and color schemes:
    - **Profits / Bullish**: `text-emerald-400`, `bg-emerald-500/10`, `border-emerald-500/20`.
    - **Losses / Bearish**: `text-rose-400`, `bg-rose-500/10`, `border-rose-500/20`.
    - **Primary Brand / Action**: `bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30`.
- **Component Reusability**:
  - Reuse components in `components/common/` (`StatsCard`, `ErrorBoundary`) and `components/trades/` (`EditTradeModal`, `BulkImportModal`, `ExportModal`).
  - Do not create duplicate versions of modals or form cards.
- **Error & Loading States**:
  - Always handle `loading` spinner/skeleton, `empty` state with helpful prompt, and `error` banner or toast.
  - Wrap critical widgets in `ErrorBoundary` to prevent entire screen blanking.
- **Number & Currency Formatting**:
  - Always format monetary amounts using `formatINR()` from `utils/formatters.js` (e.g. `+₹24,500`).
  - Always format timestamps using `formatDate()` from `utils/formatters.js`.
  - Use `font-mono-numbers` for numerical tabular data to prevent jitter.

---

## 3. Backend Development Standards (Laravel 12 / PHP 8.3+)

- **Service Layer Pattern**:
  - Keep controllers thin. Business calculations must reside in services (`TradingCalculationService`, `TradingAnalyticsService`, `ExportService`).
- **Validation**:
  - Use Laravel Form Request classes (`backend/app/Http/Requests`) for incoming payload validation.
  - Sanitize strings, enforce numeric ranges, and validate array items.
- **Authentication & Authorization**:
  - All operational routes must be protected by Sanctum middleware (`auth:sanctum`).
  - Always scope queries to the authenticated user: `Trade::where('user_id', $request->user()->id)`.
  - Never allow a user to read, update, or delete another user's records.
- **Database Query Optimization**:
  - Prevent N+1 queries by eager loading relationships using `with(['journal', 'screenshots'])`.
  - Always paginate lists (`paginate($perPage)`) rather than loading unbounded collections with `all()`.
  - Use database transactions (`DB::beginTransaction()`, `DB::commit()`, `DB::rollBack()`) when saving across multiple related tables.
- **API Response Structure**:
  - Return standardized JSON responses:
    - Success: `{ "message": "Success message", "data": { ... } }`
    - Error: `{ "message": "Validation failed", "errors": { ... } }` with appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 422, 500).

---

## 4. Database Safety Rules

- **Schema Changes**:
  - Create new migration files in `backend/database/migrations` with standard naming (`YYYY_MM_DD_HHMMSS_action_name_table.php`).
  - Every migration must include a valid `down()` method for rollback capability.
  - Never run `migrate:fresh` or `migrate:reset` on any database containing user data.
- **Column Operations**:
  - Add new columns as `nullable()` or with a sensible `default()`.
  - Maintain backward compatibility for existing records.
- **Foreign Keys**:
  - Always specify foreign key constraints with `cascadeOnDelete()` where appropriate.
  - Add composite indexes on frequently filtered column combinations (`user_id`, `trade_date`, `index_name`).

---

## 5. Security Checklist

- **Secrets**: Never commit `.env`, passwords, private tokens, or access credentials.
- **Password Storage**: Passwords must always be hashed using `Hash::make()` with bcrypt.
- **Mass Assignment**: Maintain strict `$fillable` arrays on all Eloquent models. Never use `$guarded = []`.
- **File Uploads**:
  - Enforce mime-type checks (`mimes:jpg,jpeg,png,webp`).
  - Enforce file size limit (max 10MB).
  - Store files with randomized generated names using `$file->store('screenshots', 'public')`.

---

## 6. Change Management & Risk Assessment

Before making any change, assess the risk level:
- **LOW RISK**: Minor UI alignment, CSS styling, text labels, documentation. (Can implement directly).
- **MEDIUM RISK**: Adding new controller endpoints, creating reusable components, modifying calculations. (Plan and review first).
- **HIGH RISK**: Database schema migrations, authentication logic, modifying shared calculation engines, deleting records. (Requires detailed impact analysis and approval).
