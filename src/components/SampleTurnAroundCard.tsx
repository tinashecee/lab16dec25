import React, { useEffect, useState } from 'react';
import { Clock, X, Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTATxAnalysis, FilterState, TestModalData } from '../hooks/queries/dashboard/useTATxAnalysis';

// FilterState and TestModalData are now imported from useTATxAnalysis hook

// Helper functions moved to useTATxAnalysis hook

// Utility for CSV export
function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent = [
    keys.join(separator),
    ...rows.map(row => keys.map(k => '"' + (row[k] !== undefined ? String(row[k]) : '') + '"').join(separator))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utility for PDF export
function exportToPdf(filename: string, rows: Record<string, unknown>[], title: string, stats?: { overallTatx: string, numTests: number, period: string, description: string }) {
  if (!rows.length) return;
  // Use landscape orientation
  const doc = new jsPDF({ orientation: 'landscape' });
  const primaryColor = [250, 74, 64]; // #FA4A40
  try {
    const logoUrl = '/images/logo.png';
    doc.addImage(logoUrl, 'PNG', 14, 10, 30, 15);
  } catch {
    // Logo is optional
  }
  doc.setFontSize(20);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(title, 60, 20);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  // Add quick stats if provided, with improved layout and visibility
  if (stats) {
    // Draw a very light gray rounded rectangle for stats
    const boxY = 34;
    const boxHeight = 28;
    const boxWidth = 260;
    doc.setFillColor(245, 245, 245); // very light gray
    doc.roundedRect(14, boxY, boxWidth, boxHeight, 4, 4, 'F');
    // Labels
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0); // black
    doc.setFont('helvetica', 'bold');
    doc.text('Overall TATx Score:', 22, boxY + 11);
    doc.text('Number of Tests Run:', 22, boxY + 19);
    doc.text('Period Covered:', 22, boxY + 27);
    // Values
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(String(stats.overallTatx ?? ''), 90, boxY + 11);
    doc.text(String(stats.numTests ?? ''), 90, boxY + 19);
    doc.text(String(stats.period ?? ''), 90, boxY + 27);
    // Description below the box
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(String(stats.description ?? ''), 14, boxY + boxHeight + 10, { maxWidth: 260 });
  }

  const headers = Object.keys(rows[0]);
  const data = rows.map(row => Object.values(row));
  autoTable(doc, {
    startY: 78,
    head: [headers],
    body: data,
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248]
    },
    tableWidth: 'auto',
    margin: { left: 14, right: 14 },
  });
  doc.save(filename);
}

// FilterState is now imported from useTATxAnalysis hook

