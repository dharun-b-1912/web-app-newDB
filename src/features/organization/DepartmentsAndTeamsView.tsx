// src/features/organization/DepartmentsAndTeamsView.tsx
// ============================================================================
// Joy PeopleHR — Departments & Teams Operational Management & Detail Inspector
// Realtime Database-Backed Structure with Live Member Queries & Head Assignment
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Avatar } from '../../components/ui/Avatar';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  Building2,
  Users,
  Plus,
  Search,
  Layers,
  MapPin,
  Briefcase,
  User as UserIcon,
  ShieldCheck,
  RefreshCw,
  FolderTree,
  Edit3,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Landmark,
  Mail,
  Hash,
} from 'lucide-react';
import { Department, Team, Company, Branch, Employee } from '../../types';
import { organizationStructureService } from '../../services/organization/organizationStructureService';
import { hrEventBus } from '../../services/hrEventBus';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';

interface Props {
  organizationId?: string;
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const DepartmentsAndTeamsView: React.FC<Props> = ({
  organizationId = 'org-joy-01',
  onNavigateTab,
}) => {
  const { showToast } = useToast();
  const [subView, setSubView] = useState<'departments' | 'teams'>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected Detail Drawer States
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptMembers, setDeptMembers] = useState<Employee[]>([]);
  const [deptTeams, setDeptTeams] = useState<Team[]>([]);
  const [isDeptDrawerOpen, setIsDeptDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'members' | 'teams'>('overview');

  // Selected Team Drawer States
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [isTeamDrawerOpen, setIsTeamDrawerOpen] = useState(false);

  // Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isAssignHeadModalOpen, setIsAssignHeadModalOpen] = useState(false);
  const [newHeadId, setNewHeadId] = useState('');

  // Form States - Department
  const [deptCompanyId, setDeptCompanyId] = useState('');
  const [deptBranchId, setDeptBranchId] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptCostCenter, setDeptCostCenter] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [deptHeadId, setDeptHeadId] = useState('');

  // Form States - Team
  const [teamDeptId, setTeamDeptId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [deptList, teamList, compList, brList, emps] = await Promise.all([
        organizationStructureService.getDepartments(undefined, organizationId),
        organizationStructureService.getTeams(organizationId),
        organizationStructureService.getLegalEntities(organizationId),
        organizationStructureService.getBranches(undefined, organizationId),
        api.getEmployees(),
      ]);

      // Resolve department heads from explicit database assignment or designated Head
      const enrichedDepts = deptList.map(dept => {
        let headName = dept.head_employee_name;
        let headId = dept.head_employee_id;
        const matchingEmps = emps.filter(
          e => e.department_id === dept.id || e.department_name?.toLowerCase() === dept.name.toLowerCase()
        );

        if (headId) {
          const matched = emps.find(e => e.id === headId);
          if (matched) {
            headName = matched.display_name || `${matched.first_name} ${matched.last_name}`.trim();
          }
        } else {
          // Check if an employee holds the explicit designation Head of this department
          const designatedHead = matchingEmps.find(
            e =>
              e.designation_title?.toLowerCase().includes(`${dept.name.toLowerCase()} head`) ||
              e.designation_title?.toLowerCase().includes('hr head') && dept.code === 'HR'
          );
          if (designatedHead) {
            headName = designatedHead.display_name || `${designatedHead.first_name} ${designatedHead.last_name}`.trim();
            headId = designatedHead.id;
          }
        }

        return {
          ...dept,
          head_employee_id: headId,
          head_employee_name: headName,
          employee_count: matchingEmps.length,
          team_count: teamList.filter(t => t.department_id === dept.id).length,
        };
      });

      setDepartments(enrichedDepts);
      setTeams(teamList);
      setCompanies(compList);
      setBranches(brList);
      setAllEmployees(emps);

      if (compList.length > 0 && !deptCompanyId) {
        setDeptCompanyId(compList[0].id);
      }
      if (enrichedDepts.length > 0 && !teamDeptId) {
        setTeamDeptId(enrichedDepts[0].id);
      }

      // If drawer is currently open, refresh selected entity
      if (selectedDept) {
        const refreshedDept = enrichedDepts.find(d => d.id === selectedDept.id);
        if (refreshedDept) {
          setSelectedDept(refreshedDept);
          const members = emps.filter(
            e => e.department_id === refreshedDept.id || e.department_name?.toLowerCase() === refreshedDept.name.toLowerCase()
          );
          setDeptMembers(members);
          setDeptTeams(teamList.filter(t => t.department_id === refreshedDept.id));
        }
      }
    } catch (err) {
      console.error('[DepartmentsAndTeamsView] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organizationId]);

  useEffect(() => {
    const unsub = hrEventBus.subscribe('organization.*', () => {
      loadData();
    });
    const unsubEmp = hrEventBus.subscribe('employee.*', () => {
      loadData();
    });
    return () => {
      unsub();
      unsubEmp();
    };
  }, [organizationId, selectedDept?.id]);

  const handleOpenDepartmentDetail = (dept: Department) => {
    setSelectedDept(dept);
    const members = allEmployees.filter(
      e => e.department_id === dept.id || e.department_name?.toLowerCase() === dept.name.toLowerCase()
    );
    const relatedTeams = teams.filter(t => t.department_id === dept.id);
    setDeptMembers(members);
    setDeptTeams(relatedTeams);
    setDrawerTab('overview');
    setIsDeptDrawerOpen(true);
  };

  const handleOpenTeamDetail = (team: Team) => {
    setSelectedTeam(team);
    const members = allEmployees.filter(e => (e as any).team_id === team.id);
    setTeamMembers(members);
    setIsTeamDrawerOpen(true);
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptCompanyId || !deptName || !deptCode) return;

    try {
      await organizationStructureService.createDepartment({
        company_id: deptCompanyId,
        branch_id: deptBranchId || undefined,
        name: deptName,
        code: deptCode,
        cost_center_code: deptCostCenter,
        description: deptDescription,
        head_employee_id: deptHeadId || undefined,
      });
      showToast(`Department ${deptName} created successfully!`);
      setIsDeptModalOpen(false);
      setDeptName('');
      setDeptCode('');
      setDeptCostCenter('');
      setDeptDescription('');
      setDeptHeadId('');
      loadData();
    } catch {
      showToast('Error creating department', 'error');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamDeptId || !teamName || !teamCode) return;

    try {
      await organizationStructureService.createTeam({
        organization_id: organizationId,
        department_id: teamDeptId,
        name: teamName,
        code: teamCode,
        description: teamDescription,
        team_lead_employee_id: teamLeadId || undefined,
      });
      showToast(`Team ${teamName} registered successfully!`);
      setIsTeamModalOpen(false);
      setTeamName('');
      setTeamCode('');
      setTeamDescription('');
      setTeamLeadId('');
      loadData();
    } catch {
      showToast('Error creating team', 'error');
    }
  };

  const handleAssignHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !newHeadId) return;

