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
            'Representatives publish times and confirm them every 7 days. Focal persons follow up after 14 days without confirmation.',
            'نمائندے اوقات شائع اور ہر ۷ دن بعد تصدیق کرتے ہیں۔ ۱۴ دن تک تصدیق نہ ہو تو فوکل پرسن رابطہ کرتا ہے۔',
          )}
        </p>
      </div>
    </div>
  );
}
