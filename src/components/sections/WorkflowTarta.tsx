import React from 'react';
import { CakeSlice, MousePointerClick, CalendarCheck, FileText, CreditCard, ChefHat, Star, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export function WorkflowTarta() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const steps = [
    { id: 1, title: 'Captación', desc: 'Landing Page & Formulario GHL', icon: MousePointerClick, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/30' },
    { id: 2, title: 'Consulta Disp.', desc: 'Webhook Make a ERP', icon: CalendarCheck, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/30' },
    { id: 3, title: 'Presupuesto', desc: 'WhatsApp Automático', icon: FileText, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10', border: 'border-yellow-200 dark:border-yellow-500/30' },
    { id: 4, title: 'Pago', desc: 'Stripe Checkout', icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/30' },
    { id: 5, title: 'Producción', desc: 'Trazabilidad y Entrega', icon: ChefHat, color: 'text-[#065f46]', bg: 'bg-[#065f46]/10 dark:bg-[#065f46]/20', border: 'border-[#065f46]/30 dark:border-[#065f46]/50' },
    { id: 6, title: 'Post-Venta', desc: 'NPS, Reseña, Reactivación', icon: Star, color: 'text-[#d4a017]', bg: 'bg-[#d4a017]/10', border: 'border-[#d4a017]/30' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t('workflow.title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('workflow.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg text-sm">
          <CakeSlice className="w-4 h-4 text-[#d4a017]" />
          <span className="text-gray-700 dark:text-gray-300">Proceso Automatizado</span>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-8 rounded-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-[#d4a017]/5 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col gap-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-6 group">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${step.bg} ${step.border} group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(var(--tw-colors-${step.color.split('-')[1]}-500),0.3)] z-10 relative bg-white dark:bg-[#111]`}>
                <step.icon className={`w-7 h-7 ${step.color}`} />
                {index !== steps.length - 1 && (
                  <div className="absolute top-16 bottom-[-32px] w-0.5 bg-gradient-to-b from-current to-transparent opacity-30 -z-10"></div>
                )}
              </div>
              
              <div className="flex-1 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] p-5 rounded-xl group-hover:border-gray-300 dark:group-hover:border-[#555] transition-colors relative">
                <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-50 dark:bg-[#1a1a1a] border-l border-b border-gray-200 dark:border-[#333] rotate-45 group-hover:border-gray-300 dark:group-hover:border-[#555] transition-colors"></div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="text-gray-500 font-mono text-sm">Paso {step.id}</span>
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{step.desc}</p>
                  </div>
                  
                  {step.id === 1 && (
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-3 py-1 rounded text-xs font-mono text-blue-600 dark:text-blue-400">
                      Webhook Trigger
                    </div>
                  )}
                  {step.id === 3 && (
                    <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 px-3 py-1 rounded text-xs font-mono text-yellow-600 dark:text-yellow-400">
                      API WhatsApp
                    </div>
                  )}
                  {step.id === 5 && (
                    <div className="bg-[#065f46]/10 dark:bg-[#065f46]/20 border border-[#065f46]/30 dark:border-[#065f46]/50 px-3 py-1 rounded text-xs font-mono text-[#065f46] font-bold">
                      Core ERP
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#222] text-xs text-gray-500 flex gap-4">
                  {step.id === 1 && <span>Datos: Nombre, Fecha, Sabor, Raciones, Decoración</span>}
                  {step.id === 2 && <span>Lógica: Verifica capacidad de obrador y stock de ingredientes clave</span>}
                  {step.id === 3 && <span>Acción: Envío de PDF interactivo con opciones de upselling</span>}
                  {step.id === 4 && <span>Estado: Cambia a "Pagado" &rarr; Dispara Orden de Producción</span>}
                  {step.id === 5 && <span>Trazabilidad: Asignación de lotes FEFO y operario</span>}
                  {step.id === 6 && <span>Fidelización: Segmentación RFM actualizada</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
