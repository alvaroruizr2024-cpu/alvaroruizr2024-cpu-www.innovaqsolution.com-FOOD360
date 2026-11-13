/** Textos de ingesta y conciliación (espacio rec.*) en ES / EN / PT-BR. Cada entrada: clave → [es, en, pt]. */
import { registerDict, type Dict } from './core';

const T: Record<string, [string, string, string]> = {
  'rec.severity.material': ['Material', 'Material', 'Material'],
  'rec.severity.minor': ['Menor', 'Minor', 'Menor'],
  'rec.severity.info': ['Informativa', 'Informational', 'Informativa'],
  // ---- hallazgos ----
  'rec.issue.consol_omits_blocks': [
    'El consolidado de la fuente no suma {nBlocks} bloque(s) con datos en la fila «{label}»: {blocks} ({n} mes(es)).',
    'The source consolidated row "{label}" leaves out {nBlocks} block(s) that hold data: {blocks} ({n} month(s)).',
    'O consolidado da fonte não soma {nBlocks} bloco(s) com dados na linha «{label}»: {blocks} ({n} mês(es)).'],
  'rec.issue.consol_ref_shifted': [
    'La fórmula del consolidado «{label}» suma celdas de otra fila («{target}») durante {n} mes(es); bloques con datos no sumados: {blocks}.',
    'The consolidated formula for "{label}" adds cells from another row ("{target}") for {n} month(s); blocks with data left out: {blocks}.',
    'A fórmula do consolidado «{label}» soma células de outra linha («{target}») durante {n} mês(es); blocos com dados não somados: {blocks}.'],
  'rec.issue.consol_hardcoded': [
    'El consolidado «{label}» contiene un valor escrito a mano que no coincide con la suma de bloques ({n} mes(es)).',
    'The consolidated row "{label}" holds a typed-in value that does not match the sum of blocks ({n} month(s)).',
    'O consolidado «{label}» contém um valor digitado que não coincide com a soma dos blocos ({n} mês(es)).'],
  'rec.issue.consol_flagged': [
    'El consolidado «{label}» incluye horas marcadas como marcador de posición o resto de plantilla ({n} mes(es)).',
    'The consolidated row "{label}" includes hours flagged as placeholder or template leftover ({n} month(s)).',
    'O consolidado «{label}» inclui horas marcadas como marcador de posição ou resto de modelo ({n} mês(es)).'],
  'rec.issue.consol_differs': [
    'El consolidado «{label}» difiere de la suma de bloques de proyecto sin causa identificada en la fórmula ({n} mes(es)).',
    'The consolidated row "{label}" differs from the sum of project blocks with no cause found in the formula ({n} month(s)).',
    'O consolidado «{label}» difere da soma dos blocos de projeto sem causa identificada na fórmula ({n} mês(es)).'],
  'rec.issue.index_differs.month': [
    'El {indicator} mensual reportado difiere del recalculado desde componentes en {n} mes(es); cifras de {at}.',
    'Reported monthly {indicator} differs from the value recalculated from components in {n} month(s); figures for {at}.',
    'O {indicator} mensal reportado difere do recalculado a partir dos componentes em {n} mês(es); valores de {at}.'],
  'rec.issue.index_differs.ytd': [
    'El {indicator} acumulado del año reportado difiere del recalculado en {n} mes(es); cifras de {at}.',
    'Reported year-to-date {indicator} differs from the recalculated value in {n} month(s); figures for {at}.',
    'O {indicator} acumulado do ano reportado difere do recalculado em {n} mês(es); valores de {at}.'],
  'rec.issue.index_differs.rolling12': [
    'El {indicator} de 12 meses móviles reportado difiere del recalculado en {n} mes(es); cifras de {at}.',
    'Reported rolling 12-month {indicator} differs from the recalculated value in {n} month(s); figures for {at}.',
    'O {indicator} de 12 meses móveis reportado difere do recalculado em {n} mês(es); valores de {at}.'],
  'rec.issue.index_coverage.month': [
    'El {indicator} mensual reportado usa un numerador sin cierre; no es comparable ({n} mes(es)).',
    'Reported monthly {indicator} uses a numerator that is not closed; not comparable ({n} month(s)).',
    'O {indicator} mensal reportado usa um numerador sem fechamento; não é comparável ({n} mês(es)).'],
  'rec.issue.index_coverage.ytd': [
    'El {indicator} acumulado guardado combina meses distintos en numerador y denominador; el recálculo usa solo meses pareados (cifras de {at}).',
    'The stored year-to-date {indicator} mixes different months in numerator and denominator; the recalculation uses paired months only (figures for {at}).',
    'O {indicator} acumulado guardado combina meses diferentes no numerador e no denominador; o recálculo usa apenas meses pareados (valores de {at}).'],
  'rec.issue.index_coverage.rolling12': [
    'El {indicator} de 12 meses guardado combina meses distintos en numerador y denominador; el recálculo usa solo meses pareados (cifras de {at}).',
    'The stored rolling 12-month {indicator} mixes different months in numerator and denominator; the recalculation uses paired months only (figures for {at}).',
    'O {indicator} de 12 meses guardado combina meses diferentes no numerador e no denominador; o recálculo usa apenas meses pareados (valores de {at}).'],
  'rec.issue.error_cells': [
    '{n} celda(s) guardan un error de división (denominador cero o vacío); {imported} se importaron como «sin dato», ninguna como cero.',
    '{n} cell(s) store a division error (zero or empty denominator); {imported} were imported as "no data", none as zero.',
    '{n} célula(s) guardam erro de divisão (denominador zero ou vazio); {imported} foram importadas como «sem dado», nenhuma como zero.'],
  'rec.issue.future_months': [
    '{n} mes(es) posteriores a {last} solo tienen encabezado; no se importan.',
    '{n} month(s) after {last} are header-only; they are not imported.',
    '{n} mês(es) posteriores a {last} têm apenas cabeçalho; não são importados.'],
  'rec.issue.not_closed': [
    'Hay horas trabajadas pero las celdas de accidentes y días están vacías en {n} mes(es): numerador sin cierre, no se asume cero.',
    'Hours worked are present but accident and day cells are empty in {n} month(s): numerator not closed, zero is not assumed.',
    'Há horas trabalhadas mas as células de acidentes e dias estão vazias em {n} mês(es): numerador sem fechamento, não se assume zero.'],
  'rec.issue.template_duplicate': [
    'Horas trabajadas idénticas a las de otro bloque en {n} mes(es): resto de plantilla; todas las medidas de esos meses quedan sin dato.',
    'Hours worked identical to another block in {n} month(s): template leftover; every measure of those months is set to no data.',
    'Horas trabalhadas idênticas às de outro bloco em {n} mês(es): resto de modelo; todas as medidas desses meses ficam sem dado.'],
  'rec.issue.header_dates': [
    '{rows} encabezado(s) de sección tienen fechas vacías ({blank}) o fuera de la secuencia mensual ({wrong}); el mes se toma de la secuencia del propio encabezado.',
    '{rows} section header(s) have blank dates ({blank}) or dates out of the monthly sequence ({wrong}); the month is taken from the sequence of the header itself.',
    '{rows} cabeçalho(s) de seção têm datas vazias ({blank}) ou fora da sequência mensal ({wrong}); o mês é obtido da sequência do próprio cabeçalho.'],
  'rec.issue.placeholder': [
    'Horas trabajadas simbólicas con dotación cero en {n} mes(es): marcador de posición, no exposición.',
    'Token hours worked with zero headcount in {n} month(s): placeholder, not exposure.',
    'Horas trabalhadas simbólicas com efetivo zero em {n} mês(es): marcador de posição, não exposição.'],
  'rec.issue.target_autofill': [
    'La meta «{label}» cambia respecto al valor constante del año, con patrón de autorrelleno; se usa el valor modal del año.',
    'Target "{label}" departs from the constant value of the year in an autofill-like pattern; the modal value of the year is used.',
    'A meta «{label}» muda em relação ao valor constante do ano, com padrão de autopreenchimento; usa-se o valor modal do ano.'],
  'rec.issue.sheets_not_imported': [
    '{n} hoja(s) con vistas superpuestas no se importan ({sheets}); solo se usa «{used}».',
    '{n} sheet(s) with overlapping views are not imported ({sheets}); only "{used}" is used.',
    '{n} planilha(s) com visões sobrepostas não são importadas ({sheets}); usa-se apenas «{used}».'],
  'rec.issue.section_not_imported': [
    'Sección de formato anterior «{title}» (filas {rows}, {blocks} bloque(s), hasta {last}) no importada: vista histórica o copia superpuesta.',
    'Old-format section "{title}" (rows {rows}, {blocks} block(s), up to {last}) not imported: historical view or overlapping copy.',
    'Seção de formato anterior «{title}» (linhas {rows}, {blocks} bloco(s), até {last}) não importada: visão histórica ou cópia sobreposta.'],
  'rec.issue.year_from_filename': [
    'El formulario no indica el año; se tomó {year} del nombre del archivo o de sus metadatos. Confirmar con el período de origen.',
    'The form does not state the year; {year} was taken from the file name or its metadata. Confirm against the source period.',
    'O formulário não indica o ano; {year} foi obtido do nome do arquivo ou dos metadados. Confirmar com o período de origem.'],
  'rec.issue.hidden_sheet': [
    'Hoja oculta «{sheet}» ({cells} celdas) no combinada: año, unidad o procedencia sin confirmar.',
    'Hidden sheet "{sheet}" ({cells} cells) not combined: year, unit or provenance unconfirmed.',
    'Planilha oculta «{sheet}» ({cells} células) não combinada: ano, unidade ou procedência sem confirmar.'],
  'rec.issue.empty_sheet': [
    'La hoja «{sheet}» solo tiene encabezados ({cells} celdas), sin registros: el análisis individual de casos sigue pendiente.',
    'Sheet "{sheet}" holds headers only ({cells} cells), no records: individual case analysis remains pending.',
    'A planilha «{sheet}» tem apenas cabeçalhos ({cells} células), sem registros: a análise individual de casos segue pendente.'],
  'rec.issue.headcount_missing': [
    'La fila de dotación «{label}» no tiene valores mensuales; su total cero es una suma de vacíos.',
    'Headcount row "{label}" has no monthly values; its zero total is a sum of blanks.',
    'A linha de efetivo «{label}» não tem valores mensais; seu total zero é uma soma de vazios.'],
  'rec.issue.location_pending': [
    'Sin maestro aprobado de proyectos: no se asignan cliente, coordenadas ni zona horaria.',
    'No approved project master: client, coordinates and time zone are not assigned.',
    'Sem cadastro mestre aprovado de projetos: não se atribuem cliente, coordenadas nem fuso horário.'],
  'rec.issue.hardcoded_constant': [
    'Valor escrito a mano en la fila «{label}», cuyo patrón es una fórmula ({n} mes(es)).',
    'Typed-in value in row "{label}", whose pattern is a formula ({n} month(s)).',
    'Valor digitado na linha «{label}», cujo padrão é uma fórmula ({n} mês(es)).'],
  'rec.issue.ref_mismatch_no_effect': [
    'La fórmula del consolidado «{label}» apunta a otra fila («{target}») en {n} mes(es), sin efecto numérico.',
    'The consolidated formula for "{label}" points at another row ("{target}") in {n} month(s), with no numeric effect.',
    'A fórmula do consolidado «{label}» aponta para outra linha («{target}») em {n} mês(es), sem efeito numérico.'],
  'rec.issue.composition_change': [
    'La composición de las fórmulas del consolidado cambia durante el año en {rows} fila(s) ({changes} mes(es) con cambio).',
    'The composition of the consolidated formulas changes during the year in {rows} row(s) ({changes} month(s) with a change).',
    'A composição das fórmulas do consolidado muda durante o ano em {rows} linha(s) ({changes} mês(es) com mudança).'],
  'rec.issue.person_row_not_sum': [
    'La fila «{label}» no coincide con la suma de las filas por nivel; los conteos usan las filas por nivel.',
    'Row "{label}" does not equal the sum of the per-level rows; counts use the per-level rows.',
    'A linha «{label}» não coincide com a soma das linhas por nível; as contagens usam as linhas por nível.'],
  'rec.issue.meta_cell_ignored': [
    'La celda bajo «Meta» de la fila «{label}» es una suma que duplica el acumulado: no es meta ni exposición; se ignora.',
    'The cell under "Meta" in row "{label}" is a sum that doubles the accumulated value: neither a target nor exposure; ignored.',
    'A célula sob «Meta» da linha «{label}» é uma soma que duplica o acumulado: não é meta nem exposição; ignorada.'],
  'rec.issue.unlabeled_row': [
    'Fila {row} sin etiqueta con {n} constantes: se ignora.',
    'Row {row} has no label and {n} constants: ignored.',
    'Linha {row} sem rótulo com {n} constantes: ignorada.'],
  'rec.issue.avg_of_pct': [
    'El acumulado de «{label}» es un promedio de porcentajes mensuales; la intensidad usa Σ horas / Σ horas trabajadas.',
    'The accumulated "{label}" is an average of monthly percentages; intensity uses Σ hours / Σ hours worked.',
    'O acumulado de «{label}» é uma média de percentuais mensais; a intensidade usa Σ horas / Σ horas trabalhadas.'],
  'rec.issue.source_missing': [
    'Fuente «{source}» no cargada: el país queda sin datos hasta importarla.',
    'Source "{source}" not loaded: the country has no data until it is imported.',
    'Fonte «{source}» não carregada: o país fica sem dados até importá-la.'],
  'rec.issue.training_unit': [
    'Unidad de «{label}» por confirmar (horas de sesión u horas-persona).',
    'Unit of "{label}" to be confirmed (session hours or person-hours).',
    'Unidade de «{label}» a confirmar (horas de sessão ou horas-pessoa).'],
  'rec.issue.lost_days_combined': [
    'La fila «{label}» combina días perdidos y días cargados; no se separan.',
    'Row "{label}" combines lost days and charged days; they are not split.',
    'A linha «{label}» combina dias perdidos e dias debitados; não são separados.'],
  // ---- fuente elegida ----
  'rec.source.project_blocks': ['Bloques de proyecto', 'Project blocks', 'Blocos de projeto'],
  'rec.source.recalculated': ['Recalculado desde componentes', 'Recalculated from components', 'Recalculado a partir dos componentes'],
  'rec.source.none': ['Ninguna (sin dato)', 'None (no data)', 'Nenhuma (sem dado)'],
  'rec.source.contractor_form': ['Formulario de contratista', 'Contractor form', 'Formulário da contratada'],
  'rec.source.modal_target': ['Valor modal del año', 'Modal value of the year', 'Valor modal do ano'],
  'rec.source.newest_sheet': ['Hoja de media móvil más reciente', 'Newest rolling-average sheet', 'Planilha de média móvel mais recente'],
  'rec.source.country_workbook': ['Libro propio del país', "The country's own workbook", 'Planilha própria do país'],
  'rec.source.as_stored': ['Valor guardado (marcado)', 'Stored value (flagged)', 'Valor guardado (marcado)'],
  'rec.source.level_rows': ['Filas por nivel de consecuencia', 'Per-level consequence rows', 'Linhas por nível de consequência'],
  // ---- motivo ----
  'rec.reason.formula_scope': ['La fórmula del consolidado no cubre todos los bloques con datos.', 'The consolidated formula does not cover every block with data.', 'A fórmula do consolidado não cobre todos os blocos com dados.'],
  'rec.reason.formula_ref': ['Una referencia de la fórmula apunta a una fila con otra etiqueta.', 'A formula reference points at a row with a different label.', 'Uma referência da fórmula aponta para uma linha com outro rótulo.'],
  'rec.reason.hardcoded': ['Constante escrita donde el patrón de la fila es una fórmula.', 'Typed-in constant where the row pattern is a formula.', 'Constante digitada onde o padrão da linha é uma fórmula.'],
  'rec.reason.flagged_excluded': ['El recálculo excluye horas marcadas como no válidas.', 'The recalculation excludes hours flagged as invalid.', 'O recálculo exclui horas marcadas como inválidas.'],
  'rec.reason.unexplained': ['Causa no identificada en la fórmula; requiere revisión del área.', 'Cause not found in the formula; needs review by the owner.', 'Causa não identificada na fórmula; requer revisão da área.'],
  'rec.reason.components_differ': ['Los componentes sumados por bloque difieren de los que usa la fórmula de origen.', 'Components summed by block differ from those used by the source formula.', 'Os componentes somados por bloco diferem dos usados pela fórmula de origem.'],
  'rec.reason.coverage_mismatch': ['Numerador y denominador cubren meses distintos.', 'Numerator and denominator cover different months.', 'Numerador e denominador cobrem meses diferentes.'],
  'rec.reason.zero_denominator': ['Denominador cero o vacío en el período.', 'Zero or empty denominator in the period.', 'Denominador zero ou vazio no período.'],
  'rec.reason.header_only': ['El encabezado existe pero ningún proyecto tiene horas en esos meses.', 'The header exists but no project has hours in those months.', 'O cabeçalho existe mas nenhum projeto tem horas nesses meses.'],
  'rec.reason.numerator_empty': ['Celdas del numerador vacías con exposición informada.', 'Numerator cells empty while exposure is reported.', 'Células do numerador vazias com exposição informada.'],
  'rec.reason.identical_series': ['Serie idéntica a la de otro bloque (copia de plantilla).', 'Series identical to another block (template copy).', 'Série idêntica à de outro bloco (cópia de modelo).'],
  'rec.reason.header_dates': ['Celdas de fecha vacías o mal escritas en el encabezado del bloque.', 'Blank or mistyped date cells in the block header.', 'Células de data vazias ou digitadas incorretamente no cabeçalho do bloco.'],
  'rec.reason.placeholder': ['Valor simbólico sin dotación.', 'Token value with no headcount.', 'Valor simbólico sem efetivo.'],
  'rec.reason.autofill': ['Incremento uniforme propio de un autorrelleno.', 'Uniform increment typical of an autofill.', 'Incremento uniforme típico de autopreenchimento.'],
  'rec.reason.overlapping_views': ['Las hojas son vistas de los mismos datos, no conjuntos independientes.', 'The sheets are views of the same data, not independent sets.', 'As planilhas são visões dos mesmos dados, não conjuntos independentes.'],
  'rec.reason.overlapping_copy': ['Los registros ya están en otra sección o en el libro del país.', "The records already exist in another section or in the country's workbook.", 'Os registros já estão em outra seção ou na planilha do país.'],
  'rec.reason.no_year_in_sheet': ['Los meses son texto sin año.', 'Months are text with no year.', 'Os meses são texto sem ano.'],
  'rec.reason.unverified_sheet': ['Hoja oculta con secuencias de meses o unidades inconsistentes.', 'Hidden sheet with inconsistent month sequences or units.', 'Planilha oculta com sequências de meses ou unidades inconsistentes.'],
  'rec.reason.no_records': ['Solo encabezados de columnas.', 'Column headers only.', 'Apenas cabeçalhos de colunas.'],
  'rec.reason.blank_row': ['La fila existe pero no tiene valores.', 'The row exists but holds no values.', 'A linha existe mas não tem valores.'],
  'rec.reason.no_master': ['La fuente no trae ubicación ni cliente validados.', 'The source carries no validated location or client.', 'A fonte não traz localização nem cliente validados.'],
  'rec.reason.definition_unconfirmed': ['Definición de la fila sin confirmar.', 'Row definition unconfirmed.', 'Definição da linha sem confirmar.'],
  'rec.reason.not_a_target': ['La celda es una fórmula de suma, no una meta.', 'The cell is a sum formula, not a target.', 'A célula é uma fórmula de soma, não uma meta.'],
  'rec.reason.no_label': ['Fila sin etiqueta.', 'Row with no label.', 'Linha sem rótulo.'],
  'rec.reason.avg_pct': ['Un promedio de porcentajes no pondera por horas.', 'An average of percentages is not weighted by hours.', 'Uma média de percentuais não pondera por horas.'],
  'rec.reason.not_loaded': ['El libro de esa fuente no se ha importado.', 'The workbook for that source has not been imported.', 'A planilha dessa fonte não foi importada.'],
  'rec.reason.unit_unconfirmed': ['La fuente no declara la unidad.', 'The source does not state the unit.', 'A fonte não declara a unidade.'],
  'rec.reason.combined_days': ['La fuente informa ambos conceptos en una sola fila.', 'The source reports both concepts in a single row.', 'A fonte informa ambos os conceitos em uma única linha.'],
  // ---- regla aplicada ----
  'rec.rule.sum_blocks': ['Los hechos provienen de los bloques de proyecto; el consolidado solo sirve para conciliar.', 'Facts come from project blocks; the consolidated only serves for reconciliation.', 'Os fatos vêm dos blocos de projeto; o consolidado serve apenas para conciliar.'],
  'rec.rule.recalc_indices': ['Los índices se recalculan desde componentes con la fórmula de origen (× 1.000.000 / horas trabajadas).', 'Indices are recalculated from components with the source formula (× 1,000,000 / hours worked).', 'Os índices são recalculados a partir dos componentes com a fórmula de origem (× 1.000.000 / horas trabalhadas).'],
  'rec.rule.paired_months': ['Solo meses con numerador cerrado y horas trabajadas informadas.', 'Only months with a closed numerator and reported hours worked.', 'Apenas meses com numerador fechado e horas trabalhadas informadas.'],
  'rec.rule.no_zero_fill': ['Un error guardado nunca se sustituye por cero.', 'A stored error is never replaced by zero.', 'Um erro guardado nunca é substituído por zero.'],
  'rec.rule.last_hh_month': ['No se importan meses posteriores al último mes con horas en algún proyecto.', 'Months after the last month with hours in any project are not imported.', 'Não se importam meses posteriores ao último mês com horas em algum projeto.'],
  'rec.rule.null_not_zero': ['Vacío significa sin dato; cero solo si está escrito.', 'Blank means no data; zero only when written.', 'Vazio significa sem dado; zero apenas se estiver escrito.'],
  'rec.rule.duplicate_null': ['Los meses duplicados de plantilla quedan sin dato en todas sus medidas.', 'Template-duplicated months are set to no data in every measure.', 'Os meses duplicados de modelo ficam sem dado em todas as medidas.'],
  'rec.rule.header_sequence': ['Cada columna toma el mes de la secuencia mensual continua de su encabezado.', 'Each column takes the month of the continuous monthly sequence of its header.', 'Cada coluna assume o mês da sequência mensal contínua do seu cabeçalho.'],
  'rec.rule.placeholder_null': ['El marcador de posición no cuenta como exposición.', 'A placeholder does not count as exposure.', 'O marcador de posição não conta como exposição.'],
  'rec.rule.modal_year': ['Meta efectiva = valor modal del año; el valor guardado se conserva.', 'Effective target = modal value of the year; the stored value is kept.', 'Meta efetiva = valor modal do ano; o valor guardado é conservado.'],
  'rec.rule.single_canonical': ['Una única fuente canónica por país, proyecto, mes e indicador.', 'A single canonical source per country, project, month and indicator.', 'Uma única fonte canônica por país, projeto, mês e indicador.'],
  'rec.rule.year_filename': ['Año provisional tomado del nombre del archivo.', 'Provisional year taken from the file name.', 'Ano provisório obtido do nome do arquivo.'],
  'rec.rule.hidden_not_combined': ['Las hojas ocultas no se combinan con el reporte vigente.', 'Hidden sheets are not combined with the current report.', 'As planilhas ocultas não são combinadas com o relatório vigente.'],
  'rec.rule.cases_pending': ['Sin registros individuales, el módulo de casos queda pendiente.', 'Without individual records the cases module stays pending.', 'Sem registros individuais, o módulo de casos fica pendente.'],
  'rec.rule.master_required': ['La ubicación solo se asigna con un maestro validado.', 'Location is assigned only from a validated master.', 'A localização só é atribuída com cadastro mestre validado.'],
  'rec.rule.flag_only': ['Se marca y se conserva tal como está en la fuente.', 'Flagged and kept as stored in the source.', 'Marca-se e conserva-se como está na fonte.'],
  'rec.rule.levels_count': ['Los conteos de accidentes usan las filas por nivel.', 'Accident counts use the per-level rows.', 'As contagens de acidentes usam as linhas por nível.'],
  'rec.rule.sum_ratio': ['Razón de sumas, nunca promedio de razones.', 'Ratio of sums, never an average of ratios.', 'Razão de somas, nunca média de razões.'],
  'rec.rule.load_source': ['Cargar el libro para habilitar el país.', 'Load the workbook to enable the country.', 'Carregar a planilha para habilitar o país.'],
  // ---- notas, avisos y errores ----
  'rec.note.historical_block': ['Bloque histórico de formato anterior; se mantiene separado.', 'Old-format historical block; kept separate.', 'Bloco histórico de formato anterior; mantido separado.'],
  'rec.note.hidden_block': ['Bloque en filas ocultas.', 'Block in hidden rows.', 'Bloco em linhas ocultas.'],
  'rec.note.template_months': ['{n} mes(es) marcados como resto de plantilla.', '{n} month(s) flagged as template leftover.', '{n} mês(es) marcados como resto de modelo.'],
  'rec.note.section_not_imported': ['Vista histórica o copia superpuesta: no importada.', 'Historical view or overlapping copy: not imported.', 'Visão histórica ou cópia sobreposta: não importada.'],
  'rec.note.sheet_overlap': ['Vista superpuesta; no importada.', 'Overlapping view; not imported.', 'Visão sobreposta; não importada.'],
  'rec.note.sheet_unused': ['Hoja no utilizada.', 'Sheet not used.', 'Planilha não utilizada.'],
  'rec.note.sheet_no_records': ['Solo encabezados; sin registros.', 'Headers only; no records.', 'Apenas cabeçalhos; sem registros.'],
  'rec.note.sheet_hidden_unverified': ['Hoja oculta sin verificar; no combinada.', 'Unverified hidden sheet; not combined.', 'Planilha oculta sem verificar; não combinada.'],
  'rec.note.location_pending': ['Ubicación pendiente de maestro aprobado.', 'Location pending an approved master.', 'Localização pendente de cadastro mestre aprovado.'],
  'rec.note.not_closed': ['{n} mes(es) con numerador sin cierre.', '{n} month(s) with numerator not closed.', '{n} mês(es) com numerador sem fechamento.'],
  'rec.warn.no_consolidated': ['No se identificó el bloque consolidado; no hay conciliación contra el consolidado.', 'The consolidated block was not identified; no reconciliation against it.', 'O bloco consolidado não foi identificado; não há conciliação contra ele.'],
  'rec.warn.form_not_recognised': ['No se reconoció la tabla del formulario.', 'The form table was not recognised.', 'A tabela do formulário não foi reconhecida.'],
  'rec.error.unknown_profile': ['«{file}»: estructura no reconocida; no se importó.', '"{file}": structure not recognised; not imported.', '«{file}»: estrutura não reconhecida; não importado.'],
  'rec.error.duplicate_profile': ['«{file}»: ya hay otro libro del perfil {profile}; se usa el de datos más recientes.', '"{file}": another workbook of profile {profile} is present; the one with the latest data is used.', '«{file}»: já existe outra planilha do perfil {profile}; usa-se a de dados mais recentes.'],
  'rec.error.unreadable': ['«{file}»: no se pudo leer ({detail}).', '"{file}": could not be read ({detail}).', '«{file}»: não foi possível ler ({detail}).'],
  'rec.target.autofill_suspect': ['Meta con posible autorrelleno: se usa el valor modal del año.', 'Target with a possible autofill: the modal value of the year is used.', 'Meta com possível autopreenchimento: usa-se o valor modal do ano.'],
  // ---- perfiles y calidad ----
  'rec.profile.corporate': ['Libro corporativo de estadísticas', 'Corporate statistics workbook', 'Planilha corporativa de estatísticas'],
  'rec.profile.colombia': ['Libro de estadísticas de Colombia', 'Colombia statistics workbook', 'Planilha de estatísticas da Colômbia'],
  'rec.profile.incired': ['Formulario de contratista (Brasil)', 'Contractor form (Brazil)', 'Formulário da contratada (Brasil)'],
  'rec.profile.unknown': ['Estructura no reconocida', 'Unrecognised structure', 'Estrutura não reconhecida'],
  'rec.quality.ok': ['Válido', 'Valid', 'Válido'],
  'rec.quality.empty': ['Vacío', 'Blank', 'Vazio'],
  'rec.quality.error': ['Error guardado', 'Stored error', 'Erro guardado'],
  'rec.quality.placeholder': ['Marcador de posición', 'Placeholder', 'Marcador de posição'],
  'rec.quality.template_duplicate': ['Resto de plantilla', 'Template leftover', 'Resto de modelo'],
  'rec.quality.future': ['Mes futuro', 'Future month', 'Mês futuro'],
  'rec.quality.not_closed': ['Sin cierre', 'Not closed', 'Sem fechamento'],
  'rec.quality.hardcoded': ['Constante escrita', 'Typed-in constant', 'Constante digitada'],
  'rec.quality.excluded': ['Excluido', 'Excluded', 'Excluído'],
  // ---- disponibilidad de módulos ----
  'rec.module.exposure.available': ['Horas trabajadas y dotación por proyecto y mes.', 'Hours worked and headcount by project and month.', 'Horas trabalhadas e efetivo por projeto e mês.'],
  'rec.module.accidents.available': ['Conteos reportados de accidentes por nivel; no son registros individuales.', 'Reported accident counts by level; not individual records.', 'Contagens reportadas de acidentes por nível; não são registros individuais.'],
  'rec.module.potential.available': ['Potencial de gravedad reportado, separado del daño real.', 'Reported severity potential, kept apart from actual harm.', 'Potencial de gravidade reportado, separado do dano real.'],
  'rec.module.source_pending': ['Fuente pendiente', 'Source pending', 'Fonte pendente'],
  'rec.module.training.partial': ['Solo horas de capacitación de una fuente; unidad por confirmar.', 'Training hours from one source only; unit to be confirmed.', 'Apenas horas de treinamento de uma fonte; unidade a confirmar.'],
  'rec.module.training.pending': ['Fuente pendiente: horas de capacitación con unidad y denominador validados.', 'Source pending: training hours with validated unit and denominator.', 'Fonte pendente: horas de treinamento com unidade e denominador validados.'],
  'rec.module.cases.pending': ['Fuente pendiente: no hay registros individuales de eventos y casos.', 'Source pending: no individual event and case records.', 'Fonte pendente: não há registros individuais de eventos e casos.'],
  'rec.module.controls.pending': ['Fuente pendiente: Controles críticos y sus verificaciones.', 'Source pending: Critical controls and their verifications.', 'Fonte pendente: Controles críticos e suas verificações.'],
  'rec.module.plan.pending': ['Base del plan pendiente: programado, ejecutado, vencimiento y evidencia.', 'Plan base pending: scheduled, done, due date and evidence.', 'Base do plano pendente: programado, executado, vencimento e evidência.'],
  'rec.module.actions.pending': ['Fuente pendiente: acciones con responsable, vencimiento y cierre (Acciones vencidas).', 'Source pending: actions with owner, due date and closure (Overdue actions).', 'Fonte pendente: ações com responsável, vencimento e fechamento (Ações vencidas).'],
  'rec.module.health.pending': ['Fuente pendiente: salud ocupacional agregada, sin personas.', 'Source pending: aggregated occupational health, no individuals.', 'Fonte pendente: saúde ocupacional agregada, sem pessoas.'],
  'rec.module.hygiene.pending': ['Fuente pendiente: mediciones de higiene por agente.', 'Source pending: hygiene measurements by agent.', 'Fonte pendente: medições de higiene por agente.'],
  'rec.module.programs.pending': ['Fuente pendiente: programas preventivos con numerador y denominador.', 'Source pending: preventive programmes with numerator and denominator.', 'Fonte pendente: programas preventivos com numerador e denominador.'],
  'rec.module.projectsGeo.pending': ['Fuente pendiente: maestro de proyectos con coordenadas validadas.', 'Source pending: project master with validated coordinates.', 'Fonte pendente: cadastro mestre de projetos com coordenadas validadas.'],
  'rec.module.predictive.disabled': ['Predicción deshabilitada: no se publican probabilidades sin aprobación.', 'Prediction disabled: no probabilities are published without approval.', 'Predição desabilitada: não se publicam probabilidades sem aprovação.'],
  'rec.req.eventos': ['Tabla «eventos»: fecha, proyecto, tipo, mecanismo, potencial.', 'Table "eventos": date, project, type, mechanism, potential.', 'Tabela «eventos»: data, projeto, tipo, mecanismo, potencial.'],
  'rec.req.casos': ['Tabla «casos»: evento, clasificación, días perdidos y cargados, parte del cuerpo.', 'Table "casos": event, classification, lost and charged days, body part.', 'Tabela «casos»: evento, classificação, dias perdidos e debitados, parte do corpo.'],
  'rec.req.controles': ['Tabla «controles»: riesgo, barrera, estándar, responsable, frecuencia.', 'Table "controles": risk, barrier, standard, owner, frequency.', 'Tabela «controles»: risco, barreira, padrão, responsável, frequência.'],
  'rec.req.verificaciones': ['Tabla «verificaciones»: control, fecha debida, fecha real, resultado, evidencia.', 'Table "verificaciones": control, due date, actual date, result, evidence.', 'Tabela «verificaciones»: controle, data devida, data real, resultado, evidência.'],
  'rec.req.plan_anual': ['Tabla «plan_anual»: actividad, programa, peso, fecha base, ejecución, evidencia.', 'Table "plan_anual": activity, programme, weight, baseline date, completion, evidence.', 'Tabela «plan_anual»: atividade, programa, peso, data base, execução, evidência.'],
  'rec.req.acciones': ['Tabla «acciones»: origen, prioridad, responsable, vencimiento, cierre, eficacia.', 'Table "acciones": source, priority, owner, due date, closure, effectiveness.', 'Tabela «acciones»: origem, prioridade, responsável, vencimento, fechamento, eficácia.'],
  'rec.req.salud_agregada': ['Tabla «salud_agregada»: programa, mes, elegibles, evaluados (sin datos personales).', 'Table "salud_agregada": programme, month, eligible, evaluated (no personal data).', 'Tabela «salud_agregada»: programa, mês, elegíveis, avaliados (sem dados pessoais).'],
  'rec.req.higiene': ['Tabla «higiene»: agente, método, unidad, mediciones válidas, sobre el límite.', 'Table "higiene": agent, method, unit, valid measurements, over the limit.', 'Tabela «higiene»: agente, método, unidade, medições válidas, acima do limite.'],
  'rec.req.programas': ['Tabla «programas»: programa, mes, programado, ejecutado, horas.', 'Table "programas": programme, month, due, done, hours.', 'Tabela «programas»: programa, mês, programado, executado, horas.'],
  'rec.req.proyectos': ['Tabla «proyectos»: nombre, país, cliente, latitud, longitud, zona horaria, fuente.', 'Table "proyectos": name, country, client, latitude, longitude, time zone, source.', 'Tabela «proyectos»: nome, país, cliente, latitude, longitude, fuso horário, fonte.'],
};

const es: Dict = {};
const en: Dict = {};
const pt: Dict = {};
for (const k of Object.keys(T)) { es[k] = T[k][0]; en[k] = T[k][1]; pt[k] = T[k][2]; }
registerDict({ es, en, pt });
export const REC_KEYS: string[] = Object.keys(T);
