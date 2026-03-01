import React, { useState, useMemo } from 'react';
import { initialIngredients, recipes } from '../../data/mockData';
import { Search, SlidersHorizontal, ArrowUpRight, ArrowDownRight, Calculator } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export function Escandallos() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  
  const textColor = theme === 'dark' ? '#9ca3af' : '#4b5563';
  const gridColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';

  const [ingredients, setIngredients] = useState(initialIngredients);
  const [selectedIngredient, setSelectedIngredient] = useState(ingredients[0].id);
  const [variation, setVariation] = useState(0);

  const handlePriceChange = (id: string, newPrice: number) => {
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, price: newPrice } : i));
  };

  const calculatedRecipes = useMemo(() => {
    return recipes.map(recipe => {
      let rawMaterialCost = 0;
      let simulatedRawMaterialCost = 0;

      const detailedIngredients = recipe.ingredients.map(ri => {
        const ing = ingredients.find(i => i.id === ri.id)!;
        const currentCost = ing.price * ri.qty;
        rawMaterialCost += currentCost;

        let simCost = currentCost;
        if (ing.id === selectedIngredient) {
          simCost = currentCost * (1 + variation / 100);
        }
        simulatedRawMaterialCost += simCost;

        return { ...ing, qty: ri.qty, currentCost, simCost };
      });

      const modCost = (recipe.modMinutes / 60) * 15; // 15€/h labor cost
      const totalCost = rawMaterialCost + modCost + recipe.energyOverhead;
      const simTotalCost = simulatedRawMaterialCost + modCost + recipe.energyOverhead;
      
      const suggestedRRP = totalCost / (1 - 0.65); // Target 65% margin
      const marginPercent = ((suggestedRRP - totalCost) / suggestedRRP) * 100;
      const simMarginPercent = ((suggestedRRP - simTotalCost) / suggestedRRP) * 100;

      return {
        ...recipe,
        detailedIngredients,
        rawMaterialCost,
        modCost,
        totalCost,
        suggestedRRP,
        marginPercent,
        simTotalCost,
        simMarginPercent,
      };
    });
  }, [ingredients, selectedIngredient, variation]);

  const simChartData = {
    labels: calculatedRecipes.map(r => r.name.substring(0, 15) + '...'),
    datasets: [
      {
        label: t('escandallos.margin') + ' (%)',
        data: calculatedRecipes.map(r => r.marginPercent),
        borderColor: '#065f46',
        backgroundColor: 'rgba(6, 95, 70, 0.5)',
      },
      {
        label: t('escandallos.margin') + ' Simulado (%)',
        data: calculatedRecipes.map(r => r.simMarginPercent),
        borderColor: '#d4a017',
        backgroundColor: 'rgba(212, 160, 23, 0.5)',
        borderDash: [5, 5],
      }
    ]
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t('escandallos.title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('escandallos.subtitle')}</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder={t('common.search')} 
            className="pl-9 pr-4 py-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#065f46] transition-colors w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {calculatedRecipes.map(recipe => (
            <div key={recipe.id} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden">
              <div className="bg-gray-50 dark:bg-[#1a1a1a] px-6 py-4 border-b border-gray-200 dark:border-[#222] flex justify-between items-center">
                <h3 className="text-lg font-bold text-[#065f46] dark:text-[#d4a017]">{recipe.name}</h3>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t('escandallos.suggestedRRP')}: <strong className="text-gray-900 dark:text-white">€{recipe.suggestedRRP.toFixed(2)}</strong></span>
                  <span className="text-gray-500 dark:text-gray-400">{t('escandallos.margin')}: <strong className={recipe.marginPercent >= 65 ? 'text-green-600 dark:text-green-500' : 'text-yellow-600 dark:text-yellow-500'}>{recipe.marginPercent.toFixed(1)}%</strong></span>
                </div>
              </div>
              <div className="p-6">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-[#1a1a1a]/50">
                    <tr>
                      <th className="px-4 py-2 rounded-tl-lg">{t('common.ingredient')}</th>
                      <th className="px-4 py-2">{t('common.qty')}</th>
                      <th className="px-4 py-2">{t('common.unitPrice')}</th>
                      <th className="px-4 py-2">{t('common.subtotal')}</th>
                      <th className="px-4 py-2 rounded-tr-lg">{t('common.var3m')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                    {recipe.detailedIngredients.map(ing => (
                      <tr key={ing.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-300">{ing.name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{ing.qty} {ing.unit}</td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            step="0.01"
                            value={ing.price}
                            onChange={(e) => handlePriceChange(ing.id, parseFloat(e.target.value) || 0)}
                            className="w-20 bg-transparent border-b border-gray-300 dark:border-[#333] focus:border-[#065f46] focus:outline-none text-gray-800 dark:text-gray-300 px-1"
                          /> €/{ing.unit}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-800 dark:text-gray-300">€{ing.currentCost.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-1 ${ing.var3m > 10 ? 'text-red-600 dark:text-red-500' : ing.var3m < 0 ? 'text-green-600 dark:text-green-500' : 'text-gray-500'}`}>
                            {ing.var3m > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(ing.var3m)}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="mt-6 grid grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-[#222]">
                  <div className="bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500 uppercase">{t('escandallos.costMP')}</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200 font-mono mt-1">€{recipe.rawMaterialCost.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500 uppercase">{t('escandallos.mod')} ({recipe.modMinutes}m)</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200 font-mono mt-1">€{recipe.modCost.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500 uppercase">{t('escandallos.energy')}</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200 font-mono mt-1">€{recipe.energyOverhead.toFixed(2)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#065f46]/10 dark:from-[#065f46]/20 to-transparent border border-[#065f46]/30 p-3 rounded-lg text-center">
                    <p className="text-xs text-[#065f46] font-bold uppercase">{t('escandallos.totalCost')}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white font-mono mt-1">€{recipe.totalCost.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-6 rounded-xl sticky top-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#d4a017]/10 rounded-lg">
                <SlidersHorizontal className="w-5 h-5 text-[#d4a017]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('escandallos.simTitle')}</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('escandallos.selectIng')}</label>
                <select 
                  value={selectedIngredient}
                  onChange={(e) => setSelectedIngredient(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#065f46]"
                >
                  {ingredients.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('escandallos.priceVar')}</label>
                  <span className={`text-sm font-bold ${variation > 0 ? 'text-red-600 dark:text-red-500' : variation < 0 ? 'text-green-600 dark:text-green-500' : 'text-gray-500'}`}>
                    {variation > 0 ? '+' : ''}{variation}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="-50" 
                  max="100" 
                  step="5"
                  value={variation}
                  onChange={(e) => setVariation(parseInt(e.target.value))}
                  className="w-full accent-[#065f46]"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>-50%</span>
                  <span>0%</span>
                  <span>+100%</span>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-200 dark:border-[#222]">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">{t('escandallos.impact')}</h4>
                <div className="h-[200px]">
                  <Line 
                    data={simChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: { grid: { color: gridColor }, ticks: { color: textColor } },
                        x: { display: false }
                      },
                      plugins: {
                        legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12 } }
                      }
                    }} 
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-lg border border-gray-200 dark:border-[#333] mt-4">
                <div className="flex items-start gap-3">
                  <Calculator className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t('escandallos.engineText')} <strong className="text-gray-800 dark:text-gray-200">{ingredients.find(i=>i.id===selectedIngredient)?.name}</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
