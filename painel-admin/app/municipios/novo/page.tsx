'use client';

import { useRouter } from 'next/navigation';
import { MunicipioForm } from '@/components/municipio-form';
import { criarMunicipio } from '@/lib/api';
import { MunicipioFormData } from '@/lib/types';

export default function NovoMunicipioPage() {
  const router = useRouter();

  async function handleSubmit(payload: MunicipioFormData) {
    await criarMunicipio(payload);
    router.push('/municipios');
    router.refresh();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Novo municipio</h1>
        <p className="page-subtitle">Cadastre um novo tenant e configure a conexao inicial do ambiente.</p>
      </div>
      <MunicipioForm submitLabel="Criar municipio ->" onSubmit={handleSubmit} />
    </div>
  );
}
