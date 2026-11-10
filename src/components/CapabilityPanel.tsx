
import { useMemo } from 'react';
import type { Capability, Context } from '../lib/rules';
import { previewCapability } from '../lib/rules';

interface Props {
  capability: Capability;
  context: Context;
  onActivate?: (capabilityId: string) => Promise<void>;
  busy?: boolean;
}

export function CapabilityPanel({
  capability,
  context,
  onActivate,
  busy = false,
}: Props) {
  const preview = useMemo(
    () => previewCapability(capability, context),
    [capability, context]
  );

  const validation = preview.validation;
  const allowed = validation.ok;

  return (
    <section aria-label={capability.name}>
      <h3>{capability.name}</h3>

      {validation.ok === false && (
        <ul>
          {validation.reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      )}

      {allowed && (
        <ul>
          {preview.effects.map((effect, index) => (
            <li key={index}>{effect.type}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={!allowed || busy || !onActivate}
        onClick={() => {
          if (onActivate) void onActivate(capability.id);
        }}
      >
        {busy ? 'Procesando...' : 'Activar'}
      </button>
    </section>
  );
}
