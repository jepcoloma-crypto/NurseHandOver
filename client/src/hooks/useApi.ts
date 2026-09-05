import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export interface Department {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  wardCount?: number;
  createdAt: string;
}

export interface Ward {
  id: string;
  name: string;
  departmentId: string;
  department?: { id: string; name: string };
  capacity: number;
  isActive: boolean;
  roomCount?: number;
  patientCount?: number;
  nurseCount?: number;
  rooms?: Room[];
  createdAt: string;
}

export interface Room {
  id: string;
  number: string;
  wardId: string;
  ward?: { id: string; name: string };
  isActive: boolean;
  bedCount?: number;
  beds?: Bed[];
  createdAt: string;
}

export interface Bed {
  id: string;
  number: string;
  roomId: string;
  room?: { id: string; number: string; ward: { id: string; name: string } };
  isActive: boolean;
  patientCount?: number;
  patients?: { id: string; mrn: string; firstName: string; lastName: string }[];
  createdAt: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  nurseCount?: number;
  nurseAssignments?: NurseAssignment[];
  createdAt: string;
}

export interface NurseAssignment {
  id: string;
  nurseId: string;
  nurse?: { id: string; firstName: string; lastName: string; email: string };
  wardId: string;
  ward?: { id: string; name: string };
  shiftId: string;
  shift?: Shift;
  assignedDate: string;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles?: { id: string; name: string }[];
}

export function useDepartments() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => api<Department[]>('/departments', { token: token || undefined }),
  });
}

export function useDepartment(id: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['departments', id],
    queryFn: () => api<Department & { wards: Ward[] }>(`/departments/${id}`, { token: token || undefined }),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api<Department>('/departments', { method: 'POST', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useUpdateDepartment() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; isActive?: boolean }) =>
      api<Department>(`/departments/${id}`, { method: 'PUT', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useDeleteDepartment() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ message: string }>(`/departments/${id}`, { method: 'DELETE', token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useWards() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['wards'],
    queryFn: () => api<Ward[]>('/wards', { token: token || undefined }),
  });
}

export function useWard(id: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['wards', id],
    queryFn: () => api<Ward & { rooms: (Room & { beds: Bed[] })[] }>(`/wards/${id}`, { token: token || undefined }),
    enabled: !!id,
  });
}

export function useCreateWard() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; departmentId: string; capacity?: number }) =>
      api<Ward>('/wards', { method: 'POST', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wards'] }),
  });
}

export function useUpdateWard() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; departmentId?: string; capacity?: number; isActive?: boolean }) =>
      api<Ward>(`/wards/${id}`, { method: 'PUT', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wards'] }),
  });
}

export function useDeleteWard() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ message: string }>(`/wards/${id}`, { method: 'DELETE', token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wards'] }),
  });
}

export function useRooms(wardId?: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['rooms', wardId],
    queryFn: () => {
      const params = wardId ? `?wardId=${wardId}` : '';
      return api<Room[]>(`/rooms${params}`, { token: token || undefined });
    },
  });
}

export function useCreateRoom() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { number: string; wardId: string }) =>
      api<Room>('/rooms', { method: 'POST', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useUpdateRoom() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; number?: string; wardId?: string; isActive?: boolean }) =>
      api<Room>(`/rooms/${id}`, { method: 'PUT', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useDeleteRoom() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ message: string }>(`/rooms/${id}`, { method: 'DELETE', token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useBeds(roomId?: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['beds', roomId],
    queryFn: () => {
      const params = roomId ? `?roomId=${roomId}` : '';
      return api<Bed[]>(`/beds${params}`, { token: token || undefined });
    },
  });
}

export function useCreateBed() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { number: string; roomId: string }) =>
      api<Bed>('/beds', { method: 'POST', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beds'] }),
  });
}

export function useUpdateBed() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; number?: string; roomId?: string; isActive?: boolean }) =>
      api<Bed>(`/beds/${id}`, { method: 'PUT', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beds'] }),
  });
}

export function useDeleteBed() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ message: string }>(`/beds/${id}`, { method: 'DELETE', token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beds'] }),
  });
}

export function useShifts() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['shifts'],
    queryFn: () => api<Shift[]>('/shifts', { token: token || undefined }),
  });
}

export function useShift(id: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['shifts', id],
    queryFn: () => api<Shift>(`/shifts/${id}`, { token: token || undefined }),
    enabled: !!id,
  });
}

export function useCreateShift() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; startTime: string; endTime: string }) =>
      api<Shift>('/shifts', { method: 'POST', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useUpdateShift() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; startTime?: string; endTime?: string; isActive?: boolean }) =>
      api<Shift>(`/shifts/${id}`, { method: 'PUT', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useDeleteShift() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ message: string }>(`/shifts/${id}`, { method: 'DELETE', token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useAssignments(filters?: { wardId?: string; shiftId?: string; nurseId?: string }) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['assignments', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.wardId) params.set('wardId', filters.wardId);
      if (filters?.shiftId) params.set('shiftId', filters.shiftId);
      if (filters?.nurseId) params.set('nurseId', filters.nurseId);
      const query = params.toString();
      return api<NurseAssignment[]>(`/assignments${query ? `?${query}` : ''}`, { token: token || undefined });
    },
  });
}

export function useMyAssignments() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['assignments', 'my'],
    queryFn: () => api<NurseAssignment[]>('/assignments/my', { token: token || undefined }),
  });
}

