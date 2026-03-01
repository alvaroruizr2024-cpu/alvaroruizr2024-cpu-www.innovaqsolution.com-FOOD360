import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Dashboard } from '../sections/Dashboard';
import { Escandallos } from '../sections/Escandallos';
import { Inventario } from '../sections/Inventario';
import { Trazabilidad } from '../sections/Trazabilidad';
import { EcosistemaGHL } from '../sections/EcosistemaGHL';
import { Integracion } from '../sections/Integracion';
import { Cumplimiento } from '../sections/Cumplimiento';
import { WorkflowTarta } from '../sections/WorkflowTarta';

export function MainLayout() {
  const [currentSection, setCurrentSection] = useState('dashboard');

  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard': return <Dashboard />;
      case 'escandallos': return <Escandallos />;
      case 'inventario': return <Inventario />;
      case 'trazabilidad': return <Trazabilidad />;
      case 'ecosistema': return <EcosistemaGHL />;
      case 'integracion': return <Integracion />;
      case 'cumplimiento': return <Cumplimiento />;
      case 'workflow': return <WorkflowTarta />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] dark:bg-[#050505] text-gray-800 dark:text-gray-200 overflow-hidden font-sans selection:bg-[#065f46] selection:text-white transition-colors duration-300">
      <Sidebar currentSection={currentSection} onSectionChange={setCurrentSection} />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <Header />
        <div className="flex-1 overflow-y-auto relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#065f46]/5 dark:from-[#065f46]/10 via-transparent dark:via-[#050505] to-transparent dark:to-[#050505] pointer-events-none"></div>
          <div className="relative z-10 p-8 min-h-full">
            {renderSection()}
          </div>
        </div>
      </main>
    </div>
  );
}