    try {
      const selectedEmp = allEmployees.find(e => e.id === newHeadId);
      const headName = selectedEmp ? selectedEmp.display_name || `${selectedEmp.first_name} ${selectedEmp.last_name}` : '';

      await organizationStructureService.updateDepartment(selectedDept.id, {
        head_employee_id: newHeadId,
        head_employee_name: headName,
      });

      showToast(`Assigned ${headName} as Head of ${selectedDept.name}!`);
      setIsAssignHeadModalOpen(false);
      loadData();
    } catch {
      showToast('Error updating department head', 'error');
    }
  };

  const handleNavigateToPeople = () => {
    window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: 'people' } }));
  };

  const filteredDepartments = departments.filter(
    d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      (d.cost_center_code && d.cost_center_code.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredTeams = teams.filter(
    t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      (t.department_name && t.department_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Toggle subview tabs */}
        <div className="flex items-center p-1 bg-gray-100/80 rounded-2xl border border-gray-200/80 w-fit">
          <button
            onClick={() => setSubView('departments')}
            className={cn(
              'px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2',
              subView === 'departments' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Building2 className="w-3.5 h-3.5 text-[#07563D]" />
            Departments ({departments.length})
          </button>
          <button
            onClick={() => setSubView('teams')}
            className={cn(
              'px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2',
              subView === 'teams' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            Teams & Squads ({teams.length})
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D] w-56"
            />
          </div>

          {subView === 'departments' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsDeptModalOpen(true)}
              className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsTeamModalOpen(true)}
              className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Add Team
            </Button>
          )}
        </div>
      </div>

      {/* 2. Content Views */}
      {subView === 'departments' ? (
        <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs font-bold text-gray-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#07563D]" />
              Loading realtime departments...
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="p-12 text-center max-w-sm mx-auto">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-900">No departments registered yet</h4>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Structure your organization by adding functional departments and cost centers.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsDeptModalOpen(true)}
                className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
              >
                <Plus className="w-4 h-4" />
                Add First Department
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-gray-700">Department Name</TableHead>
                  <TableHead className="font-bold text-gray-700">Code</TableHead>
                  <TableHead className="font-bold text-gray-700">Cost Center</TableHead>
                  <TableHead className="font-bold text-gray-700">Department Head</TableHead>
                  <TableHead className="font-bold text-gray-700 text-center">Members</TableHead>
                  <TableHead className="font-bold text-gray-700">Status</TableHead>
                  <TableHead className="text-right font-bold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map(dept => (
                  <TableRow
                    key={dept.id}
                    className="cursor-pointer hover:bg-emerald-50/40 transition-colors"
                    onClick={() => handleOpenDepartmentDetail(dept)}
                  >
                    <TableCell>
                      <div className="font-bold text-gray-900 text-xs flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[#07563D]" />
                        {dept.name}
                      </div>
                      {dept.description && <div className="text-[11px] text-gray-400 truncate max-w-xs">{dept.description}</div>}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                        {dept.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-gray-600">{dept.cost_center_code || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-800">
                        {dept.head_employee_name ? (
                          <>
                            <Avatar name={dept.head_employee_name} size="sm" className="w-5 h-5 text-[9px]" />
                            <span className="font-semibold text-gray-900">{dept.head_employee_name}</span>
                          </>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-xs bg-emerald-50 text-[#07563D] border border-emerald-100 px-2 py-0.5 rounded-full">
                        {dept.employee_count ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={dept.status === 'Active' ? 'emerald' : 'gray'} className="text-[10px]">
                        {dept.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenDepartmentDetail(dept);
                        }}
                        className="text-xs text-[#07563D] hover:bg-emerald-50 font-bold"
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      ) : (
        /* Teams Table */
        <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs font-bold text-gray-400">Loading teams & squads...</div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-12 text-center max-w-sm mx-auto">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-900">No Teams Configured</h4>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Create agile squads and cross-functional teams under your departments.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsTeamModalOpen(true)}
                className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
              >
                <Plus className="w-4 h-4" />
                Add First Team
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-gray-700">Team Name</TableHead>
                  <TableHead className="font-bold text-gray-700">Code</TableHead>
                  <TableHead className="font-bold text-gray-700">Parent Department</TableHead>
                  <TableHead className="font-bold text-gray-700">Team Lead</TableHead>
                  <TableHead className="font-bold text-gray-700 text-center">Members</TableHead>
                  <TableHead className="font-bold text-gray-700">Status</TableHead>
                  <TableHead className="text-right font-bold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map(t => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-emerald-50/40 transition-colors"
                    onClick={() => handleOpenTeamDetail(t)}
                  >
                    <TableCell>
                      <div className="font-bold text-gray-900 text-xs flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        {t.name}
                      </div>
                      {t.description && <div className="text-[11px] text-gray-400 truncate max-w-xs">{t.description}</div>}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                        {t.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-800 font-medium">
                      {t.department_name || departments.find(d => d.id === t.department_id)?.name || 'General Operations'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-800">
                        {t.team_lead_name ? (
                          <>
                            <Avatar name={t.team_lead_name} size="sm" className="w-5 h-5 text-[9px]" />
                            <span className="font-semibold text-gray-900">{t.team_lead_name}</span>
                          </>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                        {t.member_count || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'Active' ? 'emerald' : 'gray'} className="text-[10px]">
                        {t.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenTeamDetail(t);
                        }}
                        className="text-xs text-[#07563D] hover:bg-emerald-50 font-bold"
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* 3. Detailed Department Inspector Side Drawer */}
      {selectedDept && (
        <Drawer
          isOpen={isDeptDrawerOpen}
          onClose={() => setIsDeptDrawerOpen(false)}
          title={`Department: ${selectedDept.name}`}
          subtitle={`Code: ${selectedDept.code} • Cost Center: ${selectedDept.cost_center_code || 'N/A'}`}
          width="2xl"
        >
          <div className="p-6 space-y-6">
            {/* Drawer Top Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <button
                onClick={() => setDrawerTab('overview')}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition',
                  drawerTab === 'overview' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                Overview & Structure
              </button>
              <button
                onClick={() => setDrawerTab('members')}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5',
                  drawerTab === 'members' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                Active Members
                <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded-full">{deptMembers.length}</span>
              </button>
              <button
                onClick={() => setDrawerTab('teams')}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5',
                  drawerTab === 'teams' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                Sub-Teams & Squads
                <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded-full">{deptTeams.length}</span>
              </button>
            </div>

            {drawerTab === 'overview' && (
              <div className="space-y-6">
                {/* Department Head Card */}
                <Card className="p-4 bg-gradient-to-r from-emerald-50/60 to-emerald-100/30 border border-emerald-200/80 rounded-2xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {selectedDept.head_employee_name ? (
                        <Avatar name={selectedDept.head_employee_name} size="lg" className="w-12 h-12 text-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                          <UserIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Department Head
                        </div>
                        <h4 className="text-sm font-black text-gray-900">
                          {selectedDept.head_employee_name || 'No Head Assigned'}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {allEmployees.find(e => e.id === selectedDept.head_employee_id)?.designation_title ||
                            'Functional Lead'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewHeadId(selectedDept.head_employee_id || '');
                        setIsAssignHeadModalOpen(true);
                      }}
                      className="text-xs gap-1 border-emerald-300 text-[#07563D] bg-white rounded-xl"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {selectedDept.head_employee_name ? 'Change Head' : 'Assign Head'}
                    </Button>
                  </div>
                </Card>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 text-center rounded-2xl border-gray-200/80">
                    <div className="text-lg font-black text-[#07563D]">{deptMembers.length}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Employees</div>
                  </Card>
                  <Card className="p-3 text-center rounded-2xl border-gray-200/80">
                    <div className="text-lg font-black text-blue-700">{deptTeams.length}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Teams</div>
                  </Card>
                  <Card className="p-3 text-center rounded-2xl border-gray-200/80">
                    <div className="text-lg font-black text-emerald-700">{selectedDept.status || 'Active'}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Status</div>
                  </Card>
                </div>

                {/* Information Details */}
                <div className="space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-400">Description & Mission</span>
                    <p className="text-xs text-gray-700 mt-0.5">
                      {selectedDept.description || 'Core operational and strategic division within the enterprise group.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/60">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400">Cost Center Code</span>
                      <div className="text-xs font-mono font-bold text-gray-800">{selectedDept.cost_center_code || 'CC-GEN-101'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400">Facility / Campus</span>
                      <div className="text-xs font-semibold text-gray-800">Coimbatore HQ Tech Park</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {drawerTab === 'members' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800">
                    Assigned Employees ({deptMembers.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNavigateToPeople}
                    className="text-xs text-[#07563D] hover:bg-emerald-50 gap-1"
                  >
                    Open Directory <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>

                {deptMembers.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-700">No employees assigned to this department yet</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Add or transfer employees to this department in the Employee Management module.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-auto pr-1">
                    {deptMembers.map(emp => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-200/80 bg-white hover:border-emerald-300 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={emp.display_name || `${emp.first_name} ${emp.last_name}`}
                            src={emp.avatar_url}
                            size="md"
                            className="w-9 h-9"
                          />
                          <div>
                            <h5 className="text-xs font-bold text-gray-900">
                              {emp.display_name || `${emp.first_name} ${emp.last_name}`}
                            </h5>
                            <p className="text-[11px] text-gray-500">{emp.designation_title || 'Team Member'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="emerald" className="text-[9px]">
                            {emp.status || 'Active'}
                          </Badge>
                          <div className="text-[10px] font-mono text-gray-400 mt-0.5">{emp.employee_code}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {drawerTab === 'teams' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800">
                    Department Teams & Squads ({deptTeams.length})
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTeamDeptId(selectedDept.id);
                      setIsTeamModalOpen(true);
                    }}
                    className="text-xs gap-1 border-emerald-300 text-[#07563D] rounded-xl"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Squad
                  </Button>
                </div>

                {deptTeams.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80">
                    <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-700">No sub-teams created under {selectedDept.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Organize members into specialized teams, projects, or squads.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-auto pr-1">
                    {deptTeams.map(t => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setIsDeptDrawerOpen(false);
                          handleOpenTeamDetail(t);
                        }}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-200/80 bg-white hover:border-emerald-300 transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                            {t.code}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-gray-900">{t.name}</h5>
                            <p className="text-[11px] text-gray-500">Lead: {t.team_lead_name || 'Unassigned'}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Drawer>
      )}

      {/* 4. Detailed Team / Squad Inspector Side Drawer */}
      {selectedTeam && (
        <Drawer
          isOpen={isTeamDrawerOpen}
          onClose={() => setIsTeamDrawerOpen(false)}
          title={`Team: ${selectedTeam.name}`}
          subtitle={`Code: ${selectedTeam.code} • ${selectedTeam.department_name || 'Department Team'}`}
          width="xl"
        >
          <div className="p-6 space-y-6">
            {/* Team Lead Card */}
            <Card className="p-4 bg-gradient-to-r from-blue-50/60 to-blue-100/30 border border-blue-200/80 rounded-2xl">
              <div className="flex items-center gap-3">
                {selectedTeam.team_lead_name ? (
                  <Avatar name={selectedTeam.team_lead_name} size="lg" className="w-12 h-12 text-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                    <UserIcon className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                    Team Lead / Squad Lead
                  </div>
                  <h4 className="text-sm font-black text-gray-900">
                    {selectedTeam.team_lead_name || 'No Lead Assigned'}
                  </h4>
                  <p className="text-xs text-gray-600">Technical / Operational Lead</p>
                </div>
              </div>
            </Card>

            {/* Team Info */}
            <div className="space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/60">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Team Purpose & Scope</span>
                <p className="text-xs text-gray-700 mt-0.5">
                  {selectedTeam.description || 'Specialized delivery squad responsible for core product & domain execution.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/60">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Parent Department</span>
                  <div className="text-xs font-semibold text-gray-800">
                    {selectedTeam.department_name || departments.find(d => d.id === selectedTeam.department_id)?.name || 'General Operations'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Status</span>
                  <div>
                    <Badge variant="emerald" className="text-[9px]">
                      {selectedTeam.status || 'Active'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Members List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-800">Squad Members ({teamMembers.length})</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNavigateToPeople}
                  className="text-xs text-[#07563D] hover:bg-emerald-50 gap-1"
                >
                  Manage Members <ExternalLink className="w-3 h-3" />
                </Button>
              </div>

              {teamMembers.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-700">No members assigned directly to this squad</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Assign employees to this team from the Employee Directory.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-auto">
                  {teamMembers.map(emp => (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-200/80 bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.display_name || `${emp.first_name} ${emp.last_name}`} size="sm" />
                        <div>
                          <h5 className="text-xs font-bold text-gray-900">
                            {emp.display_name || `${emp.first_name} ${emp.last_name}`}
                          </h5>
                          <p className="text-[10px] text-gray-500">{emp.designation_title}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">{emp.employee_code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Drawer>
      )}

      {/* Modal: Add Department */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Add Functional Department"
        description="Register a new organizational unit and assign a cost center code"
      >
        <form onSubmit={handleCreateDepartment} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Parent Legal Entity *</label>
            <select
              value={deptCompanyId}
              onChange={e => setDeptCompanyId(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
              required
            >
              <option value="">Select legal entity...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.legal_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Department Name *</label>
              <input
                type="text"
                placeholder="e.g. Information Technology"
                value={deptName}
                onChange={e => setDeptName(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Department Code *</label>
              <input
                type="text"
                placeholder="e.g. IT"
                value={deptCode}
                onChange={e => setDeptCode(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Cost Center Code</label>
              <input
                type="text"
                placeholder="e.g. CC-IT-101"
                value={deptCostCenter}
                onChange={e => setDeptCostCenter(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Department Head (Optional)</label>
              <select
                value={deptHeadId}
                onChange={e => setDeptHeadId(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
              >
                <option value="">Select Department Head...</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.display_name || `${emp.first_name} ${emp.last_name}`} ({emp.designation_title || 'Employee'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Description & Scope</label>
            <textarea
              placeholder="Describe the department's mandate and primary responsibilities..."
              value={deptDescription}
              onChange={e => setDeptDescription(e.target.value)}
              rows={2}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Team */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        title="Add Team / Squad"
        description="Create a focused squad or operational unit under a department"
      >
        <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Parent Department *</label>
            <select
              value={teamDeptId}
              onChange={e => setTeamDeptId(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
              required
            >
              <option value="">Select department...</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Team Name *</label>
              <input
                type="text"
                placeholder="e.g. Core Platform Squad"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Team Code *</label>
              <input
                type="text"
                placeholder="e.g. SQUAD-PLAT"
                value={teamCode}
                onChange={e => setTeamCode(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Team Lead (Optional)</label>
            <select
              value={teamLeadId}
              onChange={e => setTeamLeadId(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
            >
              <option value="">Select Team Lead...</option>
              {allEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.display_name || `${emp.first_name} ${emp.last_name}`} ({emp.designation_title || 'Employee'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
            <textarea
              placeholder="Describe team mandate and scope..."
              value={teamDescription}
              onChange={e => setTeamDescription(e.target.value)}
              rows={2}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsTeamModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
              Create Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assign Department Head */}
      <Modal
        isOpen={isAssignHeadModalOpen}
        onClose={() => setIsAssignHeadModalOpen(false)}
        title="Assign Department Head"
        description={`Select an executive or manager to lead the ${selectedDept?.name} department`}
      >
        <form onSubmit={handleAssignHead} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Select Employee *</label>
            <select
              value={newHeadId}
              onChange={e => setNewHeadId(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
              required
            >
              <option value="">Choose employee...</option>
              {allEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.display_name || `${emp.first_name} ${emp.last_name}`} — {emp.designation_title || 'Employee'} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignHeadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
              Save Department Head
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