export function useCreateAssignment() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { nurseId: string; wardId: string; shiftId: string; assignedDate: string }) =>
      api<NurseAssignment>('/assignments', { method: 'POST', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useUpdateAssignment() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; wardId?: string; shiftId?: string; assignedDate?: string; isActive?: boolean }) =>
      api<NurseAssignment>(`/assignments/${id}`, { method: 'PUT', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useDeleteAssignment() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ message: string }>(`/assignments/${id}`, { method: 'DELETE', token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useUsers() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api<User[]>('/users', { token: token || undefined }),
  });
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  admissionDate: string;
  wardId: string;
  bedId?: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  ward?: { id: string; name: string };
  bed?: { id: string; number: string };
}

export interface PatientDetail extends Patient {
  vitalSigns?: VitalSign[];
  nursingAssessments?: Assessment[];
  nursingTasks?: Task[];
  handovers?: HandoverSummary[];
}

export interface VitalSign {
  id: string;
  patientId: string;
  recordedBy: string;
  temperature?: number;
  heartRate?: number;
  respiratoryRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenSaturation?: number;
  painScale?: number;
  notes?: string;
  recordedAt: string;
}

export interface Assessment {
  id: string;
  patientId: string;
  assessedBy: string;
  assessmentType: string;
  findings: string;
  painScale?: number;
  notes?: string;
  assessedAt: string;
}

export interface Task {
  id: string;
  patientId: string;
  assignedTo?: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

export interface HandoverSummary {
  id: string;
  status: string;
  createdAt: string;
  submittedAt?: string;
  outgoingNurse?: { firstName: string; lastName: string };
  incomingNurse?: { firstName: string; lastName: string };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface TimelineEvent {
  type: 'VITAL_SIGN' | 'ASSESSMENT' | 'TASK' | 'HANDOVER';
  date: string;
  data: VitalSign | Assessment | Task | HandoverSummary;
}

export interface PatientFilters {
  page?: number;
  limit?: number;
  search?: string;
  wardId?: string;
  status?: string;
}

export function usePatients(filters?: PatientFilters) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.search) params.set('search', filters.search);
      if (filters?.wardId) params.set('wardId', filters.wardId);
      if (filters?.status) params.set('status', filters.status);
      const query = params.toString();
      return api<PaginatedResponse<Patient>>(`/patients${query ? `?${query}` : ''}`, { token: token || undefined });
    },
  });
}

export function usePatient(id: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => api<PatientDetail>(`/patients/${id}`, { token: token || undefined }),
    enabled: !!id,
  });
}

export function usePatientTimeline(id: string, limit?: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['patients', id, 'timeline', limit],
    queryFn: () => {
      const params = limit ? `?limit=${limit}` : '';
      return api<TimelineEvent[]>(`/patients/${id}/timeline${params}`, { token: token || undefined });
    },
    enabled: !!id,
  });
}

export function usePatientVitals(id: string, limit?: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['patients', id, 'vitals', limit],
    queryFn: () => {
      const params = limit ? `?limit=${limit}` : '';
      return api<VitalSign[]>(`/patients/${id}/vitals${params}`, { token: token || undefined });
    },
    enabled: !!id,
  });
}

export function useCreateVitalSign() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, ...data }: { patientId: string } & Partial<VitalSign>) =>
      api<VitalSign>(`/patients/${patientId}/vitals`, { method: 'POST', body: data, token: token || undefined }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients', variables.patientId, 'vitals'] });
      queryClient.invalidateQueries({ queryKey: ['patients', variables.patientId, 'timeline'] });
    },
  });
}

export function usePatientAssessments(id: string, limit?: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['patients', id, 'assessments', limit],
    queryFn: () => {
      const params = limit ? `?limit=${limit}` : '';
      return api<Assessment[]>(`/patients/${id}/assessments${params}`, { token: token || undefined });
    },
    enabled: !!id,
  });
}

export function useCreateAssessment() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, ...data }: { patientId: string; assessmentType: string; findings: string; painScale?: number; notes?: string }) =>
      api<Assessment>(`/patients/${patientId}/assessments`, { method: 'POST', body: data, token: token || undefined }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients', variables.patientId, 'assessments'] });
      queryClient.invalidateQueries({ queryKey: ['patients', variables.patientId, 'timeline'] });
    },
  });
}

export function usePatientTasks(id: string, limit?: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['patients', id, 'tasks', limit],
    queryFn: () => {
      const params = limit ? `?limit=${limit}` : '';
      return api<Task[]>(`/patients/${id}/tasks${params}`, { token: token || undefined });
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, ...data }: { patientId: string; title: string; description?: string; priority?: string; dueDate?: string }) =>
      api<Task>(`/patients/${patientId}/tasks`, { method: 'POST', body: data, token: token || undefined }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients', variables.patientId, 'tasks'] });
    },
  });
}

export function useUpdateTask() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, taskId, ...data }: { patientId: string; taskId: string; status?: string }) =>
      api<Task>(`/patients/${patientId}/tasks/${taskId}`, { method: 'PUT', body: data, token: token || undefined }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients', variables.patientId, 'tasks'] });
    },
  });
}

export function useCreatePatient() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      mrn: string;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gender: string;
      admissionDate: string;
      wardId: string;
      bedId?: string;
    }) => api<Patient>('/patients', { method: 'POST', body: data, token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] }),
  });
}

export function useUpdatePatient() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; firstName?: string; lastName?: string; gender?: string; wardId?: string; bedId?: string | null; status?: string }) =>
      api<Patient>(`/patients/${id}`, { method: 'PUT', body: data, token: token || undefined }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients', variables.id] });
    },
  });
}

export function useDeletePatient() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ message: string }>(`/patients/${id}`, { method: 'DELETE', token: token || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] }),
  });
}
