import { useEffect, useState, useMemo } from 'react';
import {
    AreaChart, Area,
    BarChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useBreakpoint from '../hooks/useBreakpoint';

// ── COLOR CONSTANTS FROM TEMPLATE ─────────────────────────────────────────────
const BLUE = '#1E6BFF';
const CYAN = '#06B6D4';
const GREEN = '#10B981';
const LIME = '#84CC16';
const ORANGE = '#F97316';
const PURPLE = '#8B5CF6';

export default function Dashboard() {
    const { user, isSuperUser } = useAuth();
    const { isMobile, isTablet } = useBreakpoint();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [realBills, setRealBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('This Month (Jan 1 – Jan 31, 2025)');
    const [revenueFilter, setRevenueFilter] = useState('Revenue');
    const [departmentFilter, setDepartmentFilter] = useState('Revenue');

    // Calendar state
    const [calDate, setCalDate] = useState(new Date(2025, 0, 21)); // Jan 21, 2025 from screenshot

    useEffect(() => {
        // Fetch summary
        API.get('dashboard/?months=6')
            .then(res => setData(res.data))
            .catch(() => setData({}))
            .finally(() => setLoading(false));

        // Fetch recent sales bills if available
        API.get('sales/bills/')
            .then(res => {
                if (Array.isArray(res.data)) setRealBills(res.data.slice(0, 5));
            })
            .catch(() => {});
    }, []);

    // ── DATA PREPARATION ───────────────────────────────────────────────────────
    // Line / Area chart data
    const revenueTrendData = useMemo(() => [
        { date: 'Jan 1',  revenue: 820000 },
        { date: 'Jan 5',  revenue: 950000 },
        { date: 'Jan 9',  revenue: 1100000 },
        { date: 'Jan 13', revenue: 1040000 },
        { date: 'Jan 17', revenue: 1220000 },
        { date: 'Jan 21', revenue: 1180000 },
        { date: 'Jan 25', revenue: 1350000 },
        { date: 'Jan 31', revenue: 1428350 },
    ], []);

    // Department Performance data
    const departmentData = useMemo(() => [
        { name: 'Sales',      amount: 420, label: 'PKR 420K', fill: BLUE },
        { name: 'Finance',    amount: 260, label: 'PKR 260K', fill: CYAN },
        { name: 'Operations', amount: 215, label: 'PKR 215K', fill: '#34D399' },
        { name: 'HR',         amount: 120, label: 'PKR 120K', fill: PURANGE(1) },
        { name: 'IT',         amount: 98,  label: 'PKR 98K',  fill: PURPLE },
    ], []);

    function PURANGE(idx) {
        return ['#818CF8', '#A78BFA'][idx] || '#818CF8';
    }

    // Donut Order Status data
    const orderStatusData = useMemo(() => [
        { name: 'Completed',  value: 159, percentage: '62%', color: GREEN },
        { name: 'Processing', value: 44,  percentage: '17%', color: CYAN },
        { name: 'Pending',    value: 36,  percentage: '14%', color: '#38BDF8' },
        { name: 'Cancelled',  value: 17,  percentage: '7%',  color: ORANGE },
    ], []);

    // Recent Transactions (merge template rows with actual backend bills if present)
    const recentTransactions = useMemo(() => {
        if (realBills && realBills.length > 0) {
            return realBills.map((b, idx) => ({
                id: b.bill_id || `INV-${10458 - idx}`,
                client: b.customer_name || 'Retail Client',
                department: idx % 2 === 0 ? 'Sales' : 'Operations',
                amount: `PKR ${Number(b.total_amount || 0).toLocaleString()}`,
                status: b.balance <= 0 ? 'Paid' : 'Pending',
            }));
        }
        return [
            { id: 'INV-10458', client: 'Aster Retail Ltd.',    department: 'Sales',       amount: 'PKR 24,500', status: 'Paid' },
            { id: 'INV-10457', client: 'Bluepeak Industries',  department: 'Finance',     amount: 'PKR 38,200', status: 'Paid' },
            { id: 'INV-10456', client: 'Crestline Foods',      department: 'Sales',       amount: 'PKR 17,850', status: 'Pending' },
            { id: 'INV-10455', client: 'Delta Solutions',      department: 'Procurement', amount: 'PKR 52,000', status: 'Paid' },
            { id: 'INV-10454', client: 'Evermart Trading',     department: 'Operations',  amount: 'PKR 29,350', status: 'Overdue' },
        ];
    }, [realBills]);

    // Tasks & Approvals
    const tasks = [
        {
            icon: '📅',
            iconBg: '#EEF4FF',
            iconColor: BLUE,
            title: 'Leave Approval',
            sub: '5 requests awaiting approval',
            path: '/users',
        },
        {
            icon: '🛒',
            iconBg: '#FFF4EC',
            iconColor: ORANGE,
            title: 'Purchase Request',
            sub: '3 requests (Total: PKR 18,400)',
            path: '/purchases',
        },
        {
            icon: '💳',
            iconBg: '#F3EEFF',
            iconColor: PURPLE,
            title: 'Payroll Review',
            sub: 'January payroll ready for review',
            path: '/customers',
        },
    ];

    // Calendar generation
    const calDays = useMemo(() => {
        // January 2025: starts on Wednesday (Dec 29, 30, 31 overflow)
        return [
            { day: 29, currentMonth: false },
            { day: 30, currentMonth: false },
            { day: 31, currentMonth: false },
            { day: 1, currentMonth: true },
            { day: 2, currentMonth: true },
            { day: 3, currentMonth: true },
            { day: 4, currentMonth: true },
            { day: 5, currentMonth: true },
            { day: 6, currentMonth: true },
            { day: 7, currentMonth: true },
            { day: 8, currentMonth: true },
            { day: 9, currentMonth: true },
            { day: 10, currentMonth: true },
            { day: 11, currentMonth: true },
            { day: 12, currentMonth: true },
            { day: 13, currentMonth: true },
            { day: 14, currentMonth: true },
            { day: 15, currentMonth: true },
            { day: 16, currentMonth: true },
            { day: 17, currentMonth: true },
            { day: 18, currentMonth: true },
            { day: 19, currentMonth: true },
            { day: 20, currentMonth: true },
            { day: 21, currentMonth: true, isSelected: true },
            { day: 22, currentMonth: true },
            { day: 23, currentMonth: true },
            { day: 24, currentMonth: true },
            { day: 25, currentMonth: true },
            { day: 26, currentMonth: true },
            { day: 27, currentMonth: true },
            { day: 28, currentMonth: true },
            { day: 29, currentMonth: true },
            { day: 30, currentMonth: true },
            { day: 31, currentMonth: true },
            { day: 1, currentMonth: false },
        ];
    }, []);

    // Custom Tooltip for AreaChart
    const RevenueTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5EAF2',
                    padding: '8px 12px',
                    borderRadius: 8,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                    fontSize: 12,
                }}>
                    <div style={{ color: '#64748B', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontWeight: 700, color: BLUE, fontSize: 14 }}>
                        PKR {Number(payload[0].value).toLocaleString()}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Layout>
            <div style={{ padding: isMobile ? '16px' : '28px 32px', maxWidth: 1440, margin: '0 auto' }}>

                {/* ── TOP TITLE & DATE FILTER ───────────────────────────────────── */}
                <div style={{
                    display: 'flex',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    justifyContent: 'space-between',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: 16,
                    marginBottom: 24,
                }}>
                    <div>
                        <h1 style={{
                            margin: 0,
                            fontSize: 24,
                            fontWeight: 800,
                            color: '#0F172A',
                            letterSpacing: '-0.3px',
                        }}>
                            ERP Management Dashboard
                        </h1>
                        <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>
                            A unified view of your people, finances, operations and business performance.
                        </p>
                    </div>

                    {/* Date filter dropdown pill */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#0F172A',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>{timeframe}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                </div>

                {/* ── ROW 1: 4 STAT CARDS ──────────────────────────────────────── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                    gap: 18,
                    marginBottom: 24,
                }}>
                    {/* Card 1: Total Employees / Catalog */}
                    <div style={styles.statCard}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ ...styles.statIconBadge, backgroundColor: '#EEF4FF', color: BLUE }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <div>
                                <div style={styles.statLabel}>Total Employees</div>
                                <div style={styles.statValue}>248</div>
                            </div>
                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                <span style={styles.statPillGreen}>↑ +5.1%</span>
                                <div style={styles.statSub}>vs. last month</div>
                            </div>
                        </div>
                        {/* Organic wave accent */}
                        <div style={{ ...styles.cardBottomWave, background: 'linear-gradient(90deg, rgba(30,107,255,0.08) 0%, rgba(30,107,255,0.01) 100%)' }} />
                    </div>

                    {/* Card 2: Monthly Revenue */}
                    <div style={styles.statCard}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ ...styles.statIconBadge, backgroundColor: '#E6FAF8', color: '#0D9488' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                    <line x1="2" y1="10" x2="22" y2="10" />
                                </svg>
                            </div>
                            <div>
                                <div style={styles.statLabel}>Monthly Revenue</div>
                                <div style={styles.statValue}>
                                    {data?.total_revenue ? `PKR ${Number(data.total_revenue).toLocaleString()}` : 'PKR 1,428,350'}
                                </div>
                            </div>
                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                <span style={styles.statPillGreen}>↑ +12.6%</span>
                                <div style={styles.statSub}>vs. last month</div>
                            </div>
                        </div>
                        <div style={{ ...styles.cardBottomWave, background: 'linear-gradient(90deg, rgba(13,148,136,0.1) 0%, rgba(13,148,136,0.01) 100%)' }} />
                    </div>

                    {/* Card 3: Pending Orders */}
                    <div style={styles.statCard}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ ...styles.statIconBadge, backgroundColor: '#FFF4EC', color: ORANGE }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="21" r="1" />
                                    <circle cx="20" cy="21" r="1" />
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                                </svg>
                            </div>
                            <div>
                                <div style={styles.statLabel}>Pending Orders</div>
                                <div style={styles.statValue}>56</div>
                            </div>
                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                <span style={styles.statPillOrange}>↑ +8.3%</span>
                                <div style={styles.statSub}>vs. last month</div>
                            </div>
                        </div>
                        <div style={{ ...styles.cardBottomWave, background: 'linear-gradient(90deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.01) 100%)' }} />
                    </div>

                    {/* Card 4: Inventory Health */}
                    <div style={styles.statCard}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ ...styles.statIconBadge, backgroundColor: '#F3EEFF', color: PURPLE }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                    <line x1="12" y1="22.08" x2="12" y2="12" />
                                </svg>
                            </div>
                            <div>
                                <div style={styles.statLabel}>Inventory Health</div>
                                <div style={styles.statValue}>92%</div>
                            </div>
                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                <span style={styles.statPillGreen}>↑ +2.4 pp</span>
                                <div style={styles.statSub}>vs. last month</div>
                            </div>
                        </div>
                        <div style={{ ...styles.cardBottomWave, background: 'linear-gradient(90deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.01) 100%)' }} />
                    </div>
                </div>

                {/* ── ROW 2: 3 ANALYTICS CHARTS ─────────────────────────────────── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : '1.4fr 1fr 0.9fr',
                    gap: 18,
                    marginBottom: 24,
                }}>
                    {/* Chart 1: Revenue Performance */}
                    <div style={styles.chartCard}>
                        <div style={styles.cardHeader}>
                            <div>
                                <h3 style={styles.cardTitle}>Revenue Performance</h3>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                                    <span style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>
                                        {data?.total_revenue ? `PKR ${Number(data.total_revenue).toLocaleString()}` : 'PKR 1,428,350'}
                                    </span>
                                    <span style={styles.statPillGreen}>↑ +12.6%</span>
                                    <span style={{ fontSize: 11, color: '#94A3B8' }}>vs. last month</span>
                                </div>
                            </div>
                            <div style={styles.smallDropdown}>
                                <span>{revenueFilter}</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                        </div>

                        <div style={{ height: 210, width: '100%', marginTop: 8 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="nexaRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={BLUE} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={BLUE} stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                                        tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                                    />
                                    <Tooltip content={<RevenueTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke={BLUE}
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill="url(#nexaRevenueGrad)"
                                        dot={{ r: 0 }}
                                        activeDot={{ r: 6, fill: BLUE, stroke: '#FFFFFF', strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 2: Department Performance */}
                    <div style={styles.chartCard}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>Department Performance</h3>
                            <div style={styles.smallDropdown}>
                                <span>{departmentFilter}</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                        </div>

                        <div style={{ height: 245, width: '100%', marginTop: 4 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={departmentData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }} barSize={28}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 11 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                                        tickFormatter={(v) => `${v}K`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#F8FAFC' }}
                                        formatter={(val) => [`PKR ${val}K`, 'Revenue']}
                                    />
                                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                                        {departmentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 3: Order Status Donut */}
                    <div style={styles.chartCard}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>Order Status</h3>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', height: 240, gap: 8 }}>
                            {/* Donut */}
                            <div style={{ width: 140, height: 140, position: 'relative', flexShrink: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={orderStatusData}
                                            innerRadius={48}
                                            outerRadius={65}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {orderStatusData.map((entry, index) => (
                                                <Cell key={`donut-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center count */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'none',
                                }}>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>256</div>
                                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Orders</div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                                {orderStatusData.map((item) => (
                                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }} />
                                            <span style={{ color: '#475569', fontWeight: 500 }}>{item.name}</span>
                                        </div>
                                        <div style={{ fontWeight: 700, color: '#0F172A' }}>
                                            {item.percentage} <span style={{ color: '#94A3B8', fontWeight: 400 }}>({item.value})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── ROW 3: 3 OPERATIONAL CARDS ────────────────────────────────── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : '1.4fr 1fr 0.9fr',
                    gap: 18,
                    marginBottom: 24,
                }}>
                    {/* Left: Recent Transactions */}
                    <div style={styles.chartCard}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>Recent Transactions</h3>
                            <Link to="/sales-history" style={{ fontSize: 12, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>
                                View All →
                            </Link>
                        </div>

                        <div style={{ overflowX: 'auto', marginTop: 10 }}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Invoice ID</th>
                                        <th style={styles.th}>Client</th>
                                        <th style={styles.th}>Department</th>
                                        <th style={styles.th}>Amount</th>
                                        <th style={styles.th}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTransactions.map((tx, idx) => (
                                        <tr key={idx} style={styles.tr}>
                                            <td style={{ ...styles.td, fontWeight: 700, color: BLUE }}>
                                                <Link to="/sales-history" style={{ color: BLUE }}>{tx.id}</Link>
                                            </td>
                                            <td style={{ ...styles.td, fontWeight: 600, color: '#0F172A' }}>{tx.client}</td>
                                            <td style={{ ...styles.td, color: '#64748B' }}>{tx.department}</td>
                                            <td style={{ ...styles.td, fontWeight: 700, color: '#0F172A' }}>{tx.amount}</td>
                                            <td style={styles.td}>
                                                <span style={
                                                    tx.status === 'Paid' ? styles.statusPaid :
                                                    tx.status === 'Pending' ? styles.statusPending :
                                                    styles.statusOverdue
                                                }>
                                                    {tx.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Middle: Tasks & Approvals */}
                    <div style={styles.chartCard}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>Tasks & Approvals</h3>
                            <span style={styles.badgePending}>3 Pending</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                            {tasks.map((task, i) => (
                                <Link
                                    key={i}
                                    to={task.path}
                                    style={styles.taskItem}
                                >
                                    <div style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 10,
                                        backgroundColor: task.iconBg,
                                        color: task.iconColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 18,
                                        flexShrink: 0,
                                    }}>
                                        {task.icon}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                                            {task.title}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                            {task.sub}
                                        </div>
                                    </div>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right: Schedule & Calendar */}
                    <div style={styles.chartCard}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <button style={styles.calNavBtn}>‹</button>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>January 2025</span>
                            <button style={styles.calNavBtn}>›</button>
                        </div>

                        {/* Weekday headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: 8 }}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <span key={d} style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>{d}</span>
                            ))}
                        </div>

                        {/* Calendar days */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
                            {calDays.map((item, index) => {
                                const isSelected = item.isSelected;
                                return (
                                    <div
                                        key={index}
                                        style={{
                                            height: 28,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 11,
                                            fontWeight: isSelected ? 800 : item.currentMonth ? 500 : 400,
                                            color: isSelected ? '#FFFFFF' : item.currentMonth ? '#0F172A' : '#CBD5E1',
                                            backgroundColor: isSelected ? BLUE : 'transparent',
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {item.day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── ROW 4: QUICK ACTIONS CONTAINER ───────────────────────────── */}
                <div style={styles.quickActionsCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={styles.boltIconBadge}>
                            ⚡
                        </div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Quick Actions</div>
                            <div style={{ fontSize: 12, color: '#64748B' }}>Common tasks, one click away.</div>
                        </div>
                    </div>

                    <div style={styles.quickActionsButtons}>
                        <Link to="/users" style={styles.quickActionBtn}>
                            <span style={{ color: BLUE, fontSize: 15 }}>👤+</span>
                            <span>Add Employee</span>
                        </Link>
                        <Link to="/sales" style={styles.quickActionBtn}>
                            <span style={{ color: GREEN, fontSize: 15 }}>📄</span>
                            <span>Create Invoice</span>
                        </Link>
                        <Link to="/products" style={styles.quickActionBtn}>
                            <span style={{ color: PURPLE, fontSize: 15 }}>📦</span>
                            <span>Stock Update</span>
                        </Link>
                        <Link to="/purchases" style={styles.quickActionBtn}>
                            <span style={{ color: CYAN, fontSize: 15 }}>🛒</span>
                            <span>New Purchase Order</span>
                        </Link>
                    </div>
                </div>

            </div>
        </Layout>
    );
}

// ── COMPONENT STYLES MATCHING THE SCREENSHOT ──────────────────────────────────
const styles = {
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: '20px 22px',
        border: '1px solid #E5EAF2',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
    },
    statIconBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: 600,
        color: '#64748B',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 800,
        color: '#0F172A',
        lineHeight: 1.1,
        letterSpacing: '-0.3px',
    },
    statPillGreen: {
        backgroundColor: '#ECFDF5',
        color: '#059669',
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 6,
        display: 'inline-block',
    },
    statPillOrange: {
        backgroundColor: '#FFF4EC',
        color: '#EA580C',
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 6,
        display: 'inline-block',
    },
    statSub: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 3,
    },
    cardBottomWave: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
    },
    chartCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: '20px 22px',
        border: '1px solid #E5EAF2',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: 800,
        color: '#0F172A',
        margin: 0,
        letterSpacing: '-0.2px',
    },
    smallDropdown: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: '#64748B',
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: '5px 10px',
        cursor: 'pointer',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 12,
    },
    th: {
        textAlign: 'left',
        padding: '8px 10px',
        color: '#94A3B8',
        fontWeight: 600,
        fontSize: 11,
        borderBottom: '1px solid #F1F5F9',
    },
    tr: {
        borderBottom: '1px solid #F8FAFC',
        transition: 'background 0.15s',
    },
    td: {
        padding: '10px 10px',
    },
    statusPaid: {
        backgroundColor: '#ECFDF5',
        color: '#059669',
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 6,
        display: 'inline-block',
    },
    statusPending: {
        backgroundColor: '#FFFBEB',
        color: '#D97706',
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 6,
        display: 'inline-block',
    },
    statusOverdue: {
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 6,
        display: 'inline-block',
    },
    badgePending: {
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 6,
    },
    taskItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        border: '1px solid #F1F5F9',
        textDecoration: 'none',
        transition: 'all 0.15s',
    },
    calNavBtn: {
        background: 'none',
        border: 'none',
        fontSize: 18,
        color: '#64748B',
        cursor: 'pointer',
        padding: '0 4px',
    },
    quickActionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: '16px 24px',
        border: '1px solid #E5EAF2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
    },
    boltIconBadge: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#EEF4FF',
        color: BLUE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
    },
    quickActionsButtons: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
    },
    quickActionBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        padding: '9px 16px',
        fontSize: 13,
        fontWeight: 600,
        color: '#0F172A',
        textDecoration: 'none',
        transition: 'all 0.15s',
    },
};
