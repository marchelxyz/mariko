import Layout from '@/components/Layout';
import Header from '@/components/Header';

export default function Franchise() {
  return (
    <Layout>
      <Header title="Франшиза" />
      <div className="px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-primary mb-4">О франшизе</h2>
          <p className="text-text-primary mb-4">
            Присоединяйтесь к нашей сети ресторанов и станьте частью успешного бизнеса.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Преимущества франшизы:</h3>
              <ul className="list-disc list-inside space-y-1 text-text-primary">
                <li>Проверенная бизнес-модель</li>
                <li>Поддержка на всех этапах</li>
                <li>Обучение персонала</li>
                <li>Маркетинговая поддержка</li>
              </ul>
            </div>
            <div className="mt-6">
              <p className="text-text-primary">
                Для получения подробной информации свяжитесь с нами через форму обратной связи.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
