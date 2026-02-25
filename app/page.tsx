'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  LayoutDashboard,
  Plus,
  FileText,
  History,
  Settings,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  Pencil,
  Send,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Clock,
  Users,
  TrendingUp,
  ChevronRight,
  Search,
  Filter,
  ArrowUpDown,
  X,
  Save,
  CircleDot,
  Zap,
  Shield,
  Bot,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

// ---- AGENT IDs ----
const TONE_CALIBRATION_AGENT_ID = '699ecd0609b9e338d300ed04'
const EMAIL_REMINDER_AGENT_ID = '699ecd3c86db8df09a1d9653'
const SMS_NOTIFICATION_AGENT_ID = '699ecd2a09b9e338d300ed12'
const VOICE_REMINDER_AGENT_ID = '699ecd2a86db8df09a1d9635'

// ---- TYPES ----
interface PaymentRecord {
  id: string
  userName: string
  email: string
  phone: string
  amountDue: string
  dueDate: string
  daysOverdue: number
  status: string
  toneLevel: string
}

interface GeneratedReminder {
  user_name: string
  email: string
  phone: string
  amount_due: string
  due_date: string
  days_overdue: number
  tone_level: string
  email_subject: string
  email_body: string
  sms_message: string
  voice_script: string
}

interface SentReminder {
  id: string
  userName: string
  email: string
  phone: string
  channel: 'email' | 'sms' | 'voice'
  toneLevel: string
  message: string
  status: string
  sentAt: string
  amountDue: string
}

interface EscalationRule {
  tone: string
  minDays: number
  maxDays: number
}

