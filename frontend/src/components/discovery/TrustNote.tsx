import { ShieldCheck } from 'lucide-react';
import { useApp } from '../../hooks/useApp';

export function TrustNote() {
  const { t } = useApp();
  return (
    <div className="trust-note">
      <ShieldCheck size={24} />
      <div>
        <strong>
          {t(
            'Local knowledge. Accountable verification.',
            'مقامی معلومات۔ ذمہ دارانہ تصدیق۔',
          )}
        </strong>
        <p>
          {t(
            'Representatives maintain schedules. Focal Persons verify changes with the registered Imam.',
            'نمائندے اوقات درج کرتے ہیں۔ فوکل پرسن امام سے تبدیلیوں کی تصدیق کرتے ہیں۔',
          )}
        </p>
      </div>
    </div>
  );
}
