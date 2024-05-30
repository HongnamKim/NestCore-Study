import { ValidationArguments } from 'class-validator';

export const lengthValidationMessage = (args: ValidationArguments) => {
  if (args.constraints.length === 2) {
    return `${args.property} 은(는) ${args.constraints[0]}자 ~ ${args.constraints[1]}자 이어야 합니다.`;
  } else {
    return `${args.property} 은(는) ${args.constraints[0]}자 이상이어야 합니다.`;
  }
};
