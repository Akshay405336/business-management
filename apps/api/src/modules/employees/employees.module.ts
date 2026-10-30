import { Module, type Provider } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/index.js';
import { CrmModule } from '../crm/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import { MediaModule } from '../media/index.js';
import { ChangeEmployeeStatusHandler } from './application/change-employee-status/change-employee-status.handler.js';
import { CreateEmployeeHandler } from './application/create-employee/create-employee.handler.js';
import { DeleteEmployeeHandler } from './application/delete-employee/delete-employee.handler.js';
import { GetEmployeeHandler } from './application/get-employee/get-employee.handler.js';
import { ListEmployeesHandler } from './application/list-employees/list-employees.handler.js';
import { PreviewEmployeeCodeHandler } from './application/preview-employee-code/preview-employee-code.handler.js';
import { UpdateEmployeeHandler } from './application/update-employee/update-employee.handler.js';
import { UploadEmployeeProfileImageHandler } from './application/upload-employee-profile-image/upload-employee-profile-image.handler.js';
import { EMPLOYEE_REPOSITORY } from './domain/repositories/employee.repository.js';
import { PrismaEmployeeRepository } from './infrastructure/persistence/prisma/prisma-employee.repository.js';
import { EmployeesController } from './presentation/http/controllers/employees.controller.js';
import { EmployeeExceptionFilter } from './presentation/http/filters/employee-exception.filter.js';
import { MediaExceptionFilter } from '../media/presentation/http/filters/media-exception.filter.js';

export const employeePersistenceProviders: Provider[] = [
  { provide: EMPLOYEE_REPOSITORY, useClass: PrismaEmployeeRepository },
];

@Module({
  imports: [DatabaseModule, AuthModule, CrmModule, OrgAccessModule, MediaModule],
  controllers: [EmployeesController],
  providers: [
    ...employeePersistenceProviders,
    ListEmployeesHandler,
    GetEmployeeHandler,
    CreateEmployeeHandler,
    UpdateEmployeeHandler,
    ChangeEmployeeStatusHandler,
    DeleteEmployeeHandler,
    PreviewEmployeeCodeHandler,
    UploadEmployeeProfileImageHandler,
    EmployeeExceptionFilter,
    MediaExceptionFilter,
  ],
})
export class EmployeesModule {}
