import { LeadsList } from '../components/LeadsList';

// "service" (загальний контактний сервіс кавомашини, навіть без покупки у
// нас) свідомо не показуємо тут — ці заявки перенесено в "ТО" →
// "Заявки на сервіс", поряд з позаплановим ТО від наших клієнтів.
const TYPES = ['grant', 'trade_in', 'question', 'credit', 'turnkey', 'partnership', 'service_center'] as const;

export default function LeadsPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Заявки</h1>
        <p className="text-[#8893A2] mt-1">Гранти, Trade-IN та інші заявки з мобільного застосунку</p>
      </div>

      <LeadsList types={[...TYPES]} />
    </div>
  );
}
