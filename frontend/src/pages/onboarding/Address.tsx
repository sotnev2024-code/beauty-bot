import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input } from '@/components/ui';
import { useMaster } from '@/store/master';

import { OnboardingShell } from './OnboardingShell';

export function Address() {
  const nav = useNavigate();
  const { master, update } = useMaster();
  const [address, setAddress] = useState(master?.address ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!address.trim()) return;
    setBusy(true);
    try {
      await update({ address: address.trim() });
      nav('/onboarding/schedule');
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      step={3}
      total={7}
      title="Где ты принимаешь?"
      subtitle="Адрес салона или кабинета — бот сообщит его клиенткам после записи."
      footer={
        <Button size="lg" full disabled={!address.trim() || busy} onClick={submit}>
          Дальше
        </Button>
      }
    >
      <Input
        label="Адрес"
        placeholder="г. Москва, ул. Тверская, 5, кабинет 12"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <p className="text-xs text-mute">
        Можно одной строкой. Бот будет вставлять адрес в подтверждение записи и
        напоминания.
      </p>
    </OnboardingShell>
  );
}
