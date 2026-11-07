export const leaveRecordQueryKeys = {
  configurations: ['leave', 'year-configurations'] as const,
  records: (configurationId: string, page: number, pageSize: number, search: string) =>
    ['leave', 'employee-leave-records', configurationId, page, pageSize, search] as const,
};
