import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TransporteHandler {
  private readonly logger = new Logger(TransporteHandler.name);

  public dataSource!: DataSource;

  /**
   * Atualiza os dados de uma viagem e a presença dos pacientes
   * @param viagemId ID da sdviagem
   * @param dados Objeto contendo observacao e array de pacientes
   */
  async atualizarViagem(viagemId: number, dados: any, dataSource: DataSource) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Atualiza a observação geral da viagem na tabela sdviagem
      if (dados.observacao !== undefined) {
        await queryRunner.manager.query(
          `UPDATE sdviagem 
           SET sdviagemobservacao = $1 
           WHERE sdviagemid = $2`,
          [dados.observacao, viagemId]
        );
      }

      // 2. Atualiza a presença de cada paciente na tabela sdviagempaciente
      if (dados.pacientes && Array.isArray(dados.pacientes)) {
        for (const p of dados.pacientes) {
          // O campo no banco é 'sdviagempacientefaltou' (bool)
          // O App envia 'faltou: true' se o passageiro não apareceu
          await queryRunner.manager.query(
            `UPDATE sdviagempaciente 
             SET sdviagempacientefaltou = $1,
                 sdviagempacienteobservacao = $2
             WHERE sdviagemid = $3 AND sdusuarioid = $4`,
            [p.faltou, p.observacao || null, viagemId, p.usuarioId]
          );
        }
      }

      await queryRunner.commitTransaction();
      return { sucesso: true };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Erro ao atualizar viagem ${viagemId}: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}