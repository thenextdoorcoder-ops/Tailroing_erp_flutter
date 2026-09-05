'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, TrendingUp, Users, Package, Download } from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchDailySalesReport = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/reports/daily-sales', {
        params: { date: selectedDate },
      });
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch daily sales report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyRevenueReport = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/reports/monthly-revenue', {
        params: { year: selectedYear, month: selectedMonth },
      });
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch monthly revenue report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerReport = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/reports/customer');
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch customer report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryReport = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/reports/inventory');
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch inventory report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setReportData(null);
  };

  const handleGenerateReport = () => {
    switch (activeTab) {
      case 'daily':
        fetchDailySalesReport();
        break;
      case 'monthly':
        fetchMonthlyRevenueReport();
        break;
      case 'customer':
        fetchCustomerReport();
        break;
      case 'inventory':
        fetchInventoryReport();
        break;
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = `${activeTab}-report-${Date.now()}.csv`;

    try {
      switch (activeTab) {
        case 'daily': {
          // Summary Section
          csvContent += "Daily Sales Report\n";
          csvContent += `Date,${selectedDate}\n\n`;
          csvContent += "Summary\n";
          csvContent += `Total Orders,${reportData.summary.totalOrders}\n`;
          csvContent += `Orders Value,${reportData.summary.totalOrdersValue}\n`;
          csvContent += `Payments Received,${reportData.summary.totalPaymentsReceived}\n`;
          csvContent += `Other Expenses,${reportData.summary.totalExpenses}\n`;
          csvContent += `Staff Salaries,${reportData.summary.totalStaffSalary}\n`;
          csvContent += `Gross Profit,${reportData.summary.grossProfit}\n`;
          csvContent += `Net Profit,${reportData.summary.netProfit}\n\n`;

          // Table Data
          csvContent += "Category Breakdown\n";
          csvContent += "Category,Orders,Items,Revenue\n";
          reportData.categoryBreakdown.forEach((cat: any) => {
            csvContent += `${cat.category},${cat.orders},${cat.items},${cat.revenue}\n`;
          });
          break;
        }

        case 'monthly': {
          // Summary Section
          csvContent += "Monthly Revenue Report\n";
          csvContent += `Month,${selectedMonth}/${selectedYear}\n\n`;
          csvContent += "Summary\n";
          csvContent += `Total Orders,${reportData.summary.totalOrders}\n`;
          csvContent += `Total Revenue,${reportData.summary.totalOrdersValue}\n`;
          csvContent += `Total Payments,${reportData.summary.totalPayments}\n`;
          csvContent += `Other Expenses,${reportData.summary.totalExpenses}\n`;
          csvContent += `Staff Salaries,${reportData.summary.totalStaffSalary}\n`;
          csvContent += `Gross Profit,${reportData.summary.grossProfit}\n`;
          csvContent += `Net Profit,${reportData.summary.netProfit}\n\n`;

          // Table Data
          csvContent += "Daily Breakdown\n";
          csvContent += "Date,Orders,Payments,Other Expenses,Staff Salary,Gross Profit,Net Profit\n";
          reportData.dailyBreakdown.forEach((day: any) => {
            csvContent += `${day.date},${day.orders},${day.payments},${day.expenses},${day.staffSalary},${day.grossProfit},${day.netProfit}\n`;
          });
          break;
        }

        case 'customer': {
          // Summary Section
          csvContent += "Customer Insights Report\n\n";
          csvContent += "Summary\n";
          csvContent += `Total Customers,${reportData.totalCustomers}\n`;
          csvContent += `New Customers,${reportData.newCustomers}\n`;
          csvContent += `Active Customers,${reportData.activeCustomers}\n`;
          csvContent += `Customers with Dues,${reportData.customersWithDues.length}\n\n`;

          // Table Data
          csvContent += "Top Customers\n";
          csvContent += "Name,Mobile,Total Orders,Total Value,Total Paid,Total Due\n";
          reportData.topCustomers.forEach((customer: any) => {
            csvContent += `"${customer.name}",${customer.mobile},${customer.totalOrders},${customer.totalOrderValue},${customer.totalPaid},${customer.totalDue}\n`;
          });
          break;
        }

        case 'inventory': {
          // Summary Section
          csvContent += "Inventory Status Report\n\n";
          csvContent += "Summary\n";
          csvContent += `Total Items,${reportData.summary.totalItems}\n`;
          csvContent += `In Stock,${reportData.summary.inStock}\n`;
          csvContent += `Low Stock,${reportData.summary.lowStock}\n`;
          csvContent += `Out of Stock,${reportData.summary.outOfStock}\n`;
          csvContent += `Total Stock Value,${reportData.summary.totalStockValue}\n`;
          csvContent += `Potential Revenue,${reportData.summary.totalPotentialRevenue}\n`;
          csvContent += `Potential Profit,${reportData.summary.totalPotentialProfit}\n\n`;

          // Table Data (Low Stock Items if any)
          if (reportData.lowStockItems && reportData.lowStockItems.length > 0) {
            csvContent += "Low Stock Items\n";
            csvContent += "Name,Category,Stock Quantity,Unit,Status\n";
            reportData.lowStockItems.forEach((item: any) => {
              csvContent += `"${item.name}","${item.category}",${item.stockQuantity},${item.unit},${item.status}\n`;
            });
          }
          break;
        }
      }

      const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Failed to generate CSV:', error);
      alert('Failed to export data');
    }
  };

  return (
    <div className="animate-fadeIn pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-pink-600" />
            Business Reports
          </h1>
          <p className="text-slate-500 mt-1">Analyze your shop's performance regarding sales, customers, and inventory.</p>
        </div>
        {reportData && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-sm transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6 flex overflow-x-auto">
        {[
          { id: 'daily', label: 'Daily Sales', icon: TrendingUp },
          { id: 'monthly', label: 'Monthly Revenue', icon: BarChart3 },
          { id: 'customer', label: 'Customer Insights', icon: Users },
          { id: 'inventory', label: 'Inventory Status', icon: Package }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center
              ${activeTab === tab.id
                ? 'bg-pink-50 text-pink-700 shadow-sm'
                : 'text-slate-500 hover:bg-gray-50 hover:text-slate-700'
              }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-pink-600' : 'text-slate-400'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Area */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        {activeTab === 'daily' && (
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-700 text-sm"
              />
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-6 py-2.5 bg-pink-600 text-white rounded-xl hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-pink-200 font-medium transition-all"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-700 text-sm cursor-pointer"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Year
              </label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-700 text-sm"
              />
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-6 py-2.5 bg-pink-600 text-white rounded-xl hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-pink-200 font-medium transition-all"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        )}

        {(activeTab === 'customer' || activeTab === 'inventory') && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Generate a comprehensive report for all {activeTab === 'customer' ? 'customers' : 'inventory items'}.
            </p>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-6 py-2.5 bg-pink-600 text-white rounded-xl hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-pink-200 font-medium transition-all"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        )}
      </div>

      {/* Report Display */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mb-4"></div>
          <p className="text-slate-500 font-medium">Crunching the numbers...</p>
        </div>
      )}

      {!loading && reportData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Daily Sales Report */}
          {activeTab === 'daily' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <ReportCard label="Payments Received" value={formatCurrency(reportData.summary.totalPaymentsReceived)} color="green" />
                <ReportCard label="Other Expenses" value={formatCurrency(reportData.summary.totalExpenses)} color="red" />
                <ReportCard label="Staff Salaries" value={formatCurrency(reportData.summary.totalStaffSalary)} color="orange" />
                <ReportCard label="Net Profit" value={formatCurrency(reportData.summary.netProfit)} color="purple" />
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Category Breakdown</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-l-lg">Category</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Orders</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-r-lg">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {reportData.categoryBreakdown.map((cat: any) => (
                        <tr key={cat.category} className="hover:bg-pink-50/20">
                          <td className="px-4 py-3 text-sm font-medium text-slate-700">{cat.category}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-600">{cat.orders}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-600">{cat.items}</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                            {formatCurrency(cat.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Monthly Revenue Report */}
          {activeTab === 'monthly' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <ReportCard label="Payments" value={formatCurrency(reportData.summary.totalPayments)} color="green" />
                <ReportCard label="Other Expenses" value={formatCurrency(reportData.summary.totalExpenses)} color="red" />
                <ReportCard label="Staff Salaries" value={formatCurrency(reportData.summary.totalStaffSalary)} color="orange" />
                <ReportCard label="Gross Profit" value={formatCurrency(reportData.summary.grossProfit)} color="blue" />
                <ReportCard label="Net Profit" value={formatCurrency(reportData.summary.netProfit)} color="purple" />
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Daily Performance</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-l-lg">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Payments</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Other Expenses</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Salary</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Profit</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-r-lg">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {reportData.dailyBreakdown.map((day: any) => (
                        <tr key={day.day} className="hover:bg-pink-50/20">
                          <td className="px-4 py-3 font-medium text-slate-700">{day.date}</td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">
                            {formatCurrency(day.payments)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-red-600">
                            {formatCurrency(day.expenses)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-orange-600">
                            {formatCurrency(day.staffSalary)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-blue-600">
                            {formatCurrency(day.grossProfit)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-purple-600">
                            {formatCurrency(day.netProfit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Customer Report */}
          {activeTab === 'customer' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportCard label="Total Customers" value={reportData.totalCustomers} color="slate" />
                <ReportCard label="New (30 days)" value={reportData.newCustomers} color="blue" />
                <ReportCard label="Active" value={reportData.activeCustomers} color="green" />
                <ReportCard label="With Dues" value={reportData.customersWithDues.length} color="orange" />
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Top 10 Customers</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-l-lg">Customer</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Orders</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Value</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paid</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-r-lg">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {reportData.topCustomers.map((customer: any) => (
                        <tr key={customer.id} className="hover:bg-pink-50/20">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-700">{customer.name}</div>
                            <div className="text-xs text-slate-400">{customer.mobile}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-slate-600">{customer.totalOrders}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-800">
                            {formatCurrency(customer.totalOrderValue)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                            {formatCurrency(customer.totalPaid)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-orange-600">
                            {formatCurrency(customer.totalDue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Inventory Report */}
          {activeTab === 'inventory' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportCard label="Total Items" value={reportData.summary.totalItems} color="slate" />
                <ReportCard label="In Stock" value={reportData.summary.inStock} color="green" />
                <ReportCard label="Low Stock" value={reportData.summary.lowStock} color="orange" />
                <ReportCard label="Out of Stock" value={reportData.summary.outOfStock} color="red" />
              </div>

              {/* Low Stock Alert */}
              {reportData.lowStockItems.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl">
                  <h2 className="text-lg font-bold mb-4 text-orange-800 flex items-center gap-2">
                    ⚠️ Low Stock Alert
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reportData.lowStockItems.map((item: any) => (
                      <div key={item.id} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Stock</p>
                            <p
                              className={`font-bold ${item.status === 'OUT_OF_STOCK'
                                ? 'text-red-600'
                                : 'text-orange-600'
                                }`}
                            >
                              {item.stockQuantity} {item.unit}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory Value */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Inventory Value Analysis</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ReportCard label="Total Stock Value" value={formatCurrency(reportData.summary.totalStockValue)} color="blue" />
                  <ReportCard label="Potential Revenue" value={formatCurrency(reportData.summary.totalPotentialRevenue)} color="green" />
                  <ReportCard label="Potential Profit" value={formatCurrency(reportData.summary.totalPotentialProfit)} color="purple" />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReportCard({ label, value, color }: { label: string, value: string | number, color: string }) {
  const colorClasses: { [key: string]: string } = {
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className={`p-6 rounded-2xl border ${colorClasses[color]}`}>
      <h3 className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">{label}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}