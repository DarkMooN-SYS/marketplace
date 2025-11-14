import React, { useCallback } from 'react';
import TopUp from '../components/TopUp';

const TopUpPage: React.FC = () => {
  const handleContinue = useCallback((amount: number) => {
    // Save amount to state or context if needed
    window.location.hash = 'bank-select';
  }, []);

  return <TopUp onContinue={handleContinue} />;
};

export default TopUpPage;
