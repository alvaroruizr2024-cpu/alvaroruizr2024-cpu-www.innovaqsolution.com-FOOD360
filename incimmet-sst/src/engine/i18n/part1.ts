/** clave|es|en|pt — motivos, cobertura, avisos y notas del motor. */
export const PART1 = `
eng.reason.noDataset|Sin base cargada: importe las fuentes o active los datos de demostración.|No dataset loaded: import the sources or switch on the demo data.|Sem base carregada: importe as fontes ou ative os dados de demonstração.
eng.reason.noData|Sin datos en el alcance y período seleccionados.|No data for the selected scope and period.|Sem dados no escopo e período selecionados.
eng.reason.noExposure|Sin horas trabajadas informadas en el alcance.|No hours worked reported for this scope.|Sem horas trabalhadas informadas no escopo.
eng.reason.noHeadcount|Dotación no informada en el alcance.|Headcount not reported for this scope.|Efetivo não informado no escopo.
eng.reason.zeroDenominator|Denominador cero o ausente: no se calcula la tasa.|Zero or missing denominator: the rate is not calculated.|Denominador zero ou ausente: a taxa não é calculada.
eng.reason.noPairedData|Ningún proyecto-mes tiene numerador y denominador informados a la vez.|No project-month has both numerator and denominator reported.|Nenhum projeto-mês tem numerador e denominador informados ao mesmo tempo.
eng.reason.fieldAbsent|El campo no existe en la fuente de este alcance.|The field does not exist in the source for this scope.|O campo não existe na fonte deste escopo.
eng.reason.notClosed|Dato sin cierre: vacío no significa cero.|Not closed: an empty value does not mean zero.|Dado sem fechamento: vazio não significa zero.
eng.reason.nothingDue|No aplica: nada exigible en el período.|Not applicable: nothing was due in the period.|Não se aplica: nada exigível no período.
eng.reason.outOfScope|No aplica al alcance seleccionado (indicador nacional).|Not applicable to the selected scope (national indicator).|Não se aplica ao escopo selecionado (indicador nacional).
eng.reason.programPending|Fuente pendiente: no hay agregados de este programa.|Source pending: no aggregates for this program.|Fonte pendente: não há agregados deste programa.
eng.reason.recordsPending|Fuente pendiente: faltan los registros individuales de este módulo.|Source pending: the individual records for this module are missing.|Fonte pendente: faltam os registros individuais deste módulo.
eng.reason.needsCaseRecords|Requiere registros de eventos y casos; los conteos agregados no bastan.|Requires event and case records; aggregated counts are not enough.|Requer registros de eventos e casos; as contagens agregadas não bastam.
eng.reason.taxonomyNotValidated|Datos insuficientes: la equivalencia entre el nivel 1 y primeros auxilios no está validada.|Insufficient data: the mapping between level 1 and first aid is not validated.|Dados insuficientes: a equivalência entre o nível 1 e primeiros socorros não está validada.
eng.reason.unitsNotValidated|Unidad de las horas de capacitación sin validar (sesión u horas-persona).|Training-hours unit not validated (session hours or person-hours).|Unidade das horas de capacitação não validada (sessão ou horas-pessoa).
eng.reason.noAccidentsYear|Sin accidentes en el año: la proporción no se calcula.|No accidents in the year: the proportion is not calculated.|Sem acidentes no ano: a proporção não é calculada.
eng.reason.noReportDates|Sin fechas de reporte: la oportunidad no se puede medir.|No report dates: timeliness cannot be measured.|Sem datas de relato: a pontualidade não pode ser medida.
eng.reason.noProjects|Sin proyectos cargados para este país.|No projects loaded for this country.|Sem projetos carregados para este país.
eng.reason.insufficientSample|Datos insuficientes: la muestra no alcanza el mínimo documentado.|Insufficient data: the sample is below the documented minimum.|Dados insuficientes: a amostra não atinge o mínimo documentado.
eng.reason.notBetterThanBase|Datos insuficientes: la estimación no supera a la referencia simple fuera de muestra.|Insufficient data: the estimate does not beat the simple out-of-sample baseline.|Dados insuficientes: a estimativa não supera a referência simples fora da amostra.
eng.module.demo|Datos de demostración: conjunto sintético sin validez operativa.|Demo data: synthetic set with no operational validity.|Dados de demonstração: conjunto sintético sem validade operacional.
eng.cov.absent|Excluido: campo inexistente en la fuente ({fields}); {n} proyecto-mes.|Excluded: field not present in the source ({fields}); {n} project-months.|Excluído: campo inexistente na fonte ({fields}); {n} projeto-mês.
eng.cov.notClosed|Parcial: {n} proyecto-mes sin cierre ({months}); no se cuentan como cero.|Partial: {n} project-months not closed ({months}); not counted as zero.|Parcial: {n} projeto-mês sem fechamento ({months}); não contam como zero.
eng.cov.noExposure|Parcial: {n} proyecto-mes sin horas trabajadas; fuera del numerador y del denominador.|Partial: {n} project-months without hours worked; dropped from numerator and denominator.|Parcial: {n} projeto-mês sem horas trabalhadas; fora do numerador e do denominador.
eng.cov.noHeadcount|Parcial: {n} proyecto-mes con horas pero sin dotación.|Partial: {n} project-months with hours but no headcount.|Parcial: {n} projeto-mês com horas mas sem efetivo.
eng.cov.programIncomplete|Parcial: {n} filas sin numerador o denominador.|Partial: {n} rows without numerator or denominator.|Parcial: {n} linhas sem numerador ou denominador.
eng.cov.measure.hh|Horas trabajadas|Hours worked|Horas trabalhadas
eng.cov.measure.workers|Dotación|Headcount|Efetivo
eng.cov.measure.injury|Accidentes con lesión|Injury accidents|Acidentes com lesão
eng.cov.measure.lostDays|Días perdidos|Lost days|Dias perdidos
eng.cov.measure.potential|Alto potencial|High potential|Alto potencial
eng.banner.demo|Datos de demostración: cifras sintéticas, sin relación con INCIMMET.|Demo data: synthetic figures, unrelated to INCIMMET.|Dados de demonstração: números sintéticos, sem relação com a INCIMMET.
eng.banner.simulation|Predicción en modo simulación: sin validez operativa.|Prediction in simulation mode: no operational validity.|Predição em modo simulação: sem validade operacional.
eng.banner.noDataset|Sin base cargada. Importe las fuentes para ver indicadores.|No dataset loaded. Import the sources to see indicators.|Sem base carregada. Importe as fontes para ver indicadores.
eng.banner.afterCutoff|El período seleccionado supera el corte de datos ({cutoff}).|The selected period is later than the data cutoff ({cutoff}).|O período selecionado ultrapassa o corte de dados ({cutoff}).
eng.banner.notClosed|{country}: accidentes de {month} sin cierre; no se cuentan como cero.|{country}: accidents for {month} not closed; not counted as zero.|{country}: acidentes de {month} sem fechamento; não contam como zero.
eng.source.missing|Fuente pendiente|Source pending|Fonte pendente
eng.source.stale|Último dato {last}; corte {cutoff}.|Latest data {last}; cutoff {cutoff}.|Último dado {last}; corte {cutoff}.
eng.note.reportedCount|Conteo reportado por la fuente: no se afirma deduplicación de eventos ni de personas.|Count as reported by the source: no deduplication of events or persons is asserted.|Contagem informada pela fonte: não se afirma deduplicação de eventos nem de pessoas.
eng.note.fatalAsReported|Accidentes mortales tal como se reportan; el número de personas requiere registros de casos.|Fatal accidents as reported; the number of persons requires case records.|Acidentes fatais como informados; o número de pessoas requer registros de casos.
eng.note.ltiCriterion|Criterio vigente (perfil reportado v1): accidentes incapacitantes no mortales.|Current criterion (reported profile v1): non-fatal lost-time accidents.|Critério vigente (perfil informado v1): acidentes com afastamento não fatais.
eng.note.triProfile|Perfil reportado v1: niveles 2 a 6; el nivel 1 queda fuera. No equivale a categorías OSHA.|Reported profile v1: levels 2 to 6; level 1 is left out. Not equivalent to OSHA categories.|Perfil informado v1: níveis 2 a 6; o nível 1 fica fora. Não equivale a categorias OSHA.
eng.note.ltifrExcludesFatal|LTIFR = accidentes incapacitantes × 1.000.000 / HH; las fatalidades no entran en este numerador.|LTIFR = lost-time accidents × 1,000,000 / hours worked; fatalities are excluded from this numerator.|LTIFR = acidentes com afastamento × 1.000.000 / HHT; as fatalidades não entram neste numerador.
eng.note.trifrReported|TRIFR reportado por INCIMMET (perfil v1), por 1.000.000 HH.|TRIFR as reported by INCIMMET (profile v1), per 1,000,000 hours worked.|TRIFR informado pela INCIMMET (perfil v1), por 1.000.000 HHT.
eng.note.referenceNotOsha|Referencia por 200.000 HH; no es un indicador OSHA mientras la taxonomía no esté validada.|Reference per 200,000 hours; not an OSHA indicator while the taxonomy is not validated.|Referência por 200.000 HHT; não é um indicador OSHA enquanto a taxonomia não for validada.
eng.note.potentialNotConsequence|Potencial de gravedad: no es consecuencia real y no se suma a los accidentes.|Severity potential: not an actual consequence and never added to accidents.|Potencial de gravidade: não é consequência real e não se soma aos acidentes.
eng.note.multiSelect|Un caso puede marcar varias zonas del cuerpo: los porcentajes pueden superar 100.|A case may mark several body zones: percentages may exceed 100.|Um caso pode marcar várias zonas do corpo: os percentuais podem superar 100.
eng.note.chargedSeparate|Días cargados informados por separado y sumados una sola vez.|Charged days reported separately and added only once.|Dias debitados informados separadamente e somados uma só vez.
eng.note.chargedNotSeparate|La fuente no separa días cargados: se usan los días perdidos informados.|The source does not separate charged days: reported lost days are used.|A fonte não separa dias debitados: usam-se os dias perdidos informados.
eng.note.headcountMethod|Dotación media = media de los meses con dato de la suma de dotaciones.|Average headcount = mean over months with data of the summed headcount.|Efetivo médio = média dos meses com dado da soma dos efetivos.
eng.note.peRegulatory|Metodología minera configurada: verificar días cargados y clasificación frente al reglamento vigente.|Configured mining methodology: verify charged days and classification against the regulation in force.|Metodologia mineira configurada: verificar dias debitados e classificação conforme o regulamento vigente.
eng.note.coNotComparable|Denominador = trabajadores: no se suma ni se compara con IF, LTIFR o TF.|Denominator = workers: never added to or compared with IF, LTIFR or TF.|Denominador = trabalhadores: não se soma nem se compara com IF, LTIFR ou TF.
eng.note.cutoffMonthOnly|Calculado para el mes de corte del período ({month}).|Calculated for the cutoff month of the period ({month}).|Calculado para o mês de corte do período ({month}).
eng.note.yearToDate|Acumulado del año: {from} a {to}.|Year to date: {from} to {to}.|Acumulado do ano: {from} a {to}.
eng.note.brTfScope|TF configurada: incluye accidentes con y sin alejamiento.|Configured TF: includes accidents with and without lost time.|TF configurada: inclui acidentes com e sem afastamento.
eng.note.brConfigured|TG configurada: no es un indicador universal obligatorio de la NR-22.|Configured TG: not a universal mandatory NR-22 indicator.|TG configurada: não é um indicador universal obrigatório da NR-22.
eng.note.trainingUnit|Horas reportadas: confirmar si son horas de sesión u horas-persona antes de consolidar.|Reported hours: confirm whether they are session hours or person-hours before consolidating.|Horas informadas: confirmar se são horas de sessão ou horas-pessoa antes de consolidar.
eng.note.intensityNotCompliance|La intensidad no equivale al cumplimiento del plan de capacitación.|Intensity is not the same as training-plan compliance.|A intensidade não equivale ao cumprimento do plano de capacitação.
eng.note.moreReportsNotWorse|Más reportes preventivos no implican peor seguridad.|More preventive reports do not mean worse safety.|Mais relatos preventivos não significam pior segurança.
eng.note.sample|Alcance muestral: {n} permisos revisados.|Sample scope: {n} permits reviewed.|Escopo amostral: {n} permissões revisadas.
eng.note.sampleCaveat|Un 100 % en una muestra pequeña no prueba que todos los controles funcionen.|100% on a small sample does not prove that every control works.|100% em uma amostra pequena não prova que todos os controles funcionam.
eng.note.activeFailure|{n} falla(s) crítica(s) activa(s): el estado no puede ser verde.|{n} active critical failure(s): the status cannot be green.|{n} falha(s) crítica(s) ativa(s): o estado não pode ser verde.
eng.note.hygieneByAgent|Por agente y método; no se comparan unidades ni límites incompatibles.|By agent and method; incompatible units or limits are not compared.|Por agente e método; não se comparam unidades nem limites incompatíveis.
eng.note.hygieneCoverage|Informar junto con la cobertura de evaluación.|Report together with the evaluation coverage.|Informar junto com a cobertura de avaliação.
eng.note.aggregatedOnly|Solo resultados agregados; sin datos personales.|Aggregated results only; no personal data.|Somente resultados agregados; sem dados pessoais.
eng.note.cohortOpened|Cohorte: acciones ABIERTAS en el período.|Cohort: actions OPENED in the period.|Coorte: ações ABERTAS no período.
eng.note.cohortDue|Cohorte: acciones que VENCEN en el período (vencimiento original).|Cohort: actions DUE in the period (original due date).|Coorte: ações que VENCEM no período (vencimento original).
eng.note.originalDueKept|El retraso se mide contra el vencimiento original; reprogramar no lo borra.|Delay is measured against the original due date; rescheduling does not erase it.|O atraso é medido contra o vencimento original; reprogramar não o apaga.
eng.note.recurrenceWindow|Reincidencia: mismo hallazgo en el mismo proyecto dentro de 12 meses.|Recurrence: same finding at the same project within 12 months.|Reincidência: mesmo achado no mesmo projeto dentro de 12 meses.
eng.note.planToDate|Exigibles hasta {cut}; las actividades futuras no reducen el cumplimiento.|Due up to {cut}; future activities do not reduce compliance.|Exigíveis até {cut}; as atividades futuras não reduzem o cumprimento.
eng.note.planAnnual|Sobre todas las actividades aprobadas del año; distinto del cumplimiento a la fecha.|Over all approved activities of the year; different from compliance to date.|Sobre todas as atividades aprovadas do ano; diferente do cumprimento até a data.
eng.note.planWeights|Ponderado con los pesos aprobados de cada actividad.|Weighted with each activity's approved weight.|Ponderado com os pesos aprovados de cada atividade.
eng.note.denominatorKept|El filtro de cuerpo o mecanismo solo reduce los casos: el denominador (horas trabajadas) se conserva porque no hay HH asignadas por zona o mecanismo.|The body-part or mechanism filter only reduces cases: the denominator (hours worked) is kept because no hours are assigned by zone or mechanism.|O filtro de corpo ou mecanismo só reduz os casos: o denominador (horas trabalhadas) é mantido porque não há HHT atribuídas por zona ou mecanismo.
eng.note.pyramidNotSummed|Consecuencia real y potencial se muestran por nivel y nunca se suman entre sí.|Actual consequence and potential are shown by level and never added together.|Consequência real e potencial são mostradas por nível e nunca se somam.
eng.note.defaultThreshold|Umbral por defecto documentado; por configurar.|Documented default threshold; to be configured.|Limite padrão documentado; a configurar.
eng.note.targetIfProxy|Sin meta propia de LTIFR: se usa la meta de IF como referencia.|No LTIFR target of its own: the IF target is used as a reference.|Sem meta própria de LTIFR: usa-se a meta de IF como referência.
eng.note.coverageDiffers|Cobertura no equivalente: {now} proyectos con exposición ahora y {then} en la comparación.|Coverage not equivalent: {now} projects with exposure now vs {then} in the comparison.|Cobertura não equivalente: {now} projetos com exposição agora e {then} na comparação.
eng.note.baseZero|Base anterior cero: se muestra el cambio absoluto.|Previous base is zero: the absolute change is shown.|Base anterior zero: mostra-se a variação absoluta.
eng.note.compareUnavailable|Sin dato comparable en el período de comparación.|No comparable data in the comparison period.|Sem dado comparável no período de comparação.
eng.note.mandatoryFields|Campos obligatorios evaluados: {fields}.|Mandatory fields assessed: {fields}.|Campos obrigatórios avaliados: {fields}.
eng.note.reportDeadline|Plazo por defecto documentado: reporte dentro de 1 día.|Documented default deadline: reported within 1 day.|Prazo padrão documentado: relato em até 1 dia.
eng.note.freshness|Meses de atraso de cada fuente frente al corte {cutoff}.|Months each source lags behind the cutoff {cutoff}.|Meses de atraso de cada fonte em relação ao corte {cutoff}.
eng.note.signalsByRules|Señales tempranas por reglas: no son una probabilidad de accidente.|Rule-based early signals: not an accident probability.|Sinais precoces por regras: não são uma probabilidade de acidente.
eng.note.recalcDiffers|La cifra recalculada difiere de la guardada en el origen en más de 0,5 %.|The recalculated figure differs from the one stored in the source by more than 0.5%.|O valor recalculado difere do guardado na origem em mais de 0,5 %.
eng.note.recalcMatches|La cifra recalculada coincide con la guardada en el origen (tolerancia 0,5 %).|The recalculated figure matches the one stored in the source (0.5% tolerance).|O valor recalculado coincide com o guardado na origem (tolerância 0,5 %).
eng.note.storedEmpty|La celda de origen está vacía o con error.|The source cell is empty or in error.|A célula de origem está vazia ou com erro.
eng.note.attentionScore|Puntaje de atención 0–100: priorización, no riesgo estadístico.|Attention score 0–100: prioritisation, not statistical risk.|Pontuação de atenção 0–100: priorização, não risco estatístico.
eng.note.attentionReweighted|Puntaje reponderado: faltan {n} variable(s) ({vars}).|Score re-weighted: {n} variable(s) missing ({vars}).|Pontuação reponderada: faltam {n} variável(is) ({vars}).
`;
