import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  senha!: string;
}

export class SaveMunicipioDto {
  @IsString()
  @MaxLength(120)
  nome!: string;

  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must contain only lowercase letters, numbers and hyphens',
  })
  slug!: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsString()
  db_host?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  db_port?: number;

  @IsOptional()
  @IsString()
  db_name?: string;

  @IsOptional()
  @IsString()
  db_user?: string;

  @IsOptional()
  @IsString()
  db_pass?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  app_port?: number;

  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'api_base_url must be a valid URL' })
  api_base_url?: string;

  @IsOptional()
  @IsObject()
  permissoes?: Record<string, boolean>;
}

export class UpdateMunicipioDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must contain only lowercase letters, numbers and hyphens',
  })
  slug?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsString()
  db_host?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  db_port?: number;

  @IsOptional()
  @IsString()
  db_name?: string;

  @IsOptional()
  @IsString()
  db_user?: string;

  @IsOptional()
  @IsString()
  db_pass?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  app_port?: number;

  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'api_base_url must be a valid URL' })
  api_base_url?: string;

  @IsOptional()
  @IsObject()
  permissoes?: Record<string, boolean>;
}
