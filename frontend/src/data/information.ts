export const content: Record<
  string,
  {
    title: [string, string];
    intro: [string, string];
    sections: [string, string, string, string][];
  }
> = {
  about: {
    title: ['Prayer brings us together.', 'نماز ہمیں یکجا کرتی ہے۔'],
    intro: [
      'DiscoverSalah helps residents and travellers find mosque-specific congregation times through accountable local maintenance.',
      'DiscoverSalah مقامی لوگوں اور مسافروں کو مسجد کے مخصوص اوقات فراہم کرتا ہے۔',
    ],
    sections: [
      [
        'Made for local communities',
        'مقامی کمیونٹی کے لیے',
        'Public discovery is free. Each participating mosque needs a responsible maintainer and an independent reviewer.',
        'عوامی تلاش مفت ہے۔ ہر مسجد کے لیے ذمہ دار نمائندہ اور آزاد نگران ضروری ہے۔',
      ],
      [
        'Growing responsibly',
        'ذمہ دارانہ ترقی',
        'Coverage expands as willing mosques and reliable maintainers join. Search results describe participating coverage only.',
        'مساجد اور ذمہ دار افراد کے شامل ہونے سے دستیابی بڑھتی ہے۔',
      ],
    ],
  },
  'how-it-works': {
    title: ['A simple path to your next congregation', 'آپ کی اگلی جماعت تک آسان راستہ'],
    intro: [
      'Choose a location, compare mosque-specific Jama’at times, and check the entrance before leaving.',
      'مقام منتخب کریں، اوقات کا موازنہ کریں اور روانگی سے پہلے داخلی دروازہ دیکھیں۔',
    ],
    sections: [
      [
        '1. Choose where to search',
        '۱۔ تلاش کا مقام',
        'Use a confirmed origin or browse without location. Nearby and Whole City are separate search scopes.',
        'اپنا مقام دیں یا مقام کے بغیر اوقات دیکھیں۔',
      ],
      [
        '2. Understand the timing evidence',
        '۲۔ اوقات کی تصدیق سمجھیں',
        'Representatives submit changes. Focal Persons verify exact versions by calling the registered Imam.',
        'نمائندے تبدیلیاں بھیجتے ہیں اور فوکل پرسن امام سے فون پر تصدیق کرتا ہے۔',
      ],
      [
        '3. Check your journey',
        '۳۔ سفر دیکھیں',
        'Open Google Maps for walking or motorcycle directions. This app does not calculate travel time or guarantee arrival before Jama’at.',
        'پیدل یا موٹر سائیکل کا راستہ گوگل میپس میں کھولیں۔ یہ ایپ سفر کا وقت یا جماعت سے پہلے پہنچنے کی ضمانت نہیں دیتی۔',
      ],
    ],
  },
  help: {
    title: ['How can we help?', 'ہم کیسے مدد کر سکتے ہیں؟'],
    intro: [
      'Clear answers for finding a congregation and understanding your results.',
      'جماعت تلاش کرنے اور نتائج سمجھنے کے لیے واضح جوابات۔',
    ],
    sections: [
      [
        'Why is an arrival estimate unavailable?',
        'آمد کا اندازہ کیوں دستیاب نہیں؟',
        'This version opens directions externally in Google Maps and receives no travel-time estimate. Mosque timetables remain available.',
        'اس ورژن میں راستہ گوگل میپس میں کھلتا ہے اور سفر کا تخمینہ ایپ کو نہیں ملتا۔ مساجد کے اوقات دستیاب رہتے ہیں۔',
      ],
      [
        'Does Whole City include every mosque?',
        'کیا پورے شہر میں ہر مسجد شامل ہے؟',
        'No. It searches participating mosques in the selected city, without the nearby distance cap.',
        'نہیں، صرف شریک مساجد شامل ہیں۔',
      ],
      [
        'Can I change a public timetable?',
        'کیا میں اوقات تبدیل کر سکتا ہوں؟',
        'Visitors can report an issue. Only assigned management can submit official schedule proposals.',
        'زائرین مسئلہ رپورٹ کر سکتے ہیں۔ سرکاری تبدیلی مقررہ نمائندہ بھیجتا ہے۔',
      ],
      [
        'What if I decline location permission?',
        'اگر مقام کی اجازت نہ دوں؟',
        'Enter a location manually or browse timings without personal arrival estimates.',
        'مقام خود درج کریں یا آمد کے اندازوں کے بغیر اوقات دیکھیں۔',
      ],
    ],
  },
  'timing-status': {
    title: ['Know what a timing label means', 'اوقات کی حیثیت کا مطلب جانیں'],
    intro: [
      'Verification, reconfirmation and maintenance are different facts.',
      'تصدیق، دوبارہ تصدیق اور دیکھ بھال الگ چیزیں ہیں۔',
    ],
    sections: [
      [
        'Phone verification',
        'فون تصدیق',
        'An independent Focal Person records a call to the registered Imam for the exact schedule version and affected sessions.',
        'فوکل پرسن امام سے مخصوص ورژن اور جماعتوں کی تصدیق کرتا ہے۔',
      ],
      [
        'Representative reconfirmation',
        'نمائندے کی دوبارہ تصدیق',
        'The representative confirms specified timings are unchanged. This is not a new Imam phone verification.',
        'نمائندہ اوقات نہ بدلنے کی تصدیق کرتا ہے۔ یہ نئی فون تصدیق نہیں ہے۔',
      ],
      [
        'Under review, disputed or stale',
        'زیر تصدیق، متنازع یا پرانے',
        'Affected sessions do not receive positive arrival recommendations. Unchanged eligible sessions are considered separately.',
        'متاثرہ جماعتوں کے لیے مثبت آمد کے اندازے نہیں دیے جاتے۔',
      ],
    ],
  },
  privacy: {
    title: ['Privacy & location use', 'رازداری اور مقام کا استعمال'],
    intro: [
      'This is the interface’s policy summary. Final legal wording and operational implementation require review before launch.',
      'یہ پالیسی کا خلاصہ ہے۔ آغاز سے پہلے حتمی جائزہ ضروری ہے۔',
    ],
    sections: [
      [
        'Your location',
        'آپ کا مقام',
        'Nearby search sends your selected coordinates to this service transiently. Opening Google Maps shares only the mosque entrance in the link; Google handles your starting point separately.',
        'قریبی تلاش کے لیے منتخب مختصات عارضی طور پر اس سروس کو بھیجے جاتے ہیں۔ گوگل میپس کے لنک میں صرف مسجد کا داخلی مقام ہوتا ہے؛ آپ کا ابتدائی مقام گوگل الگ سنبھالتا ہے۔',
      ],
      [
        'Private contacts',
        'نجی رابطے',
        'Imam verification numbers and internal notes are restricted to authorized management. A public office contact requires separate permission.',
        'امام کے نجی نمبر اور نوٹس صرف مجاز انتظامیہ دیکھ سکتی ہے۔',
      ],
      [
        'Retention',
        'ڈیٹا کی مدت',
        'Contact details from rejected or withdrawn applications are redacted after 90 days. Production backup schedules and wider retention policies still require operational approval.',
        'مسترد یا واپس لی گئی درخواستوں کی نجی رابطہ معلومات ۹۰ دن بعد ہٹا دی جاتی ہیں۔ پیداواری بیک اپ اور دیگر ڈیٹا کی مدت کے لیے عملی منظوری باقی ہے۔',
      ],
      [
        'About this local service',
        'اس مقامی سروس کے بارے میں',
        'Records are stored in the connected database. Only language preferences are kept in browser storage. Clearing browser data does not delete submitted records.',
        'ریکارڈ منسلک ڈیٹابیس میں محفوظ ہیں۔ براؤزر میں صرف زبان کی ترجیح رکھی جاتی ہے۔ براؤزر کا ڈیٹا صاف کرنے سے جمع شدہ ریکارڈ حذف نہیں ہوتے۔',
      ],
    ],
  },
  terms: {
    title: ['Service expectations', 'سروس سے توقعات'],
    intro: [
      'DiscoverSalah provides information for planning. This summary is not finalized legal policy.',
      'DiscoverSalah منصوبہ بندی کے لیے معلومات فراہم کرتا ہے۔ یہ حتمی قانونی پالیسی نہیں۔',
    ],
    sections: [
      [
        'Estimated arrival is not a guarantee',
        'آمد کا اندازہ ضمانت نہیں',
        'Allow time for travel, parking, entry and Wudu. Do not speed or take unsafe routes to reach a congregation.',
        'سفر، پارکنگ اور وضو کے لیے وقت رکھیں۔ تیز یا غیر محفوظ سفر نہ کریں۔',
      ],
      [
        'Responsible use',
        'ذمہ دارانہ استعمال',
        'Submit accurate reports, respect private information, and do not impersonate mosque authorities or other contributors.',
        'درست معلومات دیں، رازداری کا احترام کریں اور کسی اور کی شناخت استعمال نہ کریں۔',
      ],
    ],
  },
  guidelines: {
    title: ['Contributor guidelines', 'رضاکاروں کے لیے رہنمائی'],
    intro: [
      'Maintain clear information, respect privacy, and keep verification independent.',
      'درست معلومات رکھیں، رازداری کا احترام کریں اور تصدیق آزاد رکھیں۔',
    ],
    sections: [
      [
        'Record what is confirmed',
        'تصدیق شدہ معلومات درج کریں',
        'Use actual Imam-confirmed congregation times. Do not infer religious scheduling rules or change timings through a notice.',
        'امام کے تصدیق شدہ جماعت کے اوقات استعمال کریں۔',
      ],
      [
        'Keep responsibility clear',
        'ذمہ داری واضح رکھیں',
        'Work within your assignment. Submit corrections as new versions, keep private notes private, and escalate urgent gaps.',
        'اپنی ذمہ داری کے اندر کام کریں، اصلاحات نئے ورژن میں بھیجیں اور نجی معلومات محفوظ رکھیں۔',
      ],
      [
        'No self-approval',
        'اپنی منظوری خود نہیں',
        'A different authorized reviewer must verify your submission, even if you hold another role.',
        'آپ کی درخواست ایک الگ مجاز نگران تصدیق کرے گا۔',
      ],
    ],
  },
  accessibility: {
    title: [
      'Accessible ways to use DiscoverSalah',
      'DiscoverSalah استعمال کرنے کے قابل رسائی طریقے',
    ],
    intro: [
      'Use the site with a keyboard, readable text, or a list instead of a map.',
      'کی بورڈ، واضح متن یا نقشے کی بجائے فہرست استعمال کریں۔',
    ],
    sections: [
      [
        'Keyboard and zoom',
        'کی بورڈ اور زوم',
        'Tab moves between controls; Enter activates links; Escape closes dialogs. Browser text zoom remains enabled.',
        'ٹیب سے کنٹرول بدلیں، انٹر سے لنک کھولیں، ایسکیپ سے ڈائیلاگ بند کریں۔',
      ],
      [
        'English and Urdu',
        'انگریزی اور اردو',
        'The language switch preserves your page and form inputs. Numbers and times retain their reading direction.',
        'زبان بدلنے سے صفحہ اور فارم کی معلومات محفوظ رہتی ہیں۔',
      ],
      [
        'Report an accessibility issue',
        'رسائی کا مسئلہ بتائیں',
        'Use the contact form to describe an obstacle. Accessibility certification has not yet been completed.',
        'رابطہ فارم میں مسئلہ بتائیں۔ مختلف آلات پر رسائی کی مکمل جانچ ابھی باقی ہے۔',
      ],
    ],
  },
};
