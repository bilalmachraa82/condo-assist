import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw } from 'lucide-react';
import { useUpdateAppSetting } from '@/hooks/useAppSettings';

// Validation schemas for different setting types
const emailSchema = z.string().email('Email inválido').optional();
const nifSchema = z.string().regex(/^\d{9}$/, 'NIF deve ter 9 dígitos').optional();
const phoneSchema = z.string().regex(/^(\+351\s?)?[0-9\s]{9,}$/, 'Formato de telefone inválido').optional();
const urlSchema = z.string().url('URL inválida').optional();

interface SettingsFormProps {
  category: string;
  title: string;
  description: string;
  settings: Record<string, any>;
  fields: SettingField[];
}

interface SettingField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'switch' | 'nif';
  description?: string;
  placeholder?: string;
  required?: boolean;
  validation?: z.ZodSchema;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  category,
  title,
  description,
  settings,
  fields
}) => {
  const updateSetting = useUpdateAppSetting();

  // Create dynamic schema based on fields
  const createSchema = () => {
    const schemaObj: Record<string, z.ZodSchema> = {};
    
    fields.forEach(field => {
      let schema: z.ZodSchema = z.any();
      
      switch (field.type) {
        case 'email':
          schema = field.required ? emailSchema.refine(val => val, 'Email obrigatório') : emailSchema;
          break;
        case 'nif':
          schema = field.required ? nifSchema.refine(val => val, 'NIF obrigatório') : nifSchema;
          break;
        case 'tel':
          schema = field.required ? phoneSchema.refine(val => val, 'Telefone obrigatório') : phoneSchema;
          break;
        case 'url':
          schema = field.required ? urlSchema.refine(val => val, 'URL obrigatória') : urlSchema;
          break;
        case 'switch':
          schema = z.boolean();
          break;
        default:
          schema = field.required ? z.string().min(1, 'Campo obrigatório') : z.string().optional();
      }
      
      if (field.validation) {
        schema = field.validation;
      }
      
      schemaObj[field.key] = schema;
    });
    
    return z.object(schemaObj);
  };

  const form = useForm({
    resolver: zodResolver(createSchema()),
    defaultValues: settings,
    mode: 'onBlur'
  });

  const onSubmit = async (data: any) => {
    // Update each changed field
    const changedFields = Object.keys(data).filter(key => {
      const originalValue = settings[key];
      const newValue = data[key];
      return originalValue !== newValue;
    });

    for (const key of changedFields) {
      await updateSetting.mutateAsync({ key, value: data[key] });
    }
  };

  const handleFieldChange = async (key: string, value: any) => {
    // Auto-save on field change
    if (settings[key] !== value) {
      await updateSetting.mutateAsync({ key, value });
    }
  };

  const resetForm = () => {
    form.reset(settings);
  };

  const hasChanges = form.formState.isDirty;
  const isLoading = updateSetting.isPending;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">
              Alterações pendentes
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {fields.map((field, index) => (
              <React.Fragment key={field.key}>
                <FormField
                  control={form.control}
                  name={field.key}
                  render={({ field: formField }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </FormLabel>
                      <FormControl>
                        {field.type === 'switch' ? (
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={formField.value || false}
                              onCheckedChange={(checked) => {
                                formField.onChange(checked);
                                handleFieldChange(field.key, checked);
                              }}
                              disabled={isLoading}
                            />
                            <span className="text-sm text-muted-foreground">
                              {formField.value ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        ) : field.type === 'textarea' ? (
                          <Textarea
                            placeholder={field.placeholder}
                            {...formField}
                            onBlur={(e) => {
                              formField.onBlur();
                              handleFieldChange(field.key, e.target.value);
                            }}
                            disabled={isLoading}
                            className="min-h-[100px] resize-none"
                          />
                        ) : (
                          <Input
                            type={field.type === 'nif' ? 'text' : field.type}
                            placeholder={field.placeholder}
                            {...formField}
                            onBlur={(e) => {
                              formField.onBlur();
                              handleFieldChange(field.key, e.target.value);
                            }}
                            disabled={isLoading}
                          />
                        )}
                      </FormControl>
                      {field.description && (
                        <FormDescription className="text-xs text-muted-foreground">
                          {field.description}
                        </FormDescription>
                      )}
                    </FormItem>
                  )}
                />
                {index < fields.length - 1 && <Separator className="my-4" />}
              </React.Fragment>
            ))}
            
            {hasChanges && (
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isLoading ? 'A guardar...' : 'Guardar alterações'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Cancelar
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};