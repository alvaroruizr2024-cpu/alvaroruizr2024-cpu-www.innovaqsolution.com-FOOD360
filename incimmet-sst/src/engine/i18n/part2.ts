/** clave|es|en|pt — líneas de apoyo, tendencias, mapa, predicción, señales y próximos pasos. */
export const PART2 = `
eng.sec.injuryAccidents|Accidentes con lesión|Injury accidents|Acidentes com lesão
eng.sec.propertyAccidents|Daño material|Property damage|Dano material
eng.sec.incidents|Incidentes|Incidents|Incidentes
eng.sec.nearMiss|Casi accidentes|Near misses|Quase acidentes
eng.sec.hazardReports|Reportes de peligro|Hazard reports|Relatos de perigo
eng.sec.injuryEvents|Eventos con lesión|Events with injury|Eventos com lesão
eng.sec.fatalEvents|Eventos fatales|Fatal events|Eventos fatais
eng.sec.casesLti|Casos con tiempo perdido|Lost-time cases|Casos com afastamento
eng.sec.accNv1|Accidentes nivel 1 (reportado)|Level 1 accidents (reported)|Acidentes nível 1 (informado)
eng.sec.chargedDays|Días cargados|Charged days|Dias debitados
eng.sec.lostDays|Días perdidos|Lost days|Dias perdidos
eng.sec.ltiCount|Accidentes incapacitantes|Lost-time accidents|Acidentes com afastamento
eng.sec.triCount|Accidentes registrables (perfil v1)|Recordable accidents (profile v1)|Acidentes registráveis (perfil v1)
eng.sec.incapFatal|Incapacitantes + mortales|Lost-time + fatal|Com afastamento + fatais
eng.sec.hh|Horas trabajadas|Hours worked|Horas trabalhadas
eng.sec.hipoCount|Eventos de alto potencial|High-potential events|Eventos de alto potencial
eng.sec.multiZone|Casos con varias zonas|Multi-zone cases|Casos com várias zonas
eng.sec.if|IF|IF|IF
eng.sec.is|IS|IS|IS
eng.sec.sampled|Permisos revisados|Permits reviewed|Permissões revisadas
eng.sec.evaluatedOfApplicable|Evaluados / aplicables|Evaluated / applicable|Avaliados / aplicáveis
eng.sec.evaluatedOfEligible|Evaluados / elegibles|Evaluated / eligible|Avaliados / elegíveis
eng.sec.p90|Percentil 90|90th percentile|Percentil 90
eng.sec.n|Registros|Records|Registros
eng.sec.activeFailures|Fallas críticas activas|Active critical failures|Falhas críticas ativas
eng.sec.overdueCritical|Vencidas críticas|Overdue critical|Vencidas críticas
eng.sec.pctOfOpen|% de las abiertas|% of open|% das abertas
eng.sec.rescheduled|Reprogramadas|Rescheduled|Reprogramadas
eng.sec.futureActivities|Actividades futuras|Future activities|Atividades futuras
eng.sec.storedInSource|Guardado en origen|Stored in source|Guardado na origem
eng.sec.horizon|{days} días|{days} days|{days} dias
eng.sec.hhAssumed|HH supuestas (90 días)|Assumed hours (90 days)|HHT supostas (90 dias)
eng.sec.expectedBaseline|Esperado según línea base|Expected from baseline|Esperado pela linha de base
eng.sec.brier|Puntaje de Brier (fuera de muestra)|Brier score (out of sample)|Escore de Brier (fora da amostra)
eng.sec.brierBase|Brier de la referencia|Baseline Brier|Brier da referência
eng.sec.pOnTime|Frecuencia de cumplimiento en plazo|On-time completion frequency|Frequência de cumprimento no prazo
eng.sec.scenarioDown|HH −10 %|Hours −10%|HHT −10 %
eng.sec.scenarioBase|Base|Base|Base
eng.sec.scenarioUp|HH +10 %|Hours +10%|HHT +10 %
eng.sec.pZeroBase|P(ningún evento), base|P(no event), base|P(nenhum evento), base
eng.sec.sigCritical|Críticas|Critical|Críticas
eng.sec.sigHigh|Altas|High|Altas
eng.sec.sigMedium|Medias|Medium|Médias
eng.trend.counts|Accidentes por nivel|Accidents by level|Acidentes por nível
eng.trend.rates|Tasas de 12 meses móviles|Trailing 12-month rates|Taxas de 12 meses móveis
eng.trend.exposure|Horas trabajadas|Hours worked|Horas trabalhadas
eng.trend.ltifr12|LTIFR 12 meses|LTIFR 12 months|LTIFR 12 meses
eng.trend.trifr12|TRIFR reportado 12 meses|Reported TRIFR 12 months|TRIFR informado 12 meses
eng.trend.targetTrifr|Meta TRIFR|TRIFR target|Meta TRIFR
eng.trend.forecast|Esperado (modelo validado)|Expected (validated model)|Esperado (modelo validado)
eng.trend.ratesNote|Σ numeradores × 1.000.000 / Σ HH de los 12 meses previos; banda = intervalo de Poisson al 95 %.|Σ numerators × 1,000,000 / Σ hours of the previous 12 months; band = 95% Poisson interval.|Σ numeradores × 1.000.000 / Σ HHT dos 12 meses anteriores; faixa = intervalo de Poisson de 95 %.
eng.trend.countsRecordsNote|Eventos únicos; el caso más grave define el nivel del evento.|Unique events; the worst case sets the event level.|Eventos únicos; o caso mais grave define o nível do evento.
eng.trend.headcountNote|Dotación del último mes: {workers} personas (no se grafica en este eje).|Headcount in the latest month: {workers} people (not plotted on this axis).|Efetivo do último mês: {workers} pessoas (não plotado neste eixo).
eng.map.statusDef.events|Color = LTIFR del período frente a la meta: verde ≤ meta, ámbar hasta +{band} %, rojo por encima. Gris = sin dato; rayado = sin exposición; tamaño = horas trabajadas.|Colour = period LTIFR vs target: green ≤ target, amber up to +{band}%, red above. Grey = no data; hatched = no exposure; size = hours worked.|Cor = LTIFR do período frente à meta: verde ≤ meta, âmbar até +{band} %, vermelho acima. Cinza = sem dado; hachurado = sem exposição; tamanho = horas trabalhadas.
eng.map.statusDef.exposure|Tamaño = horas trabajadas del período. Sin semáforo: la exposición es contexto.|Size = hours worked in the period. No traffic light: exposure is context.|Tamanho = horas trabalhadas do período. Sem semáforo: a exposição é contexto.
eng.map.statusDef.controls|Color = efectividad de controles críticos; rojo si hay una falla crítica activa.|Colour = critical-control effectiveness; red if there is an active critical failure.|Cor = efetividade dos controles críticos; vermelho se houver falha crítica ativa.
eng.map.statusDef.actions|Color = acciones vencidas: rojo con críticas vencidas, ámbar con otras, verde sin vencidas.|Colour = overdue actions: red with overdue critical ones, amber with others, green with none.|Cor = ações vencidas: vermelho com críticas vencidas, âmbar com outras, verde sem vencidas.
eng.map.statusDef.health|Color = vigilancia médica vigente frente al umbral por defecto (±{band} %).|Colour = current medical surveillance vs the default threshold (±{band}%).|Cor = vigilância médica vigente frente ao limite padrão (±{band} %).
eng.map.demoCoords|Ubicaciones ficticias de demostración (no verificadas).|Fictional demo locations (not verified).|Localizações fictícias de demonstração (não verificadas).
eng.map.noCoords|{n} proyecto(s) sin coordenadas validadas: se listan, no se ubican.|{n} project(s) without validated coordinates: listed, not placed.|{n} projeto(s) sem coordenadas validadas: listados, não posicionados.
eng.pred.reason.months|Historial insuficiente: {n} meses (mínimo {min}).|Insufficient history: {n} months (minimum {min}).|Histórico insuficiente: {n} meses (mínimo {min}).
eng.pred.reason.events|Eventos insuficientes: {n} (mínimo {min}).|Insufficient events: {n} (minimum {min}).|Eventos insuficientes: {n} (mínimo {min}).
eng.pred.reason.noEvaluation|No fue posible evaluar el modelo fuera de muestra.|The model could not be evaluated out of sample.|Não foi possível avaliar o modelo fora da amostra.
eng.pred.reason.score|El modelo no supera a la referencia simple (puntaje {cand} frente a {base}).|The model does not beat the simple baseline (score {cand} vs {base}).|O modelo não supera a referência simples (escore {cand} frente a {base}).
eng.pred.reason.coverage|Cobertura del intervalo al 80 % fuera de banda: {cov} %.|80% interval coverage out of band: {cov}%.|Cobertura do intervalo de 80 % fora da faixa: {cov} %.
eng.pred.reason.drift|Deriva de alcance: {share} % de las HH viene de proyectos que empezaron o terminaron en 12 meses.|Scope drift: {share}% of hours come from projects that started or ended within 12 months.|Deriva de escopo: {share} % das HHT vem de projetos que começaram ou terminaram em 12 meses.
eng.pred.reason.unclosed|Hay numeradores sin cierre en los últimos 3 meses.|There are unclosed numerators in the last 3 months.|Há numeradores sem fechamento nos últimos 3 meses.
eng.pred.reason.notApproved|Sin aprobación explícita para publicar predicciones.|No explicit approval to publish predictions.|Sem aprovação explícita para publicar predições.
eng.pred.disabledNote|Predicción deshabilitada ({n} motivo(s)); no se muestran cifras.|Prediction disabled ({n} reason(s)); no figures are shown.|Predição desabilitada ({n} motivo(s)); nenhum número é mostrado.
eng.pred.simulation|Simulación con datos de demostración: sin validez operativa.|Simulation on demo data: no operational validity.|Simulação com dados de demonstração: sem validade operacional.
eng.pred.calibration|{n} pronósticos de origen móvil; error absoluto medio {mae} frente a {maeBase} de la referencia.|{n} rolling-origin forecasts; mean absolute error {mae} vs {maeBase} for the baseline.|{n} previsões de origem móvel; erro absoluto médio {mae} frente a {maeBase} da referência.
eng.pred.hhAssumption|Supuesto: {hh} HH por mes (media de los últimos 3 meses).|Assumption: {hh} hours per month (mean of the last 3 months).|Suposição: {hh} HHT por mês (média dos últimos 3 meses).
eng.pred.modelNote|Modelo {model} v{version}: conteos de accidentes registrables con exposición.|Model {model} v{version}: recordable-accident counts with exposure.|Modelo {model} v{version}: contagens de acidentes registráveis com exposição.
eng.pred.eventDefinition|Evento = al menos un accidente registrable (perfil v1) en el alcance.|Event = at least one recordable accident (profile v1) in the scope.|Evento = ao menos um acidente registrável (perfil v1) no escopo.
eng.pred.residualNote|Residuo estandarizado frente a la tasa de los 12 meses previos; umbral descriptivo 3σ.|Standardised residual vs the previous 12-month rate; descriptive 3σ threshold.|Resíduo padronizado frente à taxa dos 12 meses anteriores; limite descritivo 3σ.
eng.pred.latenessNote|Frecuencia empírica de incumplimiento por prioridad, verificada fuera de muestra.|Empirical lateness frequency by priority, checked out of sample.|Frequência empírica de descumprimento por prioridade, verificada fora da amostra.
eng.pred.planNote|Cumplidas + pendientes × frecuencia histórica de cumplimiento en plazo.|Completed + pending × historical on-time frequency.|Cumpridas + pendentes × frequência histórica de cumprimento no prazo.
eng.pred.persistenceNote|Señal descriptiva: controles críticos con 2 o más fallas en 6 meses.|Descriptive signal: critical controls with 2 or more failures in 6 months.|Sinal descritivo: controles críticos com 2 ou mais falhas em 6 meses.
eng.pred.scenarioNote|Hipótesis: HH futuras ±10 %; la diferencia no es un efecto causal.|Hypothesis: future hours ±10%; the difference is not a causal effect.|Hipótese: HHT futuras ±10 %; a diferença não é um efeito causal.
eng.ev.rate12|{value} frente a meta {target}: {n} eventos en {hh} HH ({from} a {to}).|{value} vs target {target}: {n} events in {hh} hours ({from} to {to}).|{value} frente à meta {target}: {n} eventos em {hh} HHT ({from} a {to}).
eng.ev.monthCount|{month}: {n} accidente(s) registrable(s).|{month}: {n} recordable accident(s).|{month}: {n} acidente(s) registrável(is).
eng.ev.hipo|{month}: {n} evento(s) de alto potencial ({field}).|{month}: {n} high-potential event(s) ({field}).|{month}: {n} evento(s) de alto potencial ({field}).
eng.ev.hh|{month}: {hh} HH.|{month}: {hh} hours.|{month}: {hh} HHT.
eng.ev.ssoma|{month}: puntaje {value}; media previa {mean}.|{month}: score {value}; previous mean {mean}.|{month}: pontuação {value}; média anterior {mean}.
eng.ev.notClosed|{month}: accidentes sin cierre.|{month}: accidents not closed.|{month}: acidentes sem fechamento.
eng.ev.noHeadcount|{month}: dotación ausente.|{month}: headcount missing.|{month}: efetivo ausente.
eng.ev.sourceLag|Último dato {last}; corte {cutoff}.|Latest data {last}; cutoff {cutoff}.|Último dado {last}; corte {cutoff}.
eng.ev.control|Control {control} · riesgo {risk}: última verificación fallida sin recuperación.|Control {control} · risk {risk}: latest verification failed with no recovery.|Controle {control} · risco {risk}: última verificação falhou sem recuperação.
eng.ev.ratio|{num} de {den}.|{num} of {den}.|{num} de {den}.
eng.ev.action|Acción {id}: {days} días de retraso; vencimiento original {due}.|Action {id}: {days} days late; original due date {due}.|Ação {id}: {days} dias de atraso; vencimento original {due}.
eng.role.sst|SST (sugerido, por configurar)|OHS (suggested, to be configured)|SST (sugerido, a configurar)
eng.role.operations|Operaciones (sugerido, por configurar)|Operations (suggested, to be configured)|Operações (sugerido, a configurar)
eng.role.health|Salud Ocupacional (sugerido, por configurar)|Occupational Health (suggested, to be configured)|Saúde Ocupacional (sugerido, a configurar)
eng.role.program|Responsable de programa (sugerido, por configurar)|Program owner (suggested, to be configured)|Responsável de programa (sugerido, a configurar)
eng.role.data|Administración de datos (sugerido, por configurar)|Data administration (suggested, to be configured)|Administração de dados (sugerido, a configurar)
eng.sig.ltifr12.title|LTIFR de 12 meses sobre la meta|12-month LTIFR above target|LTIFR de 12 meses acima da meta
eng.sig.ltifr12.what|LTIFR de 12 meses {value} frente a la referencia {target}.|12-month LTIFR {value} vs reference {target}.|LTIFR de 12 meses {value} frente à referência {target}.
eng.sig.ltifr12.rec|Recomendación: revisar los accidentes incapacitantes del alcance y verificar sus controles.|Recommendation: review the lost-time accidents in scope and verify their controls.|Recomendação: revisar os acidentes com afastamento do escopo e verificar seus controles.
eng.sig.trifr12.title|TRIFR de 12 meses sobre la meta|12-month TRIFR above target|TRIFR de 12 meses acima da meta
eng.sig.trifr12.what|TRIFR reportado de 12 meses {value} frente a la meta {target}.|12-month reported TRIFR {value} vs target {target}.|TRIFR informado de 12 meses {value} frente à meta {target}.
eng.sig.trifr12.rec|Recomendación: analizar los accidentes registrables por proyecto y priorizar verificaciones.|Recommendation: analyse recordable accidents by project and prioritise verifications.|Recomendação: analisar os acidentes registráveis por projeto e priorizar verificações.
eng.sig.streak3.title|Accidentes registrables tres meses seguidos|Recordable accidents three months in a row|Acidentes registráveis três meses seguidos
eng.sig.streak3.what|{n} accidentes registrables en los últimos 3 meses, con al menos uno cada mes.|{n} recordable accidents in the last 3 months, at least one every month.|{n} acidentes registráveis nos últimos 3 meses, ao menos um por mês.
eng.sig.streak3.rec|Recomendación: revisar en terreno las tareas involucradas y sus controles.|Recommendation: review the tasks involved and their controls in the field.|Recomendação: revisar em campo as tarefas envolvidas e seus controles.
eng.sig.hipo3.title|Evento de alto potencial reciente|Recent high-potential event|Evento de alto potencial recente
eng.sig.hipo3.what|{n} evento(s) de alto potencial en los últimos 3 meses.|{n} high-potential event(s) in the last 3 months.|{n} evento(s) de alto potencial nos últimos 3 meses.
eng.sig.hipo3.rec|Recomendación: confirmar la investigación y la verificación de los controles críticos asociados.|Recommendation: confirm the investigation and the verification of the related critical controls.|Recomendação: confirmar a investigação e a verificação dos controles críticos associados.
eng.sig.hhRamp.title|Exposición en aumento rápido|Exposure rising fast|Exposição em aumento rápido
eng.sig.hhRamp.what|Las horas trabajadas crecieron {pct} % en 3 meses.|Hours worked grew {pct}% in 3 months.|As horas trabalhadas cresceram {pct} % em 3 meses.
eng.sig.hhRamp.rec|Recomendación: confirmar inducciones, supervisión y controles para el personal nuevo.|Recommendation: confirm inductions, supervision and controls for new personnel.|Recomendação: confirmar integrações, supervisão e controles para o pessoal novo.
eng.sig.ssomaDrop.title|Caída del puntaje SSOMA|SSOMA score drop|Queda da pontuação SSOMA
eng.sig.ssomaDrop.what|El puntaje bajó {drop} puntos frente a la media de los 3 meses previos.|The score fell {drop} points vs the mean of the previous 3 months.|A pontuação caiu {drop} pontos frente à média dos 3 meses anteriores.
eng.sig.ssomaDrop.rec|Recomendación: revisar los componentes del puntaje que bajaron.|Recommendation: review the score components that fell.|Recomendação: revisar os componentes da pontuação que caíram.
eng.sig.notClosed.title|Numeradores sin cierre|Numerators not closed|Numeradores sem fechamento
eng.sig.notClosed.what|{n} proyecto-mes con horas pero sin cierre de accidentes ({months}).|{n} project-months with hours but accidents not closed ({months}).|{n} projeto-mês com horas mas sem fechamento de acidentes ({months}).
eng.sig.notClosed.rec|Recomendación: solicitar el cierre de accidentes del mes a la fuente.|Recommendation: ask the source to close the month's accidents.|Recomendação: solicitar à fonte o fechamento dos acidentes do mês.
eng.sig.noHeadcount.title|Dotación ausente|Headcount missing|Efetivo ausente
eng.sig.noHeadcount.what|{n} proyecto-mes con horas trabajadas y sin dotación.|{n} project-months with hours worked and no headcount.|{n} projeto-mês com horas trabalhadas e sem efetivo.
eng.sig.noHeadcount.rec|Recomendación: completar la dotación mensual en la fuente.|Recommendation: complete the monthly headcount in the source.|Recomendação: completar o efetivo mensal na fonte.
eng.sig.reconMaterial.title|Diferencias materiales de conciliación|Material reconciliation differences|Diferenças materiais de conciliação
eng.sig.reconMaterial.what|{n} diferencia(s) material(es) entre la cifra de origen y la recalculada.|{n} material difference(s) between the source figure and the recalculated one.|{n} diferença(s) material(is) entre o valor de origem e o recalculado.
eng.sig.reconMaterial.rec|Recomendación: revisar las celdas indicadas en el registro de conciliación.|Recommendation: review the cells listed in the reconciliation log.|Recomendação: revisar as células indicadas no registro de conciliação.
eng.sig.sourceLag.title|Fuente atrasada frente al corte|Source behind the cutoff|Fonte atrasada em relação ao corte
eng.sig.sourceLag.what|La fuente lleva {lag} mes(es) de atraso; último dato {last}.|The source is {lag} month(s) behind; latest data {last}.|A fonte está {lag} mês(es) atrasada; último dado {last}.
eng.sig.sourceLag.rec|Recomendación: solicitar la actualización de la fuente.|Recommendation: request an update of the source.|Recomendação: solicitar a atualização da fonte.
eng.sig.criticalFailure.title|Falla crítica activa|Active critical failure|Falha crítica ativa
eng.sig.criticalFailure.what|El control crítico {control} falló y no tiene recuperación verificada.|Critical control {control} failed and has no verified recovery.|O controle crítico {control} falhou e não tem recuperação verificada.
eng.sig.criticalFailure.rec|Recomendación: restablecer el control y verificar su recuperación antes de continuar la tarea.|Recommendation: restore the control and verify its recovery before the task continues.|Recomendação: restabelecer o controle e verificar sua recuperação antes de continuar a tarefa.
eng.sig.verifCoverage.title|Cobertura de verificación baja|Low verification coverage|Cobertura de verificação baixa
eng.sig.verifCoverage.what|Cobertura de verificación crítica {pct} % (umbral {min} %).|Critical verification coverage {pct}% (threshold {min}%).|Cobertura de verificação crítica {pct} % (limite {min} %).
eng.sig.verifCoverage.rec|Recomendación: ejecutar las verificaciones exigibles pendientes.|Recommendation: carry out the pending due verifications.|Recomendação: executar as verificações exigíveis pendentes.
eng.sig.actionsOverdue.title|Acciones críticas vencidas|Overdue critical actions|Ações críticas vencidas
eng.sig.actionsOverdue.what|{n} acción(es) crítica(s) abierta(s) con vencimiento original superado.|{n} open critical action(s) past the original due date.|{n} ação(ões) crítica(s) aberta(s) com vencimento original ultrapassado.
eng.sig.actionsOverdue.rec|Recomendación: cerrar o escalar las acciones críticas vencidas.|Recommendation: close or escalate the overdue critical actions.|Recomendação: encerrar ou escalar as ações críticas vencidas.
eng.sig.planToDate.title|Plan anual por debajo del umbral|Annual plan below threshold|Plano anual abaixo do limite
eng.sig.planToDate.what|Cumplimiento del plan a la fecha {pct} % (umbral {min} %).|Plan compliance to date {pct}% (threshold {min}%).|Cumprimento do plano até a data {pct} % (limite {min} %).
eng.sig.planToDate.rec|Recomendación: recuperar las actividades exigibles atrasadas.|Recommendation: recover the overdue due activities.|Recomendação: recuperar as atividades exigíveis atrasadas.
eng.sig.surveillance.title|Vigilancia médica por debajo del umbral|Medical surveillance below threshold|Vigilância médica abaixo do limite
eng.sig.surveillance.what|Vigilancia médica vigente {pct} % (umbral {min} %).|Current medical surveillance {pct}% (threshold {min}%).|Vigilância médica vigente {pct} % (limite {min} %).
eng.sig.surveillance.rec|Recomendación: programar las evaluaciones médicas pendientes.|Recommendation: schedule the pending medical evaluations.|Recomendação: agendar as avaliações médicas pendentes.
eng.next.action|Cerrar la acción {id} ({days} días de retraso).|Close action {id} ({days} days late).|Encerrar a ação {id} ({days} dias de atraso).
eng.next.recon|Resolver {n} diferencia(s) material(es) de conciliación.|Resolve {n} material reconciliation difference(s).|Resolver {n} diferença(s) material(is) de conciliação.
eng.next.module.controls|Cargar el registro de controles críticos y verificaciones.|Load the critical-control and verification register.|Carregar o registro de controles críticos e verificações.
eng.next.module.plan|Cargar el plan anual con programado, ejecutado, vencimiento y evidencia.|Load the annual plan with scheduled, done, due date and evidence.|Carregar o plano anual com programado, executado, vencimento e evidência.
eng.next.module.actions|Cargar el registro de acciones con responsables, vencimientos y cierres.|Load the action register with owners, due dates and closures.|Carregar o registro de ações com responsáveis, vencimentos e encerramentos.
eng.next.module.health|Cargar los agregados de salud ocupacional.|Load the occupational-health aggregates.|Carregar os agregados de saúde ocupacional.
eng.next.module.hygiene|Cargar las mediciones de higiene por agente.|Load the hygiene measurements by agent.|Carregar as medições de higiene por agente.
eng.next.module.cases|Cargar el detalle de eventos y casos (cuerpo, mecanismo).|Load the event and case detail (body part, mechanism).|Carregar o detalhe de eventos e casos (corpo, mecanismo).
eng.next.module.training|Confirmar la unidad de las horas de capacitación.|Confirm the unit of the training hours.|Confirmar a unidade das horas de capacitação.
eng.next.module.programs|Cargar los agregados de programas preventivos.|Load the preventive-program aggregates.|Carregar os agregados de programas preventivos.
eng.next.module.projectsGeo|Validar el maestro de coordenadas de proyectos.|Validate the project-coordinates master.|Validar o cadastro de coordenadas dos projetos.
eng.flag.small_exposure|Exposición pequeña: interpretar la tasa con su intervalo.|Small exposure: read the rate with its interval.|Exposição pequena: interpretar a taxa com seu intervalo.
eng.flag.mixed_definitions|Definiciones mixtas: los países usan campos distintos.|Mixed definitions: countries use different fields.|Definições mistas: os países usam campos diferentes.
eng.flag.recalculated_differs|La cifra recalculada difiere de la guardada en el origen.|The recalculated figure differs from the stored one.|O valor recalculado difere do guardado na origem.
eng.flag.reported_count|Conteo reportado: sin deduplicación comprobable.|Reported count: deduplication cannot be verified.|Contagem informada: sem deduplicação comprovável.
eng.flag.demo|Datos de demostración|Demo data|Dados de demonstração
eng.flag.simulation|Simulación sin validez operativa|Simulation with no operational validity|Simulação sem validade operacional
eng.flag.target_scope_unconfirmed|Meta corporativa: su aplicación a este país no está confirmada.|Corporate target: its application to this country is not confirmed.|Meta corporativa: sua aplicação a este país não está confirmada.
eng.flag.active_critical_failure|Falla crítica activa|Active critical failure|Falha crítica ativa
eng.state.ok|Válido|Valid|Válido
eng.state.zero|Cero real|True zero|Zero real
eng.state.nd|N/D|N/A (no data)|N/D
eng.state.na|No aplica|Not applicable|Não se aplica
eng.state.pending|Fuente pendiente|Source pending|Fonte pendente
eng.state.insufficient|Datos insuficientes|Insufficient data|Dados insuficientes
eng.state.disabled|Deshabilitado|Disabled|Desabilitado
eng.status.good|En meta|On target|Na meta
eng.status.warn|Atención|Watch|Atenção
eng.status.crit|Crítico|Critical|Crítico
eng.status.neutral|Sin meta|No target|Sem meta
eng.status.nodata|Sin dato|No data|Sem dado
eng.status.noexposure|Sin exposición|No exposure|Sem exposição
eng.status.na|No aplica|Not applicable|Não se aplica
eng.priority.critical|Crítica|Critical|Crítica
eng.priority.high|Alta|High|Alta
eng.priority.medium|Media|Medium|Média
eng.priority.low|Baja|Low|Baixa
`;
