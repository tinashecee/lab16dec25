import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import OverdueTestsModal, { OverdueTest } from './OverdueTestsModal';
import { useNavigate } from 'react-router-dom';
import { useOverdueTests } from '../../hooks/queries/samples/useOverdueTests';

function OverdueTestsBanner() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: overdueTests = [], isLoading: loading } = useOverdueTests();
  const navigate = useNavigate();

  

  if (loading) return null;
  if (overdueTests.length === 0) return null;

  return (
    <>
      <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <span className="font-semibold">{overdueTests.length} test{overdueTests.length > 1 ? 's are' : ' is'} overdue!</span>
        <span className="ml-2">Some tests have exceeded their target turnaround time.</span>
        <button
          className="ml-auto text-red-700 underline font-medium hover:text-red-900 bg-transparent border-0 cursor-pointer"
          onClick={() => setModalOpen(true)}
        >
          View Details
        </button>
      </div>
      <OverdueTestsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGoToAll={() => {
          setModalOpen(false);
          navigate('/app/samples?filter=overdue');
        }}
        tests={overdueTests}
      />
    </>
  );
}

export default OverdueTestsBanner; 