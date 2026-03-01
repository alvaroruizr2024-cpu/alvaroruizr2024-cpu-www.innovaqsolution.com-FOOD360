import React from 'react';
import { Network, Server, ArrowRightLeft, Database, Webhook, CreditCard, MessageCircle, Mail } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export function Integracion() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const events = [
    { name: 'Stock Agotado', source: 'ERP FOOD360', dest: 'GoHighLevel', method: 'Webhook (Make)', payload: '{ "item": "Harina", "qty": 0 }' },
    { name: 'Pedido Pagado', source: 'Stripe', dest: 'ERP FOOD360', method: 'API REST', payload: '{ "order_id": "ORD-8892", "status": "paid" }' },
    { name: 'Producción Lista', source: 'ERP FOOD360', dest: 'WhatsApp API', method: 'Webhook (n8n)', payload: '{ "phone": "+34600...", "msg": "Tu pedido está listo" }' },
    { name: 'Factura Emitida', source: 'ERP FOOD360', dest: 'Email (GHL)', method: 'API REST', payload: '{ "invoice_pdf": "url...", "email": "cliente@..." }' },
    { name: 'Campaña Lanzada', source: 'GoHighLevel', dest: 'ERP FOOD360', method: 'Webhook (Make)', payload: '{ "campaign": "San Valentin", "expected_demand": 150 }' },
  ];

  const flowSteps = [
    { id: 1, name: 'Lead Capturado', desc: 'Formulario en Landing Page (GHL)', icon: Mail, color: 'text-blue-500' },
    { id: 2, name: 'Pago Procesado', desc: 'Checkout seguro con Stripe', icon: CreditCard, color: 'text-indigo-500' },
    { id: 3, name: 'Webhook a ERP', desc: 'Make/n8n transfiere datos', icon: Webhook, color: 'text-purple-500' },
    { id: 4, name: 'Orden Creada', desc: 'Reserva ingredientes, escandallo real', icon: Database, color: 'text-[#065f46]' },
    { id: 5, name: 'Producción', desc: 'Trazabilidad y control de lotes', icon: Server, color: 'text-yellow-500' },
    { id: 6, name: 'Factura Electrónica', desc: 'Generación Facturae / SII', icon: Network, color: 'text-orange-500' },
    { id: 7, name: 'Notificación', desc: 'WhatsApp automático al cliente', icon: MessageCircle, color: 'text-green-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t('integracion.title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('integracion.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg text-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-gray-700 dark:text-gray-300">APIs Conectadas</span>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-8 rounded-xl">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8">Flujo de Cierre de Venta End-to-End</h3>
        
        <div className="relative">
          <div className="absolute top-1/2 left-8 right-8 h-1 bg-gradient-to-r from-blue-500 via-[#065f46] to-green-500 -translate-y-1/2 z-0 opacity-30"></div>
          
          <div className="grid grid-cols-7 gap-4 relative z-10">
            {flowSteps.map((step, i) => (
              <div key={step.id} className="flex flex-col items-center text-center group">
                <div className={`w-14 h-14 rounded-full bg-white dark:bg-[#1a1a1a] border-2 border-gray-200 dark:border-[#333] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-current transition-all duration-300 ${step.color} shadow-sm dark:shadow-lg`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">{step.name}</h4>
                <p className="text-[10px] text-gray-500 leading-tight px-2">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#065f46]/10 dark:bg-[#065f46]/20 rounded-lg">
              <Network className="w-5 h-5 text-[#065f46]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mapa de Comunicación API</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-[#1a1a1a]/50">
                <tr>
                  <th className="px-4 py-2">Evento</th>
                  <th className="px-4 py-2">Origen → Destino</th>
                  <th className="px-4 py-2">Método</th>
                  <th className="px-4 py-2">Payload Clave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                {events.map((event, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{event.name}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <span>{event.source}</span>
                        <ArrowRightLeft className="w-3 h-3 text-[#065f46] dark:text-[#d4a017]" />
                        <span>{event.dest}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-blue-600 dark:text-blue-400 font-mono">{event.method}</td>
                    <td className="px-4 py-3 text-[10px] text-gray-500 font-mono bg-gray-50 dark:bg-[#0a0a0a] rounded p-1 my-1 block truncate max-w-[150px]">
                      {event.payload}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl flex flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#065f46]/5 dark:from-[#065f46]/10 via-transparent to-transparent pointer-events-none"></div>
          
          <div className="relative z-10 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-8 text-center">Arquitectura de Sistemas</h3>
            
            <div className="flex justify-between items-center mb-12">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-white dark:bg-[#1a1a1a] border border-blue-200 dark:border-blue-500/50 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.1)] dark:shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <span className="font-bold text-blue-600 dark:text-blue-500">GHL</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Marketing & CRM</span>
              </div>
              
              <div className="flex-1 flex items-center justify-center relative">
                <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-[#065f46]"></div>
                <div className="absolute bg-white dark:bg-[#111] px-2">
                  <div className="w-10 h-10 bg-white dark:bg-[#1a1a1a] border border-purple-200 dark:border-purple-500/50 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.1)] dark:shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <Webhook className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 bg-gradient-to-br from-[#065f46] to-[#047857] border border-[#065f46] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,95,70,0.2)] dark:shadow-[0_0_20px_rgba(6,95,70,0.4)]">
                  <span className="font-bold text-white text-lg">ERP</span>
                </div>
                <span className="text-xs text-[#065f46] font-bold">FOOD360 Core</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center px-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-white dark:bg-[#1a1a1a] border border-indigo-200 dark:border-indigo-500/50 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-500" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Stripe</span>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-white dark:bg-[#1a1a1a] border border-green-200 dark:border-green-500/50 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">WhatsApp</span>
              </div>
            </div>
            
            {/* Connecting lines for bottom row */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
              <path d="M 120 180 Q 200 180 200 120" fill="none" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 320 180 Q 250 180 250 120" fill="none" stroke="rgba(34, 197, 94, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
