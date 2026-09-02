import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/** Vérifie qu'une date (chaîne ISO) n'est pas dans le futur — ex: un don ne peut pas être daté de demain. */
export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return false;
          return date.getTime() <= Date.now();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} ne peut pas être une date future`;
        },
      },
    });
  };
}
