import { useMemo } from 'react';
import { Capability, Context, previewCapability } from '../lib/rules';

interface Props {
  capability: Capability;
  context: Context;
  /** El padre conecta esta acción a una RPC de servidor específica y atómica. */
  onActivate?: (capabilityId: string) => Promise<void>;
  busy?: boolean;
}
export function CapabilityPanel({ capability, context, onActivate, busy = false }: Props) {
  const preview = useMemo(() => previewCapability(capability, context), [capability, context]);
  const allowed = preview.validation.ok;
  return (
    <section aria-label={capability.name}>
      <h3>{capability.name}</h3>
      {!allowed && <ul>{preview.validation.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>}
      {allowed && <ul>{preview.effects.map((effect, index) => <li key={index}>{effect.type}</li>)}</ul>}
      <button type="button" disabled={!allowed || busy || !onActivate}
        onClick={() => { if (onActivate) void onActivate(capability.id); }}>
        {busy ? 'Procesando...' : 'Activar'}
      </button>
    </section>
  );
}
