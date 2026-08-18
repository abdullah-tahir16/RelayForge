import { ZodSchema } from 'zod';

export function zodValidator<T>(schema: ZodSchema<T>) {
  return (values: unknown): Record<string, string> => {
    const result = schema.safeParse(values);
    if (result.success) {
      return {};
    }
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = issue.message;
      }
    }
    return errors;
  };
}
