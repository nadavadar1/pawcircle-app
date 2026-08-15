import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "בטיחות ואמון | PawCircle",
  description: "איך PawCircle בונה אמון אמיתי בין בעלי כלבים למטיילים — אימות קהילתי, ביקורות עם שם אמיתי, וטיפים להיכרות בטוחה.",
};

export default function SafetyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 rounded-lg bg-pine px-6 py-8 text-center text-paper-hi">
        <p className="font-[var(--font-mono)] text-xs tracking-wide text-brass-hi" dir="ltr">
          PAWCIRCLE
        </p>
        <h1 className="mt-2 font-[var(--font-display)] text-2xl font-black sm:text-3xl">
          בטיחות ואמון. <span className="text-brass-hi">לא רק סיסמה.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-paper-hi/80">
          כל כלב שיוצא להליכה הוא חבר במשפחה. ככה אנחנו דואגים שההיכרות תהיה עם מישהו אמיתי, לא עם פרופיל אנונימי.
        </p>
      </div>

      <div className="flex flex-col gap-5 text-sm leading-relaxed text-ink/80">
        <section className="rounded border border-line bg-paper-hi p-4">
          <h2 className="mb-1 text-base font-bold text-pine">✓ שם מלא, לא כינוי</h2>
          <p>
            כל מטייל/ת ב-PawCircle נרשמ/ת עם שם מלא ומספר טלפון אמיתיים. אין פרופילים אנונימיים ואין כינויים —
            אתם תמיד יודעים עם מי אתם מדברים.
          </p>
        </section>

        <section className="rounded border border-line bg-paper-hi p-4">
          <h2 className="mb-1 text-base font-bold text-pine">✓ מאומת/ת קהילתית</h2>
          <p>
            מטייל/ת מקבל/ת את התג &quot;מאומת קהילתית&quot; רק אחרי 3 ביקורות מ-3 בעלי כלבים שונים באותה שכונה —
            לא כוכביות שאפשר לקנות, אלא עדות אמיתית משכנים אמיתיים.
          </p>
        </section>

        <section className="rounded border border-line bg-paper-hi p-4">
          <h2 className="mb-1 text-base font-bold text-pine">✓ ביקורות עם שם אמיתי</h2>
          <p>
            כל ביקורת ב-PawCircle חתומה בשם מלא ושכונה. אנחנו לא מוחקים ביקורות שליליות אמיתיות, ולא מייצרים
            ביקורות מזויפות — זה כל הרעיון.
          </p>
        </section>

        <section className="rounded border border-line bg-paper-hi p-4">
          <h2 className="mb-1 text-base font-bold text-pine">✓ פרטי קשר נחשפים רק אחרי אישור</h2>
          <p>
            מספר הטלפון של הצד השני לא מוצג באתר. הוא נחשף רק אחרי ששני הצדדים אישרו את בקשת ההליכה — לא לפני.
          </p>
        </section>

        <section className="rounded border border-line bg-paper-hi p-4">
          <h2 className="mb-1 text-base font-bold text-pine">✓ אפשר לדווח</h2>
          <p>
            אם משהו לא מרגיש בסדר — התנהגות לא הולמת, אי הגעה, כל דבר — אפשר לדווח ישירות דרך הפרופיל או בקשת
            ההליכה, ואנחנו בודקים כל דיווח באופן אישי.
          </p>
        </section>

        <section className="rounded-lg border border-brass/40 bg-brass/10 p-4">
          <h2 className="mb-2 text-base font-bold text-pine">טיפים להיכרות ראשונה בטוחה</h2>
          <ul className="list-disc space-y-1 pr-5 text-ink/80">
            <li>קבעו פגישת היכרות קצרה לפני ההליכה הראשונה, במקום ציבורי אם אפשר.</li>
            <li>ספרו למטייל/ת על הרגלים, רגישויות או פחדים מיוחדים של הכלב.</li>
            <li>ודאו שהקולר, הרצועה ופרטי הקשר שלכם מעודכנים ותקינים.</li>
            <li>אחרי ההליכה הראשונה — כתבו ביקורת אמיתית. זה מה שעוזר לבעלים הבאים לבחור נכון.</li>
          </ul>
        </section>
      </div>

      <p className="mt-8 text-center text-sm text-ink/60">
        יש חשש או שאלה?{" "}
        <a href="mailto:nadavadar1@gmail.com" className="text-rust underline">
          כתבו לנו
        </a>{" "}
        או קראו את{" "}
        <Link href="/privacy" className="text-rust underline">
          מדיניות הפרטיות
        </Link>
        .
      </p>
    </main>
  );
}
