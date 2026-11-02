import type { EmployeeSalaryStructureInput } from '@techwin/validation';
import type { EmployeeDetail, EmployeeEmploymentStatus, EmployeeEmploymentType } from '../types';
import type { EmployeeProfileImageFormValue } from '../components/employee-profile-image-field';

export type EmployeeFormState = {
  firstName: string;
  lastName: string;
  workEmail: string;
  phone: string;
  alternatePhone: string;
  employeeCode: string;
  jobTitle: string;
  department: string;
  employmentType: EmployeeEmploymentType;
  employmentStatus: EmployeeEmploymentStatus;
  dateOfJoining: string;
  workLocation: string;
  probationEndDate: string;
  employmentEndDate: string;
  notes: string;
  profileImage: EmployeeProfileImageFormValue;
  /** Create only: provision a sign-in account for this employee. */
  loginEnabled: boolean;
  password: string;
  confirmPassword: string;
};

export function emptyEmployeeProfileImage(): EmployeeProfileImageFormValue {
  return {
    savedPreviewUrl: null,
    localPreviewUrl: null,
    pendingFile: null,
    removeOnSave: false,
  };
}

export function emptyEmployeeForm(): EmployeeFormState {
  return {
    firstName: '',
    lastName: '',
    workEmail: '',
    phone: '',
    alternatePhone: '',
    employeeCode: '',
    jobTitle: '',
    department: '',
    employmentType: 'FULL_TIME',
    employmentStatus: 'ACTIVE',
    dateOfJoining: '',
    workLocation: '',
    probationEndDate: '',
    employmentEndDate: '',
    notes: '',
    profileImage: emptyEmployeeProfileImage(),
    loginEnabled: false,
    password: '',
    confirmPassword: '',
  };
}

export function employeeDetailToForm(detail: EmployeeDetail): EmployeeFormState {
  return {
    ...emptyEmployeeForm(),
    firstName: detail.firstName,
    lastName: detail.lastName,
    workEmail: detail.workEmail,
    phone: detail.phone,
    alternatePhone: detail.alternatePhone ?? '',
    employeeCode: detail.employeeCode,
    jobTitle: detail.jobTitle,
    department: detail.department ?? '',
    employmentType: detail.employmentType,
    employmentStatus: detail.employmentStatus,
    dateOfJoining: detail.dateOfJoining,
    workLocation: detail.workLocation ?? '',
    probationEndDate: detail.probationEndDate ?? '',
    employmentEndDate: detail.employmentEndDate ?? '',
    notes: detail.notes,
    profileImage: {
      savedPreviewUrl: detail.profileImageUrl,
      localPreviewUrl: null,
      pendingFile: null,
      removeOnSave: false,
    },
  };
}

export function employeeFormToPayload(
  form: EmployeeFormState,
  options: {
    readonly editingId: string | null;
    readonly includeSalary: boolean;
    readonly salaryForm: EmployeeSalaryStructureInput;
    readonly profileImageStoredObjectId?: string | null;
  },
) {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    workEmail: form.workEmail,
    phone: form.phone,
    alternatePhone: form.alternatePhone.trim() ? form.alternatePhone : null,
    jobTitle: form.jobTitle.trim(),
    department: form.department.trim() || null,
    employmentType: form.employmentType,
    dateOfJoining: form.dateOfJoining,
    probationEndDate: form.probationEndDate.trim() ? form.probationEndDate : null,
    employmentEndDate: form.employmentEndDate.trim() ? form.employmentEndDate : null,
    workLocation: form.workLocation.trim() || null,
    notes: form.notes.trim() || undefined,
    ...(options.profileImageStoredObjectId !== undefined
      ? { profileImageStoredObjectId: options.profileImageStoredObjectId }
      : {}),
    ...(options.includeSalary ? { salaryStructure: options.salaryForm } : {}),
  };
}

/** Create-only fields: initial status and optional login account. */
export function employeeFormToCreateExtras(form: EmployeeFormState) {
  return {
    employmentStatus: form.employmentStatus,
    ...(form.loginEnabled
      ? {
          loginEnabled: true,
          password: form.password,
          confirmPassword: form.confirmPassword,
        }
      : {}),
  };
}
