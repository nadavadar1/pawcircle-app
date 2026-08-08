/** Fixed lists used for both DB check constraints and every filter/select UI.
 * No geocoding in v1 — "proximity" and the trust badge's "same neighborhood"
 * logic are both simple exact-string matches against this list. */

export const CITIES = [
  // Tel Aviv neighborhoods
  "תל אביב - פלורנטין",
  "תל אביב - נווה צדק",
  "תל אביב - לב העיר",
  "תל אביב - צפון ישן",
  "תל אביב - צפון חדש",
  "תל אביב - יפו",
  "תל אביב - רמת אביב",
  "תל אביב - כרם התימנים",
  "תל אביב - שפירא",
  "תל אביב - נחלת יצחק",
  // Ramat Gan
  "רמת גן - מרכז",
  "רמת גן - צפון",
  "רמת גן - נאות אפקה",
  // Givatayim
  "גבעתיים",
  // Rest of Gush Dan
  "חולון",
  "בת ים",
  "הרצליה",
  "הרצליה פיתוח",
  "רמת השרון",
  "כפר סבא",
  "רעננה",
  "הוד השרון",
  "פתח תקווה",
  "ראשון לציון",
  "רחובות",
  "נס ציונה",
  "בני ברק",
  "קריית אונו",
  "אור יהודה",
  "יהוד-מונוסון",
  // Sharon (coast north of Tel Aviv)
  "נתניה",
  "חדרה",
  "זכרון יעקב",
  "בנימינה",
  "אור עקיבא",
  "פרדס חנה-כרכורים",
  // Shfela
  "יבנה",
  "גדרה",
  "לוד",
  "רמלה",
  "מודיעין",
  // Jerusalem area
  "ירושלים",
  "מבשרת ציון",
  "בית שמש",
  "מעלה אדומים",
  // Haifa area
  "חיפה",
  "קריית ים",
  "קריית מוצקין",
  "קריית ביאליק",
  "קריית אתא",
  "קריית טבעון",
  "טירת כרמל",
  "נשר",
  "עתלית",
  // Jezreel Valley
  "עפולה",
  "בית שאן",
  "מגדל העמק",
  // Galilee
  "נצרת",
  "נוף הגליל",
  "עכו",
  "נהריה",
  "כרמיאל",
  "כפר ורדים",
  "צפת",
  "טבריה",
  // Upper Galilee / Hermon area
  "קריית שמונה",
  "מטולה",
  "חצור הגלילית",
  "ראש פינה",
  // Golan Heights
  "מג'דל שמס",
  "קצרין",
  // South
  "אשדוד",
  "אשקלון",
  "קריית גת",
  "קריית מלאכי",
  "באר שבע",
  "דימונה",
  "ערד",
  "אופקים",
  "נתיבות",
  "שדרות",
  // Arava / Eilat
  "מצפה רמון",
  "אילת",
] as const;

export type City = (typeof CITIES)[number];

export const SPECIALTIES = [
  "אילוף גורים",
  "כלבים עם חרדה/פחדים",
  "כלבים אנרגטיים",
  "כלבים מבוגרים",
  "ריצה/פעילות גופנית",
  "כמה כלבים בו זמנית",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const DOG_SIZES = ["קטן", "בינוני", "גדול"] as const;

export type DogSize = (typeof DOG_SIZES)[number];
