import { registerDict, type Dict } from './core';
type Row = [es: string, en: string, pt: string];
const K: Record<string, Row> = {
  kicker: ['Acceso restringido', 'Restricted access', 'Acesso restrito'],
  heading: ['Ingrese al centro de control', 'Sign in to the control centre', 'Entre no centro de controle'],
  sub: ['Use su correo corporativo autorizado.', 'Use your authorised corporate email.', 'Use seu e-mail corporativo autorizado.'],
  email: ['Correo electrónico', 'Email', 'E-mail'], password: ['Contraseña', 'Password', 'Senha'],
  show: ['Mostrar contraseña', 'Show password', 'Mostrar senha'], hide: ['Ocultar contraseña', 'Hide password', 'Ocultar senha'],
  remember: ['Mantener la sesión en este equipo (7 días)', 'Keep me signed in on this device (7 days)', 'Manter a sessão neste dispositivo (7 dias)'],
  submit: ['Ingresar', 'Sign in', 'Entrar'], checking: ['Verificando…', 'Verifying…', 'Verificando…'],
  caps: ['Bloq Mayús está activado.', 'Caps Lock is on.', 'Caps Lock está ativado.'],
  invalid: ['Correo o contraseña incorrectos. Intentos restantes antes del bloqueo: {n}.', 'Incorrect email or password. Attempts left before lockout: {n}.', 'E-mail ou senha incorretos. Tentativas restantes antes do bloqueio: {n}.'],
  locked: ['Demasiados intentos. Vuelva a intentarlo en {s} s.', 'Too many attempts. Try again in {s} s.', 'Muitas tentativas. Tente novamente em {s} s.'],
  unconfigured: ['El acceso no está configurado en esta versión. Contacte al administrador.', 'Access is not configured in this build. Contact the administrator.', 'O acesso não está configurado nesta versão. Contate o administrador.'],
  required: ['Ingrese su correo y su contraseña.', 'Enter your email and password.', 'Informe seu e-mail e sua senha.'],
  notice: ['Uso exclusivo de personal autorizado de INCIMMET. Los datos se procesan en este navegador.', 'For authorised INCIMMET personnel only. Data is processed in this browser.', 'Uso exclusivo de pessoal autorizado da INCIMMET. Os dados são processados neste navegador.'],
  pillar1: ['Anticipar riesgos', 'Anticipate risks', 'Antecipar riscos'], pillar1d: ['Señales tempranas sobre exposición, potencial y tendencias.', 'Early signals on exposure, potential and trends.', 'Sinais precoces sobre exposição, potencial e tendências.'],
  pillar2: ['Verificar controles', 'Verify controls', 'Verificar controles'], pillar2d: ['Cobertura y efectividad de los controles críticos.', 'Coverage and effectiveness of critical controls.', 'Cobertura e efetividade dos controles críticos.'],
  pillar3: ['Proteger personas', 'Protect people', 'Proteger pessoas'], pillar3d: ['Acciones con responsable, evidencia y plazo.', 'Actions with an owner, evidence and a deadline.', 'Ações com responsável, evidência e prazo.'],
  region: ['Perú · Colombia · Brasil', 'Peru · Colombia · Brazil', 'Peru · Colômbia · Brasil'],
  mapAlt: ['Mapa de Perú, Colombia y Brasil', 'Map of Peru, Colombia and Brazil', 'Mapa do Peru, Colômbia e Brasil'],
  signedAs: ['Sesión: {email}', 'Signed in: {email}', 'Sessão: {email}'], logout: ['Cerrar sesión', 'Sign out', 'Sair'],
};
const es: Dict = {}, en: Dict = {}, pt: Dict = {};
for (const [k, [a, b, c]] of Object.entries(K)) { es[`auth.${k}`] = a; en[`auth.${k}`] = b; pt[`auth.${k}`] = c; }
registerDict({ es, en, pt });
