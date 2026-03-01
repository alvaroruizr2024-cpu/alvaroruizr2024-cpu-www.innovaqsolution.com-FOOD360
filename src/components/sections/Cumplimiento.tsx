import React from 'react';
import { Scale, FileText, CheckCircle, AlertTriangle, ShieldCheck, FileSignature, Download } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export function Cumplimiento() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const regulations = [
    { name: 'Facturae 3.2.2', req: 'Firma XAdES', status: 'Implementado', progress: 100, color: 'text-green-600 dark:text-green-500', bg: 'bg-green-500' },
    { name: 'FACe / FACeB2B', req: 'Conexión WS', status: 'Implementado', progress: 100, color: 'text-green-600 dark:text-green-500', bg: 'bg-green-500' },
    { name: 'SII AEAT', req: 'Envío 4 días hábiles', status: 'En Pruebas', progress: 85, color: 'text-yellow-600 dark:text-yellow-500', bg: 'bg-yellow-500' },
    { name: 'TicketBAI', req: 'Código QR + TBAI', status: 'Pendiente', progress: 30, color: 'text-red-600 dark:text-red-500', bg: 'bg-red-500' },
    { name: 'VeriFactu', req: 'Envío instantáneo', status: 'En Desarrollo', progress: 60, color: 'text-blue-600 dark:text-blue-500', bg: 'bg-blue-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t('cumplimiento.title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('cumplimiento.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-[#065f46]/20 border border-green-200 dark:border-[#065f46]/50 rounded-lg text-sm">
          <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-500" />
          <span className="text-green-700 dark:text-green-500 font-medium">Auditoría OK (2026)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden">
          <div className="bg-gray-50 dark:bg-[#1a1a1a] px-6 py-4 border-b border-gray-200 dark:border-[#222] flex items-center gap-3">
            <Scale className="w-5 h-5 text-[#065f46] dark:text-[#d4a017]" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Estado de Implementación Normativa</h3>
          </div>
          <div className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-[#1a1a1a]/50">
                <tr>
                  <th className="px-6 py-3">Normativa</th>
                  <th className="px-6 py-3">Requisito Clave</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 w-32">Progreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                {regulations.map((reg, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200">{reg.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{reg.req}</td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1.5 ${reg.color} text-xs font-medium`}>
                        {reg.status === 'Implementado' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        {reg.status}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-gray-200 dark:bg-[#222] rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${reg.bg}`}
                          style={{ width: `${reg.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block text-right">{reg.progress}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
              <FileSignature className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Generación Factura Electrónica</h3>
          </div>
          
          <div className="flex-1 flex gap-6">
            <div className="w-1/2 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Cliente</label>
                <select className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#065f46]">
                  <option>Restaurante El Celler (B2B)</option>
                  <option>Hotel Ritz Madrid (B2B)</option>
                  <option>Cliente Final (B2C)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Pedido Vinculado</label>
                <input type="text" value="ORD-2026-8892" readOnly className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm font-mono text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Formato de Salida</label>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-[#065f46] text-white rounded-lg text-sm font-medium hover:bg-[#047857] transition-colors">
                    Facturae XML
                  </button>
                  <button className="flex-1 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#222] transition-colors">
                    PDF (UBL)
                  </button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-[#222]">
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#d4a017] to-[#b8860b] text-white dark:text-black rounded-lg text-sm font-bold hover:shadow-[0_0_15px_rgba(212,160,23,0.4)] transition-all">
                  <FileSignature className="w-4 h-4" />
                  Firmar y Emitir (XAdES)
                </button>
              </div>
            </div>
            
            <div className="w-1/2 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg p-4 flex flex-col relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button className="flex items-center gap-2 px-4 py-2 bg-white text-black border border-gray-200 dark:border-none rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors shadow-sm">
                  <Download className="w-4 h-4" />
                  Descargar XML
                </button>
              </div>
              
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-[#333] pb-2">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Vista Previa XML</span>
                <span className="text-[10px] bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-500 px-2 py-0.5 rounded border border-green-200 dark:border-green-500/30">Válido</span>
              </div>
              
              <pre className="text-[9px] font-mono text-gray-600 dark:text-gray-500 overflow-hidden flex-1 leading-relaxed">
{`<?xml version="1.0" encoding="UTF-8"?>
<fe:Facturae xmlns:fe="http://www.facturae.es/Facturae/2014/v3.2.1/Facturae">
  <FileHeader>
    <SchemaVersion>3.2.1</SchemaVersion>
    <Modality>I</Modality>
    <InvoiceIssuerType>EM</InvoiceIssuerType>
  </FileHeader>
  <Parties>
    <SellerParty>
      <TaxIdentification>
        <PersonTypeCode>J</PersonTypeCode>
        <ResidenceTypeCode>R</ResidenceTypeCode>
        <TaxIdentificationNumber>B12345678</TaxIdentificationNumber>
      </TaxIdentification>
      <LegalEntity>
        <CorporateName>INNOVAQ SOLUTIONS SL</CorporateName>
      </LegalEntity>
    </SellerParty>
    <BuyerParty>
      <!-- Datos Cliente B2B -->
    </BuyerParty>
  </Parties>
  <Invoices>
    <Invoice>
      <InvoiceHeader>
        <InvoiceNumber>FAC-2026-1045</InvoiceNumber>
        <InvoiceSeriesCode>A</InvoiceSeriesCode>
        <InvoiceDocumentType>FC</InvoiceDocumentType>
        <InvoiceClass>OO</InvoiceClass>
      </InvoiceHeader>
      <InvoiceTotals>
        <TotalGrossAmount>450.00</TotalGrossAmount>
        <TotalTaxOutputs>45.00</TotalTaxOutputs>
        <InvoiceTotal>495.00</InvoiceTotal>
      </InvoiceTotals>
      <!-- ... -->
    </Invoice>
  </Invoices>
</fe:Facturae>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
