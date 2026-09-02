import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/** Vérifie que le champ décoré est un objet dont chaque valeur est un entier >= 1 (ex: quota par quartier). */
export function IsPositiveIntegerRecord(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPositiveIntegerRecord',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return false;
          }
          return Object.values(value).every(
            (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1,
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} doit être un objet dont chaque valeur est un entier >= 1`;
        },
      },
    });
  };
}
