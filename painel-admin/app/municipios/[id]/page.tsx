'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MunicipioForm } from '@/components/municipio-form';
import { atualizarMunicipio, buscarMunicipio } from '@/lib/api';
import { Municipio, MunicipioFormData } from '@/lib/types';

export default function EditarMunicipioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [municipio, setMunicipio] = useState<Municipio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params?.id) return;

    buscarMunicipio(Number(params.id))
      .then(setMunicipio)
      .catch((err: any) => setError(err?.message || 'Erro ao carregar municipio.'))
      .finally(() => setLoading(false));
  }, [params?.id]);

  async function handleSubmit(payload: MunicipioFormData) {
    await atualizarMunicipio(Number(params.id), payload);
    router.push('/municipios');
    router.refresh();
  }

  if (loading) return <div className="loading-state"><div className="spinner" />Carregando...</div>;
  if (error || !municipio) return <div className="alert alert-error">{error || 'Municipio nao encontrado.'}</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Editar municipio</h1>
        <p className="page-subtitle">Atualizando cadastro de <strong>{municipio.nome}</strong></p>
      </div>
      <MunicipioForm initial={municipio} submitLabel="Salvar alteracoes ->" onSubmit={handleSubmit} />
    </div>
  );
}
