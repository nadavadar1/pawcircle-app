import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "תנאי שימוש | PawCircle",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-[var(--font-display)] text-2xl font-black text-pine">תנאי שימוש</h1>
      <p className="mt-1 text-xs text-ink/50">עודכן לאחרונה: אוגוסט 2026</p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-ink/80">
        <section>
          <h2 className="mb-1 text-base font-bold text-ink">1. מה זה PawCircle</h2>
          <p>
            PawCircle היא פלטפורמה שמחברת בין בעלי כלבים למטיילי כלבים באזורם.
            השימוש באתר ובשירותיו כפוף לתנאים המפורטים כאן. עצם השימוש באתר
            מהווה הסכמה לתנאים אלו.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-ink">2. תפקיד הפלטפורמה</h2>
          <p>
            PawCircle משמשת כזירת היכרות בלבד בין בעלי כלבים למטיילים. ההסכמה על
            תנאי ההליכה, התשלום, המחיר וכל פרט אחר נעשית ישירות בין הצדדים, מחוץ
            לאתר. PawCircle אינה צד להסכם בין בעל הכלב למטייל/ת, ואינה אחראית
            לביצוע ההליכה, לאיכותה, לתשלום עבורה או לכל נזק שייגרם במהלכה.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-ink">3. אימות ותגי אמון</h2>
          <p>
            תגי &quot;מאומת קהילתית&quot; ו&quot;זהות מאומתת&quot; משקפים ביקורות
            ואימותים שבוצעו בהתאם לתהליך הפנימי של הפלטפורמה, ואינם מהווים
            ערבות לאמינות, כשירות או התנהגות המטייל/ת. מומלץ לבצע היכרות
            עצמאית לפני מסירת הכלב לידי מטייל/ת.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-ink">4. אחריות המשתמש</h2>
          <p>
            כל משתמש אחראי לנכונות הפרטים שהוא מוסר (לרבות פרטי הכלב, פרטי
            הקשר ופרטי השירות המוצע), ולהתנהלות בתום לב מול הצד השני. אין
            להשתמש בפלטפורמה למטרות שאינן חיבור בין בעלי כלבים למטיילים.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-ink">5. הסרת תוכן וחסימה</h2>
          <p>
            PawCircle רשאית להסיר תוכן, פרופיל או משתמש מהפלטפורמה, לרבות בעקבות
            דיווח על התנהגות בלתי הולמת, ללא הודעה מוקדמת ולפי שיקול דעתה
            הבלעדי.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-ink">6. יצירת קשר</h2>
          <p>
            שאלות בנוגע לתנאי השימוש ניתן לשלוח לכתובת{" "}
            <a href="mailto:nadavadar1@gmail.com" className="text-rust hover:underline">
              nadavadar1@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
