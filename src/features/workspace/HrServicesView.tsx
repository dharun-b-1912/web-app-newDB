
import React, { useState, useEffect, useMemo } from 'react';
import { serviceCatalogService } from '../../services/services/serviceCatalogService';
import {
  ServiceDefinition,
  ServiceRequest,
  ServiceRequestStatus,
  ServiceFormField,
  FormFieldType,
} from '../../types/employeeRelations';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { useToast } from '../../components/ui/Toast';
import { HelpdeskView } from '../other/subviews/HelpdeskView';
import { CommunicationHubView } from '../other/subviews/CommunicationHubView';
import {
  Send,
  HelpCircle,
  Megaphone,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sliders,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  Trash2,
  Edit,
} from 'lucide-react';

export const HrServicesView: React.FC<{ initialTab?: string }> = ({ initialTab = 'requests' }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Service Requests Desk State
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Request Detail Modal
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Form Builder / Service Configuration Modal
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<ServiceDefinition> | null>(null);
  const [formFields, setFormFields] = useState<ServiceFormField[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reqData, defData] = await Promise.all([
        serviceCatalogService.fetchServiceRequests(),
        serviceCatalogService.fetchServiceDefinitions(),
      ]);
      setRequests(reqData);
      setServices(defData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusUpdate = async (reqId: string, status: ServiceRequestStatus) => {
    setIsProcessingAction(true);
    try {
      const ok = await serviceCatalogService.updateRequestStatus(reqId, status, actionNotes);
      if (ok) {
        showToast(`Request #${selectedRequest?.request_number} updated to ${status}`, 'success');
        setSelectedRequest(null);
        setActionNotes('');
        loadData();
      }
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSaveService = async () => {
    if (!editingService?.name || !editingService?.code) {
      showToast('Please provide service name and code', 'error');
      return;
    }

    const payload: Partial<ServiceDefinition> = {
      ...editingService,
      form_schema: formFields,
    };

    const saved = await serviceCatalogService.createOrUpdateDefinition(payload);
    if (saved) {
      showToast(`Service "${saved.name}" saved successfully`, 'success');
      setIsServiceModalOpen(false);
      setEditingService(null);
      setFormFields([]);
      loadData();
    }
  };

  const addFormField = () => {
    const newField: ServiceFormField = {
      id: `field_${Date.now()}`,
      label: 'New Field Label',
      type: 'TEXT',
      required: true,
      placeholder: 'Enter details...',
    };
    setFormFields([...formFields, newField]);
  };

  const updateFormField = (index: number, updates: Partial<ServiceFormField>) => {
    const next = [...formFields];
    next[index] = { ...next[index], ...updates };
    setFormFields(next);
  };

  const removeFormField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.service_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  const getStatusBadge = (status: ServiceRequestStatus) => {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETED':
        return <Badge variant="emerald" className="font-bold">COMPLETED</Badge>;
      case 'PENDING_MANAGER':
      case 'PENDING_HR':
      case 'SUBMITTED':
        return <Badge variant="amber" className="font-bold">PENDING REVIEW</Badge>;
      case 'IN_REVIEW':
      case 'PROCESSING':
        return <Badge variant="blue" className="font-bold">IN PROCESS</Badge>;
      case 'ACTION_REQUIRED':
        return <Badge variant="purple" className="font-bold">CLARIFICATION NEEDED</Badge>;
      case 'REJECTED':
      case 'CANCELLED':
        return <Badge variant="danger" className="font-bold">REJECTED</Badge>;
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'HR SERVICES' }, { label: 'Operational Service Desk' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Send className="w-5 h-5 text-[#07563D]" />
            <span>Employee Relations, Services & Helpdesk Hub</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Dynamic service request workflows, form builder, operational ticketing, and targeted company broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadData} disabled={isLoading}>
            <RotateCcw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {activeTab === 'catalog' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setEditingService({
                  name: '',
                  code: '',
                  category: 'General',
                  sla_hours: 48,
                  enabled: true,
                  employee_visible: true,
                  requires_attachment: false,
                });
                setFormFields([]);
                setIsServiceModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Configure New Service
            </Button>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'requests', label: `Service Requests Queue (${requests.length})`, icon: <Send className="w-4 h-4" /> },
          { id: 'catalog', label: `Service Catalog & Forms (${services.length})`, icon: <Sliders className="w-4 h-4" /> },
          { id: 'helpdesk', label: 'HR Helpdesk Tickets', icon: <HelpCircle className="w-4 h-4" /> },
          { id: 'communication', label: 'Communication Hub', icon: <Megaphone className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Service Requests Queue */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === 'SUBMITTED' ? 'border-amber-500 ring-2 ring-amber-100 bg-amber-50/20' : ''
                }`}
            >
              <div className="text-[11px] font-bold text-gray-500 uppercase">Pending Review</div>
              <div className="text-xl font-black text-amber-600 mt-1">
                {requests.filter((r) => r.status === 'SUBMITTED' || r.status === 'PENDING_HR').length}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Awaiting HR action</div>
            </Card>

            <Card
              onClick={() => setStatusFilter('APPROVED')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === 'APPROVED' ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20' : ''
                }`}
            >
              <div className="text-[11px] font-bold text-gray-500 uppercase">Completed / Approved</div>
              <div className="text-xl font-black text-emerald-600 mt-1">
                {requests.filter((r) => r.status === 'APPROVED' || r.status === 'COMPLETED').length}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Dispatched to employee</div>
            </Card>

            <Card
              onClick={() => setStatusFilter('ACTION_REQUIRED')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === 'ACTION_REQUIRED' ? 'border-purple-500 ring-2 ring-purple-100 bg-purple-50/20' : ''
                }`}
            >
              <div className="text-[11px] font-bold text-gray-500 uppercase">Clarification Needed</div>
              <div className="text-xl font-black text-purple-600 mt-1">
                {requests.filter((r) => r.status === 'ACTION_REQUIRED').length}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Waiting on employee response</div>
            </Card>

            <Card
              onClick={() => setStatusFilter('ALL')}
              className="p-4 rounded-xl border hover:border-gray-300 cursor-pointer transition-all"
            >
              <div className="text-[11px] font-bold text-gray-500 uppercase">Total Requests</div>
              <div className="text-xl font-black text-gray-900 mt-1">{requests.length}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">All services combined</div>
            </Card>
          </div>

          {/* Search & Filter */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search request #, employee, service name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted / Pending</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="ACTION_REQUIRED">Clarification Needed</option>
              <option value="APPROVED">Approved / Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Requests Table */}
          <Card className="rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                    <th className="p-3.5 font-mono">Req #</th>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Service Requested</th>
                    <th className="p-3.5">Submitted Date</th>
                    <th className="p-3.5">Form Preview</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        <Send className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-50" />
                        <p className="font-bold text-gray-700">No service requests found</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Employee submissions from mobile will arrive here in real time.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-[#07563D]">{r.request_number}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-gray-900">{r.employee_name}</div>
                          <div className="text-[11px] text-gray-400">{r.department || 'General'}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-gray-900">{r.service_name}</div>
                          <div className="text-[11px] text-gray-400">{r.category}</div>
                        </td>
                        <td className="p-3.5 text-gray-500 whitespace-nowrap">
                          {new Date(r.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 max-w-xs truncate text-[11px] text-gray-500">
                          {Object.entries(r.form_data || {})
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' • ') || 'No extra fields'}
                        </td>
                        <td className="p-3.5">{getStatusBadge(r.status)}</td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(r);
                              setActionNotes('');
                            }}
                          >
                            Review & Process
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Service Catalog & Dynamic Form Builder */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((def) => (
              <Card key={def.id} className="p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-[#07563D] border border-emerald-200 rounded-md font-mono text-[10px] font-bold">
                      {def.code}
                    </span>
                    <Badge variant={def.enabled ? 'emerald' : 'gray'}>
                      {def.enabled ? 'ACTIVE' : 'DISABLED'}
                    </Badge>
                  </div>

                  <h3 className="text-sm font-black text-gray-900">{def.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{def.description}</p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <div className="text-gray-500 font-semibold">
                    <span>{def.form_schema?.length || 0} Dynamic Form Fields</span>
                    <span className="mx-1.5">•</span>
                    <span>SLA: {def.sla_hours}h</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setEditingService(def);
                        setFormFields(def.form_schema || []);
                        setIsServiceModalOpen(true);
                      }}
                      leftIcon={<Edit className="w-3 h-3" />}
                    >
                      Configure
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Helpdesk Tickets */}
      {activeTab === 'helpdesk' && <HelpdeskView />}

      {/* Tab 4: Communication Hub */}
      {activeTab === 'communication' && <CommunicationHubView />}

      {/* Request Review & Approval Modal */}
      {selectedRequest && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title={`Review Service Request: ${selectedRequest.request_number}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900 text-sm">{selectedRequest.employee_name}</div>
                <div className="text-gray-500">Service: <span className="font-semibold text-gray-800">{selectedRequest.service_name}</span></div>
              </div>
              <div>{getStatusBadge(selectedRequest.status)}</div>
            </div>

            {/* Submitted Form Values */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Submitted Form Values</div>
              {Object.entries(selectedRequest.form_data || {}).map(([key, val]) => (
                <div key={key} className="flex justify-between py-1 border-b border-gray-100 last:border-none">
                  <span className="font-semibold text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="font-bold text-gray-900">{String(val)}</span>
                </div>
              ))}
            </div>

            {/* Action Notes Input */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">HR Processing / Resolution Notes</label>
              <textarea
                rows={3}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Enter notes or reason for approval / clarification / rejection..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <Button
                size="sm"
                variant="outline"
                className="text-red-700 border-red-200 hover:bg-red-50"
                onClick={() => handleStatusUpdate(selectedRequest.id, 'REJECTED')}
                disabled={isProcessingAction}
              >
                Reject Request
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-purple-700 border-purple-200 hover:bg-purple-50"
                  onClick={() => handleStatusUpdate(selectedRequest.id, 'ACTION_REQUIRED')}
                  disabled={isProcessingAction}
                >
                  Request Clarification
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleStatusUpdate(selectedRequest.id, 'APPROVED')}
                  disabled={isProcessingAction}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {isProcessingAction ? 'Processing...' : 'Approve & Complete'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Service Catalog & Form Builder Modal */}
      {isServiceModalOpen && editingService && (
        <Modal
          isOpen={isServiceModalOpen}
          onClose={() => setIsServiceModalOpen(false)}
          title={`Configure Service: ${editingService.name || 'New Service'}`}
          size="lg"
        >
          <div className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Service Name *</label>
                <input
                  type="text"
                  value={editingService.name || ''}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  placeholder="e.g. Salary Certificate Request"
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Service Code (Unique ID) *</label>
                <input
                  type="text"
                  value={editingService.code || ''}
                  onChange={(e) => setEditingService({ ...editingService, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SAL-CERT"
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Category</label>
                <input
                  type="text"
                  value={editingService.category || 'General'}
                  onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">SLA Target (Hours)</label>
                <input
                  type="number"
                  value={editingService.sla_hours || 48}
                  onChange={(e) => setEditingService({ ...editingService, sla_hours: parseInt(e.target.value) || 24 })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Description / Instructions for Employees</label>
              <textarea
                rows={2}
                value={editingService.description || ''}
                onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                placeholder="Explain what this service provides and any prerequisites..."
                className="w-full p-2.5 border border-gray-200 rounded-xl"
              />
            </div>

            {/* Dynamic Form Schema Builder */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-black text-gray-900 text-sm">Dynamic Form Schema</div>
                  <div className="text-gray-500 text-[11px]">Define the fields that Flutter will render dynamically on mobile.</div>
                </div>
                <Button size="xs" variant="outline" onClick={addFormField} leftIcon={<Plus className="w-3 h-3" />}>
                  Add Form Field
                </Button>
              </div>

              {formFields.length === 0 ? (
                <div className="text-center py-6 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                  <FileText className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <span>No custom fields yet. Click "Add Form Field" to add text, date, dropdown, or file upload fields.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {formFields.map((field, idx) => (
                    <div key={field.id || idx} className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateFormField(idx, { label: e.target.value })}
                          placeholder="Field Label (e.g. Bank Account Number)"
                          className="flex-1 p-1.5 border border-gray-200 rounded-lg font-semibold text-xs"
                        />

                        <select
                          value={field.type}
                          onChange={(e) => updateFormField(idx, { type: e.target.value as FormFieldType })}
                          className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700"
                        >
                          <option value="TEXT">Text Input</option>
                          <option value="TEXTAREA">Long Text Area</option>
                          <option value="NUMBER">Number</option>
                          <option value="DATE">Date Picker</option>
                          <option value="DROPDOWN">Dropdown Menu</option>
                          <option value="CHECKBOX">Checkbox</option>
                          <option value="RADIO">Radio Choices</option>
                          <option value="ATTACHMENT">File Upload Proof</option>
                          <option value="AMOUNT">Currency Amount (₹)</option>
                        </select>

                        <label className="flex items-center gap-1 font-bold text-gray-600">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateFormField(idx, { required: e.target.checked })}
                            className="accent-[#07563D]"
                          />
                          <span>Required</span>
                        </label>

                        <button
                          onClick={() => removeFormField(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {(field.type === 'DROPDOWN' || field.type === 'RADIO') && (
                        <div>
                          <input
                            type="text"
                            value={field.options?.join(', ') || ''}
                            onChange={(e) =>
                              updateFormField(idx, {
                                options: e.target.value.split(',').map((s) => s.trim()),
                              })
                            }
                            placeholder="Options separated by commas: Option A, Option B, Option C"
                            className="w-full p-1.5 border border-gray-200 rounded-lg text-xs text-gray-600"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button size="sm" variant="ghost" onClick={() => setIsServiceModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleSaveService}>
                Save Service Configuration
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
