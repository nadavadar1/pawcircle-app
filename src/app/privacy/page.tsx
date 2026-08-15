import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מדיניות פרטיות | PawCircle",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-[var(--font-display)] text-2xl font-black text-pine">מדיניות פרטיות</h1>
      <p className="mt-1 text-xs text-ink/50">עודכן לאחרונה: אוגוסט 2026</p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-ink/80">
        <section>
          <h2 className="mb-1 text-base font-bold text-ink">1. איזה מידע אנחנו אוספים</h2>
          <ul className="list-disc space-y-1 pr-5">
            <li>פרטי הרשמה: כתובת אימייל (לצורך התחברות באמצעות קישור מאובטח).</li>
            <li>פרטי פרופיל: שם מלא, מספר טלפון, עיר, תמונת פרופיל.</li>
            <li>פרטי כלב (לבעלי כלבים): שם, גזע, גודל, הערות מיוחדות, תמונה.</li>
            <li>פרטי שירות (למטיילים): תיאור, מחיר, אזורי שירות, התמחויות, ותמונת/מסמך אימות זהות אם נבחר לעבור תהליך אימות.</li>
            <li>בקשות הליכה, ביקורות שנכתבו (כולל שם ושכונה), וכתובת אימייל שהושארה בטופס &quot;נודיע לכם&quot;.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-ink">2. איך אנחנו משתמשים במידע</h2>
          <p>
            המידע משמש להצגת פרופילים, התאמה בין בעלי כלבים למטיילים, אפשרות
            ליצירת קשר לאחר אישור בקשת הליכה, הצגת תגי אמון (כגון &quot;מאומת
            קהילתית&quot;), ושליחת עדכון כאשר מטייל/ת רלוונטי/ת מצטרף/ת לאזור
            שביקשתם. מספר הטלפון נחשף אך ורק לצד השני בבקשת הליכה שאושרה, ולא
            מוצג באופן פומבי באתר.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-ink">3. תמונות ומסמכי אימות</h2>
          <p>
            תמונות פרופיל וכלב מוצגות באתר לכלל המשתמשים. מסמך אימות זהות
            (אם הועלה לצורך תג &quot;זהות מאומתת&quot;) נשמר באחסון פרטי, נגיש
            רק לצוות PawCircle לצורך אישור ידני, ואינו מוצג לשום משתמש אחר.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-ink">4. שיתוף מידע עם צדדים שלישיים</h2>
          <p>
            אנחנו לא מוכרים מידע אישי לצדדים שלישיים. המידע מאוחסן אצל ספקי
            תשתית (Supabase, Vercel) לצורך הפעלת האתר בלבד. האתר משתמש בכלי
            אנליטיקס (GoatCounter) שאינו משתמש בעוגיות מעקב ואינו אוסף מידע
            מזהה אישית.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-ink">5. זכויותיכם</h2>
          <p>
            ניתן לעדכן או למחוק את פרטי הפרופיל בכל עת דרך עמוד &quot;הפרופיל
            שלי&quot;. לבקשת מחיקה מלאה של החשבון והמידע הנלווה אליו, ניתן לפנות
            לכתובת{" "}
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
