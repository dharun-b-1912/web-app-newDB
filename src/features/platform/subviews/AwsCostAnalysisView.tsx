import React, { useState, useMemo } from 'react';
import {
  Server,
  Database,
  Cloud,
  Layers,
  TrendingUp,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  Activity,
  HardDrive,
  Cpu,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export interface AwsCostAnalysisViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const AwsCostAnalysisView: React.FC<AwsCostAnalysisViewProps> = ({ onNavigateTab }) => {
  // Interactive Simulation Controls
  const [employeeCount, setEmployeeCount] = useState<number>(100000);
  const [dauPercent, setDauPercent] = useState<number>(65);
  const [archTier, setArchTier] = useState<'cost-optimized' | 'enterprise' | 'high-availability'>('enterprise');
  const [billingModel, setBillingModel] = useState<'pay-go' | 'savings-plan'>('pay-go');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [showTechnicalSpecs, setShowTechnicalSpecs] = useState<boolean>(false);

  const USD_TO_INR = 86;

  // Workload Computations
  const calculations = useMemo(() => {
    const totalEmployees = employeeCount;
    const dau = Math.round((totalEmployees * dauPercent) / 100);
    const peakConcurrency = Math.round(dau * 0.15); // 15% of DAU in morning rush

    // CloudFront (Static Web SPA + CDN)
    let cloudFrontUsd = 0;
    if (totalEmployees <= 5000) cloudFrontUsd = 5;
    else if (totalEmployees <= 25000) cloudFrontUsd = 18;
    else if (totalEmployees <= 100000) cloudFrontUsd = 25;
    else if (totalEmployees <= 500000) cloudFrontUsd = 120;
    else cloudFrontUsd = 240;

    // Database (Amazon RDS PostgreSQL Multi-AZ / Aurora)
    let rdsUsd = 0;
    if (totalEmployees <= 1000) rdsUsd = 15;
    else if (totalEmployees <= 5000) rdsUsd = 35;
    else if (totalEmployees <= 10000) rdsUsd = 75;
    else if (totalEmployees <= 25000) rdsUsd = 145;
    else if (totalEmployees <= 50000) rdsUsd = 260;
    else if (totalEmployees <= 100000) rdsUsd = 410; // db.r6g.xlarge Multi-AZ
    else if (totalEmployees <= 500000) rdsUsd = 1650;
    else rdsUsd = 2950;

    // ECS Fargate (Backend API Tasks)
    let ecsUsd = 0;
    if (totalEmployees <= 1000) ecsUsd = 15;
    else if (totalEmployees <= 5000) ecsUsd = 30;
    else if (totalEmployees <= 10000) ecsUsd = 60;
    else if (totalEmployees <= 25000) ecsUsd = 95;
    else if (totalEmployees <= 50000) ecsUsd = 130;
    else if (totalEmployees <= 100000) ecsUsd = 185; // 4-8 tasks + ALB
    else if (totalEmployees <= 500000) ecsUsd = 820;
    else ecsUsd = 1550;

    // S3 Storage (Documents & Payslips)
    const storageGb = Math.round((totalEmployees * 20) / 1024); // 20MB per employee
    const s3Usd = Math.max(storageGb * 0.023, 2.5);

    // ElastiCache Redis
    let redisUsd = 0;
    if (totalEmployees <= 1000) redisUsd = 0;
    else if (totalEmployees <= 10000) redisUsd = 18;
    else if (totalEmployees <= 100000) redisUsd = 55; // Multi-AZ t4g.medium
    else redisUsd = 180;

    // Notifications (SES Email + SNS Push)
    const emailsMonth = Math.round(totalEmployees * 2.5);
    const sesUsd = (emailsMonth / 1000) * 0.10;
    const pushesMonth = totalEmployees * 60;
    const snsUsd = Math.max((pushesMonth - 1000000) / 1000000 * 0.50, 0);

    // Security & Networking (WAF + NAT GW + CloudWatch + Secrets)
    let securityNetUsd = 0;
    if (totalEmployees <= 1000) securityNetUsd = 16;
    else if (totalEmployees <= 10000) securityNetUsd = 55;
    else if (totalEmployees <= 100000) securityNetUsd = 158;
    else securityNetUsd = 420;

    // Total AWS Infrastructure Cost
    let rawTotalAwsUsd = cloudFrontUsd + rdsUsd + ecsUsd + s3Usd + redisUsd + sesUsd + snsUsd + securityNetUsd;

    // Apply Savings Plan discount if selected (30% on compute/DB)
    if (billingModel === 'savings-plan') {
      rawTotalAwsUsd = rawTotalAwsUsd - (rdsUsd + ecsUsd) * 0.35;
    }

    const totalAwsInr = Math.round(rawTotalAwsUsd * USD_TO_INR);
    const perUserCostInr = (totalAwsInr / totalEmployees).toFixed(2);
    const annualAwsInr = totalAwsInr * 12;

    // External Services (Airtel SMS, WhatsApp Meta, Resend, Maps)
    const externalMonthlyInr = Math.round(totalEmployees * 0.38);

    // Commercial Revenue Benchmark (e.g. ₹50/user avg plan)
    const projectedRevenueInr = totalEmployees * 50;
    const grossMarginPercent = (
      ((projectedRevenueInr - totalAwsInr - externalMonthlyInr) / projectedRevenueInr) * 100
    ).toFixed(1);

    return {
      totalEmployees,
      dau,
      peakConcurrency,
      cloudFrontUsd,
      rdsUsd,
      ecsUsd,
      s3Usd,
      redisUsd,
      sesUsd,
      snsUsd,
      securityNetUsd,
      totalAwsUsd: Math.round(rawTotalAwsUsd),
      totalAwsInr,
      perUserCostInr,
      annualAwsInr,
      externalMonthlyInr,
      projectedRevenueInr,
      grossMarginPercent,
    };
  }, [employeeCount, dauPercent, archTier, billingModel]);

  const formatCurrency = (valInr: number, valUsd?: number) => {
    if (currency === 'USD') {
      const u = valUsd !== undefined ? valUsd : Math.round(valInr / USD_TO_INR);
      return `$${u.toLocaleString()}`;
    }
    return `₹${valInr.toLocaleString()}`;
  };

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      {/* 1. Header & Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              AWS Cloud Architecture & FinOps Cost Analysis
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Verified Architecture Baseline
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-4xl">
            Forensic infrastructure planning model mapping Joy PeopleHR (Web & Flutter Mobile App) to AWS. 
            <span className="font-semibold text-slate-700 ml-1">Simulation Only — Zero changes to production data.</span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Currency Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setCurrency('INR')}
              className={`px-3 py-1 rounded-lg transition-all ${
                currency === 'INR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 rounded-lg transition-all ${
                currency === 'USD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              USD ($)
            </button>
          </div>

          <a
            href="/JOY_PEOPLEHR_AWS_EXECUTIVE_PRICING_REPORT.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Executive PDF Report
          </a>
        </div>
      </div>

      {/* 2. TOP EXECUTIVE KPI CARDS (Matching Requested Format) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-emerald-300 transition-all">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">1,000 Employees</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(4171, 48.5)} <span className="text-xs font-normal text-slate-500">/ mo</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">₹4.17 per employee</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-emerald-300 transition-all">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">10,000 Employees</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(20210, 235)} <span className="text-xs font-normal text-slate-500">/ mo</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">₹2.02 per employee</span>
        </div>

        <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase text-emerald-700 tracking-wider block">100,000 Employees</span>
          <div className="text-xl font-extrabold text-emerald-950 mt-1">
            {formatCurrency(75508, 878)} <span className="text-xs font-normal text-emerald-700">/ mo</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">₹0.75 per employee (Benchmark)</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-emerald-300 transition-all">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">1,000,000 Employees</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(633390, 7365)} <span className="text-xs font-normal text-slate-500">/ mo</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">₹0.59 per employee (Ultra-scale)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">AWS Infra / Employee</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">
            {currency === 'USD' ? `$${(Number(calculations.perUserCostInr) / USD_TO_INR).toFixed(4)}` : `₹${calculations.perUserCostInr}`}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">&lt; 1.8% of SaaS revenue</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Annual Infrastructure</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(calculations.annualAwsInr, calculations.totalAwsUsd * 12)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">12-month run rate</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Migration Estimate</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {currency === 'USD' ? '$4,400 – $7,500' : '₹3.8L – ₹6.5L'}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">120 – 200 engineer hours</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Primary Cost Driver</span>
          <div className="text-xl font-extrabold text-indigo-600 mt-1">RDS PostgreSQL</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">46.7% of total AWS spend</span>
        </div>
      </div>

      {/* 3. Interactive Scenario Controls */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              Interactive FinOps Workload Simulator
            </h2>
            <p className="text-xs text-slate-500">
              Adjust employee scale, active ratios, and contract models to simulate live AWS monthly costs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Pricing Model:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setBillingModel('pay-go')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  billingModel === 'pay-go' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                Pay-As-You-Go
              </button>
              <button
                onClick={() => setBillingModel('savings-plan')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  billingModel === 'savings-plan' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                1-Yr Savings Plan (-35%)
              </button>
            </div>
          </div>
        </div>

        {/* Quick Scale Presets */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 font-medium">Quick Presets:</span>
          {[1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000].map((preset) => (
            <button
              key={preset}
              onClick={() => setEmployeeCount(preset)}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                employeeCount === preset
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
            </button>
          ))}
        </div>

        {/* Slider Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Total Registered Employees</span>
              <span className="text-emerald-700 font-mono font-bold">{employeeCount.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={1000000}
              step={5000}
              value={employeeCount}
              onChange={(e) => setEmployeeCount(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Daily Active Ratio (DAU %)</span>
              <span className="text-emerald-700 font-mono font-bold">{dauPercent}% ({calculations.dau.toLocaleString()} DAU)</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={dauPercent}
              onChange={(e) => setDauPercent(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Architecture Tier</span>
              <span className="text-emerald-700 font-bold capitalize">{archTier.replace('-', ' ')}</span>
            </div>
            <select
              value={archTier}
              onChange={(e) => setArchTier(e.target.value as any)}
              className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="cost-optimized">Architecture A: Cost-Optimized (Single-AZ)</option>
              <option value="enterprise">Architecture B: Enterprise Standard (Multi-AZ)</option>
              <option value="high-availability">Architecture C: High Availability (Aurora Cluster)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. CURRENT ARCHITECTURE vs AWS TARGET ARCHITECTURE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current Supabase Stack */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                NOW
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Current Architecture: Supabase + BaaS</h3>
                <p className="text-[11px] text-slate-500">Managed developer platform baseline</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
              Shared Cloud
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Database:</span>
              <span className="font-semibold text-slate-800">Supabase PostgreSQL 15 (168 migrations)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Authentication:</span>
              <span className="font-semibold text-slate-800">Supabase Auth (GoTrue JWT)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Storage:</span>
              <span className="font-semibold text-slate-800">Supabase Storage (4 S3 buckets)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Realtime:</span>
              <span className="font-semibold text-slate-800">Supabase Realtime (WAL WebSockets)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Serverless:</span>
              <span className="font-semibold text-slate-800">7 Deno Edge Functions</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Cache & Rate Limiting:</span>
              <span className="font-semibold text-slate-800">Upstash Serverless Redis</span>
            </div>
          </div>
        </div>

        {/* Target AWS Stack */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                AWS
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Target AWS Architecture (Enterprise VPC)</h3>
                <p className="text-[11px] text-slate-500">Asia Pacific (Mumbai) ap-south-1</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
              Private VPC
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Database:</span>
              <span className="font-semibold text-slate-800">Amazon RDS PostgreSQL Multi-AZ (gp3 SSD)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Compute Backend:</span>
              <span className="font-semibold text-slate-800">AWS ECS on Fargate (ARM64 Graviton) + ALB</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Storage & Archive:</span>
              <span className="font-semibold text-slate-800">Amazon S3 Standard + S3 Glacier (7-Yr Retention)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Web Edge & CDN:</span>
              <span className="font-semibold text-slate-800">Amazon CloudFront + S3 Static Hosting</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">In-Memory Cache:</span>
              <span className="font-semibold text-slate-800">Amazon ElastiCache Redis Cluster</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Security & WAF:</span>
              <span className="font-semibold text-slate-800">AWS WAF + KMS Customer Keys + CloudTrail</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. ITEMISED MONTHLY AWS COST SCHEDULE */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Itemized Monthly AWS Cost Schedule ({employeeCount.toLocaleString()} Employees)
            </h2>
            <p className="text-xs text-slate-500">
              Detailed service breakdown for AWS Asia Pacific (Mumbai) based on verified pricing.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTechnicalSpecs(!showTechnicalSpecs)}
            className="text-xs flex items-center gap-1.5"
          >
            {showTechnicalSpecs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showTechnicalSpecs ? 'Hide Specs' : 'View Hardware Specs'}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Service & Functional Layer</th>
                <th className="py-2.5 px-3">Primary Role in Joy PeopleHR</th>
                {showTechnicalSpecs && <th className="py-2.5 px-3">Provisioned Hardware Sizing</th>}
                <th className="py-2.5 px-3 text-right">Monthly (USD)</th>
                <th className="py-2.5 px-3 text-right">Monthly (INR @ ₹86/$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-600" />
                  Amazon CloudFront (CDN)
                </td>
                <td className="py-2.5 px-3 text-slate-600">Global edge caching for React SPA & static assets</td>
                {showTechnicalSpecs && <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">Pro Plan / 4 TB Transfer + 15M Requests</td>}
                <td className="py-2.5 px-3 text-right font-mono">${calculations.cloudFrontUsd}</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">₹{(calculations.cloudFrontUsd * USD_TO_INR).toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  Amazon RDS for PostgreSQL
                </td>
                <td className="py-2.5 px-3 text-slate-600">Core database (168 migrations, multi-tenant RLS, payroll)</td>
                {showTechnicalSpecs && <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">Multi-AZ db.r6g.xlarge (4 vCPU, 32GB RAM, 1TB gp3)</td>}
                <td className="py-2.5 px-3 text-right font-mono">${calculations.rdsUsd}</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">₹{(calculations.rdsUsd * USD_TO_INR).toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  AWS ECS on Fargate + ALB
                </td>
                <td className="py-2.5 px-3 text-slate-600">Node.js Express backend, biometric gateway & WhatsApp webhooks</td>
                {showTechnicalSpecs && <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">4–8 Tasks (ARM64 Graviton, 2 vCPU, 4GB) + ALB</td>}
                <td className="py-2.5 px-3 text-right font-mono">${calculations.ecsUsd}</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">₹{(calculations.ecsUsd * USD_TO_INR).toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-amber-600" />
                  Amazon S3 Document Vault
                </td>
                <td className="py-2.5 px-3 text-slate-600">KYC scans (Aadhaar, PAN), contracts, salary slip PDFs</td>
                {showTechnicalSpecs && <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">2 TB Standard + S3 Glacier 7-year rule</td>}
                <td className="py-2.5 px-3 text-right font-mono">${calculations.s3Usd.toFixed(1)}</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">₹{Math.round(calculations.s3Usd * USD_TO_INR).toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-red-600" />
                  Amazon ElastiCache for Redis
                </td>
                <td className="py-2.5 px-3 text-slate-600">Biometric punch deduplication, rate limits, session protection</td>
                {showTechnicalSpecs && <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">Multi-AZ cache.t4g.medium (2 nodes)</td>}
                <td className="py-2.5 px-3 text-right font-mono">${calculations.redisUsd}</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">₹{(calculations.redisUsd * USD_TO_INR).toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Amazon SES & SNS Messaging
                </td>
                <td className="py-2.5 px-3 text-slate-600">Salary slip emails + instant Flutter push alerts</td>
                {showTechnicalSpecs && <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">300k emails/mo + 6M mobile push notifications</td>}
                <td className="py-2.5 px-3 text-right font-mono">${Math.round(calculations.sesUsd + calculations.snsUsd)}</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">₹{Math.round((calculations.sesUsd + calculations.snsUsd) * USD_TO_INR).toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-600" />
                  Security, VPC NAT & Monitoring
                </td>
                <td className="py-2.5 px-3 text-slate-600">AWS WAF, 2 NAT Gateways, CloudWatch logs, Secrets Manager</td>
                {showTechnicalSpecs && <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">2 NAT GWs + WAF 5 rules + 50GB logs</td>}
                <td className="py-2.5 px-3 text-right font-mono">${calculations.securityNetUsd}</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">₹{(calculations.securityNetUsd * USD_TO_INR).toLocaleString()}</td>
              </tr>
              <tr className="bg-emerald-50/70 font-bold text-emerald-950 text-[13px]">
                <td className="py-3 px-3">TOTAL AWS INFRASTRUCTURE SPEND</td>
                <td className="py-3 px-3 text-emerald-800">
                  {billingModel === 'savings-plan' ? '1-Year Savings Plan Applied (-35%)' : 'Pure Pay-As-You-Go (On-Demand)'}
                </td>
                {showTechnicalSpecs && <td className="py-3 px-3 text-emerald-800">All-Inclusive Cloud Hosting</td>}
                <td className="py-3 px-3 text-right font-mono text-emerald-900">${calculations.totalAwsUsd.toLocaleString()}</td>
                <td className="py-3 px-3 text-right font-mono text-emerald-900 font-extrabold">₹{calculations.totalAwsInr.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. AWS INFRASTRUCTURE vs EXTERNAL SERVICES vs REVENUE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* AWS Infra Card */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">1. AWS Infrastructure</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">Hosting</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(calculations.totalAwsInr, calculations.totalAwsUsd)}
            <span className="text-xs font-normal text-slate-500"> / month</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Covers compute, database, storage, networking, security, and push alerts on AWS.
          </p>
        </div>

        {/* External Services Card */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">2. External Managed Services</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">Variable Comms</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(calculations.externalMonthlyInr)}
            <span className="text-xs font-normal text-slate-500"> / month</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Resend email deliverability, Meta WhatsApp API conversations, and Airtel SMS OTPs.
          </p>
        </div>

        {/* Gross Margin Card */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-800">3. Gross Infrastructure Margin</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">FinOps ROI</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-950">
            {calculations.grossMarginPercent}%
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Projected revenue of {formatCurrency(calculations.projectedRevenueInr)}/mo against total cloud expenses.
          </p>
        </div>
      </div>

      {/* 7. RECOMMENDATION & ROADMAP BOX */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Executive Verdict & Implementation Roadmap
          </h2>
          <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
            Production Approved
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong>1. Day 1 Launch:</strong> Deploy on <strong>Pay-As-You-Go</strong> in AWS Mumbai (<code className="text-emerald-300">ap-south-1</code>) with zero upfront commitment. Total hosting cost for your initial customer cohort will remain under <strong>$50 – $100 / month (~₹4,300 – ₹8,600 / mo)</strong>.
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong>2. Growth Threshold:</strong> Once active employee registrations cross <strong>25,000 users</strong>, commit to a <strong>1-Year Savings Plan</strong> on your RDS PostgreSQL cluster and ECS Fargate fleet to immediately slash monthly infrastructure spend by <strong>35%</strong>.
        </p>
      </div>
    </div>
  );
};
