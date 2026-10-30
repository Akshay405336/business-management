'use client';

import { computeEmployeeSalaryTotals, type EmployeeSalaryStructureInput } from '@techwin/validation';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CrmFormField, formGridClass } from '@/features/admin/crm/components/crm-feedback';

export type EmployeeSalaryFormState = EmployeeSalaryStructureInput;

export const emptySalaryForm = (): EmployeeSalaryFormState => ({
  currency: 'INR',
  frequency: 'MONTHLY',
  basicSalary: 0,
  houseRentAllowance: 0,
  otherAllowances: 0,
  bonus: 0,
  otherEarnings: 0,
  providentFund: 0,
  professionalTax: 0,
  otherDeductions: 0,
});

function moneyField(
  label: string,
  value: number,
  onChange: (next: number) => void,
  error?: string,
) {
  return (
    <CrmFormField label={label} error={error}>
      <Input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </CrmFormField>
  );
}

export function EmployeeSalarySection({
  value,
  onChange,
  errors,
  disabled,
}: {
  value: EmployeeSalaryFormState;
  onChange: (next: EmployeeSalaryFormState) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  const totals = computeEmployeeSalaryTotals(value);
  const frequencyLabel = value.frequency === 'MONTHLY' ? 'Monthly' : 'Annual';

  const patch = (partial: Partial<EmployeeSalaryFormState>) => onChange({ ...value, ...partial });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-foreground text-sm font-semibold">Salary structure</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          All amounts are {frequencyLabel.toLowerCase()}. Estimated net salary excludes tax rules not
          configured in the app.
        </p>
      </div>
      <div className={formGridClass}>
        <CrmFormField label="Currency">
          <Input
            value={value.currency}
            maxLength={3}
            disabled={disabled}
            onChange={(event) => patch({ currency: event.target.value.toUpperCase().slice(0, 3) })}
          />
        </CrmFormField>
        <CrmFormField label="Salary frequency">
          <Select
            value={value.frequency}
            onValueChange={(frequency) =>
              patch({ frequency: frequency as EmployeeSalaryFormState['frequency'] })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="ANNUAL">Annual</SelectItem>
            </SelectContent>
          </Select>
        </CrmFormField>
      </div>
      <p className="text-foreground text-xs font-medium">Compensation ({frequencyLabel})</p>
      <div className={formGridClass}>
        {moneyField('Basic salary', value.basicSalary, (n) => patch({ basicSalary: n }), errors?.basicSalary)}
        {moneyField('HRA', value.houseRentAllowance, (n) => patch({ houseRentAllowance: n }))}
        {moneyField('Other allowances', value.otherAllowances, (n) => patch({ otherAllowances: n }))}
        {moneyField('Bonus / variable', value.bonus, (n) => patch({ bonus: n }))}
        {moneyField('Other earnings', value.otherEarnings, (n) => patch({ otherEarnings: n }))}
      </div>
      <p className="text-foreground text-xs font-medium">Deductions ({frequencyLabel})</p>
      <div className={formGridClass}>
        {moneyField('Provident fund (PF)', value.providentFund, (n) => patch({ providentFund: n }))}
        {moneyField('Professional tax', value.professionalTax, (n) => patch({ professionalTax: n }))}
        {moneyField('Other deductions', value.otherDeductions, (n) => patch({ otherDeductions: n }))}
      </div>
      <div className="bg-muted/40 border-border/60 rounded-lg border p-3 text-sm">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Summary</p>
        <dl className="mt-2 grid gap-1.5 text-sm tabular-nums">
          <div className="flex justify-between gap-4">
            <dt>Total earnings</dt>
            <dd className="font-medium">{totals.totalEarnings.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Total deductions</dt>
            <dd className="font-medium">{totals.totalDeductions.toFixed(2)}</dd>
          </div>
          <div className="text-foreground flex justify-between gap-4 border-t border-black/5 pt-2 font-semibold">
            <dt>Estimated net salary</dt>
            <dd>{totals.estimatedNetSalary.toFixed(2)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
