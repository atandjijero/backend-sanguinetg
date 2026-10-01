import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export const AGE_MIN_DON = 18;
export const AGE_MAX_DON = 65;

export function calculerAge(dateNaissance: Date, maintenant = new Date()): number {
  let age = maintenant.getFullYear() - dateNaissance.getFullYear();
  const anniversairePasse =
    maintenant.getMonth() > dateNaissance.getMonth() ||
    (maintenant.getMonth() === dateNaissance.getMonth() &&
      maintenant.getDate() >= dateNaissance.getDate());
  if (!anniversairePasse) age -= 1;
  return age;
}

export function IsAgeEntre(min: number, max?: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAgeEntre',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [min, max],
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return false;
          const age = calculerAge(date);
          return age >= min && (max === undefined || age <= max);
        },
        defaultMessage(args: ValidationArguments) {
          const [ageMin, ageMax] = args.constraints as [number, number | undefined];
          return ageMax === undefined
            ? `Vous devez avoir au moins ${ageMin} ans`
            : `L'âge doit être compris entre ${ageMin} et ${ageMax} ans`;
        },
      },
    });
  };
}