// ---- INITIAL DATA ----
const initialPaymentRecords: PaymentRecord[] = [
  { id: '1', userName: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+1-555-0101', amountDue: '$249.99', dueDate: '2026-02-20', daysOverdue: 5, status: 'overdue', toneLevel: 'SOFT' },
  { id: '2', userName: 'Marcus Chen', email: 'mchen@email.com', phone: '+1-555-0102', amountDue: '$149.00', dueDate: '2026-02-15', daysOverdue: 10, status: 'overdue', toneLevel: 'MODERATE' },
  { id: '3', userName: 'Emily Rodriguez', email: 'emily.r@email.com', phone: '+1-555-0103', amountDue: '$399.50', dueDate: '2026-02-10', daysOverdue: 15, status: 'overdue', toneLevel: 'FIRM' },
  { id: '4', userName: 'David Park', email: 'dpark@email.com', phone: '+1-555-0104', amountDue: '$89.99', dueDate: '2026-01-30', daysOverdue: 26, status: 'overdue', toneLevel: 'FINAL_NOTICE' },
  { id: '5', userName: 'Lisa Thompson', email: 'lisa.t@email.com', phone: '+1-555-0105', amountDue: '$199.00', dueDate: '2026-02-05', daysOverdue: 20, status: 'overdue', toneLevel: 'URGENT' },
  { id: '6', userName: 'James Wilson', email: 'jwilson@email.com', phone: '+1-555-0106', amountDue: '$324.75', dueDate: '2026-02-22', daysOverdue: 3, status: 'overdue', toneLevel: 'SOFT' },
]

const defaultEscalationRules: EscalationRule[] = [
  { tone: 'SOFT', minDays: 1, maxDays: 5 },
  { tone: 'MODERATE', minDays: 6, maxDays: 10 },
  { tone: 'FIRM', minDays: 11, maxDays: 15 },
  { tone: 'URGENT', minDays: 16, maxDays: 25 },
  { tone: 'FINAL_NOTICE', minDays: 26, maxDays: 999 },
]

// ---- HELPERS ----
function getToneBadgeClasses(tone: string): string {
  const t = tone?.toUpperCase() ?? ''
  if (t === 'SOFT') return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50'
  if (t === 'MODERATE') return 'bg-amber-900/40 text-amber-300 border-amber-700/50'
  if (t === 'FIRM') return 'bg-orange-900/40 text-orange-300 border-orange-700/50'
  if (t === 'URGENT') return 'bg-red-900/40 text-red-300 border-red-700/50'
  if (t === 'FINAL_NOTICE') return 'bg-rose-950/50 text-rose-300 border-rose-700/50'
  return 'bg-muted text-muted-foreground border-border'
}

function getStatusBadge(status: string): string {
  if (status === 'sent' || status === 'success') return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50'
  if (status === 'failed') return 'bg-red-900/40 text-red-300 border-red-700/50'
  if (status === 'queued') return 'bg-amber-900/40 text-amber-300 border-amber-700/50'
  return 'bg-muted text-muted-foreground border-border'
}

function formatTone(tone: string): string {
  if (!tone) return ''
  return tone.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

// ---- ERROR BOUNDARY ----
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---- SIDEBAR NAV ITEMS ----
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'add-payment', label: 'Add Payment', icon: Plus },
  { id: 'review', label: 'Review Reminders', icon: FileText },
  { id: 'history', label: 'Reminder History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
]

// ---- METRIC CARD ----
function MetricCard({ title, value, icon: Icon, accent }: { title: string; value: string | number; icon: React.ElementType; accent?: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground tracking-wide uppercase font-sans">{title}</p>
            <p className="text-2xl font-bold mt-1 font-serif">{value}</p>
          </div>
          <div className={cn('p-3 rounded-lg', accent || 'bg-accent/20')}>
            <Icon className="h-5 w-5 text-accent-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- DASHBOARD SCREEN ----
function DashboardScreen({
  paymentRecords,
  onGenerateReminders,
  generating,
  setActiveScreen,
  statusMessage,
  generatedReminders,
}: {
  paymentRecords: PaymentRecord[]
  onGenerateReminders: () => void
  generating: boolean
  setActiveScreen: (s: string) => void
  statusMessage: string
  generatedReminders: GeneratedReminder[]
}) {
  const [sortField, setSortField] = useState<string>('daysOverdue')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterTone, setFilterTone] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const totalOverdue = paymentRecords.length
  const avgDaysOverdue = paymentRecords.length > 0 ? Math.round(paymentRecords.reduce((s, r) => s + r.daysOverdue, 0) / paymentRecords.length) : 0
  const remindersGenerated = generatedReminders.length

  const filtered = paymentRecords.filter(r => {
    if (filterTone !== 'all' && r.toneLevel !== filterTone) return false
    if (searchQuery && !r.userName.toLowerCase().includes(searchQuery.toLowerCase()) && !r.email.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[sortField]
    const bVal = (b as Record<string, unknown>)[sortField]
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    }
    const aStr = String(aVal ?? '')
    const bStr = String(bVal ?? '')
    return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
  })

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif tracking-wide">Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1">Overview of overdue payments and reminder activity</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setActiveScreen('add-payment')} className="font-sans text-sm">
            <Plus className="h-4 w-4 mr-2" /> Add Payment
          </Button>
          <Button onClick={onGenerateReminders} disabled={generating || paymentRecords.length === 0} className="bg-accent text-accent-foreground hover:bg-accent/90 font-sans text-sm">
            {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Zap className="h-4 w-4 mr-2" /> Generate Reminders</>}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 text-accent-foreground text-sm font-sans">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Overdue" value={totalOverdue} icon={AlertTriangle} accent="bg-red-900/30" />
        <MetricCard title="Avg Days Overdue" value={avgDaysOverdue} icon={Clock} accent="bg-amber-900/30" />
        <MetricCard title="Reminders Generated" value={remindersGenerated} icon={Send} accent="bg-emerald-900/30" />
        <MetricCard title="Collection Rate" value="68%" icon={TrendingUp} accent="bg-accent/20" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg font-serif">Payment Records</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 w-56 text-sm font-sans" />
              </div>
              <Select value={filterTone} onValueChange={setFilterTone}>
                <SelectTrigger className="w-40 h-9 text-sm font-sans">
                  <Filter className="h-3.5 w-3.5 mr-2" />
                  <SelectValue placeholder="Filter tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tones</SelectItem>
                  <SelectItem value="SOFT">Soft</SelectItem>
                  <SelectItem value="MODERATE">Moderate</SelectItem>
                  <SelectItem value="FIRM">Firm</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="FINAL_NOTICE">Final Notice</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[1.5fr_1.5fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 px-3 py-2 text-xs font-sans text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => toggleSort('userName')}>Name <ArrowUpDown className="h-3 w-3" /></button>
                <span>Email</span>
                <span>Phone</span>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => toggleSort('amountDue')}>Amount <ArrowUpDown className="h-3 w-3" /></button>
                <span>Due Date</span>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => toggleSort('daysOverdue')}>Days Over <ArrowUpDown className="h-3 w-3" /></button>
                <span>Tone</span>
              </div>
              {sorted.map(record => (
                <div key={record.id} className="grid grid-cols-[1.5fr_1.5fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 px-3 py-3 text-sm border-b border-border/30 hover:bg-secondary/30 transition-colors items-center">
                  <span className="font-medium font-serif">{record.userName}</span>
                  <span className="text-muted-foreground font-sans text-xs truncate">{record.email}</span>
                  <span className="text-muted-foreground font-sans text-xs">{record.phone}</span>
                  <span className="font-semibold text-foreground">{record.amountDue}</span>
                  <span className="text-muted-foreground font-sans text-xs">{record.dueDate}</span>
                  <span className="font-semibold text-red-400">{record.daysOverdue}d</span>
                  <Badge variant="outline" className={cn('text-xs font-sans', getToneBadgeClasses(record.toneLevel))}>{formatTone(record.toneLevel)}</Badge>
                </div>
              ))}
              {sorted.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">No payment records found.</div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- ADD PAYMENT SCREEN ----
function AddPaymentScreen({
  paymentRecords,
  setPaymentRecords,
}: {
  paymentRecords: PaymentRecord[]
  setPaymentRecords: React.Dispatch<React.SetStateAction<PaymentRecord[]>>
}) {
  const [form, setForm] = useState({ userName: '', email: '', phone: '', amountDue: '', dueDate: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const handleSubmit = () => {
    if (!form.userName || !form.email || !form.amountDue || !form.dueDate) {
      setMessage('Please fill in all required fields.')
      return
    }
    const today = new Date()
    const due = new Date(form.dueDate)
    const diffMs = today.getTime() - due.getTime()
    const daysOverdue = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

    let toneLevel = 'SOFT'
    if (daysOverdue > 25) toneLevel = 'FINAL_NOTICE'
    else if (daysOverdue > 15) toneLevel = 'URGENT'
    else if (daysOverdue > 10) toneLevel = 'FIRM'
    else if (daysOverdue > 5) toneLevel = 'MODERATE'

    if (editingId) {
      setPaymentRecords(prev => prev.map(r => r.id === editingId ? { ...r, userName: form.userName, email: form.email, phone: form.phone, amountDue: form.amountDue, dueDate: form.dueDate, daysOverdue, toneLevel } : r))
      setEditingId(null)
      setMessage('Payment record updated successfully.')
    } else {
      const newRecord: PaymentRecord = {
        id: generateId(),
        userName: form.userName,
        email: form.email,
        phone: form.phone,
        amountDue: form.amountDue.startsWith('$') ? form.amountDue : `$${form.amountDue}`,
        dueDate: form.dueDate,
        daysOverdue,
        status: 'overdue',
        toneLevel,
      }
      setPaymentRecords(prev => [...prev, newRecord])
      setMessage('Payment record added successfully.')
    }
    setForm({ userName: '', email: '', phone: '', amountDue: '', dueDate: '' })
  }

  const handleEdit = (record: PaymentRecord) => {
    setForm({ userName: record.userName, email: record.email, phone: record.phone, amountDue: record.amountDue, dueDate: record.dueDate })
    setEditingId(record.id)
  }

  const handleDelete = (id: string) => {
    setPaymentRecords(prev => prev.filter(r => r.id !== id))
    setMessage('Payment record deleted.')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-serif tracking-wide">Add Payment Record</h2>
        <p className="text-muted-foreground text-sm mt-1">Create and manage overdue payment records for reminder generation</p>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 text-accent-foreground text-sm font-sans">
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-serif">{editingId ? 'Edit Payment Record' : 'New Payment Record'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-sans text-xs uppercase tracking-wider text-muted-foreground">Full Name *</Label>
              <Input value={form.userName} onChange={e => setForm(prev => ({ ...prev, userName: e.target.value }))} placeholder="Sarah Johnson" className="font-sans" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans text-xs uppercase tracking-wider text-muted-foreground">Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="sarah@email.com" className="font-sans" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans text-xs uppercase tracking-wider text-muted-foreground">Phone</Label>
              <Input value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="+1-555-0101" className="font-sans" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans text-xs uppercase tracking-wider text-muted-foreground">Amount Due *</Label>
              <Input value={form.amountDue} onChange={e => setForm(prev => ({ ...prev, amountDue: e.target.value }))} placeholder="249.99" className="font-sans" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans text-xs uppercase tracking-wider text-muted-foreground">Due Date *</Label>
              <Input type="date" value={form.dueDate} onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))} className="font-sans" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} className="bg-accent text-accent-foreground hover:bg-accent/90 font-sans">
              {editingId ? <><Save className="h-4 w-4 mr-2" /> Update Record</> : <><Plus className="h-4 w-4 mr-2" /> Add Record</>}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={() => { setEditingId(null); setForm({ userName: '', email: '', phone: '', amountDue: '', dueDate: '' }) }} className="font-sans">Cancel</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-serif">Existing Records ({paymentRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {paymentRecords.map(record => (
              <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium font-serif truncate">{record.userName}</p>
                    <p className="text-xs text-muted-foreground font-sans">{record.email} | {record.amountDue} | Due: {record.dueDate}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-xs font-sans shrink-0', getToneBadgeClasses(record.toneLevel))}>{formatTone(record.toneLevel)}</Badge>
                  <span className="text-sm font-semibold text-red-400 shrink-0">{record.daysOverdue}d overdue</span>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
            {paymentRecords.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">No payment records. Add one above to get started.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- REVIEW REMINDERS SCREEN ----
function ReviewRemindersScreen({
  generatedReminders,
  setGeneratedReminders,
  onSendEmails,
  onSendSms,
  sendingEmails,
  sendingSms,
  emailStatus,
  smsStatus,
  onActivateVoice,
}: {
  generatedReminders: GeneratedReminder[]
  setGeneratedReminders: React.Dispatch<React.SetStateAction<GeneratedReminder[]>>
  onSendEmails: (selected: GeneratedReminder[]) => void
  onSendSms: (selected: GeneratedReminder[]) => void
  sendingEmails: boolean
  sendingSms: boolean
  emailStatus: string
  smsStatus: string
  onActivateVoice: (reminder: GeneratedReminder) => void
}) {
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set())
  const [selectedSmsIds, setSelectedSmsIds] = useState<Set<string>>(new Set())

  const toggleEmailSelect = (email: string) => {
    setSelectedEmailIds(prev => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  const toggleSmsSelect = (phone: string) => {
    setSelectedSmsIds(prev => {
      const next = new Set(prev)
      if (next.has(phone)) next.delete(phone)
      else next.add(phone)
      return next
    })
  }

  const selectAllEmails = () => {
    if (selectedEmailIds.size === generatedReminders.length) {
      setSelectedEmailIds(new Set())
    } else {
      setSelectedEmailIds(new Set(generatedReminders.map(r => r.email)))
    }
  }

  const selectAllSms = () => {
    if (selectedSmsIds.size === generatedReminders.length) {
      setSelectedSmsIds(new Set())
    } else {
      setSelectedSmsIds(new Set(generatedReminders.map(r => r.phone)))
    }
  }

  const updateReminderField = (index: number, field: string, value: string) => {
    setGeneratedReminders(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  if (generatedReminders.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-serif tracking-wide">Review Reminders</h2>
          <p className="text-muted-foreground text-sm mt-1">Review and edit generated reminder messages before sending</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No reminders generated yet.</p>
            <p className="text-muted-foreground text-sm mt-1">Go to Dashboard and click &quot;Generate Reminders&quot; to create tone-calibrated messages.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-serif tracking-wide">Review Reminders</h2>
        <p className="text-muted-foreground text-sm mt-1">{generatedReminders.length} reminders ready for review</p>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="email" className="flex-1 font-sans text-sm"><Mail className="h-4 w-4 mr-2" /> Email</TabsTrigger>
          <TabsTrigger value="sms" className="flex-1 font-sans text-sm"><MessageSquare className="h-4 w-4 mr-2" /> SMS</TabsTrigger>
          <TabsTrigger value="voice" className="flex-1 font-sans text-sm"><Phone className="h-4 w-4 mr-2" /> Voice</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox checked={selectedEmailIds.size === generatedReminders.length && generatedReminders.length > 0} onCheckedChange={selectAllEmails} />
              <span className="text-sm text-muted-foreground font-sans">Select All ({selectedEmailIds.size} selected)</span>
            </div>
            <Button onClick={() => onSendEmails(generatedReminders.filter(r => selectedEmailIds.has(r.email)))} disabled={sendingEmails || selectedEmailIds.size === 0} className="bg-accent text-accent-foreground hover:bg-accent/90 font-sans text-sm">
              {sendingEmails ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : <><Send className="h-4 w-4 mr-2" /> Send Email Reminders ({selectedEmailIds.size})</>}
            </Button>
          </div>
          {emailStatus && <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 text-sm font-sans">{emailStatus}</div>}
          <div className="space-y-3">
            {generatedReminders.map((reminder, idx) => (
              <Card key={`email-${idx}`} className="border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={selectedEmailIds.has(reminder.email)} onCheckedChange={() => toggleEmailSelect(reminder.email)} className="mt-1" />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-medium font-serif">{reminder.user_name}</p>
                          <p className="text-xs text-muted-foreground font-sans">{reminder.email} | {reminder.amount_due} | {reminder.days_overdue}d overdue</p>
                        </div>
                        <Badge variant="outline" className={cn('text-xs font-sans', getToneBadgeClasses(reminder.tone_level))}>{formatTone(reminder.tone_level)}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground font-sans">Subject</Label>
                          <Input value={reminder.email_subject} onChange={e => updateReminderField(idx, 'email_subject', e.target.value)} className="mt-1 text-sm font-sans" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground font-sans">Body</Label>
                          <Textarea value={reminder.email_body} onChange={e => updateReminderField(idx, 'email_body', e.target.value)} rows={4} className="mt-1 text-sm font-sans" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sms" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox checked={selectedSmsIds.size === generatedReminders.length && generatedReminders.length > 0} onCheckedChange={selectAllSms} />
              <span className="text-sm text-muted-foreground font-sans">Select All ({selectedSmsIds.size} selected)</span>
            </div>
            <Button onClick={() => onSendSms(generatedReminders.filter(r => selectedSmsIds.has(r.phone)))} disabled={sendingSms || selectedSmsIds.size === 0} className="bg-accent text-accent-foreground hover:bg-accent/90 font-sans text-sm">
              {sendingSms ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : <><Send className="h-4 w-4 mr-2" /> Send SMS Notifications ({selectedSmsIds.size})</>}
            </Button>
          </div>
          {smsStatus && <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 text-sm font-sans">{smsStatus}</div>}
          <div className="space-y-3">
            {generatedReminders.map((reminder, idx) => (
              <Card key={`sms-${idx}`} className="border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={selectedSmsIds.has(reminder.phone)} onCheckedChange={() => toggleSmsSelect(reminder.phone)} className="mt-1" />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-medium font-serif">{reminder.user_name}</p>
                          <p className="text-xs text-muted-foreground font-sans">{reminder.phone} | {reminder.amount_due}</p>
                        </div>
                        <Badge variant="outline" className={cn('text-xs font-sans', getToneBadgeClasses(reminder.tone_level))}>{formatTone(reminder.tone_level)}</Badge>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground font-sans">SMS Message</Label>
                        <Textarea value={reminder.sms_message} onChange={e => updateReminderField(idx, 'sms_message', e.target.value)} rows={3} className="mt-1 text-sm font-sans" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="voice" className="mt-4 space-y-4">
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold font-sans">Voice Reminder System</span>
            </div>
            <p className="text-xs text-muted-foreground font-sans">Click &quot;Activate Voice Reminder&quot; on any card below to initiate a live voice call session with the AI agent. The voice agent will read the script and interact with the recipient.</p>
          </div>
          <div className="space-y-3">
            {generatedReminders.map((reminder, idx) => (
              <Card key={`voice-${idx}`} className="border-border/40">
                <CardContent className="p-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-medium font-serif">{reminder.user_name}</p>
                        <p className="text-xs text-muted-foreground font-sans">{reminder.phone} | {reminder.amount_due} | {reminder.days_overdue}d overdue</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs font-sans', getToneBadgeClasses(reminder.tone_level))}>{formatTone(reminder.tone_level)}</Badge>
                        <Button size="sm" onClick={() => onActivateVoice(reminder)} className="bg-accent text-accent-foreground hover:bg-accent/90 font-sans text-xs">
                          <Phone className="h-3.5 w-3.5 mr-1" /> Activate Voice
                        </Button>
                      </div>
                    </div>
                    <div className="bg-secondary/40 rounded-lg p-3">
                      <Label className="text-xs text-muted-foreground font-sans">Voice Script</Label>
                      <Textarea value={reminder.voice_script} onChange={e => updateReminderField(idx, 'voice_script', e.target.value)} rows={3} className="mt-1 text-sm font-sans bg-transparent border-none focus-visible:ring-0 p-0 resize-none" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---- HISTORY SCREEN ----
function HistoryScreen({ sentReminders }: { sentReminders: SentReminder[] }) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const uniqueUsers = Array.from(new Set(sentReminders.map(r => r.userName)))
  const filteredUsers = uniqueUsers.filter(u => u.toLowerCase().includes(searchQuery.toLowerCase()))

  const selectedReminders = selectedUser
    ? sentReminders.filter(r => r.userName === selectedUser).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    : []

  const getChannelIcon = (channel: string) => {
    if (channel === 'email') return <Mail className="h-4 w-4 text-blue-400" />
    if (channel === 'sms') return <MessageSquare className="h-4 w-4 text-green-400" />
    return <Phone className="h-4 w-4 text-purple-400" />
  }

  if (sentReminders.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-serif tracking-wide">Reminder History</h2>
          <p className="text-muted-foreground text-sm mt-1">Audit trail of all sent reminders</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No reminders sent yet.</p>
            <p className="text-muted-foreground text-sm mt-1">Generate and send reminders to see the history here.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-serif tracking-wide">Reminder History</h2>
        <p className="text-muted-foreground text-sm mt-1">{sentReminders.length} reminders in the audit trail</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans uppercase tracking-wider text-muted-foreground">Users</CardTitle>
            <div className="relative mt-2">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search users..." className="pl-9 h-8 text-xs font-sans" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-340px)]">
              {filteredUsers.map(user => {
                const userReminders = sentReminders.filter(r => r.userName === user)
                const latestAmount = userReminders[0]?.amountDue ?? ''
                return (
                  <button key={user} onClick={() => setSelectedUser(user)} className={cn('w-full text-left px-4 py-3 border-b border-border/30 hover:bg-secondary/30 transition-colors', selectedUser === user && 'bg-secondary/50')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium font-serif text-sm">{user}</p>
                        <p className="text-xs text-muted-foreground font-sans">{userReminders.length} reminder{userReminders.length !== 1 ? 's' : ''} | {latestAmount}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                )
              })}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans uppercase tracking-wider text-muted-foreground">
              {selectedUser ? `Timeline - ${selectedUser}` : 'Select a user'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-340px)]">
              {selectedUser ? (
                <div className="p-4 space-y-4">
                  {selectedReminders.map(reminder => (
                    <div key={reminder.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="p-2 rounded-lg bg-secondary/50 border border-border/30">
                          {getChannelIcon(reminder.channel)}
                        </div>
                        <div className="w-px h-full bg-border/30 mt-2" />
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs text-muted-foreground font-sans">{reminder.sentAt}</span>
                          <Badge variant="outline" className={cn('text-xs font-sans', getToneBadgeClasses(reminder.toneLevel))}>{formatTone(reminder.toneLevel)}</Badge>
                          <Badge variant="outline" className={cn('text-xs font-sans', getStatusBadge(reminder.status))}>{reminder.status}</Badge>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-3 mt-2">
                          <p className="text-sm font-sans text-foreground/90">{reminder.message}</p>
                        </div>
                        <p className="text-xs text-muted-foreground font-sans mt-1">{reminder.channel === 'email' ? reminder.email : reminder.phone} | {reminder.amountDue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  Select a user from the list to view their reminder timeline.
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---- SETTINGS SCREEN ----
function SettingsScreen({
  escalationRules,
  setEscalationRules,
}: {
  escalationRules: EscalationRule[]
  setEscalationRules: React.Dispatch<React.SetStateAction<EscalationRule[]>>
}) {
  const [savedMsg, setSavedMsg] = useState('')

  const handleRuleChange = (index: number, field: 'minDays' | 'maxDays', value: string) => {
    setEscalationRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: parseInt(value) || 0 } : r))
  }

  const handleSave = () => {
    setSavedMsg('Settings saved successfully.')
    setTimeout(() => setSavedMsg(''), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-serif tracking-wide">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">Configure escalation rules and default templates</p>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-700/30 text-emerald-300 text-sm font-sans flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {savedMsg}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-serif">Tone Escalation Rules</CardTitle>
          <CardDescription className="font-sans text-sm">Define the day ranges that determine which tone level is applied to each overdue payment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {escalationRules.map((rule, idx) => (
              <div key={rule.tone} className="grid grid-cols-[1fr_100px_100px] gap-4 items-center p-3 rounded-lg bg-secondary/20 border border-border/30">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={cn('text-xs font-sans min-w-[100px] justify-center', getToneBadgeClasses(rule.tone))}>{formatTone(rule.tone)}</Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-sans">From (days)</Label>
                  <Input type="number" value={rule.minDays} onChange={e => handleRuleChange(idx, 'minDays', e.target.value)} className="h-8 text-sm font-sans" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-sans">To (days)</Label>
                  <Input type="number" value={rule.maxDays === 999 ? '' : rule.maxDays} onChange={e => handleRuleChange(idx, 'maxDays', e.target.value || '999')} placeholder="No limit" className="h-8 text-sm font-sans" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-serif">Default Templates</CardTitle>
          <CardDescription className="font-sans text-sm">Base templates used by the Tone Calibration Agent for each channel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-sans text-xs uppercase tracking-wider text-muted-foreground">Email Template</Label>
            <Textarea defaultValue="Dear {name},\n\nThis is a reminder regarding your outstanding balance of {amount} which was due on {due_date}.\n\nPlease arrange payment at your earliest convenience.\n\nBest regards,\nAccounts Team" rows={5} className="font-sans text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="font-sans text-xs uppercase tracking-wider text-muted-foreground">SMS Template</Label>
            <Textarea defaultValue="Reminder: Your payment of {amount} was due on {due_date}. Please pay promptly to avoid further action. Ref: {name}" rows={3} className="font-sans text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="font-sans text-xs uppercase tracking-wider text-muted-foreground">Voice Script Template</Label>
            <Textarea defaultValue="Hello {name}, this is a reminder about your outstanding payment of {amount}, which was due on {due_date}. Please contact us to arrange payment. Thank you." rows={3} className="font-sans text-sm" />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90 font-sans">
            <Save className="h-4 w-4 mr-2" /> Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// ---- VOICE OVERLAY ----
function VoiceOverlay({
  open,
  onClose,
  reminder,
}: {
  open: boolean
  onClose: () => void
  reminder: GeneratedReminder | null
}) {
  const [callActive, setCallActive] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [isThinking, setIsThinking] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const micCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const nextPlayTimeRef = useRef(0)
  const isMutedRef = useRef(false)

  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    if (micCtxRef.current) {
      micCtxRef.current.close().catch(() => {})
      micCtxRef.current = null
    }
    nextPlayTimeRef.current = 0
    setCallActive(false)
    setConnecting(false)
    setIsThinking(false)
  }, [])

  useEffect(() => {
    if (!open) cleanup()
  }, [open, cleanup])

  const startVoiceSession = async () => {
    setConnecting(true)
    setVoiceError('')
    setTranscript('')

    try {
      const res = await fetch('https://voice-sip.studio.lyzr.ai/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: VOICE_REMINDER_AGENT_ID }),
      })
      const data = await res.json()

      if (!data.wsUrl) {
        setVoiceError('Failed to get voice session URL')
        setConnecting(false)
        return
      }

      const sampleRate = data.audioConfig?.sampleRate || 24000
      const ws = new WebSocket(data.wsUrl)

      const audioCtx = new AudioContext({ sampleRate })
      nextPlayTimeRef.current = audioCtx.currentTime

      ws.onopen = () => {
        setCallActive(true)
        setConnecting(false)
        if (reminder?.voice_script) {
          ws.send(JSON.stringify({
            type: 'text',
            text: `Here is the context for this call. The customer is ${reminder.user_name}, owing ${reminder.amount_due}, ${reminder.days_overdue} days overdue. The script: ${reminder.voice_script}`
          }))
        }
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'audio' && msg.audio) {
            setIsThinking(false)
            const raw = atob(msg.audio)
            const buffer = new ArrayBuffer(raw.length)
            const view = new Uint8Array(buffer)
            for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)

            const pcm16 = new Int16Array(buffer)
            const float32 = new Float32Array(pcm16.length)
            for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768

            const audioBuffer = audioCtx.createBuffer(1, float32.length, sampleRate)
            audioBuffer.getChannelData(0).set(float32)

            const source = audioCtx.createBufferSource()
            source.buffer = audioBuffer

            const gainNode = audioCtx.createGain()
            gainNode.gain.value = 1.0
            source.connect(gainNode)
            gainNode.connect(audioCtx.destination)

            const startTime = Math.max(audioCtx.currentTime, nextPlayTimeRef.current)
            source.start(startTime)
            nextPlayTimeRef.current = startTime + audioBuffer.duration
          } else if (msg.type === 'transcript') {
            setIsThinking(false)
            const text = msg.text || msg.content || ''
            if (text) setTranscript(prev => prev + ' ' + text)
          } else if (msg.type === 'thinking') {
            setIsThinking(true)
          } else if (msg.type === 'clear') {
            setTranscript('')
          } else if (msg.type === 'error') {
            setVoiceError(msg.message || 'Voice error occurred')
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onerror = () => {
        setVoiceError('WebSocket connection error')
        cleanup()
      }

      ws.onclose = () => {
        setCallActive(false)
        setConnecting(false)
      }

      wsRef.current = ws

      // Mic capture
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const micCtx = new AudioContext({ sampleRate })
      const micSource = micCtx.createMediaStreamSource(stream)
      const processor = micCtx.createScriptProcessor(4096, 1, 1)

      const silentGain = micCtx.createGain()
      silentGain.gain.value = 0
      micSource.connect(processor)
      processor.connect(silentGain)
      silentGain.connect(micCtx.destination)

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current) return
        const inputData = e.inputBuffer.getChannelData(0)
        const pcm16 = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32768)))
        }
        const uint8 = new Uint8Array(pcm16.buffer)
        let binary = ''
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i])
        }
        const base64 = btoa(binary)
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'audio', audio: base64, sampleRate }))
        }
      }

      streamRef.current = stream
      audioCtxRef.current = audioCtx
      micCtxRef.current = micCtx
      processorRef.current = processor

    } catch (err) {
      setVoiceError('Failed to start voice session. Please check microphone permissions.')
      setConnecting(false)
    }
  }

  const endCall = () => {
    cleanup()
    setTranscript('')
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { cleanup(); onClose() } }}>
      <DialogContent className="sm:max-w-lg border-accent/30">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Phone className="h-5 w-5 text-accent" /> Voice Reminder
          </DialogTitle>
          <DialogDescription className="font-sans">
            {reminder ? `Calling ${reminder.user_name} regarding ${reminder.amount_due} overdue payment` : 'Voice reminder session'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {voiceError && (
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-sans flex items-center gap-2">
              <XCircle className="h-4 w-4" /> {voiceError}
            </div>
          )}

          {/* Waveform visualization */}
          <div className="flex items-center justify-center py-6">
            {callActive ? (
              <div className="flex items-center gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="w-1.5 bg-accent rounded-full animate-pulse" style={{ height: `${16 + Math.random() * 32}px`, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            ) : connecting ? (
              <Loader2 className="h-10 w-10 text-accent animate-spin" />
            ) : (
              <div className="p-6 rounded-full bg-accent/10 border border-accent/30">
                <Volume2 className="h-10 w-10 text-accent/60" />
              </div>
            )}
          </div>

          {isThinking && (
            <div className="text-center text-sm text-muted-foreground font-sans animate-pulse">Agent is thinking...</div>
          )}

          {transcript && (
            <ScrollArea className="h-32 rounded-lg bg-secondary/30 border border-border/30 p-3">
              <p className="text-sm font-sans text-foreground/90">{transcript}</p>
            </ScrollArea>
          )}

          {reminder && !callActive && !connecting && (
            <div className="bg-secondary/30 rounded-lg p-3 border border-border/30">
              <p className="text-xs text-muted-foreground font-sans mb-1">Script Preview</p>
              <p className="text-sm font-sans">{reminder.voice_script}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            {!callActive && !connecting ? (
              <Button onClick={startVoiceSession} className="bg-emerald-700 text-white hover:bg-emerald-600 font-sans">
                <Phone className="h-4 w-4 mr-2" /> Start Call
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsMuted(m => !m)} className={cn('font-sans', isMuted && 'bg-red-900/30 border-red-700/50')}>
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button onClick={endCall} className="bg-red-700 text-white hover:bg-red-600 font-sans">
                  <PhoneOff className="h-4 w-4 mr-2" /> End Call
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => { cleanup(); onClose() }} className="font-sans">
              <X className="h-4 w-4 mr-2" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---- AGENT STATUS FOOTER ----
function AgentStatusFooter({ activeAgentId }: { activeAgentId: string | null }) {
  const [expanded, setExpanded] = useState(false)

  const agents = [
    { id: TONE_CALIBRATION_AGENT_ID, name: 'Tone Calibration', purpose: 'Analyzes overdue days to assign tone levels and generate messages', icon: Zap },
    { id: EMAIL_REMINDER_AGENT_ID, name: 'Email Reminder', purpose: 'Sends personalized email reminders via Gmail integration', icon: Mail },
    { id: SMS_NOTIFICATION_AGENT_ID, name: 'SMS Notification', purpose: 'Queues SMS notification messages for delivery', icon: MessageSquare },
    { id: VOICE_REMINDER_AGENT_ID, name: 'Voice Reminder', purpose: 'Conducts live voice reminder calls via WebSocket', icon: Phone },
  ]

  return (
    <div className="border-t border-border/50 bg-card/80">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground font-sans hover:text-foreground transition-colors">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5" />
          <span>AI Agents ({agents.length})</span>
          {activeAgentId && (
            <span className="flex items-center gap-1 text-accent">
              <CircleDot className="h-3 w-3 animate-pulse" /> Active
            </span>
          )}
        </div>
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {agents.map(agent => {
            const Icon = agent.icon
            const isActive = activeAgentId === agent.id
            return (
              <div key={agent.id} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-sans', isActive ? 'bg-accent/10 border border-accent/30' : 'bg-secondary/20')}>
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-accent' : 'text-muted-foreground')} />
                <div className="flex-1 min-w-0">
                  <p className={cn('font-medium', isActive ? 'text-accent-foreground' : 'text-foreground')}>{agent.name}</p>
                  <p className="text-muted-foreground truncate">{agent.purpose}</p>
                </div>
                {isActive && <Loader2 className="h-3 w-3 animate-spin text-accent" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- MAIN PAGE ----
export default function Page() {
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>(initialPaymentRecords)
  const [generatedReminders, setGeneratedReminders] = useState<GeneratedReminder[]>([])
  const [sentReminders, setSentReminders] = useState<SentReminder[]>([])
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>(defaultEscalationRules)

  const [generating, setGenerating] = useState(false)
  const [sendingEmails, setSendingEmails] = useState(false)
  const [sendingSms, setSendingSms] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [emailStatus, setEmailStatus] = useState('')
  const [smsStatus, setSmsStatus] = useState('')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false)
  const [voiceReminder, setVoiceReminder] = useState<GeneratedReminder | null>(null)

  const [showSampleData, setShowSampleData] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Sample data toggle
  useEffect(() => {
    if (showSampleData && generatedReminders.length === 0) {
      const sampleReminders: GeneratedReminder[] = paymentRecords.map(r => ({
        user_name: r.userName,
        email: r.email,
        phone: r.phone,
        amount_due: r.amountDue,
        due_date: r.dueDate,
        days_overdue: r.daysOverdue,
        tone_level: r.toneLevel,
        email_subject: `Payment Reminder: ${r.amountDue} due - ${formatTone(r.toneLevel)} Notice`,
        email_body: `Dear ${r.userName},\n\nThis is a ${r.toneLevel.toLowerCase()} reminder regarding your outstanding balance of ${r.amountDue}, which was due on ${r.dueDate}. Your payment is now ${r.daysOverdue} days overdue.\n\nPlease arrange payment at your earliest convenience to avoid further escalation.\n\nBest regards,\nAccounts Team`,
        sms_message: `${formatTone(r.toneLevel)} Reminder: ${r.userName}, your payment of ${r.amountDue} (due ${r.dueDate}) is ${r.daysOverdue} days overdue. Please pay promptly.`,
        voice_script: `Hello ${r.userName}, this is a ${r.toneLevel.toLowerCase()} reminder about your outstanding payment of ${r.amountDue}, which was due on ${r.dueDate}. Your account is now ${r.daysOverdue} days past due. Please contact our office to arrange payment as soon as possible. Thank you.`,
      }))
      setGeneratedReminders(sampleReminders)

      const sampleHistory: SentReminder[] = [
        { id: 'h1', userName: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+1-555-0101', channel: 'email', toneLevel: 'SOFT', message: 'Dear Sarah, this is a gentle reminder about your payment of $249.99...', status: 'sent', sentAt: '2026-02-24 09:15 AM', amountDue: '$249.99' },
        { id: 'h2', userName: 'Marcus Chen', email: 'mchen@email.com', phone: '+1-555-0102', channel: 'sms', toneLevel: 'MODERATE', message: 'MODERATE Reminder: Marcus Chen, your payment of $149.00 is 10 days overdue.', status: 'sent', sentAt: '2026-02-23 02:30 PM', amountDue: '$149.00' },
        { id: 'h3', userName: 'Emily Rodriguez', email: 'emily.r@email.com', phone: '+1-555-0103', channel: 'email', toneLevel: 'FIRM', message: 'Dear Emily, we urgently need to address your outstanding balance of $399.50...', status: 'sent', sentAt: '2026-02-22 11:00 AM', amountDue: '$399.50' },
        { id: 'h4', userName: 'David Park', email: 'dpark@email.com', phone: '+1-555-0104', channel: 'email', toneLevel: 'FINAL_NOTICE', message: 'FINAL NOTICE: David, your account with balance $89.99 requires immediate attention...', status: 'sent', sentAt: '2026-02-21 08:45 AM', amountDue: '$89.99' },
        { id: 'h5', userName: 'David Park', email: 'dpark@email.com', phone: '+1-555-0104', channel: 'sms', toneLevel: 'URGENT', message: 'URGENT: David Park, $89.99 is 26 days overdue. Immediate payment required.', status: 'sent', sentAt: '2026-02-20 03:00 PM', amountDue: '$89.99' },
      ]
      setSentReminders(sampleHistory)
    }
  }, [showSampleData, generatedReminders.length, paymentRecords])

  // Generate reminders
  const handleGenerateReminders = async () => {
    setGenerating(true)
    setActiveAgentId(TONE_CALIBRATION_AGENT_ID)
    setStatusMessage('Generating tone-calibrated reminders...')

    try {
      const message = JSON.stringify({
        action: 'generate_reminders',
        payment_records: paymentRecords.map(r => ({
          user_name: r.userName,
          email: r.email,
          phone: r.phone,
          amount_due: r.amountDue,
          due_date: r.dueDate,
          days_overdue: r.daysOverdue,
        })),
      })

      const result = await callAIAgent(message, TONE_CALIBRATION_AGENT_ID)

      if (result.success) {
        let parsed = result?.response?.result
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed) } catch {}
        }

        const reminders = Array.isArray(parsed?.reminders) ? parsed.reminders : []
        const summary = parsed?.summary || {}
        const breakdown = summary?.tone_breakdown || {}

        if (reminders.length > 0) {
          setGeneratedReminders(reminders)
          setStatusMessage(`Generated ${reminders.length} reminders. Breakdown: ${breakdown?.soft ?? 0} Soft, ${breakdown?.moderate ?? 0} Moderate, ${breakdown?.firm ?? 0} Firm, ${breakdown?.urgent ?? 0} Urgent, ${breakdown?.final_notice ?? 0} Final Notice`)
        } else {
          setStatusMessage('Reminders generated. Check the Review tab to see results.')
          // If no reminders returned, generate local fallback
          const fallback: GeneratedReminder[] = paymentRecords.map(r => ({
            user_name: r.userName,
            email: r.email,
            phone: r.phone,
            amount_due: r.amountDue,
            due_date: r.dueDate,
            days_overdue: r.daysOverdue,
            tone_level: r.toneLevel,
            email_subject: `Payment Reminder: ${r.amountDue} Outstanding`,
            email_body: `Dear ${r.userName},\n\nThis is a reminder about your payment of ${r.amountDue} which was due on ${r.dueDate}.\n\nPlease arrange payment promptly.\n\nBest regards`,
            sms_message: `Reminder: ${r.userName}, payment of ${r.amountDue} (due ${r.dueDate}) is ${r.daysOverdue} days overdue.`,
            voice_script: `Hello ${r.userName}, this is about your payment of ${r.amountDue}, due ${r.dueDate}. Please contact us to arrange payment.`,
          }))
          setGeneratedReminders(fallback)
        }
      } else {
        setStatusMessage(`Error: ${result?.error ?? 'Failed to generate reminders'}`)
      }
    } catch (err) {
      setStatusMessage('Error generating reminders. Please try again.')
    } finally {
      setGenerating(false)
      setActiveAgentId(null)
    }
  }

  // Send emails
  const handleSendEmails = async (selected: GeneratedReminder[]) => {
    if (selected.length === 0) return
    setSendingEmails(true)
    setActiveAgentId(EMAIL_REMINDER_AGENT_ID)
    setEmailStatus('Sending email reminders...')

    try {
      const message = JSON.stringify({
        action: 'send_emails',
        reminders: selected.map(r => ({
          recipient_email: r.email,
          recipient_name: r.user_name,
          subject: r.email_subject,
          body: r.email_body,
          tone_level: r.tone_level,
        })),
      })

      const result = await callAIAgent(message, EMAIL_REMINDER_AGENT_ID)

      if (result.success) {
        let parsed = result?.response?.result
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed) } catch {}
        }

        const results = Array.isArray(parsed?.results) ? parsed.results : []
        const totalSent = parsed?.total_sent ?? selected.length
        const totalFailed = parsed?.total_failed ?? 0

        const now = new Date().toLocaleString()
        const newHistory: SentReminder[] = selected.map((r, i) => {
          const resultItem = results[i]
          return {
            id: generateId(),
            userName: r.user_name,
            email: r.email,
            phone: r.phone,
            channel: 'email' as const,
            toneLevel: r.tone_level,
            message: r.email_body,
            status: resultItem?.status ?? 'sent',
            sentAt: resultItem?.sent_at ?? now,
            amountDue: r.amount_due,
          }
        })

        setSentReminders(prev => [...prev, ...newHistory])
        setEmailStatus(`${totalSent} emails sent successfully. ${totalFailed > 0 ? `${totalFailed} failed.` : ''}`)
      } else {
        setEmailStatus(`Error: ${result?.error ?? 'Failed to send emails'}`)
      }
    } catch {
      setEmailStatus('Error sending emails. Please try again.')
    } finally {
      setSendingEmails(false)
      setActiveAgentId(null)
    }
  }

  // Send SMS
  const handleSendSms = async (selected: GeneratedReminder[]) => {
    if (selected.length === 0) return
    setSendingSms(true)
    setActiveAgentId(SMS_NOTIFICATION_AGENT_ID)
    setSmsStatus('Sending SMS notifications...')

    try {
      const message = JSON.stringify({
        action: 'send_sms',
        reminders: selected.map(r => ({
          phone: r.phone,
          recipient_name: r.user_name,
          message: r.sms_message,
          tone_level: r.tone_level,
        })),
      })

      const result = await callAIAgent(message, SMS_NOTIFICATION_AGENT_ID)

      if (result.success) {
        let parsed = result?.response?.result
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed) } catch {}
        }

        const results = Array.isArray(parsed?.results) ? parsed.results : []
        const totalQueued = parsed?.total_queued ?? selected.length
        const totalFailed = parsed?.total_failed ?? 0

        const now = new Date().toLocaleString()
        const newHistory: SentReminder[] = selected.map((r, i) => {
          const resultItem = results[i]
          return {
            id: generateId(),
            userName: r.user_name,
            email: r.email,
            phone: r.phone,
            channel: 'sms' as const,
            toneLevel: r.tone_level,
            message: r.sms_message,
            status: resultItem?.status ?? 'queued',
            sentAt: resultItem?.queued_at ?? now,
            amountDue: r.amount_due,
          }
        })

        setSentReminders(prev => [...prev, ...newHistory])
        setSmsStatus(`${totalQueued} SMS notifications queued. ${totalFailed > 0 ? `${totalFailed} failed.` : ''}`)
      } else {
        setSmsStatus(`Error: ${result?.error ?? 'Failed to send SMS'}`)
      }
    } catch {
      setSmsStatus('Error sending SMS. Please try again.')
    } finally {
      setSendingSms(false)
      setActiveAgentId(null)
    }
  }

  // Voice overlay
  const handleActivateVoice = (reminder: GeneratedReminder) => {
    setVoiceReminder(reminder)
    setVoiceOverlayOpen(true)
  }

  return (
    <ErrorBoundary>
      <div className="dark min-h-screen bg-background text-foreground flex">
        {/* Sidebar */}
        <div className={cn('flex flex-col border-r border-border/50 bg-card/50 transition-all duration-300 shrink-0', sidebarCollapsed ? 'w-16' : 'w-64')}>
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <h1 className="font-bold font-serif text-lg tracking-wide truncate">Payment Remind</h1>
                  <p className="text-xs text-muted-foreground font-sans">Collection Agent Suite</p>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 p-2 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = activeScreen === item.id
              return (
                <button key={item.id} onClick={() => setActiveScreen(item.id)} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans transition-colors', isActive ? 'bg-accent/15 text-accent-foreground border border-accent/30' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30')}>
                  <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-accent')} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              )
            })}
          </nav>

          <div className="p-3 border-t border-border/50">
            <button onClick={() => setSidebarCollapsed(c => !c)} className="w-full flex items-center justify-center p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/30 transition-colors">
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          <AgentStatusFooter activeAgentId={activeAgentId} />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card/30 shrink-0">
            <div className="flex items-center gap-2 text-sm font-sans text-muted-foreground">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>/</span>
              <span className="text-foreground">{navItems.find(n => n.id === activeScreen)?.label ?? 'Dashboard'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="sample-data" className="text-xs text-muted-foreground font-sans cursor-pointer">Sample Data</Label>
              <Switch id="sample-data" checked={showSampleData} onCheckedChange={setShowSampleData} />
            </div>
          </div>

          {/* Page content */}
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-7xl mx-auto w-full">
              {activeScreen === 'dashboard' && (
                <DashboardScreen
                  paymentRecords={paymentRecords}
                  onGenerateReminders={handleGenerateReminders}
                  generating={generating}
                  setActiveScreen={setActiveScreen}
                  statusMessage={statusMessage}
                  generatedReminders={generatedReminders}
                />
              )}
              {activeScreen === 'add-payment' && (
                <AddPaymentScreen
                  paymentRecords={paymentRecords}
                  setPaymentRecords={setPaymentRecords}
                />
              )}
              {activeScreen === 'review' && (
                <ReviewRemindersScreen
                  generatedReminders={generatedReminders}
                  setGeneratedReminders={setGeneratedReminders}
                  onSendEmails={handleSendEmails}
                  onSendSms={handleSendSms}
                  sendingEmails={sendingEmails}
                  sendingSms={sendingSms}
                  emailStatus={emailStatus}
                  smsStatus={smsStatus}
                  onActivateVoice={handleActivateVoice}
                />
              )}
              {activeScreen === 'history' && (
                <HistoryScreen sentReminders={sentReminders} />
              )}
              {activeScreen === 'settings' && (
                <SettingsScreen
                  escalationRules={escalationRules}
                  setEscalationRules={setEscalationRules}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Voice Overlay */}
        <VoiceOverlay
          open={voiceOverlayOpen}
          onClose={() => { setVoiceOverlayOpen(false); setVoiceReminder(null) }}
          reminder={voiceReminder}
        />
      </div>
    </ErrorBoundary>
  )
}
