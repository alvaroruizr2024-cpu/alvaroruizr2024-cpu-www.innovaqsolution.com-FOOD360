import React, { useState } from 'react';
import { GitMerge, ArrowRight, ShieldCheck, Truck, Factory, Package, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export function Trazabilidad() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [activePhase, setActivePhase] = useState(1);

  const phases = [
    { id: 1, name: t('trazabilidad.reception'), icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/30' },
    { id: 2, name: t('trazabilidad.storage'), icon: Package, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10', border: 'border-yellow-200 dark:border-yellow-500/30' },
    { id: 3, name: t('trazabilidad.production'), icon: Factory, color: 'text-[#065f46]', bg: 'bg-[#065f46]/10 dark:bg-[#065f46]/20', border: 'border-[#065f46]/30 dark:border-[#065f46]/50' },
    { id: 4, name: t('trazabilidad.dispatch'), icon: Truck, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-500/30' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t('trazabilidad.title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('trazabilidad.subtitle')}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] transition-colors text-sm text-gray-700 dark:text-gray-200">
          <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-500" />
          Certificado IFS Food
        </button>
      </div>

      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-8 rounded-xl">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8">{t('trazabilidad.flow')}</h3>
        
        <div className="flex justify-between items-center relative mb-12">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-[#222] -translate-y-1/2 z-0"></div>
          {phases.map((phase, i) => (
            <div key={phase.id} className="relative z-10 flex flex-col items-center gap-3">
              <button 
                onClick={() => setActivePhase(phase.id)}
                className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  activePhase === phase.id 
                    ? `${phase.bg} ${phase.border} scale-110 shadow-[0_0_20px_rgba(var(--tw-colors-${phase.color.split('-')[1]}-500),0.3)]` 
                    : 'bg-white dark:bg-[#1a1a1a] border-gray-300 dark:border-[#333] text-gray-400 dark:text-gray-500 hover:border-gray-400'
                }`}
              >
                <phase.icon className={`w-6 h-6 ${activePhase === phase.id ? phase.color : ''}`} />
              </button>
              <span className={`text-sm font-medium ${activePhase === phase.id ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                {phase.name}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-xl p-6 transition-all duration-300">
          {activePhase === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h4 className="text-lg font-bold text-blue-600 dark:text-blue-500 mb-4 flex items-center gap-2"><Truck className="w-5 h-5"/> Recepción de Materia Prima</h4>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase">Proveedor</label>
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">Lácteos Asturianos SL</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase">Lote Origen</label>
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-mono">LA-2026-0410-005</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase">Temperatura Recepción</label>
                  <p className="text-sm text-green-600 dark:text-green-500 font-mono font-bold">3.8°C (OK)</p>
                </div>
              </div>
            </div>
          )}
          {activePhase === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h4 className="text-lg font-bold text-yellow-600 dark:text-yellow-500 mb-4 flex items-center gap-2"><Package className="w-5 h-5"/> Almacenamiento FEFO</h4>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase">Lote Interno Asignado</label>
                  <p className="text-sm text-[#065f46] dark:text-[#d4a017] font-mono font-bold">LOT-2026-0410-NATA-005</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase">Ubicación</label>
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-mono">Cámara Frío 2 - Pasillo B</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase">Caducidad</label>
                  <p className="text-sm text-red-600 dark:text-red-500 font-mono font-bold">2026-04-25</p>
                </div>
              </div>
            </div>
          )}
          {activePhase === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h4 className="text-lg font-bold text-[#065f46] mb-4 flex items-center gap-2"><Factory className="w-5 h-5"/> Producción (Vinculación)</h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#111] p-4 rounded-lg border border-gray-200 dark:border-[#222]">
                  <label className="text-xs text-gray-500 uppercase mb-2 block">Lote Producto Terminado</label>
                  <p className="text-lg text-gray-900 dark:text-white font-mono font-bold">PT-TARTA-RV-20260415-01</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tarta Red Velvet Premium</p>
                </div>
                <div className="bg-white dark:bg-[#111] p-4 rounded-lg border border-gray-200 dark:border-[#222]">
                  <label className="text-xs text-gray-500 uppercase mb-2 block">Ingredientes Vinculados</label>
                  <ul className="space-y-1 text-sm font-mono text-gray-600 dark:text-gray-400">
                    <li><span className="text-[#065f46]">✓</span> LOT-2026-0315-HARINA-001</li>
                    <li><span className="text-[#065f46]">✓</span> LOT-2026-0410-NATA-005</li>
                    <li><span className="text-[#065f46]">✓</span> LOT-2026-0215-HUEVO-003</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          {activePhase === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h4 className="text-lg font-bold text-green-600 dark:text-green-500 mb-4 flex items-center gap-2"><Truck className="w-5 h-5"/> Expedición</h4>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase">Pedido Cliente</label>
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-mono">ORD-2026-8892</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase">Factura Vinculada</label>
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-mono">FAC-2026-1045</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase">Estado Entrega</label>
                  <p className="text-sm text-green-600 dark:text-green-500 font-bold">Entregado (Firma Digital)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#d4a017]/10 rounded-lg">
              <GitMerge className="w-5 h-5 text-[#d4a017]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('trazabilidad.reverse')}</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input 
                type="text" 
                defaultValue="PT-TARTA-RV-20260415-01" 
                className="flex-1 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2 text-sm font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#d4a017]"
              />
              <button className="px-4 py-2 bg-[#d4a017] text-white dark:text-black font-bold rounded-lg text-sm hover:bg-[#b8860b] transition-colors">
                Rastrear
              </button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-5 h-5 text-[#d4a017]" />
                <span className="font-mono text-gray-900 dark:text-white font-bold">PT-TARTA-RV-20260415-01</span>
              </div>
              <div className="pl-4 border-l-2 border-gray-300 dark:border-[#333] space-y-4 ml-2">
                <div className="relative">
                  <div className="absolute w-4 h-0.5 bg-gray-300 dark:bg-[#333] -left-4 top-3"></div>
                  <div className="pl-4">
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300">LOT-2026-0315-HARINA-001 <span className="text-xs text-gray-500">(Harinas de Castilla)</span></p>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute w-4 h-0.5 bg-gray-300 dark:bg-[#333] -left-4 top-3"></div>
                  <div className="pl-4">
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300">LOT-2026-0410-NATA-005 <span className="text-xs text-gray-500">(Lácteos Asturianos)</span></p>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute w-4 h-0.5 bg-gray-300 dark:bg-[#333] -left-4 top-3"></div>
                  <div className="pl-4">
                    <p className="text-sm font-mono text-red-600 dark:text-red-400">LOT-2026-0215-HUEVO-003 <span className="text-xs text-red-500/80 dark:text-red-500/50">(Alerta Sanitaria)</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('trazabilidad.qualityAlerts')}</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-[#1a1a1a]/50">
                <tr>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Lote Afectado</th>
                  <th className="px-4 py-2">Acción Automatizada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                <tr className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                  <td className="px-4 py-3"><span className="text-red-600 dark:text-red-500 font-medium">Alerta Sanitaria</span></td>
                  <td className="px-4 py-3 font-mono text-gray-800 dark:text-gray-300 text-xs">LOT-2026-0215-HUEVO-003</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">Bloqueo expedición. Notificación a 12 clientes.</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                  <td className="px-4 py-3"><span className="text-yellow-600 dark:text-yellow-500 font-medium">Temp. Fuera Rango</span></td>
                  <td className="px-4 py-3 font-mono text-gray-800 dark:text-gray-300 text-xs">Cámara 2 (IoT)</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">Aviso a mantenimiento. Revisión lotes Nata.</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                  <td className="px-4 py-3"><span className="text-blue-600 dark:text-blue-500 font-medium">Desviación Peso</span></td>
                  <td className="px-4 py-3 font-mono text-gray-800 dark:text-gray-300 text-xs">PT-TARTA-CH-0414</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">Recalibración báscula B3.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
