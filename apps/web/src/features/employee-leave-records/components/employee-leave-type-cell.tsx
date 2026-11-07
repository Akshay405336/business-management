export function EmployeeLeaveTypeCell({
  allocatedDays,
  usedDays,
  availableDays,
}: {
  allocatedDays: string;
  usedDays: string;
  availableDays: string;
}) {
  return (
    <>
      {allocatedDays}
      <span className="text-muted-foreground"> / </span>
      {usedDays}
      <span className="text-muted-foreground"> / </span>
      {availableDays}
    </>
  );
}
