import React from 'react';
import { Megaphone, Calendar, MessageCircle, Users, ArrowRight, Filter, Target } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export function EcosistemaGHL() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const funnels = [
    { name: 'San Valentín', dates: '15 Ene - 10 Feb', product: 'Tarta Corazón Red Velvet', conversion: '4.2%', status: 'Completado', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
    { name: 'Semana Santa', dates: '1 Mar - Lunes Santo', product: 'Monas + Torrijas Premium', conversion: '5.8%', status: 'Activo', color: 'text-[#065f46] dark:text-[#d4a017]', bg: 'bg-[#065f46]/10 dark:bg-[#d4a017]/10' },
    { name: 'Día de la Madre', dates: '15 Abr - 1er Dom May', product: 'Tarta Personalizada', conversion: '-', status: 'Programado', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10' },
    { name: 'Halloween', dates: '1 - 28 Oct', product: 'Cupcakes Temáticos', conversion: '-', status: 'Borrador', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
    { name: 'Navidad', dates: '15 Nov - 20 Dic', product: 'Roscón + Tronco Navideño', conversion: '-', status: 'Borrador', color: 'text-[#065f46]', bg: 'bg-[#065f46]/10 dark:bg-[#065f46]/20' },
  ];

  const rfmSegments = [
    { name: 'Champions', score: '5-5-5', desc: 'Compran frecuentemente, gastan mucho, compra reciente.', action: 'Descuentos VIP, Acceso anticipado a campañas.', users: 124, color: 'text-[#065f46] dark:text-[#d4a017]' },
    { name: 'Leales', score: '4-4-4', desc: 'Compran regularmente, ticket medio bueno.', action: 'Emails exclusivos, programa de referidos.', users: 342, color: 'text-green-600 dark:text-green-500' },
    { name: 'En Riesgo', score: '1-3-3', desc: 'Solían comprar a menudo pero hace tiempo que no lo hacen.', action: 'Cupones de recuperación, encuestas NPS.', users: 89, color: 'text-yellow-600 dark:text-yellow-500' },
    { name: 'Perdidos', score: '1-1-X', desc: 'Baja frecuencia, bajo gasto, hace mucho que no compran.', action: 'Campañas de reactivación agresivas.', users: 215, color: 'text-red-600 dark:text-red-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t('ghl.title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('ghl.subtitle')}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#065f46] to-[#047857] text-white rounded-lg hover:shadow-[0_0_15px_rgba(6,95,70,0.5)] transition-all text-sm font-medium">
          <Target className="w-4 h-4" />
          Lanzar Nueva Campaña
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden">
            <div className="bg-gray-50 dark:bg-[#1a1a1a] px-6 py-4 border-b border-gray-200 dark:border-[#222] flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#065f46] dark:text-[#d4a017]" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Funnels de Temporada</h3>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-[#1a1a1a]/50">
                  <tr>
                    <th className="px-6 py-3">Campaña</th>
                    <th className="px-6 py-3">Fechas</th>
                    <th className="px-6 py-3">Producto Estrella</th>
                    <th className="px-6 py-3 text-center">Conversión</th>
                    <th className="px-6 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                  {funnels.map((funnel, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                      <td className={`px-6 py-4 font-bold ${funnel.color}`}>{funnel.name}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{funnel.dates}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{funnel.product}</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-gray-900 dark:text-white">{funnel.conversion}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          funnel.status === 'Activo' ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-500 dark:border-green-500/20' :
                          funnel.status === 'Completado' ? 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20' :
                          'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-500 dark:border-blue-500/20'
                        }`}>
                          {funnel.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4 border-t border-gray-200 dark:border-[#222]">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Estructura de Funnel Estándar</h4>
              <div className="flex items-center justify-between text-sm">
                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300">Landing Principal</div>
                <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300">Order Bump (+15%)</div>
                <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300">Upsell Post-Compra</div>
                <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300">Thank You + Referidos</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden">
            <div className="bg-gray-50 dark:bg-[#1a1a1a] px-6 py-4 border-b border-gray-200 dark:border-[#222] flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sistema de Fidelización RFM</h3>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-[#1a1a1a]/50">
                  <tr>
                    <th className="px-6 py-3">Segmento</th>
                    <th className="px-6 py-3">Score</th>
                    <th className="px-6 py-3 w-1/3">Perfil</th>
                    <th className="px-6 py-3 w-1/3">Acción Automatizada (GHL)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                  {rfmSegments.map((seg, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className={`font-bold ${seg.color}`}>{seg.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{seg.users} usuarios</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">{seg.score}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs leading-relaxed">{seg.desc}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300 text-xs leading-relaxed">{seg.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl flex flex-col h-[600px]">
            <div className="bg-gray-50 dark:bg-[#1a1a1a] px-6 py-4 border-b border-gray-200 dark:border-[#222] flex items-center gap-3 rounded-t-xl">
              <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">SDR Inteligente (IA)</h3>
                <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  WhatsApp API Conectado
                </p>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-100 dark:bg-[#0a0a0a] font-sans text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 text-center mb-2">Hoy 10:42 AM</span>
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-800 dark:text-gray-200 p-3 rounded-2xl rounded-tl-sm max-w-[85%] self-start shadow-sm">
                  ¡Hola! Quería saber si tenéis disponibilidad para una tarta personalizada para este sábado. Es para 15 personas.
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="bg-[#065f46] text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] self-end shadow-sm">
                  ¡Hola! 👋 Soy el asistente virtual de FOOD360. 
                  <br/><br/>
                  He consultado nuestro ERP y sí, tenemos disponibilidad en producción para este sábado. 🎉
                  <br/><br/>
                  Para 15 personas, te recomiendo una tarta de 2kg. ¿Qué sabor prefieres? (Chocolate Valrhona, Red Velvet, Zanahoria...)
                </div>
                <span className="text-[10px] text-gray-500 text-right mr-1">Leído 10:43 AM</span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-800 dark:text-gray-200 p-3 rounded-2xl rounded-tl-sm max-w-[85%] self-start shadow-sm">
                  Red Velvet suena genial. ¿Cuánto costaría?
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="bg-[#065f46] text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] self-end shadow-sm">
                  La Tarta Red Velvet Premium de 2kg tiene un precio de 65€. 
                  <br/><br/>
                  ¿Te gustaría añadir una decoración personalizada con nombre por 5€ más? 🎂
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-[#222] rounded-b-xl">
              <div className="flex items-center gap-2 bg-white dark:bg-[#0a0a0a] border border-gray-300 dark:border-[#333] rounded-full px-4 py-2">
                <input 
                  type="text" 
                  placeholder="Simular mensaje de cliente..." 
                  className="bg-transparent border-none focus:outline-none text-sm text-gray-800 dark:text-gray-200 w-full"
                  disabled
                />
                <button className="text-[#065f46]" disabled>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="text-[10px] bg-gray-200 dark:bg-[#222] text-gray-600 dark:text-gray-400 px-2 py-1 rounded">Consulta ERP Real-time</span>
                <span className="text-[10px] bg-gray-200 dark:bg-[#222] text-gray-600 dark:text-gray-400 px-2 py-1 rounded">Escalado Humano: OFF</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