export default function SampleTurnAroundCard() {
  // Filter state - Default to current week
  const [filter, setFilter] = useState<FilterState>({ period: 'week' });
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Use TanStack Query hook for TATx analysis
  const { data, isLoading: loading, error } = useTATxAnalysis(filter);
  
  // Extract data from query result
  const totalTests = data?.totalTests ?? null;
  const testsMonth = data?.testsMonth ?? null;
  const testsWeek = data?.testsWeek ?? null;
  const testsToday = data?.testsToday ?? null;
  const uniqueCenters = data?.uniqueCenters ?? null;
  const centersMonth = data?.centersMonth ?? null;
  const centersWeek = data?.centersWeek ?? null;
  const centersToday = data?.centersToday ?? null;
  const tatxScore = data?.tatxScore ?? null;
  const testsModalData = data?.testsModalData ?? [];

  // Helper functions moved to useTATxAnalysis hook

  // Get filter display text
  const getFilterDisplayText = (filterState: FilterState): string => {
    switch (filterState.period) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'quarter':
        return 'This Quarter';
      case 'year':
        return 'This Year';
      case 'custom-month':
        if (filterState.selectedMonth) {
          return format(filterState.selectedMonth, 'MMMM yyyy');
        }
        return 'Select Month';
      case 'all':
      default:
        return 'All Time';
    }
  };

  // Calculate TATx Score
  // TATx Score = (Target TAT ÷ Actual TAT) × 100%
  // Scores > 100% indicate excellent performance (faster than target)
  // Scores < 100% indicate poor performance (slower than target)
  function calculateTatxScore(targetTAT: number, actualTAT: number): number {
    // Handle edge cases that could cause NaN
    if (isNaN(targetTAT) || isNaN(actualTAT) || targetTAT <= 0 || actualTAT <= 0) {
      return 0;
    }
    // No cap - allow scores > 100% for excellent performance
    const score = (targetTAT / actualTAT) * 100;
    return isNaN(score) ? 0 : score;
  }

  // Format TATx Score with % symbol
  function formatTatxScore(score: number | null): string {
    if (score === null || isNaN(score)) return 'N/A';
    return `${score.toFixed(1)}%`;
  }

  // Safely parse TATx score values to avoid NaN issues
  function safeParseTatxScore(scoreString: string): number | null {
    if (scoreString === "N/A" || scoreString === "" || scoreString === null || scoreString === undefined) {
      return null;
    }
    // Remove % symbol and parse
    const numericValue = parseFloat(scoreString.replace('%', ''));
    return isNaN(numericValue) ? null : numericValue;
  }

  // Get color class for TATx score
  // Scores > 100% = Excellent (faster than target)
  // Scores 100% = Meeting target
  // Scores 80-99% = Good but room for improvement
  // Scores < 80% = Needs improvement
  function getTatxScoreColorClass(score: number | null): string {
    if (score === null) return 'text-gray-600';
    if (score > 100) return 'text-green-700'; // Excellent - darker green for > 100%
    if (score >= 100) return 'text-green-600'; // Meeting target
    if (score >= 80) return 'text-yellow-600'; // Good
    return 'text-red-600'; // Needs improvement
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownOpen) {
        const target = event.target as Element;
        const dropdownButton = document.getElementById('filter-dropdown-button');
        const dropdownMenu = document.getElementById('filter-dropdown-menu');
        
        if (dropdownButton && dropdownMenu && 
            !dropdownButton.contains(target) && 
            !dropdownMenu.contains(target)) {
          setFilterDropdownOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterDropdownOpen]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-500 bg-opacity-10 p-2 rounded-lg">
            <Clock className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-medium text-secondary-900">Sample Turn Around Time</h3>
            <p className="text-sm text-secondary-500">Quick stats</p>
          </div>
        </div>
        
        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <div className="text-sm text-secondary-600">Filter by:</div>
          <div className="relative">
            <button
              id="filter-dropdown-button"
              onClick={(e) => {
                e.stopPropagation();
                setFilterDropdownOpen(!filterDropdownOpen);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <Calendar className="w-4 h-4" />
              {getFilterDisplayText(filter)}
              <ChevronDown className={`w-4 h-4 transition-transform ${filterDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {filterDropdownOpen && (
              <div 
                id="filter-dropdown-menu"
                className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-1">
                  {[
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'This Week' },
                    { value: 'month', label: 'This Month' },
                    { value: 'quarter', label: 'This Quarter' },
                    { value: 'year', label: 'This Year' },
                    { value: 'custom-month', label: 'Select Month...' },
                    { value: 'all', label: 'All Time' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Filter option clicked:', option.value); // Debug log
                        if (option.value === 'custom-month') {
                          setFilter({ period: 'custom-month', selectedMonth: new Date() });
                        } else {
                          setFilter({ period: option.value as FilterState['period'] });
                        }
                        setFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors focus:outline-none focus:bg-gray-100 ${
                        filter.period === option.value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Month Picker for custom-month filter */}
          {filter.period === 'custom-month' && (
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={filter.selectedMonth ? format(filter.selectedMonth, 'yyyy-MM') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month] = e.target.value.split('-');
                    const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                    setFilter({ ...filter, selectedMonth: selectedDate });
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TATx Score Card (Replaces Routine Tests) */}
        <div 
          className="p-5 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg cursor-pointer hover:shadow-md transition border border-primary-200 shadow-sm flex flex-col items-center justify-center"
          onClick={() => setModalOpen(true)}
        >
          <p className="text-sm font-medium text-secondary-900 text-center">TATx Score</p>
          <div className="mt-2 text-center">
            <span className="text-xs text-secondary-500">TAT Excellence Score</span>
            {loading ? (
              <div className="mt-2">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary-600">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="text-sm">Calculating...</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className={`text-4xl font-bold mt-2 ${getTatxScoreColorClass(tatxScore ? safeParseTatxScore(tatxScore) : null)}`}>
                  {tatxScore || 'N/A'}
                </p>
                <p className="text-xs text-secondary-600 mt-1">
                  📅 {getFilterDisplayText(filter)}
                </p>
                <p className="text-xs text-secondary-500 mt-1">Click for detailed analysis</p>
              </>
            )}
          </div>
        </div>
        {/* Samples Delivered */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-secondary-900">Samples Delivered</p>
          <div className="mt-1">
            <span className="text-xs text-secondary-500">{getFilterDisplayText(filter)}</span>
            {loading ? (
              <div className="flex items-center gap-2 text-lg font-semibold text-green-600 mt-1">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                <span className="text-sm">Calculating...</span>
              </div>
            ) : (
              <p className="text-lg font-semibold text-green-600 mt-1">
                {totalTests !== null ? totalTests : 'N/A'}
              </p>
            )}
                          {filter.period === 'all' && (
                <div className="text-xs text-secondary-500 mt-2">
                  <div>Month: <span className="font-semibold text-secondary-900">{loading ? <span className="animate-pulse">...</span> : (testsMonth !== null ? testsMonth : 'N/A')}</span></div>
                  <div>Week: <span className="font-semibold text-secondary-900">{loading ? <span className="animate-pulse">...</span> : (testsWeek !== null ? testsWeek : 'N/A')}</span></div>
                  <div>Today: <span className="font-semibold text-secondary-900">{loading ? <span className="animate-pulse">...</span> : (testsToday !== null ? testsToday : 'N/A')}</span></div>
                </div>
              )}
            {filter.period !== 'all' && (
              <div className="text-xs text-secondary-500 mt-2">
                <div className="text-gray-600">Filtered results</div>
              </div>
            )}
          </div>
        </div>
        {/* Centers */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-secondary-900">Centers</p>
          <div className="mt-1">
            <span className="text-xs text-secondary-500">With samples processed</span>
            {loading ? (
              <div className="flex items-center gap-2 text-lg font-semibold text-green-600 mt-1">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                <span className="text-sm">Counting...</span>
              </div>
            ) : (
              <p className="text-lg font-semibold text-green-600 mt-1">
                {uniqueCenters !== null ? uniqueCenters : 'N/A'}
              </p>
            )}
            <div className="text-xs text-secondary-500 mt-2">
              <div>Month: <span className="font-semibold text-secondary-900">{loading ? <span className="animate-pulse">...</span> : (centersMonth !== null ? centersMonth : 'N/A')}</span></div>
              <div>Week: <span className="font-semibold text-secondary-900">{loading ? <span className="animate-pulse">...</span> : (centersWeek !== null ? centersWeek : 'N/A')}</span></div>
              <div>Today: <span className="font-semibold text-secondary-900">{loading ? <span className="animate-pulse">...</span> : (centersToday !== null ? centersToday : 'N/A')}</span></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* TATx Score Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
            <button 
              className="absolute top-2 right-2 text-gray-500 hover:text-primary-600"
              onClick={() => setModalOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-primary-700">TATx Score Analysis</h2>
              <p className="text-gray-500">
                TATx Score measures test processing efficiency by comparing target vs actual TAT.
                Score = (Target TAT ÷ Actual TAT) × 100%.
              </p>
              {/* Export buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  onClick={() => {
                    // Prepare data for export
                    const rows = testsModalData.map(({ testName, normalTAT, urgentTAT, normalTests, urgentTests, averageNormalTAT, averageUrgentTAT, normalTatxScore, urgentTatxScore, overallTatxScore }) => ({
                      'Test Name': testName,
                      'Normal TAT (h)': normalTAT,
                      'Urgent TAT (h)': urgentTAT,
                      'Normal Tests': normalTests,
                      'Urgent Tests': urgentTests,
                      'Avg Normal TAT (h)': averageNormalTAT,
                      'Avg Urgent TAT (h)': averageUrgentTAT,
                      'Normal TATx': normalTatxScore,
                      'Urgent TATx': urgentTatxScore,
                      'Overall TATx': overallTatxScore
                    }));
                    exportToCsv('tatx_score_analysis.csv', rows);
                  }}
                >
                  Download CSV
                </button>
                <button
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  onClick={() => {
                    const rows = testsModalData.map(({ testName, normalTAT, urgentTAT, normalTests, urgentTests, averageNormalTAT, averageUrgentTAT, normalTatxScore, urgentTatxScore, overallTatxScore }) => ({
                      'Test Name': testName,
                      'Normal TAT (h)': normalTAT,
                      'Urgent TAT (h)': urgentTAT,
                      'Normal Tests': normalTests,
                      'Urgent Tests': urgentTests,
                      'Avg Normal TAT (h)': averageNormalTAT,
                      'Avg Urgent TAT (h)': averageUrgentTAT,
                      'Normal TATx': normalTatxScore,
                      'Urgent TATx': urgentTatxScore,
                      'Overall TATx': overallTatxScore
                    }));
                    // Compute quick stats
                    const overallTatx = tatxScore || 'N/A';
                    const numTests = testsModalData.reduce((sum, t) => sum + t.normalTests + t.urgentTests, 0);
                    // Include filter period information
                    const period = getFilterDisplayText(filter);
                    const description = `This report summarizes the Turnaround Time Excellence (TATx) Score for ${period.toLowerCase()} delivered tests. TATx measures the efficiency of test processing by comparing the target turnaround time (TAT) for each test to the actual time taken. Higher TATx scores indicate better performance. The report includes a breakdown by test type, urgency, and average TATs.`;
                    exportToPdf('tatx_score_analysis.pdf', rows, 'TATx Score Analysis', {
                      overallTatx,
                      numTests,
                      period,
                      description
                    });
                  }}
                >
                  Download PDF
                </button>
              </div>
              
              <div className="flex gap-4 mt-4 text-sm">
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  &gt;100%: Outstanding (faster than target)
                </div>
                <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200">
                  100%: On Target
                </div>
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                  80-99%: Good
                </div>
                <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full">
                  &lt;80%: Needs Improvement
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Test Performance</h3>
                {loading ? (
                  <div>Loading test data...</div>
                ) : testsModalData.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Normal TAT</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgent TAT</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Normal Tests</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgent Tests</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Normal TAT</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Urgent TAT</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Normal TATx</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgent TATx</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall TATx</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {testsModalData.map((test, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">{test.testName}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{test.normalTAT}h</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{test.urgentTAT}h</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{test.normalTests}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{test.urgentTests}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{test.averageNormalTAT}h</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{test.averageUrgentTAT}h</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              test.normalTatxScore === "N/A" ? "bg-gray-100 text-gray-500" : 
                              (safeParseTatxScore(test.normalTatxScore) || 0) > 100 ? "bg-green-200 text-green-900" : 
                              (safeParseTatxScore(test.normalTatxScore) || 0) >= 100 ? "bg-green-100 text-green-800" : 
                              (safeParseTatxScore(test.normalTatxScore) || 0) >= 80 ? "bg-yellow-100 text-yellow-800" : 
                              "bg-red-100 text-red-800"
                            }`}>
                              {test.normalTatxScore}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              test.urgentTatxScore === "N/A" ? "bg-gray-100 text-gray-500" : 
                              (safeParseTatxScore(test.urgentTatxScore) || 0) > 100 ? "bg-green-200 text-green-900" : 
                              (safeParseTatxScore(test.urgentTatxScore) || 0) >= 100 ? "bg-green-100 text-green-800" : 
                              (safeParseTatxScore(test.urgentTatxScore) || 0) >= 80 ? "bg-yellow-100 text-yellow-800" : 
                              "bg-red-100 text-red-800"
                            }`}>
                              {test.urgentTatxScore}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              test.overallTatxScore === "N/A" ? "bg-gray-100 text-gray-500" : 
                              (safeParseTatxScore(test.overallTatxScore) || 0) > 100 ? "bg-green-200 text-green-900" : 
                              (safeParseTatxScore(test.overallTatxScore) || 0) >= 100 ? "bg-green-100 text-green-800" : 
                              (safeParseTatxScore(test.overallTatxScore) || 0) >= 80 ? "bg-yellow-100 text-yellow-800" : 
                              "bg-red-100 text-red-800"
                            }`}>
                              {test.overallTatxScore}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-6 text-gray-500">No test data available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}