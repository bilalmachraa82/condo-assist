
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ValidationErrorProps {
  message?: string;
}

export const ValidationError: React.FC<ValidationErrorProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="flex items-center gap-1 text-sm text-destructive mt-1">
      <AlertCircle className="h-3 w-3" />
      <span>{message}</span>
    </div>
  );
};

interface RequiredIndicatorProps {
  required?: boolean;
}

export const RequiredIndicator: React.FC<RequiredIndicatorProps> = ({ required }) => {
  if (!required) return null;
  
  return <span className="text-destructive ml-1">*</span>;
};

// Common Portuguese validation messages
export const VALIDATION_MESSAGES = {
  required: 'Este campo é obrigatório',
  email: 'Insira um email válido',
  minLength: (min: number) => `Deve ter pelo menos ${min} caracteres`,
  maxLength: (max: number) => `Não pode exceder ${max} caracteres`,
  pattern: 'Formato inválido',
  phone: 'Número de telefone inválido',
  nif: 'NIF inválido',
  password: {
    weak: 'Password demasiado fraca',
    mismatch: 'As passwords não coincidem',
    requirements: 'A password deve conter pelo menos 8 caracteres, uma maiúscula, uma minúscula e um número'
  },
  file: {
    tooLarge: 'Ficheiro demasiado grande',
    invalidType: 'Tipo de ficheiro não suportado',
    required: 'Selecione um ficheiro'
  },
  date: {
    invalid: 'Data inválida',
    future: 'A data deve ser no futuro',
    past: 'A data deve ser no passado'
  },
  number: {
    min: (min: number) => `Deve ser pelo menos ${min}`,
    max: (max: number) => `Não pode ser superior a ${max}`,
    positive: 'Deve ser um número positivo'
  }
};
