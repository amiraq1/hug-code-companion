# دليل المساهمة — Code Agent Studio

شكراً لاهتمامك بالمساهمة! هذا الدليل يشرح البنية المعمارية وكيفية المساهمة.

---

## 🏗️ البنية المعمارية

### نظرة عامة

التطبيق يتبع نمط **Component-Based Architecture** مع فصل واضح بين الطبقات:

```
┌─────────────────────────────────────────────┐
│                 Pages (Router)              │
│  Index.tsx — يدير التنقل بين الشاشات       │
├─────────────────────────────────────────────┤
│              Screens Layer                  │
│  LoginScreen │ ReposScreen │ SettingsScreen │
├─────────────────────────────────────────────┤
│            IDE Components Layer             │
│  CodeEditor │ FileExplorer │ GitPanel │ ... │
├─────────────────────────────────────────────┤
│              Hooks Layer                    │
│  useGitHub │ usePreview │ useMobile         │
├─────────────────────────────────────────────┤
│              Stores Layer                   │
│  editorStore — أنواع البيانات والثوابت      │
├─────────────────────────────────────────────┤
│           Backend (Edge Functions)          │
│  github-auth │ github-api                   │
└─────────────────────────────────────────────┘
```

### الطبقات بالتفصيل

#### 1. Pages (`src/pages/`)
- **`Index.tsx`** — نقطة الدخول الرئيسية. يدير حالة `AppScreen` للتنقل بين: `login` → `repos` → `editor` → `settings`
- يحتوي على جميع معالجات الأحداث المركزية (handlers)

#### 2. Screens (`src/components/screens/`)
- **`LoginScreen`** — مصادقة GitHub OAuth أو الدخول كضيف
- **`ReposScreen`** — عرض وتصفية المستودعات مع البحث
- **`SettingsScreen`** — إعدادات المحرر واتصال GitHub ومعلومات التطبيق

#### 3. IDE Components (`src/components/ide/`)

| المكون | المسؤولية |
|--------|----------|
| `CodeEditor` | غلاف Monaco Editor مع دعم الإعدادات الديناميكية |
| `FileExplorer` | شجرة ملفات تفاعلية مع توسيع/طي المجلدات |
| `TabBar` | شريط تبويبات الملفات المفتوحة |
| `AIChatPanel` | واجهة الدردشة مع AI مع عرض Markdown |
| `GitHubPanel` | تصفح ملفات المستودع من GitHub |
| `GitPanel` | حالة Git، الفروع، وسجل الالتزامات |
| `PreviewPanel` | معاينة مباشرة (HTML/CSS/JS/MD/JSON) |
| `CommitDialog` | نافذة حوار لكتابة رسالة الالتزام |
| `StatusBar` | شريط الحالة السفلي |

#### 4. Hooks (`src/hooks/`)
- **`useGitHub`** — Hook شامل لإدارة اتصال GitHub وجميع عمليات API
  - المصادقة: `connect`, `disconnect`, `checkStatus`
  - المستودعات: `listRepos`, `createRepo`
  - الملفات: `listContents`, `getFile`, `commitFile`
  - الفروع: `listBranches`, `createBranch`, `deleteBranch`
  - السجل: `listCommits`, `getStatus`

#### 5. Stores (`src/stores/`)
- **`editorStore`** — يحتوي على:
  - `FileNode` و `ChatMessage` — أنواع البيانات
  - `DEFAULT_FILES` — الملفات الافتراضية
  - `flattenFiles()` — تسطيح شجرة الملفات
  - `getFileIcon()` — تحديد أيقونة الملف

#### 6. Backend (`supabase/functions/`)
- **`github-auth/`** — مصادقة OAuth مع GitHub (authorize, callback, status, disconnect)
- **`github-api/`** — وسيط لجميع عمليات GitHub API (repos, files, branches, commits)

---

## 🔧 إعداد بيئة التطوير

```bash
# استنساخ المشروع
git clone <URL>
cd code-agent-studio

# تثبيت التبعيات
npm install

# تشغيل خادم التطوير
npm run dev

# تشغيل الاختبارات
npm test
```

## 📐 معايير الكود

### TypeScript
- استخدم أنواع صريحة للـ Props و Return Types
- تجنب `any` — استخدم `unknown` إذا لزم الأمر
- استخدم `interface` للكائنات و `type` للاتحادات

### React
- استخدم **Functional Components** فقط
- استخدم `useCallback` و `useMemo` للأداء
- المكونات الصغيرة المركزة أفضل من المكونات الكبيرة

### التنسيق (Styling)
- استخدم **Tailwind CSS** حصراً
- استخدم **Semantic Tokens** من `index.css` — لا تستخدم ألوان مباشرة
- أمثلة: `text-foreground`, `bg-background`, `text-primary`, `bg-card`

### الاختبارات
- ملفات الاختبار في `src/test/`
- التسمية: `ComponentName.test.tsx` أو `module.test.ts`
- استخدم `describe` / `it` / `expect`
- Mock الوحدات الخارجية (Monaco Editor, Supabase)

## 🔀 سير عمل المساهمة

1. **Fork** المستودع
2. أنشئ فرعاً جديداً: `git checkout -b feature/my-feature`
3. اكتب الكود والاختبارات
4. تأكد من نجاح جميع الاختبارات: `npm test`
5. أنشئ **Pull Request** مع وصف واضح

## 📁 إنشاء مكون جديد

```tsx
/**
 * MyComponent — وصف مختصر للمكون
 *
 * @param title - عنوان المكون
 * @param onAction - دالة تُستدعى عند التفاعل
 *
 * @example
 * <MyComponent title="Hello" onAction={() => console.log('clicked')} />
 */

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <button
        onClick={onAction}
        className="mt-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs"
      >
        Action
      </button>
    </div>
  );
}
```

## 🐛 الإبلاغ عن الأخطاء

عند الإبلاغ عن خطأ، يرجى تضمين:
1. وصف المشكلة
2. خطوات إعادة الإنتاج
3. السلوك المتوقع مقابل الفعلي
4. لقطات شاشة (إن أمكن)
5. معلومات المتصفح ونظام التشغيل
