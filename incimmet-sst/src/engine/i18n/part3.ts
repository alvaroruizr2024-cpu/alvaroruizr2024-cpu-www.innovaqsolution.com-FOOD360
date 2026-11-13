/** clave|es|en|pt — etiquetas de medidas, niveles, riesgos, mecanismos, cuerpo, programas, exportación y metodología local. */
export const PART3 = `
eng.measure.hh|Horas trabajadas|Hours worked|Horas trabalhadas
eng.measure.workers|Dotación|Headcount|Efetivo
eng.measure.lostDays|Días perdidos|Lost days|Dias perdidos
eng.measure.chargedDays|Días cargados|Charged days|Dias debitados
eng.measure.accFatal|Accidentes mortales|Fatal accidents|Acidentes fatais
eng.measure.accLti|Accidentes incapacitantes|Lost-time accidents|Acidentes com afastamento
eng.measure.accNv3|Accidentes nivel 3|Level 3 accidents|Acidentes nível 3
eng.measure.accNv2|Accidentes nivel 2|Level 2 accidents|Acidentes nível 2
eng.measure.accNv1|Accidentes nivel 1|Level 1 accidents|Acidentes nível 1
eng.measure.accNoLostTime|Accidentes sin tiempo perdido|Accidents without lost time|Acidentes sem afastamento
eng.measure.accPerson|Accidentes a la persona|Accidents to persons|Acidentes pessoais
eng.measure.accProperty|Accidentes con daño material|Property-damage accidents|Acidentes com dano material
eng.measure.incPerson|Incidentes a la persona|Incidents involving persons|Incidentes pessoais
eng.measure.incProperty|Incidentes materiales|Property incidents|Incidentes materiais
eng.measure.incInvestigated|Incidentes investigados|Incidents investigated|Incidentes investigados
eng.measure.hpriLoss|Alto potencial con pérdida|High potential with loss|Alto potencial com perda
eng.measure.hpriNoLoss|Alto potencial sin pérdida|High potential without loss|Alto potencial sem perda
eng.measure.pg56|Potencial de gravedad 5–6|Severity potential 5–6|Potencial de gravidade 5–6
eng.measure.pg4|Potencial de gravedad 4|Severity potential 4|Potencial de gravidade 4
eng.measure.pg3|Potencial de gravedad 3|Severity potential 3|Potencial de gravidade 3
eng.measure.pg2|Potencial de gravedad 2|Severity potential 2|Potencial de gravidade 2
eng.measure.pg1|Potencial de gravedad 1|Severity potential 1|Potencial de gravidade 1
eng.measure.trainingHours|Horas de capacitación|Training hours|Horas de capacitação
eng.measure.ssomaScore|Puntaje SSOMA|SSOMA score|Pontuação SSOMA
eng.measure.fatalities|Fatalidades (personas)|Fatalities (persons)|Fatalidades (pessoas)
eng.measure.casesInjury|Casos de lesión|Injury cases|Casos de lesão
eng.measure.casesLti|Casos con tiempo perdido|Lost-time cases|Casos com afastamento
eng.measure.casesRestricted|Casos con trabajo restringido|Restricted-work cases|Casos com trabalho restrito
eng.measure.casesMedical|Casos con tratamiento médico|Medical-treatment cases|Casos com tratamento médico
eng.measure.casesFirstAid|Casos de primeros auxilios|First-aid cases|Casos de primeiros socorros
eng.measure.nearMiss|Casi accidentes|Near misses|Quase acidentes
eng.measure.hazardReports|Reportes de peligro|Hazard reports|Relatos de perigo
eng.level.5|Nivel 5–6 · mortal|Level 5–6 · fatal|Nível 5–6 · fatal
eng.level.4|Nivel 4 · incapacitante|Level 4 · lost time|Nível 4 · com afastamento
eng.level.3|Nivel 3|Level 3|Nível 3
eng.level.2|Nivel 2|Level 2|Nível 2
eng.level.1|Nivel 1|Level 1|Nível 1
eng.agent.silica|Sílice y polvo|Silica and dust|Sílica e poeira
eng.agent.noise|Ruido|Noise|Ruído
eng.agent.vibration|Vibración|Vibration|Vibração
eng.agent.heat|Calor|Heat|Calor
eng.agent.gases|Gases|Gases|Gases
eng.agent.other|Otros agentes|Other agents|Outros agentes
eng.body.head|Cabeza|Head|Cabeça
eng.body.eyes|Ojos|Eyes|Olhos
eng.body.neck|Cuello|Neck|Pescoço
eng.body.shoulder_l|Hombro izquierdo|Left shoulder|Ombro esquerdo
eng.body.shoulder_r|Hombro derecho|Right shoulder|Ombro direito
eng.body.arm_l|Brazo izquierdo|Left arm|Braço esquerdo
eng.body.arm_r|Brazo derecho|Right arm|Braço direito
eng.body.hand_l|Mano izquierda|Left hand|Mão esquerda
eng.body.hand_r|Mano derecha|Right hand|Mão direita
eng.body.chest|Tórax|Chest|Tórax
eng.body.back|Espalda|Back|Costas
eng.body.abdomen|Abdomen|Abdomen|Abdômen
eng.body.hip|Cadera|Hip|Quadril
eng.body.leg_l|Pierna izquierda|Left leg|Perna esquerda
eng.body.leg_r|Pierna derecha|Right leg|Perna direita
eng.body.knee_l|Rodilla izquierda|Left knee|Joelho esquerdo
eng.body.knee_r|Rodilla derecha|Right knee|Joelho direito
eng.body.foot_l|Pie izquierdo|Left foot|Pé esquerdo
eng.body.foot_r|Pie derecho|Right foot|Pé direito
eng.mech.struck_by|Golpeado por objeto|Struck by object|Atingido por objeto
eng.mech.caught_between|Atrapamiento|Caught in or between|Aprisionamento
eng.mech.fall_same_level|Caída al mismo nivel|Fall on the same level|Queda no mesmo nível
eng.mech.fall_from_height|Caída de altura|Fall from height|Queda de altura
eng.mech.overexertion|Sobreesfuerzo|Overexertion|Sobre-esforço
eng.mech.contact_energy|Contacto con energía|Contact with energy|Contato com energia
eng.mech.vehicle|Vehículo o equipo móvil|Vehicle or mobile equipment|Veículo ou equipamento móvel
eng.mech.rockfall|Caída de rocas|Rockfall|Queda de rochas
eng.mech.chemical_exposure|Exposición química|Chemical exposure|Exposição química
eng.mech.cut_puncture|Corte o punción|Cut or puncture|Corte ou perfuração
eng.risk.vehicle_person|Interacción vehículo–persona|Vehicle–person interaction|Interação veículo–pessoa
eng.risk.rockfall|Caída de rocas|Rockfall|Queda de rochas
eng.risk.ground_support|Sostenimiento|Ground support|Sustentação
eng.risk.hazardous_energy|Energías peligrosas|Hazardous energy|Energias perigosas
eng.risk.work_at_height|Trabajo en altura|Work at height|Trabalho em altura
eng.risk.lifting|Izaje|Lifting|Içamento
eng.risk.confined_space|Espacios confinados|Confined spaces|Espaços confinados
eng.risk.explosives|Explosivos|Explosives|Explosivos
eng.risk.fire|Incendio|Fire|Incêndio
eng.risk.ventilation_gases|Ventilación y gases|Ventilation and gases|Ventilação e gases
eng.risk.hazardous_substances|Sustancias peligrosas|Hazardous substances|Substâncias perigosas
eng.risk.machinery|Maquinaria|Machinery|Maquinário
eng.risk.backfill_pressure|Presión en relleno de minas|Mine backfill pressure|Pressão em enchimento de minas
eng.plan.training|Capacitación|Training|Capacitação
eng.plan.drills|Simulacros|Drills|Simulados
eng.plan.inspections|Inspecciones|Inspections|Inspeções
eng.plan.audits|Auditorías|Audits|Auditorias
eng.plan.leadership|Liderazgo|Leadership|Liderança
eng.plan.critical_controls|Controles críticos|Critical controls|Controles críticos
eng.plan.observations|Observaciones|Observations|Observações
eng.plan.investigations|Investigaciones|Investigations|Investigações
eng.plan.actions|Acciones|Actions|Ações
eng.plan.campaigns|Campañas|Campaigns|Campanhas
eng.plan.committees|Comités|Committees|Comitês
eng.plan.health_surveillance|Vigilancia de salud|Health surveillance|Vigilância de saúde
eng.program.risk_assessment|Evaluación de riesgos|Risk assessment|Avaliação de riscos
eng.program.controls_implemented|Controles implementados|Controls implemented|Controles implementados
eng.program.inspections|Inspecciones|Inspections|Inspeções
eng.program.competencies|Competencias|Competencies|Competências
eng.program.training|Capacitación|Training|Capacitação
eng.program.training_effectiveness|Efectividad de capacitación|Training effectiveness|Efetividade da capacitação
eng.program.permits|Permisos de alto riesgo|High-risk permits|Permissões de alto risco
eng.program.maintenance|Mantenimiento crítico|Critical maintenance|Manutenção crítica
eng.program.emergency|Preparación para emergencias|Emergency preparedness|Preparação para emergências
eng.program.drills|Simulacros|Drills|Simulados
eng.program.audits|Auditorías|Audits|Auditorias
eng.program.moc|Gestión del cambio|Management of change|Gestão de mudanças
eng.program.legal|Cumplimiento legal|Legal compliance|Conformidade legal
eng.program.leadership|Liderazgo visible|Visible leadership|Liderança visível
eng.program.participation|Participación preventiva|Preventive participation|Participação preventiva
eng.program.report_quality|Calidad de reportes|Report quality|Qualidade dos relatos
eng.program.interventions|Intervenciones preventivas|Preventive interventions|Intervenções preventivas
eng.program.investigations|Investigaciones|Investigations|Investigações
eng.program.health_surveillance|Vigilancia médica|Medical surveillance|Vigilância médica
eng.program.restrictions|Seguimiento de restricciones|Restriction follow-up|Acompanhamento de restrições
eng.program.hygiene_monitoring|Monitoreo higiénico|Hygiene monitoring|Monitoramento de higiene
eng.program.ergonomics|Ergonomía|Ergonomics|Ergonomia
eng.program.fatigue|Fatiga|Fatigue|Fadiga
eng.program.psychosocial|Riesgo psicosocial|Psychosocial risk|Risco psicossocial
eng.program.absenteeism|Ausentismo médico|Medical absenteeism|Absenteísmo médico
eng.program.occupational_disease|Enfermedad laboral|Occupational disease|Doença ocupacional
eng.module.pending.controls|Fuente pendiente: registro de controles críticos y verificaciones.|Source pending: critical-control and verification register.|Fonte pendente: registro de controles críticos e verificações.
eng.module.pending.plan|Base del plan pendiente: no se inventa cumplimiento.|Plan source pending: no compliance is invented.|Base do plano pendente: não se inventa cumprimento.
eng.module.pending.actions|Fuente pendiente: registro de acciones.|Source pending: action register.|Fonte pendente: registro de ações.
eng.module.pending.health|Fuente pendiente: agregados de salud ocupacional.|Source pending: occupational-health aggregates.|Fonte pendente: agregados de saúde ocupacional.
eng.module.pending.hygiene|Fuente pendiente: mediciones de higiene.|Source pending: hygiene measurements.|Fonte pendente: medições de higiene.
eng.module.pending.cases|Fuente pendiente: detalle de eventos y casos.|Source pending: event and case detail.|Fonte pendente: detalhe de eventos e casos.
eng.module.pending.training|Capacitación parcial: unidad de las horas por confirmar.|Training partial: unit of the hours to be confirmed.|Capacitação parcial: unidade das horas a confirmar.
eng.module.pending.programs|Fuente pendiente: agregados de programas preventivos.|Source pending: preventive-program aggregates.|Fonte pendente: agregados de programas preventivos.
eng.module.pending.projectsGeo|Maestro de coordenadas pendiente: países y lista de proyectos.|Coordinates master pending: countries and project list.|Cadastro de coordenadas pendente: países e lista de projetos.
eng.module.pending.predictive|Predicción deshabilitada: solo señales tempranas por reglas.|Prediction disabled: rule-based early signals only.|Predição desabilitada: apenas sinais precoces por regras.
eng.req.controls|Controles (riesgo, barrera, estándar, frecuencia, crítico) y verificaciones (vencimiento, fecha, resultado, evidencia, recuperación).|Controls (risk, barrier, standard, frequency, critical) and verifications (due date, date, result, evidence, recovery).|Controles (risco, barreira, padrão, frequência, crítico) e verificações (vencimento, data, resultado, evidência, recuperação).
eng.req.plan|Actividades: programa, peso, vencimiento base y vigente, reprogramaciones, ejecución, aceptación y evidencia.|Activities: program, weight, baseline and current due date, reschedules, completion, acceptance and evidence.|Atividades: programa, peso, vencimento base e vigente, reprogramações, execução, aceite e evidência.
eng.req.actions|Acciones: origen, hallazgo, prioridad, apertura, vencimiento original y vigente, cierre, aceptación y efectividad.|Actions: source, finding, priority, opening, original and current due date, closure, acceptance and effectiveness.|Ações: origem, achado, prioridade, abertura, vencimento original e vigente, encerramento, aceite e efetividade.
eng.req.health|Agregados mensuales por programa: elegibles, realizados, conformes (sin personas).|Monthly aggregates by program: eligible, done, conforming (no individuals).|Agregados mensais por programa: elegíveis, realizados, conformes (sem pessoas).
eng.req.hygiene|Mediciones por agente y método: válidas, sobre límite, personas evaluadas y sobreexpuestas.|Measurements by agent and method: valid, over limit, people evaluated and overexposed.|Medições por agente e método: válidas, acima do limite, pessoas avaliadas e superexpostas.
eng.req.cases|Eventos (fecha, tipo, mecanismo, riesgo, potencial) y casos (clasificación, días, zonas del cuerpo).|Events (date, type, mechanism, risk, potential) and cases (classification, days, body zones).|Eventos (data, tipo, mecanismo, risco, potencial) e casos (classificação, dias, zonas do corpo).
eng.req.training|Horas-persona de capacitación por proyecto y mes, con asignaciones exigibles y en plazo.|Training person-hours by project and month, with due and on-time assignments.|Horas-pessoa de capacitação por projeto e mês, com atribuições exigíveis e no prazo.
eng.req.programs|Agregados mensuales numerador/denominador por programa preventivo.|Monthly numerator/denominator aggregates per preventive program.|Agregados mensais numerador/denominador por programa preventivo.
eng.req.projectsGeo|Maestro de proyectos con latitud, longitud, fuente y validación.|Project master with latitude, longitude, source and validation.|Cadastro de projetos com latitude, longitude, fonte e validação.
eng.req.predictive|36 meses y 30 eventos como mínimo, validación fuera de muestra y aprobación explícita.|At least 36 months and 30 events, out-of-sample validation and explicit approval.|No mínimo 36 meses e 30 eventos, validação fora da amostra e aprovação explícita.
eng.export.kpis|Resumen de indicadores|KPI summary|Resumo de indicadores
eng.export.monthly|Hechos mensuales|Monthly facts|Fatos mensais
eng.export.projects|Proyectos|Projects|Projetos
eng.export.signals|Señales tempranas|Early signals|Sinais precoces
eng.export.reconciliation|Conciliación|Reconciliation|Conciliação
eng.export.meta.dataset|Conjunto de datos|Dataset|Conjunto de dados
eng.export.meta.demo|Marca DEMO|DEMO mark|Marca DEMO
eng.export.meta.period|Período|Period|Período
eng.export.meta.compare|Comparación|Comparison|Comparação
eng.export.meta.filters|Filtros|Filters|Filtros
eng.export.meta.language|Idioma|Language|Idioma
eng.export.meta.cutoff|Corte de datos|Data cutoff|Corte de dados
eng.export.meta.units|Unidades|Units|Unidades
eng.export.meta.version|Versión de metodología|Methodology version|Versão da metodologia
eng.export.demoYes|DEMO · datos de demostración sin validez operativa|DEMO · demo data with no operational validity|DEMO · dados de demonstração sem validade operacional
eng.export.demoNo|Datos cargados por el usuario|Data loaded by the user|Dados carregados pelo usuário
eng.export.unitsNote|Tasas por 1.000.000 de horas trabajadas salvo indicación; porcentajes en %; cifras sin redondear.|Rates per 1,000,000 hours worked unless stated; percentages in %; figures unrounded.|Taxas por 1.000.000 de horas trabalhadas salvo indicação; percentuais em %; valores sem arredondar.
eng.export.col.id|ID|ID|ID
eng.export.col.indicator|Indicador|Indicator|Indicador
eng.export.col.value|Valor|Value|Valor
eng.export.col.unit|Unidad|Unit|Unidade
eng.export.col.state|Estado del dato|Data state|Estado do dado
eng.export.col.numerator|Numerador|Numerator|Numerador
eng.export.col.denominator|Denominador|Denominator|Denominador
eng.export.col.constant|Constante|Constant|Constante
eng.export.col.target|Meta|Target|Meta
eng.export.col.status|Semáforo|Status|Semáforo
eng.export.col.flags|Avisos|Flags|Avisos
eng.export.col.reason|Motivo|Reason|Motivo
eng.export.col.country|País|Country|País
eng.export.col.project|Proyecto|Project|Projeto
eng.export.col.month|Mes|Month|Mês
eng.export.col.projectStatus|Estado del proyecto|Project status|Estado do projeto
eng.export.col.hh|Horas trabajadas|Hours worked|Horas trabalhadas
eng.export.col.workers|Dotación media|Average headcount|Efetivo médio
eng.export.col.fatal|Accidentes mortales|Fatal accidents|Acidentes fatais
eng.export.col.lti|Accidentes incapacitantes|Lost-time accidents|Acidentes com afastamento
eng.export.col.tri|Accidentes registrables|Recordable accidents|Acidentes registráveis
eng.export.col.hipo|Alto potencial|High potential|Alto potencial
eng.export.col.lostDays|Días perdidos|Lost days|Dias perdidos
eng.export.col.ltifr|LTIFR|LTIFR|LTIFR
eng.export.col.trifr|TRIFR reportado|Reported TRIFR|TRIFR informado
eng.export.col.ssoma|Puntaje SSOMA|SSOMA score|Pontuação SSOMA
eng.export.col.attention|Puntaje de atención (0–100)|Attention score (0–100)|Pontuação de atenção (0–100)
eng.export.col.priority|Prioridad|Priority|Prioridade
eng.export.col.rule|Regla|Rule|Regra
eng.export.col.title|Señal|Signal|Sinal
eng.export.col.whatChanged|Qué cambió|What changed|O que mudou
eng.export.col.evidence|Evidencia|Evidence|Evidência
eng.export.col.ownerRole|Rol sugerido|Suggested role|Papel sugerido
eng.export.col.dueInDays|Plazo sugerido (días)|Suggested deadline (days)|Prazo sugerido (dias)
eng.export.col.recommendation|Control recomendado|Recommended control|Controle recomendado
eng.export.col.severity|Severidad|Severity|Severidade
eng.export.col.months|Meses|Months|Meses
eng.export.col.kpis|Indicadores afectados|KPIs affected|Indicadores afetados
eng.export.col.issue|Hallazgo|Issue|Achado
eng.export.col.reported|Valor de origen|Source value|Valor de origem
eng.export.col.recalculated|Valor recalculado|Recalculated value|Valor recalculado
eng.export.col.delta|Diferencia|Difference|Diferença
eng.export.col.sourceChosen|Fuente elegida|Source chosen|Fonte escolhida
eng.local.PE.profile|Perú · minería: IF, IS e IA por 1.000.000 HH (metodología configurada).|Peru · mining: IF, IS and IA per 1,000,000 hours (configured methodology).|Peru · mineração: IF, IS e IA por 1.000.000 HHT (metodologia configurada).
eng.local.PE.validity|Verificar frente al D.S. 024-2016-EM y sus modificatorias vigentes.|Verify against D.S. 024-2016-EM and its amendments in force.|Verificar frente ao D.S. 024-2016-EM e suas alterações vigentes.
eng.local.PE.population|Población según la fuente cargada (propios y contratistas sin separar).|Population as in the loaded source (own staff and contractors not separated).|População conforme a fonte carregada (próprios e contratados sem separar).
eng.local.PE.note|Días cargados no disponibles por separado en la fuente: IS usa los días informados.|Charged days are not available separately in the source: IS uses the reported days.|Dias debitados não disponíveis separadamente na fonte: IS usa os dias informados.
eng.local.CO.profile|Colombia: frecuencia, severidad y mortalidad con denominador de trabajadores.|Colombia: frequency, severity and fatality proportion with a worker denominator.|Colômbia: frequência, severidade e mortalidade com denominador de trabalhadores.
eng.local.CO.validity|Verificar vigencia y aplicabilidad de la Resolución 0312 de 2019.|Verify the validity and applicability of Resolution 0312 of 2019.|Verificar vigência e aplicabilidade da Resolução 0312 de 2019.
eng.local.CO.population|Trabajadores del mes según la fuente cargada.|Workers in the month as in the loaded source.|Trabalhadores do mês conforme a fonte carregada.
eng.local.CO.note|Enfermedad laboral y ausentismo requieren agregados de salud (fuente pendiente si no existen).|Occupational disease and absenteeism require health aggregates (source pending if absent).|Doença ocupacional e absenteísmo requerem agregados de saúde (fonte pendente se não existirem).
eng.local.BR.profile|Brasil: TF y TG por 1.000.000 HHT como metodología configurada.|Brazil: TF and TG per 1,000,000 hours worked as a configured methodology.|Brasil: TF e TG por 1.000.000 HHT como metodologia configurada.
eng.local.BR.validity|No son indicadores universales obligatorios de la NR-22; verificar norma técnica y contrato.|Not universal mandatory NR-22 indicators; verify the technical standard and the contract.|Não são indicadores universais obrigatórios da NR-22; verificar norma técnica e contrato.
eng.local.BR.population|Población del formulario estadístico de contratista cargado.|Population of the loaded contractor statistics form.|População do formulário estatístico de contratada carregado.
eng.local.BR.note|El formulario no tiene campo de fatalidad ni niveles: esos indicadores excluyen al país.|The form has no fatality field or levels: those indicators exclude the country.|O formulário não tem campo de fatalidade nem níveis: esses indicadores excluem o país.
eng.local.notComparable|No sumar ni comparar CO01 con PE01, LTIFR o BR01: numeradores y denominadores difieren.|Never add or compare CO01 with PE01, LTIFR or BR01: numerators and denominators differ.|Não somar nem comparar CO01 com PE01, LTIFR ou BR01: numeradores e denominadores diferem.
eng.rule.1|Toda tasa = Σ numeradores / Σ denominadores × constante; nunca un promedio de tasas.|Every rate = Σ numerators / Σ denominators × constant; never an average of rates.|Toda taxa = Σ numeradores / Σ denominadores × constante; nunca uma média de taxas.
eng.rule.2|Cobertura pareada: un proyecto-mes entra solo si numerador y denominador están informados.|Paired coverage: a project-month enters only if numerator and denominator are both reported.|Cobertura pareada: um projeto-mês entra somente se numerador e denominador estiverem informados.
eng.rule.3|Denominador cero o ausente: N/D con motivo. Cero eventos con exposición válida: cero real.|Zero or missing denominator: N/A with a reason. Zero events with valid exposure: true zero.|Denominador zero ou ausente: N/D com motivo. Zero eventos com exposição válida: zero real.
eng.rule.4|Un campo inexistente en una fuente no es cero: el país se excluye y se declara.|A field missing from a source is not zero: the country is excluded and this is stated.|Um campo inexistente em uma fonte não é zero: o país é excluído e isso é declarado.
eng.rule.5|Las metodologías nacionales incompatibles no se consolidan ni se comparan entre sí.|Incompatible national methodologies are never consolidated or compared with each other.|As metodologias nacionais incompatíveis não se consolidam nem se comparam entre si.
eng.rule.6|Variación relativa solo con base distinta de cero; los porcentajes se comparan en puntos porcentuales.|Relative change only with a non-zero base; percentages are compared in percentage points.|Variação relativa somente com base diferente de zero; os percentuais são comparados em pontos percentuais.
eng.rule.7|Ningún verde con una falla crítica activa; reprogramar no borra retrasos.|No green with an active critical failure; rescheduling never erases delays.|Nenhum verde com uma falha crítica ativa; reprogramar não apaga atrasos.
eng.rule.8|El idioma no cambia el perfil normativo ni las cifras.|The language changes neither the regulatory profile nor the figures.|O idioma não altera o perfil normativo nem os números.
`;
