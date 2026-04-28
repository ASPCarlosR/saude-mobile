import { IsString, IsArray, IsInt, IsOptional } from 'class-validator';

export class RegistroSyncDto {
  @IsString()
  guid!: string;

  @IsInt()
  tabelasincro!: number;

  dados!: any; // O payload JSON flexível vindo do app
}

export class SyncPayloadDto {
  @IsString()
  origem!: string; // 'M' = Mobile novo, 'W' = Genexus

  @IsArray()
  registros!: RegistroSyncDto[];
}