import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { FinancialRecord, Farm, UserRole } from '../../types/index.ts';
import { IndianRupee, TrendingDown, AlertCircle, HelpCircle, Calculator, Plus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

interface MilkLossRevenueViewProps {
  currentRole: UserRole;
}

export const MilkLossRevenueView: React.FC<MilkLossRevenueViewProps> = ({ currentRole }) => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Model parameters
  const [simulatedMilkPrice, setSimulatedMilkPrice] = useState<number>(42.0);

  useEffect(() => {
    loadFarms();
  }, []);

  useEffect(() => {
    loadFinancials();
  }, [selectedFarm]);

  const loadFarms = async () => {
    try {
      const f = await api.getFarms();
      setFarms(f);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFinancials = async () => {
    setLoading(true);
    try {
      const res = await api.getFinancialRecords(selectedFarm || undefined);
      setRecords(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregations
  let totalExpectedYield = 0;
  let totalActualYield = 0;
  let totalDiscarded = 0;
  let totalScreeningCost = 0;
  let totalVetCost = 0;
  let totalOtherCost = 0;

  for (const r of records) {
    totalExpectedYield += r.expected_yield_litres || 0;
    totalActualYield += r.actual_yield_litres || 0;
    totalDiscarded += r.discarded_milk_litres || 0;
    totalScreeningCost += r.screening_cost || 0;
    totalVetCost += r.veterinary_cost || 0;
    totalOtherCost += r.other_recorded_costs || 0;
  }

  const unharvestedYieldLitres = Math.max(0, totalExpectedYield - totalActualYield);
  const totalLostMilkLitres = unharvestedYieldLitres + totalDiscarded;
  const lostMilkRevenueINR = Math.round(totalLostMilkLitres * simulatedMilkPrice);
  const totalDirectCostsINR = totalScreeningCost + totalVetCost + totalOtherCost;
  const totalNetEconomicImpactINR = lostMilkRevenueINR + totalDirectCostsINR;

  const chartData = [
    {
      name: 'Milk Revenue Loss',
      amount: lostMilkRevenueINR,
      fill: '#dc2626'
    },
    {
      name: 'Treatment & Drugs',
      amount: totalOtherCost,
      fill: '#7c3aed'
    },
    {
      name: 'Veterinary Fees',
      amount: totalVetCost,
      fill: '#2563eb'
    },
    {
      name: 'Screening Tests',
      amount: totalScreeningCost,
      fill: '#059669'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Milk-Loss & Net Economic Impact Analysis</h2>
          <p className="text-xs text-slate-500">Transparent accounting of yield depression, discarded milk, and clinical expenditures</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="text-xs border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-slate-800"
          >
            <option value="">All Registered Farms</option>
            {farms.map((f) => (
              <option key={f.farm_id} value={f.farm_id}>{f.farm_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Disclosed Methodology & Assumptions Banner */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <Calculator className="w-4 h-4 text-emerald-700" />
          <span>Disclosed Accounting Formulas & Economic Assumptions</span>
        </div>
        <p className="text-slate-600 leading-relaxed text-[11px]">
          <strong>Net Economic Impact</strong> = (Unharvested Yield Gap + Discarded Milk Litres) × Price per Litre + Direct Veterinary & Screening Costs.<br />
          <em>Note:</em> Yield reductions are attributed as observed correlations during active mastitis flags. Confounding seasonal feed or parity factors may contribute. Avoided losses are speculative and not claimed as verified prevention without randomized control comparisons.
        </p>
      </div>

      {/* Interactive Price Slider */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <label className="text-xs font-semibold text-slate-900">Milk Realization Price (INR ₹ / Litre)</label>
          <p className="text-[11px] text-slate-500">Peri-urban Tamil Nadu base price (Aavin cooperative or direct-to-consumer private)</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="30"
            max="60"
            step="1"
            value={simulatedMilkPrice}
            onChange={(e) => setSimulatedMilkPrice(parseFloat(e.target.value))}
            className="w-40 sm:w-56 accent-emerald-600"
          />
          <span className="font-mono font-bold text-sm text-slate-900 w-16 text-right tabular-nums">
            ₹{simulatedMilkPrice.toFixed(2)}/L
          </span>
        </div>
      </div>

      {/* Economic Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 font-medium">Yield Reduction Gap</div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
            {unharvestedYieldLitres.toFixed(1)} L
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Expected vs actual yield</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 font-medium">Discarded Milk Volume</div>
          <div className="text-xl font-bold font-mono text-rose-700 mt-1 tabular-nums">
            {totalDiscarded.toFixed(1)} L
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Antibiotic withdrawal dumping</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 font-medium">Lost Milk Value</div>
          <div className="text-xl font-bold font-mono text-rose-700 mt-1 tabular-nums">
            ₹{lostMilkRevenueINR.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">At ₹{simulatedMilkPrice}/L</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 font-medium">Total Net Impact</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            ₹{totalNetEconomicImpactINR.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Lost revenue + direct costs</div>
        </div>
      </div>

      {/* Breakdown Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Financial Impact Breakdown</h3>
        <p className="text-xs text-slate-500 mb-4">Direct treatment and diagnostic expenses versus foregone milk sales</p>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Cost Impact']}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-sm">Farm Financial Ledger Records</h3>
          <span className="text-xs font-mono text-slate-500">{records.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3">Record Date</th>
                <th className="px-4 py-3">Farm</th>
                <th className="px-4 py-3">Cow</th>
                <th className="px-4 py-3 text-right">Expected (L)</th>
                <th className="px-4 py-3 text-right">Actual (L)</th>
                <th className="px-4 py-3 text-right">Discarded (L)</th>
                <th className="px-4 py-3 text-right">Screening (₹)</th>
                <th className="px-4 py-3 text-right">Vet & Meds (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {records.map((r) => (
                <tr key={r.financial_id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-slate-500">{r.record_date}</td>
                  <td className="px-4 py-3 font-sans text-slate-800">{r.farm_name}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.tag_number || 'Herd Level'}</td>
                  <td className="px-4 py-3 text-right text-slate-700 tabular-nums">{r.expected_yield_litres.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-slate-700 tabular-nums">{r.actual_yield_litres.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-rose-600 font-semibold tabular-nums">{r.discarded_milk_litres.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-slate-700 tabular-nums">₹{r.screening_cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-semibold tabular-nums">₹{(r.veterinary_cost + r.other_recorded_costs).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
