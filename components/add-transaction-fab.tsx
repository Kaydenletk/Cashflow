/**
 * components/add-transaction-fab.tsx
 *
 * Fixed bottom-right floating action button. Owns the open/close state for
 * <AddTransactionModal />. Lives on /today only this slice.
 */

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AddTransactionModal } from '@/components/add-transaction-modal';

export function AddTransactionFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg"
        aria-label="Add transaction"
      >
        <Plus className="h-6 w-6" />
      </Button>
      <AddTransactionModal open={open} onOpenChange={setOpen} />
    </>
  );
}
