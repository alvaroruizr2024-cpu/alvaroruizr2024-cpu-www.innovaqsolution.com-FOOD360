import React from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { TrendingUp, AlertTriangle, CheckCircle, Percent, Zap, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function Dashboard() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  
  const textColor = theme === 'dark' ? '#9ca3af' : '#4b5563';
  const gridColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';

  const kpis = [
    { title: t('dashboard.margin'), value: '68.4%', target: '>65%', icon: Percent, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: t('dashboard.waste'), value: '2.1%', target: '<3%', icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { title: t('dashboard.autoOrders'), value: '84%', target: 'Obj: 90%', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: t('dashboard.eInvoice'), value: '100%', target: 'Obligatorio', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: t('dashboard.ltv'), value: '€420', target: '+15% a/a', icon: TrendingUp, color: 'text-[#d4a017]', bg: 'bg-[#d4a017]/10' },
  ];

  const marginData = {
    labels: ['Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar'],
    datasets: [
      {
        label: t('dashboard.margin') + ' (%)',
        data: [62, 64, 69, 65, 67, 68.4],
        borderColor: '#065f46',
        backgroundColor: 'rgba(6, 95, 70, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const wasteData = {
    labels: ['Caducidad MP', 'Error Producción', 'Devoluciones', 'Roturas'],
    datasets: [
      {
        data: [45, 30, 15, 10],
        backgroundColor: ['#d4a017', '#065f46', '#ef4444', '#3b82f6'],
        borderWidth: 0,
      }
    ]
  };

  const salesData = {
    labels: ['San Valentín', 'Semana Santa', 'Día Madre', 'Halloween', 'Navidad'],
    datasets: [
      {
        label: 'Ventas 2025 (€)',
        data: [15000, 22000, 18000, 12000, 45000],
        backgroundColor: '#065f46',
        borderRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: textColor } }
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textColor } },
      y: { grid: { color: gridColor }, ticks: { color: textColor } }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { color: textColor } }
    },
    cutout: '70%'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t('dashboard.title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] transition-colors text-sm text-gray-700 dark:text-gray-200">
          <RefreshCw className="w-4 h-4" />
          {t('common.updateData')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-5 rounded-xl hover:border-[#065f46]/50 transition-colors group">
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-500 bg-gray-100 dark:bg-[#1a1a1a] px-2 py-1 rounded-full">{kpi.target}</span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-[#065f46] dark:group-hover:text-[#d4a017] transition-colors">{kpi.value}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{kpi.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl h-[350px]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.marginEvol')}</h3>
          <div className="h-[260px]">
            <Line data={marginData} options={chartOptions} />
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl h-[350px]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.salesSeason')}</h3>
          <div className="h-[260px]">
            <Bar data={salesData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl h-[350px]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.wasteDist')}</h3>
          <div className="h-[260px]">
            <Doughnut data={wasteData} options={doughnutOptions} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl h-[350px] flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.topProducts')}</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {[
              { name: 'Tarta Nupcial 3 Pisos', margin: '78%', trend: '+2.4%' },
              { name: 'Macarons Surtidos (Caja 12)', margin: '75%', trend: '+1.1%' },
              { name: 'Tarta Red Velvet', margin: '72%', trend: '-0.5%' },
              { name: 'Tronco de Navidad Premium', margin: '70%', trend: '+5.0%' },
              { name: 'Torrijas Brioche (Bandeja)', margin: '68%', trend: '+8.2%' },
            ].map((prod, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-[#222]">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 dark:text-gray-500 font-mono text-sm">0{i+1}</span>
                  <span className="text-gray-700 dark:text-gray-200 font-medium">{prod.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[#065f46] dark:text-[#d4a017] font-bold">{prod.margin}</span>
                  <span className={prod.trend.startsWith('+') ? 'text-green-600 dark:text-green-500 text-sm' : 'text-red-600 dark:text-red-500 text-sm'}>
                    {prod.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.activeAlerts')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-600 dark:text-red-500 font-medium text-sm">{t('dashboard.criticalStock')}</h4>
              <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Nata 35% MG por debajo del punto de reorden (Quedan 25L).</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-yellow-700 dark:text-yellow-500 font-medium text-sm">{t('dashboard.expiringSoon')}</h4>
              <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Lote LOT-2026-0410-NATA-005 caduca en 48h.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-green-700 dark:text-green-500 font-medium text-sm">{t('dashboard.activeCampaign')}</h4>
              <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Funnel Semana Santa operando con 4.2% conversión.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
