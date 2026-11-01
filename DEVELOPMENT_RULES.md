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
  - The UI supports three primary themes:
    - **Dark (Default / Midnight)**: Navy blue `#0b0f19` canvas, `#121b2d` card surfaces, `#1e293b` borders.
    - **Zerodha Kite**: Pitch charcoal `#191919` canvas, `#1e1e1e` card surfaces, `#141414` sidebar/header, `#292929` hairline borders, `#ff5722` Kite orange active indicators, `#387ed1` CTA buttons.
    - **Light Mode**: Clean white `#ffffff` surfaces, `#f8fafc` canvas, `#e2e8f0` borders using `light:` modifiers.
  - Controlled by `ThemeContext.jsx` via CSS class `.theme-kite` and `.light` on `document.documentElement`.
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

## 3. Backend Development Standards (Laravel 13 / PHP 8.3+)

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

---

## 7. Automatic Documentation Maintenance

Documentation must remain synchronized with the actual application codebase as a mandatory part of every development task.

Whenever implementing, modifying, removing, or refactoring functionality:
1. **Identify Affected Files**: Determine which of the 10 core documentation files are impacted.
2. **Update Immediately After Implementation**: Never defer documentation updates or wait for user requests.
3. **Specific File Triggers**:
   - `PROJECT_CONTEXT.md`: System scope, target market, or operational environment changes.
   - `ARCHITECTURE.md`: Architecture patterns, context providers, services, or component hierarchy changes.
   - `DATABASE_SCHEMA.md`: Table, column, foreign key, or index additions/modifications.
   - `API_DOCUMENTATION.md`: New routes, parameter changes, response signatures, or status codes.
   - `FEATURES.md`: Application features added, updated, or enhanced.
   - `DEVELOPMENT_RULES.md`: Development rules, styling standards, or architectural guidelines.
   - `CHANGELOG.md`: Log every completed development task under Semantic Versioning.
   - `KNOWN_ISSUES.md`: Record new issues discovered, performance bottlenecks, or mark resolved issues.
   - `TODO.md`: Track completed roadmap items and log newly identified tasks.
4. **Final Task Report**:
   - Always report which documentation files were updated or explicitly state if none were affected.

---

## 8. Codebase Dependency Analysis with Graphify

TradeJournal uses Graphify (`graphifyy`) for codebase structure discovery, AST relationship mapping, and impact analysis without external LLM dependencies.

### Query Guidelines for Developers & AI Agents

- **Explore Relationships**:
  - `graphify query "<concept or question>"`: Performs breadth-first traversal from relevant entrypoints to discover related controllers, models, and UI components.
- **Find Dependency Paths**:
  - `graphify path "<SourceSymbol>" "<TargetSymbol>"`: Finds the shortest connection path between two classes, functions, or files.
- **Explain Module Interfaces**:
  - `graphify explain "<SymbolName>"`: Dumps the incoming and outgoing connections, methods, and source locations for a specific class or service.
- **Visual Exploration**:
  - Open `graphify-out/graph.html` in a web browser for interactive D3 graph visualization.
- **Synchronization**:
  - Run `export PATH="$HOME/.local/bin:$PATH" && graphify update .` to re-extract AST nodes whenever code changes occur.
  - Exclusions are maintained in `.graphifyignore` (`vendor/`, `node_modules/`, `build/`, `dist/`, `.env`).
