/**
 * components/landing/scenario-templates.tsx
 *
 * Horizontal row of life event template cards below the calculator.
 * Clicking a card opens the TemplateDetail overlay with the focused
 * slider editor. This is the "one more what-if" retention loop
 * surface per Phase E research.
 *
 * Voice constraint (locked): card copy stays in question voice ("What
 * if I..."), never identity voice. This component just renders what
 * TEMPLATES provides, so as long as lib/scenarios/templates.ts keeps
 * the discipline, the UI follows.
 */

'use client';

import { motion } from 'framer-motion';

import { track } from '@/lib/analytics/track';
import { TEMPLATES, type Template } from '@/lib/scenarios/templates';

interface ScenarioTemplatesProps {
  onOpen: (template: Template) => void;
}

export function ScenarioTemplates({ onOpen }: ScenarioTemplatesProps) {
  function handleClick(template: Template) {
    track('landing_template_clicked', { templateId: template.id });
    onOpen(template);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.5 }}
      className="flex flex-col gap-4"
    >
      <div className="text-xs uppercase tracking-wide text-[#A3A3A3]">
        Try a what-if
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => handleClick(template)}
            className="group flex h-full flex-col items-start gap-2 rounded-xl border border-[#262626] bg-[#0F0F0F] p-4 text-left transition-colors hover:border-[#10B981]/40 hover:bg-[#141414]"
          >
            <div className="text-sm font-medium leading-snug text-[#FAFAFA]">
              {template.question}
            </div>
            <div className="text-[11px] text-[#A3A3A3] leading-relaxed">
              {template.description}
            </div>
            <div className="mt-auto text-[11px] font-medium text-[#10B981] group-hover:text-[#10B981]">
              Try it →
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
