/** Motor de reglas declarativas v1: funciones puras, sin referencias a clases concretas. */
export type Ability = 'fuerza' | 'destreza' | 'constitucion' | 'inteligencia' | 'sabiduria' | 'carisma';
export type AttackKind = 'sin_armas' | 'arma_improvisada' | 'arma_pugilista' | 'otra_arma';
export type DamageType = 'contundente' | 'perforante' | 'cortante' | 'fuerza' | 'fuego' | 'frio' | 'radiante' | 'necrotico' | 'psiquico' | 'trueno' | 'relampago' | 'acido' | 'veneno';
export type Trigger = 'al_impactar' | 'al_recibir_dano' | 'al_fallar_prueba' | 'al_iniciar_turno' | 'al_activar';

export interface Context {
  characterLevel: number;
  classLevels: Record<string, number>;
  abilityScores: Record<Ability, number>;
  resources: Record<string, number>;
  attackKind?: AttackKind;
  event?: Trigger;
}
export type Requirement =
  | { type: 'class_level'; classId: string; minimum: number }
  | { type: 'resource'; resourceId: string; minimum: number }
  | { type: 'attack_kind'; allowed: AttackKind[] }
  | { type: 'event'; trigger: Trigger };
export type Effect =
  | { type: 'bonus_damage'; dice: string; damageType?: DamageType }
  | { type: 'damage_type'; value: DamageType }
  | { type: 'resistance'; values: DamageType[]; durationSeconds: number }
  | { type: 'temporary_hp'; amount: number }
  | { type: 'condition'; value: string; durationSeconds?: number };
export interface Capability {
  id: string;
  name: string;
  requirements: Requirement[];
  cost?: { resourceId: string; amount: number };
  effects: Effect[];
}
export type Validation = { ok: true } | { ok: false; reasons: string[] };
export function validateCapability(capability: Capability, context: Context): Validation {
  const reasons: string[] = [];
  for (const req of capability.requirements) {
    switch (req.type) {
      case 'class_level':
        if ((context.classLevels[req.classId] ?? 0) < req.minimum) reasons.push('Nivel de clase insuficiente');
        break;
      case 'resource':
        if ((context.resources[req.resourceId] ?? 0) < req.minimum) reasons.push('Recurso insuficiente');
        break;
      case 'attack_kind':
        if (!context.attackKind || !req.allowed.includes(context.attackKind)) reasons.push('Tipo de ataque no permitido');
        break;
      case 'event':
        if (context.event !== req.trigger) reasons.push('Evento requerido no ocurrido');
        break;
    }
  }
  if (capability.cost && (context.resources[capability.cost.resourceId] ?? 0) < capability.cost.amount) {
    reasons.push('No alcanza el recurso para pagar el coste');
  }
  return reasons.length ? { ok: false, reasons } : { ok: true };
}
/** Solo análisis/visualización: no gasta recursos ni altera el estado del servidor. */
export function previewCapability(capability: Capability, context: Context) {
  const validation = validateCapability(capability, context);
  return { validation, effects: validation.ok ? capability.effects : [] };
}
/** Tiradas locales solo para simulación. La resolución autoritativa debe hacerse en servidor. */
export function rollDice(expression: string, random: () => number = Math.random): number {
  const match = /^(\d{1,2})d(4|6|8|10|12|20|100)$/.exec(expression);
  if (!match) throw new Error('Expresión de dados no permitida');
  const count = Number(match[1]);
  const faces = Number(match[2]);
  if (count < 1 || count > 20) throw new Error('Cantidad de dados inválida');
  let result = 0;
  for (let i = 0; i < count; i++) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Fuente aleatoria inválida');
    result += Math.floor(value * faces) + 1;
  }
  return result;
}
