import React from 'react';
import { initialIngredients, batches } from '../../data/mockData';
import { PackageSearch, TrendingUp, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export function Inventario() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  
  const textColor = theme === 'dark' ? '#9ca3af' : '#4b5563';
  const gridColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';

  const trendData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [
      {
        label: 'Demanda Histórica (kg)',
        data: [1200, 1500, 2200, 1800, 1900, 1600, 1400, 1100, 1500, 1800, 2500, 3200],
        borderColor: '#065f46',
        backgroundColor: 'rgba(6, 95, 70, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textColor } },
      y: { grid: { color: gridColor }, ticks: { color: textColor } }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t('inventario.title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('inventario.subtitle')}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#065f46] to-[#047857] text-white rounded-lg hover:shadow-[0_0_15px_rgba(6,95,70,0.5)] transition-all text-sm font-medium">
          <PackageSearch className="w-4 h-4" />
          {t('inventario.genOrder')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden">
            <div className="bg-gray-50 dark:bg-[#1a1a1a] px-6 py-4 border-b border-gray-200 dark:border-[#222]">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('inventario.ingStatus')}</h3>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-[#1a1a1a]/50">
                  <tr>
                    <th className="px-6 py-3">{t('common.ingredient')}</th>
                    <th className="px-6 py-3">{t('inventario.currentStock')}</th>
                    <th className="px-6 py-3">{t('inventario.reorderPt')}</th>
                    <th className="px-6 py-3">{t('inventario.demand7d')}</th>
                    <th className="px-6 py-3 text-center">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                  {initialIngredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-300">{ing.name}</td>
                      <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-400">{ing.stock} {ing.unit}</td>
                      <td className="px-6 py-4 font-mono text-gray-500">{ing.reorderPoint} {ing.unit}</td>
                      <td className="px-6 py-4 font-mono text-[#065f46] dark:text-[#d4a017]">{ing.demand7d} {ing.unit}</td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center justify-center w-24 px-2 py-1 rounded-full text-xs font-medium border ${
                          ing.status === 'ok' ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-500 border-green-200 dark:border-green-500/20' :
                          ing.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/20' :
                          'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 border-red-200 dark:border-red-500/20'
                        }`}>
                          {ing.status === 'ok' ? t('common.ok') : ing.status === 'warning' ? t('common.warning') : t('common.critical')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden">
            <div className="bg-gray-50 dark:bg-[#1a1a1a] px-6 py-4 border-b border-gray-200 dark:border-[#222] flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('inventario.lotControl')}</h3>
              <span className="text-xs text-gray-500 font-mono">First Expired, First Out</span>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-[#1a1a1a]/50">
                  <tr>
                    <th className="px-6 py-3">{t('inventario.lot')}</th>
                    <th className="px-6 py-3">{t('common.provider')}</th>
                    <th className="px-6 py-3">{t('inventario.expiry')}</th>
                    <th className="px-6 py-3 w-48">{t('inventario.shelfLife')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                  {batches.map((batch, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-800 dark:text-gray-300">{batch.id}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{batch.provider}</td>
                      <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-400">{batch.expiry}</td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-gray-200 dark:bg-[#222] rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              batch.progress > 90 ? 'bg-red-500' : 
                              batch.progress > 75 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${batch.progress}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#065f46]/10 dark:bg-[#065f46]/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-[#065f46]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('inventario.predEngine')}</h3>
            </div>
            
            <div className="h-[200px] mb-6">
              <Line data={trendData} options={chartOptions} />
            </div>

            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {t('inventario.upcomingEvents')}
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-[#333]">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Semana Santa</p>
                  <p className="text-xs text-gray-500">En 15 días</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#065f46] dark:text-[#d4a017]">x2.5 Demanda</p>
                  <p className="text-xs text-gray-500">Torrijas, Monas</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-[#333]">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Día de la Madre</p>
                  <p className="text-xs text-gray-500">En 45 días</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#065f46] dark:text-[#d4a017]">x1.8 Demanda</p>
                  <p className="text-xs text-gray-500">Tartas Personalizadas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('inventario.alerts')}</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-red-600 dark:text-red-500 font-medium text-sm">{t('inventario.autoBlock')}</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Lote LOT-2026-0215-HUEVO-002 caducado. Retirado de producción.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-yellow-700 dark:text-yellow-500 font-medium text-sm">{t('inventario.exp48h')}</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Lote LOT-2026-0410-NATA-005 requiere uso inmediato.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-blue-700 dark:text-blue-500 font-medium text-sm">{t('inventario.iotOk')}</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Cámaras frigoríficas operando a 3.2°C (Rango: 2-5°C).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
