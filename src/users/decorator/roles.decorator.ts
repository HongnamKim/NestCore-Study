import { RolesEnum } from '../const/roles.const';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'user_roles';

//@Roles(RolesEnum.ADMIN)
export const Roles = (role: RolesEnum) => SetMetadata(ROLES_KEY, role);
